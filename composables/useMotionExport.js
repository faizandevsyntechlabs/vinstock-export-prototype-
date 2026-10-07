import { reactive } from 'vue';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import {
  useMotionTimeline,
  computeAnimationEnvelope,
  clamp,
} from './useMotionTimeline.js';
import { useMediaSync } from './useMediaSync.js';

const exportState = reactive({
  isOpen: false,
  status: 'idle', // 'idle' | 'preparing' | 'rendering' | 'processing' | 'encoding' | 'complete' | 'error'
  phaseLabel: 'Ready',
  progress: 0,
  currentFrame: 0,
  totalFrames: 0,
  resolution: 'canvas', // 'canvas' | '720p-scale' | '1080p-scale'
  fps: 30,
  engine: 'client-mp4', // 'client-mp4' (Vercel/Static & Universal) | 'server-ffmpeg'
  downloadUrl: '',
  fileName: 'vinstock-motion-export.mp4',
  fileSize: 0,
  codec: 'H.264 (MP4) + AAC',
  errorMessage: '',
});

function base64ToMp4Blob(base64Str) {
  const binaryStr = atob(base64Str);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'video/mp4' });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders the active VINSTOCK HTML/Vue animation onto the export canvas using the exact
 * same deterministic envelope math (computeAnimationEnvelope) and properties as the Vue components.
 */
function renderVinstockAnimationToCanvas(ctx, animationTrack, masterTimeSec) {
  const { animationId, x, y, scale, animationSpeed, customProperties } = animationTrack;
  const startTime = Number(animationTrack.startTime) || 0;
  const duration = Math.max(0.1, Number(animationTrack.duration) || 5);

  if (!animationId) return;
  if (masterTimeSec < startTime || masterTimeSec > startTime + duration) return;

  const progress = clamp((masterTimeSec - startTime) / duration, 0, 1);
  const env = computeAnimationEnvelope(progress, duration, animationSpeed);
  if (env.visibility <= 0.005) return;

  const baseScale = Number(scale) || 1;
  const posX = Number(x) || 960;
  const posY = Number(y) || 540;
  const accent = customProperties?.accentColor || '#F59E0B';

  ctx.save();
  ctx.globalAlpha = clamp(env.visibility, 0, 1);

  if (animationId === 'animated-title') {
    const translateY = (1 - env.enter) * 48 - env.exit * 32;
    const currentScale = (0.92 + 0.08 * env.enter - 0.05 * env.exit) * baseScale;
    const fontSize = clamp(Number(customProperties?.fontSize) || 84, 32, 140);
    const titleText = customProperties?.text || 'BEYOND THE FRAME';
    const subtext = customProperties?.subtext || 'VINSTOCK MOTION SERIES · 2026';

    ctx.translate(posX, posY + translateY);
    ctx.scale(currentScale, currentScale);

    ctx.font = `800 ${fontSize}px "Syne", sans-serif`;
    const titleMetrics = ctx.measureText(titleText);
    const boxW = Math.max(520, titleMetrics.width + 110);
    const boxH = fontSize + 130;

    // Backdrop card
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 16);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.stroke();

    // Top accent bar track
    const barW = 192;
    const barH = 6;
    const barX = -barW / 2;
    const barY = -boxH / 2 + 28;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    drawRoundedRect(ctx, barX, barY, barW, barH, 3);
    ctx.fill();

    const activeBarW = barW * clamp(env.enter * (1 - env.exit * 0.8), 0, 1);
    if (activeBarW > 1) {
      ctx.fillStyle = accent;
      drawRoundedRect(ctx, barX, barY, activeBarW, barH, 3);
      ctx.fill();
    }

    // Main Headline
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${fontSize}px "Syne", sans-serif`;
    ctx.fillText(titleText, 0, -4);

    // Subheadline Kicker
    const subAlpha = clamp((env.enter - 0.25) / 0.75, 0, 1) * (1 - env.exit);
    ctx.globalAlpha = clamp(env.visibility * subAlpha, 0, 1);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText(subtext.toUpperCase(), 0, boxH / 2 - 34 + (1 - subAlpha) * 12);
  } else if (animationId === 'lower-third') {
    const slideX = -(1 - env.enter) * 64 - env.exit * 44;
    const primaryText = customProperties?.primaryText || 'John Smith';
    const secondaryText = customProperties?.secondaryText || 'Creative Director';

    ctx.translate(posX + slideX, posY);
    ctx.scale(baseScale, baseScale);

    ctx.font = '700 38px "Syne", sans-serif';
    const w1 = ctx.measureText(primaryText).width;
    ctx.font = '600 16px "JetBrains Mono", monospace';
    const w2 = ctx.measureText(secondaryText.toUpperCase()).width + 30;
    const boxW = Math.max(440, Math.max(w1, w2) + 80);
    const boxH = 108;

    // Card background anchored at left center
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    drawRoundedRect(ctx, 0, -boxH / 2, boxW, boxH, 10);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

    // Left pillar
    const pillarH = boxH * clamp(env.enter * (1 - env.exit), 0, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(0, boxH / 2 - pillarH, 12, pillarH);

    // Primary text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 36px "Syne", sans-serif';
    ctx.fillText(primaryText, 38, -14);

    // Secondary dot + role text
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(43, 24, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText(secondaryText.toUpperCase(), 56, 25);
  } else if (animationId === 'shape-reveal') {
    const s = (0.65 + 0.35 * env.enterBack - 0.25 * env.exit) * baseScale;
    const brandLabel = customProperties?.brandLabel || 'VINSTOCK';
    const tagline = customProperties?.tagline || 'MOTION GRAPHICS ENGINE';

    ctx.translate(posX, posY);
    ctx.scale(s, s);

    const boxW = 420;
    const boxH = 260;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.80)';
    drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 20);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

    // Rotating dashed ring
    ctx.save();
    ctx.translate(0, -34);
    const ringDeg = (progress * 180 * (Number(animationSpeed) || 1) * Math.PI) / 180;
    ctx.rotate(ringDeg);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Core rotated diamond
    ctx.save();
    ctx.translate(0, -34);
    const diamondRad = ((45 - (1 - env.enter) * 90 + progress * 45) * Math.PI) / 180;
    ctx.rotate(diamondRad);
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, -24, -24, 48, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();

    // Brand text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 36px "Syne", sans-serif';
    ctx.fillText(brandLabel.toUpperCase(), 0, 58);

    ctx.fillStyle = accent;
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(tagline.toUpperCase(), 0, 92);
  } else if (animationId === 'animated-badge') {
    const pulse = 1 + Math.sin(progress * Math.PI * 6 * (Number(animationSpeed) || 1)) * 0.035;
    const s = (0.5 + 0.5 * env.enterBack - 0.3 * env.exit) * pulse * baseScale;
    const tiltRad = (((1 - env.enterBack) * -12) * Math.PI) / 180;
    const badgeText = customProperties?.text || 'FEATURED';
    const sublabel = customProperties?.sublabel || 'LIMITED RELEASE';

    ctx.translate(posX, posY);
    ctx.rotate(tiltRad);
    ctx.scale(s, s);

    ctx.font = '800 30px "Syne", sans-serif';
    const textW = ctx.measureText(badgeText.toUpperCase()).width;
    const boxW = Math.max(260, textW + 115);
    const boxH = 84;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 14);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = accent;
    ctx.stroke();

    // Pulse beacon dot
    const dotX = -boxW / 2 + 34;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(dotX, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Badge text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 30px "Syne", sans-serif';
    ctx.fillText(badgeText.toUpperCase(), dotX + 24, -10);

    ctx.fillStyle = accent;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(sublabel.toUpperCase(), dotX + 24, 18);
  }

  ctx.restore();
}

/**
 * Mixes the uploaded audio track (respecting startTime, duration, volume, and mute)
 * into a 44.1kHz stereo AudioBuffer for exact MP4 muxing.
 */
async function renderSynchronizedAudioBuffer(audioTrack, totalDurationSec) {
  if (!audioTrack.file || audioTrack.muted || Number(audioTrack.volume) <= 0) {
    return null;
  }

  try {
    const sampleRate = 44100;
    const totalSamples = Math.max(sampleRate, Math.ceil(totalDurationSec * sampleRate));
    const arrayBuffer = await audioTrack.file.arrayBuffer();

    const tempAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    let decodedBuffer = null;
    try {
      decodedBuffer = await tempAudioCtx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      if (tempAudioCtx.state !== 'closed') {
        await tempAudioCtx.close().catch(() => {});
      }
    }

    if (!decodedBuffer) return null;

    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = clamp(Number(audioTrack.volume ?? 0.85), 0, 2);

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    const startSec = clamp(Number(audioTrack.startTime) || 0, 0, totalDurationSec);
    const durSec = clamp(Number(audioTrack.duration) || totalDurationSec, 0.1, totalDurationSec - startSec);

    source.start(startSec, 0, durSec);
    return await offlineCtx.startRendering();
  } catch (err) {
    console.warn('Could not decode audio for WebCodecs muxing:', err);
    return null;
  }
}

export function useMotionExport() {
  const { composition, videoTrack, animationTrack, audioTrack, pause, seekTo } =
    useMotionTimeline();
  const { seekVideoElementForExport } = useMediaSync();

  function openExportModal() {
    pause();
    exportState.isOpen = true;
    if (exportState.status === 'error') {
      exportState.status = 'idle';
      exportState.errorMessage = '';
    }
  }

  function closeExportModal() {
    if (
      exportState.status === 'preparing' ||
      exportState.status === 'rendering' ||
      exportState.status === 'processing' ||
      exportState.status === 'encoding'
    ) {
      return;
    }
    exportState.isOpen = false;
  }

  /**
   * Draw a single master timeline frame at `masterTime` onto `ctx`.
   */
  async function drawMasterFrame(ctx, scaleRatio, masterTime) {
    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;

    ctx.save();
    ctx.scale(scaleRatio, scaleRatio);

    // Background layer
    ctx.fillStyle = '#0B0D11';
    ctx.fillRect(0, 0, compW, compH);

    // Layer 1: Uploaded Video Track
    const vStart = Number(videoTrack.startTime) || 0;
    const vDur = Math.max(0.1, Number(videoTrack.duration) || 0);
    if (videoTrack.url && masterTime >= vStart && masterTime <= vStart + vDur) {
      const videoEl = await seekVideoElementForExport(masterTime);
      if (videoEl && videoEl.readyState >= 2) {
        const vScale = Number(videoTrack.scale) || 1;
        const drawW = (Number(videoTrack.width) || compW) * vScale;
        const drawH = (Number(videoTrack.height) || compH) * vScale;
        const drawX = Number(videoTrack.x) || 0;
        const drawY = Number(videoTrack.y) || 0;
        try {
          ctx.drawImage(videoEl, drawX, drawY, drawW, drawH);
        } catch (_e) {
          // Ignore transient video draw error
        }
      }
    }

    // Layer 2: VINSTOCK HTML/Vue Animation Overlay
    renderVinstockAnimationToCanvas(ctx, animationTrack, masterTime);

    ctx.restore();
  }

  /**
   * 100% Client-Side Hardware-Accelerated H.264 + AAC MP4 Exporter using WebCodecs + mp4-muxer.
   * Works seamlessly on Vercel static deployments (https://vinstock-export-prototype.vercel.app/)
   * as well as local dev without requiring server-side /tmp or FFmpeg binaries.
   */
  async function exportWithBrowserWebCodecs(targetWidth, targetHeight, fps, totalDuration, totalFrames) {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      throw new Error('WebCodecs API is not supported in this browser.');
    }

    // 1. Find universal H.264 codec profile supported by hardware/browser
    const candidateCodecs = [
      'avc1.4d0028', // Main Profile Level 4.0
      'avc1.420028', // Baseline Profile Level 4.0
      'avc1.42001f', // Baseline Profile Level 3.1
      'avc1.640028', // High Profile Level 4.0
    ];

    let selectedVideoConfig = null;
    for (const codecStr of candidateCodecs) {
      try {
        const check = await VideoEncoder.isConfigSupported({
          codec: codecStr,
          width: targetWidth,
          height: targetHeight,
          bitrate: targetWidth >= 1920 ? 8_000_000 : 5_000_000,
          framerate: fps,
        });
        if (check.supported) {
          selectedVideoConfig = check.config;
          break;
        }
      } catch (_e) {}
    }

    if (!selectedVideoConfig) {
      throw new Error('No compatible H.264 VideoEncoder profile found on this device.');
    }

    // 2. Prepare synchronized audio buffer & check AAC encoder support
    let renderedAudioBuffer = await renderSynchronizedAudioBuffer(audioTrack, totalDuration);
    let audioEncoderConfig = null;

    if (renderedAudioBuffer && typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
      try {
        const audioCheck = await AudioEncoder.isConfigSupported({
          codec: 'mp4a.40.2',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitrate: 128000,
        });
        if (audioCheck.supported) {
          audioEncoderConfig = audioCheck.config;
        }
      } catch (_e) {
        audioEncoderConfig = null;
      }
    }

    const includeAudio = Boolean(renderedAudioBuffer && audioEncoderConfig);

    // 3. Configure MP4 Muxer
    const muxerTarget = new ArrayBufferTarget();
    const muxer = new Muxer({
      target: muxerTarget,
      video: {
        codec: 'avc',
        width: targetWidth,
        height: targetHeight,
        frameRate: fps,
      },
      ...(includeAudio
        ? {
            audio: {
              codec: 'aac',
              numberOfChannels: 2,
              sampleRate: 44100,
            },
          }
        : {}),
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    let videoEncoderError = null;
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (err) => {
        videoEncoderError = err;
      },
    });
    videoEncoder.configure(selectedVideoConfig);

    // 4. Render & Encode Every Frame Deterministically
    exportState.status = 'rendering';
    exportState.phaseLabel = 'Rendering frames';

    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const ctx = offscreen.getContext('2d', { alpha: false });
    const scaleRatio = targetWidth / (Number(composition.width) || 1920);
    const frameDurationMicros = Math.round(1_000_000 / fps);

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (videoEncoderError) throw videoEncoderError;

      const masterTime = frameIdx / fps;
      composition.currentTime = masterTime;

      await drawMasterFrame(ctx, scaleRatio, masterTime);

      const timestampMicros = Math.round((frameIdx / fps) * 1_000_000);
      const videoFrame = new VideoFrame(offscreen, {
        timestamp: timestampMicros,
        duration: frameDurationMicros,
      });

      videoEncoder.encode(videoFrame, { keyFrame: frameIdx % fps === 0 });
      videoFrame.close();

      // Yield briefly if encoder queue builds up
      while (videoEncoder.encodeQueueSize > 10) {
        await new Promise((r) => setTimeout(r, 8));
      }

      exportState.currentFrame = frameIdx + 1;
      exportState.progress = Math.round(10 + ((frameIdx + 1) / totalFrames) * 65);

      if (frameIdx % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // 5. Process & Encode Synchronized Audio Track if present
    exportState.status = 'processing';
    exportState.phaseLabel = 'Processing media';
    exportState.progress = 80;

    if (includeAudio && renderedAudioBuffer) {
      try {
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            muxer.addAudioChunk(chunk, meta);
          },
          error: (err) => {
            console.warn('AudioEncoder warning:', err);
          },
        });
        audioEncoder.configure(audioEncoderConfig);

        const ch0 = renderedAudioBuffer.getChannelData(0);
        const ch1 =
          renderedAudioBuffer.numberOfChannels > 1
            ? renderedAudioBuffer.getChannelData(1)
            : ch0;
        const totalSamples = renderedAudioBuffer.length;
        const chunkSize = 1024;

        for (let offset = 0; offset < totalSamples; offset += chunkSize) {
          const framesInChunk = Math.min(chunkSize, totalSamples - offset);
          const planarData = new Float32Array(framesInChunk * 2);
          planarData.set(ch0.subarray(offset, offset + framesInChunk), 0);
          planarData.set(ch1.subarray(offset, offset + framesInChunk), framesInChunk);

          const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate: 44100,
            numberOfFrames: framesInChunk,
            numberOfChannels: 2,
            timestamp: Math.round((offset / 44100) * 1_000_000),
            data: planarData,
          });
          audioEncoder.encode(audioData);
          audioData.close();
        }

        await audioEncoder.flush();
        audioEncoder.close();
      } catch (audErr) {
        console.warn('Skipping audio stream due to encoder error:', audErr);
      }
    }

    // 6. Finalize H.264 + AAC MP4 Container
    exportState.status = 'encoding';
    exportState.phaseLabel = 'Encoding';
    exportState.progress = 92;

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    const mp4Blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
    return {
      mp4Blob,
      codec: includeAudio ? 'H.264 (WebCodecs) + AAC-LC' : 'H.264 (WebCodecs MP4)',
    };
  }

  /**
   * Server-side FFmpeg export pipeline (used when running with the Express/Node backend).
   */
  async function exportWithServerFfmpeg(targetWidth, targetHeight, fps, totalDuration, totalFrames) {
    const sessionId = `vinstock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let audioBase64 = null;
    let audioExt = 'mp3';
    if (audioTrack.file && !audioTrack.muted && Number(audioTrack.volume) > 0) {
      audioBase64 = await fileToBase64(audioTrack.file);
      const nameParts = (audioTrack.fileName || '').split('.');
      if (nameParts.length > 1) {
        audioExt = nameParts[nameParts.length - 1].toLowerCase();
      }
    }

    const initRes = await fetch('/api/export/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        fps,
        width: targetWidth,
        height: targetHeight,
        duration: totalDuration,
        audioConfig: {
          startTime: Number(audioTrack.startTime) || 0,
          duration: Number(audioTrack.duration) || totalDuration,
          volume: Number(audioTrack.volume ?? 0.85),
          muted: Boolean(audioTrack.muted),
        },
        audioBase64,
        audioExt,
      }),
    });

    if (!initRes.ok) {
      const err = new Error('Server FFmpeg endpoint unavailable');
      err.status = initRes.status;
      throw err;
    }

    exportState.status = 'rendering';
    exportState.phaseLabel = 'Rendering frames';

    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const ctx = offscreen.getContext('2d', { alpha: false });
    const scaleRatio = targetWidth / (Number(composition.width) || 1920);

    const batchSize = 15;
    let frameBatch = [];

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const masterTime = frameIdx / fps;
      composition.currentTime = masterTime;

      await drawMasterFrame(ctx, scaleRatio, masterTime);

      const dataUrl = offscreen.toDataURL('image/jpeg', 0.9);
      frameBatch.push({ index: frameIdx, dataUrl });

      exportState.currentFrame = frameIdx + 1;
      exportState.progress = Math.round(8 + ((frameIdx + 1) / totalFrames) * 68);

      if (frameBatch.length >= batchSize || frameIdx === totalFrames - 1) {
        exportState.status = frameIdx === totalFrames - 1 ? 'processing' : 'rendering';
        exportState.phaseLabel =
          frameIdx === totalFrames - 1 ? 'Processing media' : 'Rendering frames';

        const batchRes = await fetch('/api/export/frames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            frames: frameBatch,
          }),
        });

        if (!batchRes.ok) {
          const errData = await batchRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed while uploading rendered frame batch');
        }
        frameBatch = [];
      }
    }

    exportState.status = 'encoding';
    exportState.phaseLabel = 'Encoding';
    exportState.progress = 85;

    const finalRes = await fetch('/api/export/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!finalRes.ok) {
      const errData = await finalRes.json().catch(() => ({}));
      throw new Error(errData.error || 'FFmpeg MP4 encoding failed');
    }

    const finalData = await finalRes.json();
    const mp4Blob = base64ToMp4Blob(finalData.mp4Base64);
    return {
      mp4Blob,
      codec: finalData.codec || 'H.264 (Main@L4.0) + AAC-LC',
    };
  }

  async function startMp4Export() {
    const savedTime = composition.currentTime;
    pause();
    composition.isExporting = true;

    exportState.status = 'preparing';
    exportState.phaseLabel = 'Preparing';
    exportState.progress = 4;
    exportState.downloadUrl = '';
    exportState.errorMessage = '';

    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;
    const factor = exportState.resolution === '720p-scale' ? 0.6667 : 1;
    // H.264 requires dimensions divisible by 2
    const targetWidth = Math.max(320, Math.round((compW * factor) / 2) * 2);
    const targetHeight = Math.max(240, Math.round((compH * factor) / 2) * 2);
    const fps = Number(exportState.fps) || 30;
    const totalDuration = clamp(Number(composition.duration) || 10, 1, 30);
    const totalFrames = Math.max(1, Math.round(totalDuration * fps));

    exportState.totalFrames = totalFrames;
    exportState.currentFrame = 0;

    try {
      let result = null;

      if (exportState.engine === 'server-ffmpeg') {
        try {
          result = await exportWithServerFfmpeg(
            targetWidth,
            targetHeight,
            fps,
            totalDuration,
            totalFrames
          );
        } catch (serverErr) {
          // Automatic fallback to Browser WebCodecs + mp4-muxer when deployed to Vercel / static host
          console.warn(
            'Server FFmpeg endpoint unavailable, falling back to in-browser H.264/AAC MP4 muxer:',
            serverErr.message
          );
          result = await exportWithBrowserWebCodecs(
            targetWidth,
            targetHeight,
            fps,
            totalDuration,
            totalFrames
          );
        }
      } else {
        try {
          result = await exportWithBrowserWebCodecs(
            targetWidth,
            targetHeight,
            fps,
            totalDuration,
            totalFrames
          );
        } catch (clientErr) {
          console.warn('Browser WebCodecs unavailable, falling back to Server FFmpeg:', clientErr.message);
          result = await exportWithServerFfmpeg(
            targetWidth,
            targetHeight,
            fps,
            totalDuration,
            totalFrames
          );
        }
      }

      if (exportState.downloadUrl && exportState.downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(exportState.downloadUrl);
      }

      exportState.downloadUrl = URL.createObjectURL(result.mp4Blob);
      exportState.fileSize = result.mp4Blob.size;
      exportState.fileName = `vinstock-motion-export-${Date.now().toString().slice(-5)}.mp4`;
      exportState.codec = result.codec;
      exportState.progress = 100;
      exportState.status = 'complete';
      exportState.phaseLabel = 'Complete';
    } catch (err) {
      console.error('MP4 Export error:', err);
      exportState.status = 'error';
      exportState.phaseLabel = 'Export Failed';
      exportState.errorMessage = err.message || 'An unexpected error occurred during MP4 export.';
    } finally {
      composition.isExporting = false;
      seekTo(savedTime);
    }
  }

  function downloadMp4File() {
    if (!exportState.downloadUrl) return;
    const link = document.createElement('a');
    link.href = exportState.downloadUrl;
    link.download = exportState.fileName || 'vinstock-motion-export.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    exportState,
    openExportModal,
    closeExportModal,
    startMp4Export,
    downloadMp4File,
  };
}
