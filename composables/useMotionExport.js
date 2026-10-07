import { reactive } from 'vue';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import {
  useMotionTimeline,
  computeAnimationEnvelope,
  evaluateLayerSpatialState,
  isTrackActiveAt,
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
  format: 'mp4', // 'mp4' | 'webm'
  resolution: '1080p', // '1080p' | '720p' | '4k' | 'canvas'
  fps: 30,
  engine: 'client-mp4', // 'client-mp4' | 'server-ffmpeg'
  downloadUrl: '',
  fileName: 'vinstock-motion-export.mp4',
  fileSize: 0,
  codec: 'H.264 (MP4) + AAC',
  errorMessage: '',
});

function base64ToBlob(base64Str, mimeType = 'video/mp4') {
  const binaryStr = atob(base64Str);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
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
 * Renders a VINSTOCK HTML/Vue animation layer onto the export canvas using the exact
 * same deterministic envelope math + spatial keyframe/transition state as the Vue preview.
 */
function renderVinstockAnimationToCanvas(ctx, animationTrack, masterTimeSec) {
  const { animationId, animationSpeed, customProperties } = animationTrack;
  const startTime = Number(animationTrack.startTime) || 0;
  const duration = Math.max(0.1, Number(animationTrack.duration) || 5);

  if (!animationId) return;
  if (masterTimeSec < startTime || masterTimeSec > startTime + duration) return;

  const progress = clamp((masterTimeSec - startTime) / duration, 0, 1);
  const env = computeAnimationEnvelope(progress, duration, animationSpeed);
  const spatial = evaluateLayerSpatialState(animationTrack, masterTimeSec);
  const finalAlpha = clamp(env.visibility * spatial.opacity, 0, 1);
  if (finalAlpha <= 0.005) return;

  const baseScale = spatial.scale;
  const posX = spatial.x;
  const posY = spatial.y;
  const rotRad = (spatial.rotation * Math.PI) / 180;
  const accent = customProperties?.accentColor || '#F59E0B';

  ctx.save();
  ctx.globalAlpha = finalAlpha;
  ctx.translate(posX, posY);
  if (rotRad) ctx.rotate(rotRad);

  if (animationId === 'animated-title') {
    const translateY = (1 - env.enter) * 48 - env.exit * 32;
    const currentScale = (0.92 + 0.08 * env.enter - 0.05 * env.exit) * baseScale;
    const fontSize = clamp(Number(customProperties?.fontSize) || 84, 32, 140);
    const titleText = customProperties?.text || 'BEYOND THE FRAME';
    const subtext = customProperties?.subtext || 'VINSTOCK MOTION SERIES · 2026';

    ctx.translate(0, translateY);
    ctx.scale(currentScale, currentScale);

    ctx.font = `800 ${fontSize}px "Syne", sans-serif`;
    const titleMetrics = ctx.measureText(titleText);
    const boxW = Math.max(520, titleMetrics.width + 110);
    const boxH = fontSize + 130;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 16);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.stroke();

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

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${fontSize}px "Syne", sans-serif`;
    ctx.fillText(titleText, 0, -4);

    const subAlpha = clamp((env.enter - 0.25) / 0.75, 0, 1) * (1 - env.exit);
    ctx.globalAlpha = clamp(finalAlpha * subAlpha, 0, 1);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText(subtext.toUpperCase(), 0, boxH / 2 - 34 + (1 - subAlpha) * 12);
  } else if (animationId === 'lower-third') {
    const slideX = -(1 - env.enter) * 64 - env.exit * 44;
    const primaryText = customProperties?.primaryText || 'John Smith';
    const secondaryText = customProperties?.secondaryText || 'Creative Director';

    ctx.translate(slideX, 0);
    ctx.scale(baseScale, baseScale);

    ctx.font = '700 38px "Syne", sans-serif';
    const w1 = ctx.measureText(primaryText).width;
    ctx.font = '600 16px "JetBrains Mono", monospace';
    const w2 = ctx.measureText(secondaryText.toUpperCase()).width + 30;
    const boxW = Math.max(440, Math.max(w1, w2) + 80);
    const boxH = 108;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    drawRoundedRect(ctx, 0, -boxH / 2, boxW, boxH, 10);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

    const pillarH = boxH * clamp(env.enter * (1 - env.exit), 0, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(0, boxH / 2 - pillarH, 12, pillarH);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 36px "Syne", sans-serif';
    ctx.fillText(primaryText, 38, -14);

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

    ctx.scale(s, s);

    const boxW = 420;
    const boxH = 260;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.80)';
    drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 20);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

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

    const dotX = -boxW / 2 + 34;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(dotX, 0, 7, 0, Math.PI * 2);
    ctx.fill();

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

function renderTextLayerToCanvas(ctx, tItem, masterTimeSec) {
  if (!isTrackActiveAt(tItem, masterTimeSec)) return;
  const spatial = evaluateLayerSpatialState(tItem, masterTimeSec);
  if (spatial.opacity <= 0.01) return;

  const fontSize = clamp(Number(tItem.fontSize) || 52, 18, 160);
  const textStr = tItem.text || 'CAPTION';

  ctx.save();
  ctx.globalAlpha = spatial.opacity;
  ctx.translate(spatial.x, spatial.y);
  if (spatial.rotation) ctx.rotate((spatial.rotation * Math.PI) / 180);
  ctx.scale(spatial.scale, spatial.scale);

  ctx.font = `${tItem.fontWeight || '700'} ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  const textW = ctx.measureText(textStr).width;
  const boxW = textW + 56;
  const boxH = fontSize + 32;

  ctx.fillStyle = tItem.backgroundColor || 'rgba(15, 23, 42, 0.78)';
  drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 12);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = tItem.borderColor || '#38BDF8';
  ctx.stroke();

  ctx.fillStyle = tItem.color || '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textStr, 0, 1);
  ctx.restore();
}

function renderCroppedBoxToCanvas(ctx, sourceEl, item, masterTimeSec, fallbackW = 1920, fallbackH = 1080) {
  if (!sourceEl) return;
  const spatial = evaluateLayerSpatialState(item, masterTimeSec);
  if (spatial.opacity <= 0.01) return;

  const drawW = (Number(item.width) || fallbackW) * spatial.scale;
  const drawH = (Number(item.height) || fallbackH) * spatial.scale;
  const drawX = spatial.x;
  const drawY = spatial.y;

  const cTop = clamp(Number(item.cropTop) || 0, 0, 45) / 100;
  const cRight = clamp(Number(item.cropRight) || 0, 0, 45) / 100;
  const cBottom = clamp(Number(item.cropBottom) || 0, 0, 45) / 100;
  const cLeft = clamp(Number(item.cropLeft) || 0, 0, 45) / 100;

  ctx.save();
  ctx.globalAlpha = spatial.opacity;

  const cx = drawX + drawW / 2;
  const cy = drawY + drawH / 2;
  ctx.translate(cx, cy);
  if (spatial.rotation) {
    ctx.rotate((spatial.rotation * Math.PI) / 180);
  }
  ctx.translate(-drawW / 2, -drawH / 2);

  if (cTop > 0 || cRight > 0 || cBottom > 0 || cLeft > 0) {
    const clipX = drawW * cLeft;
    const clipY = drawH * cTop;
    const clipW = Math.max(4, drawW * (1 - cLeft - cRight));
    const clipH = Math.max(4, drawH * (1 - cTop - cBottom));
    ctx.beginPath();
    ctx.rect(clipX, clipY, clipW, clipH);
    ctx.clip();
  }

  try {
    ctx.drawImage(sourceEl, 0, 0, drawW, drawH);
  } catch (_e) {}

  ctx.restore();
}

/**
 * Mixes all uploaded audio tracks AND video tracks' embedded audio (respecting startTime, duration,
 * trimStart, trimEnd, playbackRate, volume, fadeIn, fadeOut, and mute) into a 44.1kHz stereo AudioBuffer.
 */
async function renderSynchronizedAudioBuffer(audioTracksList, videoTracksList, totalDurationSec) {
  const activeAudios = (audioTracksList || []).filter(
    (a) => a && a.file && !a.muted && Number(a.volume) > 0
  );
  const activeVideos = (videoTracksList || []).filter(
    (v) => v && v.file && Number(v.volume) > 0
  );
  const allSources = [
    ...activeAudios.map((a) => ({ item: a, isVideo: false })),
    ...activeVideos.map((v) => ({ item: v, isVideo: true })),
  ];

  if (allSources.length === 0) {
    return null;
  }

  try {
    const sampleRate = 44100;
    const totalSamples = Math.max(sampleRate, Math.ceil(totalDurationSec * sampleRate));
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    let scheduledCount = 0;

    for (const { item: trackItem } of allSources) {
      try {
        const arrayBuffer = await trackItem.file.arrayBuffer();
        const tempAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
        let decodedBuffer = null;
        try {
          decodedBuffer = await tempAudioCtx.decodeAudioData(arrayBuffer.slice(0));
        } finally {
          if (tempAudioCtx.state !== 'closed') {
            await tempAudioCtx.close().catch(() => {});
          }
        }
        if (!decodedBuffer) continue;

        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;
        const rate = clamp(Number(trackItem.playbackRate) || 1, 0.25, 4);
        source.playbackRate.value = rate;

        const gainNode = offlineCtx.createGain();
        const baseVol = clamp(Number(trackItem.volume ?? 0.85), 0, 2);
        const startSec = clamp(Number(trackItem.startTime) || 0, 0, totalDurationSec);
        const durSec = clamp(
          Number(trackItem.duration) || totalDurationSec,
          0.1,
          Math.max(0.1, totalDurationSec - startSec)
        );
        const fadeIn = Math.max(0, Number(trackItem.fadeIn) || 0);
        const fadeOut = Math.max(0, Number(trackItem.fadeOut) || 0);

        if (fadeIn > 0.02 || fadeOut > 0.02) {
          gainNode.gain.setValueAtTime(fadeIn > 0.02 ? 0.001 : baseVol, startSec);
          if (fadeIn > 0.02) {
            gainNode.gain.linearRampToValueAtTime(baseVol, Math.min(startSec + durSec, startSec + fadeIn));
          }
          if (fadeOut > 0.02 && durSec > fadeOut) {
            gainNode.gain.setValueAtTime(baseVol, startSec + durSec - fadeOut);
            gainNode.gain.linearRampToValueAtTime(0.001, startSec + durSec);
          }
        } else {
          gainNode.gain.value = baseVol;
        }

        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        const trimIn = Math.max(0, Number(trackItem.trimStart) || 0);
        source.start(startSec, trimIn, durSec * rate);
        scheduledCount++;
      } catch (_trackErr) {
        // Track has no audio stream or unsupported codec
      }
    }

    if (scheduledCount === 0) return null;
    return await offlineCtx.startRendering();
  } catch (err) {
    console.warn('Could not decode multi-track audio for muxing:', err);
    return null;
  }
}

function audioBufferToWavBase64(audioBuffer) {
  if (!audioBuffer) return null;
  const numChannels = 2;
  const sampleRate = audioBuffer.sampleRate || 44100;
  const numSamples = audioBuffer.length;
  const dataSize = numSamples * numChannels * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-32768, Math.min(32767, Math.floor(ch0[i] * 32767)));
    const r = Math.max(-32768, Math.min(32767, Math.floor(ch1[i] * 32767)));
    view.setInt16(offset, l, true);
    view.setInt16(offset + 2, r, true);
    offset += 4;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function useMotionExport() {
  const {
    composition,
    videoTracks,
    audioTracks,
    sortedVisualLayers,
    pause,
    seekTo,
  } = useMotionTimeline();
  const { seekAllVideosForExport } = useMediaSync();

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

  function resolveExportDimensions() {
    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;
    const aspect = compW / compH;

    let targetH = compH;
    if (exportState.resolution === '720p') {
      targetH = 720;
    } else if (exportState.resolution === '1080p') {
      targetH = 1080;
    } else if (exportState.resolution === '4k') {
      targetH = 2160;
    }

    let targetW = exportState.resolution === 'canvas' ? compW : Math.round(targetH * aspect);
    targetW = Math.max(320, Math.round(targetW / 2) * 2);
    targetH = Math.max(240, Math.round(targetH / 2) * 2);
    return { targetWidth: targetW, targetHeight: targetH };
  }

  /**
   * Draw a single master timeline frame at `masterTime` onto `ctx` (renders all video, image, text, and HTML layers sorted by zIndex).
   */
  async function drawMasterFrame(ctx, scaleX, scaleY, masterTime) {
    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.fillStyle = '#0B0D11';
    ctx.fillRect(0, 0, compW, compH);

    const activeVideos = await seekAllVideosForExport(masterTime);
    const videoElByTrackId = new Map();
    for (const { track: vItem, videoEl } of activeVideos) {
      if (videoEl && videoEl.readyState >= 2) {
        videoElByTrackId.set(vItem.id, videoEl);
      }
    }

    // Render all visual layers in ascending zIndex order
    for (const layer of sortedVisualLayers.value) {
      if (layer.type === 'video') {
        const videoEl = videoElByTrackId.get(layer.id);
        if (videoEl) {
          renderCroppedBoxToCanvas(ctx, videoEl, layer, masterTime, compW, compH);
        }
      } else if (layer.type === 'image') {
        if (isTrackActiveAt(layer, masterTime) && layer.imageElement) {
          renderCroppedBoxToCanvas(ctx, layer.imageElement, layer, masterTime, 320, 180);
        }
      } else if (layer.type === 'text') {
        renderTextLayerToCanvas(ctx, layer, masterTime);
      } else if (layer.type === 'animation') {
        renderVinstockAnimationToCanvas(ctx, layer, masterTime);
      }
    }

    ctx.restore();
  }

  /**
   * Client-side WebM exporter using Canvas + MediaRecorder (VP9/VP8) for universal WebM support.
   */
  async function exportWithBrowserWebm(targetWidth, targetHeight, fps, totalDuration, totalFrames) {
    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const ctx = offscreen.getContext('2d', { alpha: false });
    const scaleX = targetWidth / (Number(composition.width) || 1920);
    const scaleY = targetHeight / (Number(composition.height) || 1080);

    const stream = offscreen.captureStream(fps);
    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const selectedMime =
      mimeCandidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ||
      'video/webm';

    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: targetWidth >= 1920 ? 8_000_000 : 5_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopPromise = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });

    exportState.status = 'rendering';
    exportState.phaseLabel = 'Rendering WebM frames';
    recorder.start(100);

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const masterTime = frameIdx / fps;
      composition.currentTime = masterTime;
      await drawMasterFrame(ctx, scaleX, scaleY, masterTime);

      exportState.currentFrame = frameIdx + 1;
      exportState.progress = Math.round(10 + ((frameIdx + 1) / totalFrames) * 80);
      await new Promise((r) => setTimeout(r, 12));
    }

    exportState.status = 'encoding';
    exportState.phaseLabel = 'Finalizing WebM';
    recorder.stop();
    await stopPromise;

    const webmBlob = new Blob(chunks, { type: 'video/webm' });
    return {
      blob: webmBlob,
      ext: 'webm',
      codec: selectedMime.includes('vp9') ? 'VP9 (WebM)' : 'VP8 (WebM)',
    };
  }

  /**
   * 100% Client-Side Hardware-Accelerated H.264 + AAC MP4 Exporter using WebCodecs + mp4-muxer.
   */
  async function exportWithBrowserWebCodecs(targetWidth, targetHeight, fps, totalDuration, totalFrames) {
    if (exportState.format === 'webm') {
      return await exportWithBrowserWebm(targetWidth, targetHeight, fps, totalDuration, totalFrames);
    }

    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      throw new Error('WebCodecs API is not supported in this browser.');
    }

    const candidateCodecs = [
      'avc1.640033', // High Profile Level 5.1 (Supports 4K)
      'avc1.4d0033', // Main Profile Level 5.1 (Supports 4K)
      'avc1.4d0028', // Main Profile Level 4.0
      'avc1.420028', // Baseline Profile Level 4.0
      'avc1.42001f', // Baseline Profile Level 3.1
    ];

    let selectedVideoConfig = null;
    for (const codecStr of candidateCodecs) {
      try {
        const check = await VideoEncoder.isConfigSupported({
          codec: codecStr,
          width: targetWidth,
          height: targetHeight,
          bitrate: targetWidth >= 3840 ? 18_000_000 : targetWidth >= 1920 ? 8_000_000 : 5_000_000,
          framerate: fps,
        });
        if (check.supported) {
          selectedVideoConfig = check.config;
          break;
        }
      } catch (_e) {}
    }

    if (!selectedVideoConfig) {
      throw new Error('No compatible H.264 VideoEncoder profile found for this resolution.');
    }

    const renderedAudioBuffer = await renderSynchronizedAudioBuffer(
      audioTracks,
      videoTracks,
      totalDuration
    );
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

    exportState.status = 'rendering';
    exportState.phaseLabel = 'Rendering frames';

    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const ctx = offscreen.getContext('2d', { alpha: false });
    const scaleX = targetWidth / (Number(composition.width) || 1920);
    const scaleY = targetHeight / (Number(composition.height) || 1080);
    const frameDurationMicros = Math.round(1_000_000 / fps);

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (videoEncoderError) throw videoEncoderError;

      const masterTime = frameIdx / fps;
      composition.currentTime = masterTime;

      await drawMasterFrame(ctx, scaleX, scaleY, masterTime);

      const timestampMicros = Math.round((frameIdx / fps) * 1_000_000);
      const videoFrame = new VideoFrame(offscreen, {
        timestamp: timestampMicros,
        duration: frameDurationMicros,
      });

      videoEncoder.encode(videoFrame, { keyFrame: frameIdx % fps === 0 });
      videoFrame.close();

      while (videoEncoder.encodeQueueSize > 10) {
        await new Promise((r) => setTimeout(r, 8));
      }

      exportState.currentFrame = frameIdx + 1;
      exportState.progress = Math.round(10 + ((frameIdx + 1) / totalFrames) * 65);

      if (frameIdx % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

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

    exportState.status = 'encoding';
    exportState.phaseLabel = 'Encoding';
    exportState.progress = 92;

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    const mp4Blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
    return {
      blob: mp4Blob,
      ext: 'mp4',
      codec: includeAudio ? 'H.264 (WebCodecs) + AAC-LC' : 'H.264 (WebCodecs MP4)',
    };
  }

  /**
   * Server-side FFmpeg export pipeline (supports both MP4 and WebM).
   */
  async function exportWithServerFfmpeg(targetWidth, targetHeight, fps, totalDuration, totalFrames) {
    const sessionId = `vinstock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fmt = exportState.format === 'webm' ? 'webm' : 'mp4';

    let audioBase64 = null;
    const mixedBuffer = await renderSynchronizedAudioBuffer(audioTracks, videoTracks, totalDuration);
    if (mixedBuffer) {
      audioBase64 = audioBufferToWavBase64(mixedBuffer);
    }

    const initRes = await fetch('/api/export/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        format: fmt,
        fps,
        width: targetWidth,
        height: targetHeight,
        duration: totalDuration,
        audioConfig: {
          startTime: 0,
          duration: totalDuration,
          volume: 1,
          muted: !mixedBuffer,
        },
        audioBase64,
        audioExt: 'wav',
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
    const scaleX = targetWidth / (Number(composition.width) || 1920);
    const scaleY = targetHeight / (Number(composition.height) || 1080);

    const batchSize = 15;
    let frameBatch = [];

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const masterTime = frameIdx / fps;
      composition.currentTime = masterTime;

      await drawMasterFrame(ctx, scaleX, scaleY, masterTime);

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
    exportState.phaseLabel = 'Encoding with FFmpeg';
    exportState.progress = 85;

    const finalRes = await fetch('/api/export/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!finalRes.ok) {
      const errData = await finalRes.json().catch(() => ({}));
      throw new Error(errData.error || 'FFmpeg encoding failed');
    }

    const finalData = await finalRes.json();
    const outBlob = base64ToBlob(
      finalData.mp4Base64,
      fmt === 'webm' ? 'video/webm' : 'video/mp4'
    );
    return {
      blob: outBlob,
      ext: fmt,
      codec: finalData.codec || (fmt === 'webm' ? 'VP9 (WebM) + Opus' : 'H.264 + AAC-LC'),
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

    const { targetWidth, targetHeight } = resolveExportDimensions();
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
          console.warn('Server FFmpeg unavailable, falling back to browser encoder:', serverErr.message);
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
          console.warn('Browser encoder fallback to Server FFmpeg:', clientErr.message);
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

      exportState.downloadUrl = URL.createObjectURL(result.blob);
      exportState.fileSize = result.blob.size;
      exportState.fileName = `vinstock-motion-export-${Date.now().toString().slice(-5)}.${result.ext}`;
      exportState.codec = result.codec;
      exportState.progress = 100;
      exportState.status = 'complete';
      exportState.phaseLabel = 'Complete';
    } catch (err) {
      console.error('Export error:', err);
      exportState.status = 'error';
      exportState.phaseLabel = 'Export Failed';
      exportState.errorMessage = err.message || 'An unexpected error occurred during export.';
    } finally {
      composition.isExporting = false;
      seekTo(savedTime);
    }
  }

  function downloadMp4File() {
    if (!exportState.downloadUrl) return;
    const link = document.createElement('a');
    link.href = exportState.downloadUrl;
    link.download = exportState.fileName || `vinstock-motion-export.${exportState.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    exportState,
    openExportModal,
    closeExportModal,
    resolveExportDimensions,
    startMp4Export,
    downloadMp4File,
  };
}
