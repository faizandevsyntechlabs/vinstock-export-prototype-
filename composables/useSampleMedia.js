import { ref } from 'vue';
import { useMotionTimeline } from './useMotionTimeline.js';

const isGeneratingSample = ref(false);

/**
 * Generates a real playable 16-bit PCM Stereo WAV File (44.1 kHz) with an ambient studio chord progression
 * and subtle rhythmic pulse so audio synchronization and MP4 muxing can be verified immediately.
 */
export function createSampleWavFile(durationSec = 10) {
  const sampleRate = 44100;
  const numChannels = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Warm cinematic chord progression (A minor 9 -> F major 7) with gentle rhythmic pulse
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordSwitch = t < durationSec * 0.5 ? 0 : 1;
    const freqs =
      chordSwitch === 0
        ? [110.0, 220.0, 261.63, 329.63, 493.88]
        : [87.31, 174.61, 220.0, 261.63, 329.63];

    // Fade in / out envelope
    const fadeIn = Math.min(1, t / 0.4);
    const fadeOut = Math.min(1, (durationSec - t) / 0.6);
    const beatPulse = 0.72 + 0.28 * Math.sin(2 * Math.PI * 2 * t);

    let sampleL = 0;
    let sampleR = 0;
    for (let fIdx = 0; fIdx < freqs.length; fIdx++) {
      const f = freqs[fIdx];
      const amp = fIdx === 0 ? 0.26 : 0.12;
      sampleL += Math.sin(2 * Math.PI * f * t) * amp;
      sampleR += Math.sin(2 * Math.PI * (f * 1.0015) * t + 0.3) * amp;
    }

    // Subtle chime marker every 2 seconds for easy sync verification
    const mod2 = t % 2.0;
    if (mod2 < 0.25) {
      const chimeEnv = Math.exp(-mod2 * 14);
      sampleL += Math.sin(2 * Math.PI * 880 * t) * 0.18 * chimeEnv;
      sampleR += Math.sin(2 * Math.PI * 880 * t) * 0.18 * chimeEnv;
    }

    const gain = 0.55 * fadeIn * fadeOut * beatPulse;
    const leftInt = Math.max(-32768, Math.min(32767, Math.floor(sampleL * gain * 32767)));
    const rightInt = Math.max(-32768, Math.min(32767, Math.floor(sampleR * gain * 32767)));

    view.setInt16(offset, leftInt, true);
    view.setInt16(offset + 2, rightInt, true);
    offset += 4;
  }

  return new File([buffer], 'vinstock-studio-score.wav', { type: 'audio/wav' });
}

/**
 * Generates a real playable WebM video file using an offscreen Canvas + MediaRecorder
 * so the user can test synchronized video + HTML/Vue animation + audio right away,
 * or replace it with any uploaded MP4/WebM video file.
 */
export async function createSampleVideoFile(durationSec = 6) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(30);
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  const supportedMime = mimeTypes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';

  if (!supportedMime) {
    return null;
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMime,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const ext = supportedMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: supportedMime });
      const file = new File([blob], `vinstock-cinematic-backdrop.${ext}`, {
        type: supportedMime.split(';')[0],
      });
      resolve(file);
    };

    recorder.start(100);

    const fps = 30;
    const totalFrames = Math.floor(durationSec * fps);
    let frame = 0;

    function drawNextFrame() {
      const t = (frame / totalFrames) * durationSec;
      const w = canvas.width;
      const h = canvas.height;

      // Deep architectural studio background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Animated horizon grid & moving spotlight orbs
      const orbX1 = w * 0.3 + Math.cos(t * 1.1) * 220;
      const orbY1 = h * 0.45 + Math.sin(t * 0.9) * 110;
      const rad1 = ctx.createRadialGradient(orbX1, orbY1, 20, orbX1, orbY1, 420);
      rad1.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
      rad1.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = rad1;
      ctx.fillRect(0, 0, w, h);

      const orbX2 = w * 0.72 + Math.sin(t * 1.3) * 200;
      const orbY2 = h * 0.55 + Math.cos(t * 1.0) * 120;
      const rad2 = ctx.createRadialGradient(orbX2, orbY2, 20, orbX2, orbY2, 380);
      rad2.addColorStop(0, 'rgba(245, 158, 11, 0.26)');
      rad2.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = rad2;
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      const gridOffset = (t * 60) % 80;
      for (let x = -80 + gridOffset; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Moving kinetic sweep bar so frame-by-frame seek synchronization is unmistakably visible
      const sweepX = ((t / durationSec) * (w - 240)) + 120;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sweepX, 90);
      ctx.lineTo(sweepX, h - 90);
      ctx.stroke();

      // Subtle source slate watermark in bottom right corner of video footage
      ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText(`SOURCE VIDEO FOOTAGE · T+${t.toFixed(2)}s`, 48, h - 42);

      frame++;
      if (frame <= totalFrames) {
        setTimeout(drawNextFrame, 12);
      } else {
        recorder.stop();
        stream.getTracks().forEach((tr) => tr.stop());
      }
    }

    drawNextFrame();
  });
}

export function useSampleMedia() {
  const { setVideoFile, setAudioFile, videoTrack, audioTrack } = useMotionTimeline();

  async function loadSampleMedia() {
    if (isGeneratingSample.value) return;
    isGeneratingSample.value = true;
    try {
      const wavFile = createSampleWavFile(10);
      setAudioFile(wavFile);
      audioTrack.startTime = 0.5;
      audioTrack.duration = 8.5;

      const videoFile = await createSampleVideoFile(5);
      if (videoFile) {
        setVideoFile(videoFile);
        videoTrack.startTime = 0;
        videoTrack.duration = 9.0;
      }
    } finally {
      isGeneratingSample.value = false;
    }
  }

  return {
    isGeneratingSample,
    loadSampleMedia,
    createSampleWavFile,
    createSampleVideoFile,
  };
}
