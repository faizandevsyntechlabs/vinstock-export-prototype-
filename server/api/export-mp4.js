import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const FFMPEG_BIN = fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : (ffmpegStatic || 'ffmpeg');

const SESSIONS_ROOT = path.join(os.tmpdir(), 'vinstock-motion-exports');
if (!fs.existsSync(SESSIONS_ROOT)) {
  fs.mkdirSync(SESSIONS_ROOT, { recursive: true });
}

function getSessionDir(sessionId) {
  const safeId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(SESSIONS_ROOT, safeId);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stderr);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-600)}`));
      }
    });
  });
}

export async function handleExportInit(req, res) {
  try {
    const {
      sessionId,
      format = 'mp4',
      fps = 30,
      width = 1280,
      height = 720,
      duration = 10,
      audioConfig = null,
      audioBase64 = null,
      audioExt = 'mp3',
      videoConfig = null,
      videoBase64 = null,
      videoExt = 'mp4',
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const sessionDir = getSessionDir(sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    fs.mkdirSync(sessionDir, { recursive: true });

    let savedAudioPath = null;
    if (audioBase64 && typeof audioBase64 === 'string') {
      const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const safeExt = String(audioExt || 'mp3').replace(/[^a-zA-Z0-9]/g, '') || 'mp3';
      savedAudioPath = path.join(sessionDir, `input_audio.${safeExt}`);
      fs.writeFileSync(savedAudioPath, Buffer.from(base64Data, 'base64'));
    }

    let savedVideoPath = null;
    if (videoBase64 && typeof videoBase64 === 'string') {
      const base64Data = videoBase64.includes(',') ? videoBase64.split(',')[1] : videoBase64;
      const safeExt = String(videoExt || 'mp4').replace(/[^a-zA-Z0-9]/g, '') || 'mp4';
      savedVideoPath = path.join(sessionDir, `input_video.${safeExt}`);
      fs.writeFileSync(savedVideoPath, Buffer.from(base64Data, 'base64'));
    }

    const meta = {
      sessionId,
      format: format === 'webm' ? 'webm' : 'mp4',
      fps: Number(fps) || 30,
      width: Number(width) || 1280,
      height: Number(height) || 720,
      duration: Number(duration) || 10,
      audioConfig,
      savedAudioPath,
      videoConfig,
      savedVideoPath,
      createdAt: Date.now(),
    };

    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2));
    return res.json({ ok: true, sessionId });
  } catch (err) {
    console.error('Export init error:', err);
    return res.status(500).json({ error: err.message || 'Failed to initialize export session' });
  }
}

export async function handleExportFrames(req, res) {
  try {
    const { sessionId, frames } = req.body;
    if (!sessionId || !Array.isArray(frames)) {
      return res.status(400).json({ error: 'Invalid sessionId or frames array' });
    }

    const sessionDir = getSessionDir(sessionId);
    if (!fs.existsSync(sessionDir)) {
      return res.status(404).json({ error: 'Export session not found' });
    }

    for (const frame of frames) {
      const frameIndex = Number(frame.index);
      const dataUrl = frame.dataUrl;
      if (Number.isNaN(frameIndex) || !dataUrl) continue;
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const padded = String(frameIndex).padStart(5, '0');
      const framePath = path.join(sessionDir, `frame_${padded}.jpg`);
      fs.writeFileSync(framePath, Buffer.from(base64Data, 'base64'));
    }

    return res.json({ ok: true, written: frames.length });
  } catch (err) {
    console.error('Export frames error:', err);
    return res.status(500).json({ error: err.message || 'Failed to write frames' });
  }
}

export async function handleExportFinalize(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const sessionDir = getSessionDir(sessionId);
    const metaPath = path.join(sessionDir, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Export session metadata not found' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const isWebm = meta.format === 'webm';
    const ext = isWebm ? 'webm' : 'mp4';
    const outputFilePath = path.join(sessionDir, `vinstock-motion-export.${ext}`);
    const fps = Number(meta.fps) || 30;
    const totalDuration = Math.max(0.5, Number(meta.duration) || 10);

    const hasAudioFile =
      meta.savedAudioPath &&
      fs.existsSync(meta.savedAudioPath) &&
      meta.audioConfig &&
      !meta.audioConfig.muted &&
      Number(meta.audioConfig.volume ?? 1) > 0;

    const framePattern = path.join(sessionDir, 'frame_%05d.jpg');

    const videoEncodeArgs = isWebm
      ? [
          '-vf',
          'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
          '-c:v',
          'libvpx-vp9',
          '-b:v',
          '0',
          '-crf',
          '30',
          '-deadline',
          'realtime',
          '-cpu-used',
          '4',
          '-pix_fmt',
          'yuv420p',
          '-r',
          String(fps),
        ]
      : [
          '-vf',
          'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
          '-c:v',
          'libx264',
          '-profile:v',
          'main',
          '-level',
          '4.0',
          '-pix_fmt',
          'yuv420p',
          '-colorspace',
          'bt709',
          '-color_primaries',
          'bt709',
          '-color_trc',
          'bt709',
          '-color_range',
          'tv',
          '-preset',
          'fast',
          '-crf',
          '20',
          '-r',
          String(fps),
          '-vsync',
          'cfr',
        ];

    const audioEncodeArgs = isWebm
      ? [
          '-c:a',
          'libopus',
          '-b:a',
          '160k',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-t',
          String(totalDuration.toFixed(3)),
          outputFilePath,
        ]
      : [
          '-c:a',
          'aac',
          '-profile:a',
          'aac_low',
          '-b:a',
          '192k',
          '-ar',
          '44100',
          '-ac',
          '2',
          '-brand',
          'mp42',
          '-movflags',
          '+faststart',
          '-t',
          String(totalDuration.toFixed(3)),
          outputFilePath,
        ];

    const buildSilentArgs = () => [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      framePattern,
      '-f',
      'lavfi',
      '-t',
      String(totalDuration.toFixed(3)),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      ...videoEncodeArgs,
      ...audioEncodeArgs,
    ];

    if (hasAudioFile) {
      const audioStart = Math.max(0, Number(meta.audioConfig.startTime) || 0);
      const audioDur = Math.max(0.1, Number(meta.audioConfig.duration) || totalDuration);
      const audioVol = Math.max(0, Math.min(2, Number(meta.audioConfig.volume ?? 1)));
      const delayMs = Math.round(audioStart * 1000);

      const delayFilter = delayMs > 0 ? `,adelay=${delayMs}|${delayMs}` : '';
      const filterComplex = `[1:a]aformat=sample_rates=44100:channel_layouts=stereo[base];[2:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${audioDur.toFixed(3)},asetpts=PTS-STARTPTS,volume=${audioVol.toFixed(3)}${delayFilter}[useraud];[base][useraud]amix=inputs=2:duration=first:dropout_transition=0:weights="1 1"[aout]`;

      const args = [
        '-y',
        '-framerate',
        String(fps),
        '-i',
        framePattern,
        '-f',
        'lavfi',
        '-t',
        String(totalDuration.toFixed(3)),
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-i',
        meta.savedAudioPath,
        '-filter_complex',
        filterComplex,
        '-map',
        '0:v:0',
        '-map',
        '[aout]',
        ...videoEncodeArgs,
        ...audioEncodeArgs,
      ];

      try {
        await runFfmpeg(args);
      } catch (audioErr) {
        console.warn('Primary FFmpeg audio mix failed, falling back to clean stream:', audioErr.message);
        await runFfmpeg(buildSilentArgs());
      }
    } else {
      await runFfmpeg(buildSilentArgs());
    }

    const fileBuffer = fs.readFileSync(outputFilePath);

    return res.json({
      ok: true,
      format: ext,
      downloadUrl: `/api/export/download/${sessionId}`,
      mp4Base64: fileBuffer.toString('base64'),
      fileSize: fileBuffer.length,
      resolution: `${meta.width}x${meta.height}`,
      fps,
      duration: totalDuration,
      codec: isWebm ? 'VP9 (WebM) + Opus' : 'H.264 (Main@L4.0) + AAC-LC',
    });
  } catch (err) {
    console.error('Export finalize error:', err);
    return res.status(500).json({ error: err.message || 'FFmpeg encoding failed' });
  }
}

export async function handleExportDownload(req, res) {
  try {
    const { sessionId } = req.params;
    const sessionDir = getSessionDir(sessionId);
    const webmPath = path.join(sessionDir, 'vinstock-motion-export.webm');
    const mp4Path = path.join(sessionDir, 'vinstock-motion-export.mp4');
    const isWebm = fs.existsSync(webmPath);
    const targetPath = isWebm ? webmPath : mp4Path;

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Exported file not found' });
    }

    const stat = fs.statSync(targetPath);
    res.setHeader('Content-Type', isWebm ? 'video/webm' : 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="vinstock-motion-export-${sessionId.slice(0, 6)}.${isWebm ? 'webm' : 'mp4'}"`
    );

    const stream = fs.createReadStream(targetPath);
    stream.pipe(res);
  } catch (err) {
    console.error('Export download error:', err);
    return res.status(500).json({ error: 'Failed to download exported video' });
  }
}
