import { reactive } from 'vue';
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
  resolution: '1280x720', // '1280x720' | '1920x1080'
  fps: 30,
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
  const { animationId, startTime, duration, x, y, scale, animationSpeed, customProperties } =
    animationTrack;

  if (!animationId) return;
  if (masterTimeSec < startTime || masterTimeSec > startTime + duration) return;

  const progress = clamp((masterTimeSec - startTime) / Math.max(0.1, duration), 0, 1);
  const env = computeAnimationEnvelope(progress, duration, animationSpeed);
  if (env.visibility <= 0.005) return;

  const baseScale = Number(scale) || 1;
  const accent = customProperties?.accentColor || '#F59E0B';

  ctx.save();
  ctx.globalAlpha = clamp(env.visibility, 0, 1);

  if (animationId === 'animated-title') {
    const translateY = (1 - env.enter) * 48 - env.exit * 32;
    const currentScale = (0.92 + 0.08 * env.enter - 0.05 * env.exit) * baseScale;
    const fontSize = clamp(Number(customProperties?.fontSize) || 84, 32, 140);
    const titleText = customProperties?.text || 'BEYOND THE FRAME';
    const subtext = customProperties?.subtext || 'VINSTOCK MOTION SERIES · 2026';

    ctx.translate(x, y + translateY);
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

    ctx.translate(x + slideX, y);
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

    ctx.translate(x, y);
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

    ctx.translate(x, y);
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

  async function startMp4Export() {
    const savedTime = composition.currentTime;
    pause();
    composition.isExporting = true;

    exportState.status = 'preparing';
    exportState.phaseLabel = 'Preparing';
    exportState.progress = 4;
    exportState.downloadUrl = '';
    exportState.errorMessage = '';

    const [targetWidth, targetHeight] =
      exportState.resolution === '1920x1080' ? [1920, 1080] : [1280, 720];
    const fps = Number(exportState.fps) || 30;
    const totalDuration = clamp(Number(composition.duration) || 10, 1, 30);
    const totalFrames = Math.max(1, Math.round(totalDuration * fps));

    exportState.totalFrames = totalFrames;
    exportState.currentFrame = 0;

    const sessionId = `vinstock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      // 1. Prepare audio file payload if present
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
            startTime: audioTrack.startTime,
            duration: audioTrack.duration,
            volume: audioTrack.volume,
            muted: audioTrack.muted,
          },
          audioBase64,
          audioExt,
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize FFmpeg export session');
      }

      // 2. Render frames deterministically at logical 1920x1080 scaled to targetWidth x targetHeight
      exportState.status = 'rendering';
      exportState.phaseLabel = 'Rendering frames';

      const offscreen = document.createElement('canvas');
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;
      const ctx = offscreen.getContext('2d', { alpha: false });
      const scaleRatio = targetWidth / 1920;

      const batchSize = 15;
      let frameBatch = [];

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        const masterTime = frameIdx / fps;
        composition.currentTime = masterTime;

        // Clear logical 1920x1080 canvas coordinate space
        ctx.save();
        ctx.scale(scaleRatio, scaleRatio);

        // Background layer
        ctx.fillStyle = '#0B0D11';
        ctx.fillRect(0, 0, 1920, 1080);

        // Layer 1: Uploaded Video Track
        if (
          videoTrack.url &&
          masterTime >= videoTrack.startTime &&
          masterTime <= videoTrack.startTime + videoTrack.duration
        ) {
          const videoEl = await seekVideoElementForExport(masterTime);
          if (videoEl && videoEl.readyState >= 2) {
            const vScale = Number(videoTrack.scale) || 1;
            const drawW = (Number(videoTrack.width) || 1920) * vScale;
            const drawH = (Number(videoTrack.height) || 1080) * vScale;
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

      // 3. Finalize & Encode via FFmpeg (H.264 + AAC)
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
      if (exportState.downloadUrl && exportState.downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(exportState.downloadUrl);
      }

      if (finalData.mp4Base64) {
        const mp4Blob = base64ToMp4Blob(finalData.mp4Base64);
        exportState.downloadUrl = URL.createObjectURL(mp4Blob);
        exportState.fileSize = mp4Blob.size;
      } else {
        exportState.downloadUrl = finalData.downloadUrl;
        exportState.fileSize = finalData.fileSize || 0;
      }

      exportState.fileName = `vinstock-motion-export-${Date.now().toString().slice(-5)}.mp4`;
      exportState.codec = finalData.codec || 'H.264 (Main@L4.0) + AAC-LC';
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
