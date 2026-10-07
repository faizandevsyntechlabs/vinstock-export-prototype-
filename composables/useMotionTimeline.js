import { reactive, computed } from 'vue';

export const VINSTOCK_ANIMATIONS = [
  {
    id: 'animated-title',
    name: 'Animated Title',
    category: 'Headline',
    description: 'Kinetic headline with staggered reveal bar, slide-up easing, and dynamic tracking.',
    defaultProps: {
      x: 960,
      y: 500,
      scale: 1,
      animationSpeed: 1,
      startTime: 0.8,
      duration: 6.5,
      customProperties: {
        text: 'BEYOND THE FRAME',
        subtext: 'VINSTOCK MOTION SERIES · 2026',
        fontSize: 84,
        accentColor: '#F59E0B',
      },
    },
  },
  {
    id: 'lower-third',
    name: 'Lower Third',
    category: 'Broadcast',
    description: 'Editorial broadcast lower-third nameplate with animated accent pillar and glass backdrop.',
    defaultProps: {
      x: 140,
      y: 860,
      scale: 1,
      animationSpeed: 1,
      startTime: 1.2,
      duration: 5.5,
      customProperties: {
        primaryText: 'John Smith',
        secondaryText: 'Creative Director',
        accentColor: '#F59E0B',
      },
    },
  },
  {
    id: 'shape-reveal',
    name: 'Logo / Shape Reveal',
    category: 'Identity',
    description: 'Geometric emblem and rotating architectural rings that assemble and lock into focus.',
    defaultProps: {
      x: 960,
      y: 540,
      scale: 1,
      animationSpeed: 1,
      startTime: 1.0,
      duration: 6.0,
      customProperties: {
        brandLabel: 'VINSTOCK',
        tagline: 'MOTION GRAPHICS ENGINE',
        accentColor: '#10B981',
      },
    },
  },
  {
    id: 'animated-badge',
    name: 'Callout / Badge',
    category: 'Promo',
    description: 'High-impact promotional callout badge with elastic pop-in, pulse ring, and shimmer sweep.',
    defaultProps: {
      x: 1580,
      y: 180,
      scale: 1,
      animationSpeed: 1,
      startTime: 1.5,
      duration: 5.0,
      customProperties: {
        text: 'FEATURED',
        sublabel: 'LIMITED RELEASE',
        accentColor: '#EF4444',
      },
    },
  },
];

// Singleton state so all components and composables share the exact same master timeline
const composition = reactive({
  duration: 10,
  currentTime: 0,
  isPlaying: false,
  isExporting: false,
  width: 1920,
  height: 1080,
  fps: 30,
  selectedTrack: 'animation', // 'animation' | 'video' | 'audio'
  previewQuality: '1080p · 30fps',
});

const videoTrack = reactive({
  file: null,
  fileName: '',
  url: '',
  naturalWidth: 1920,
  naturalHeight: 1080,
  naturalDuration: 10,
  startTime: 0,
  duration: 10,
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  scale: 1,
  volume: 0.8,
});

const animationTrack = reactive({
  animationId: 'animated-title',
  startTime: 0.8,
  duration: 6.5,
  x: 960,
  y: 500,
  scale: 1,
  animationSpeed: 1,
  customProperties: {
    text: 'BEYOND THE FRAME',
    subtext: 'VINSTOCK MOTION SERIES · 2026',
    fontSize: 84,
    primaryText: 'John Smith',
    secondaryText: 'Creative Director',
    brandLabel: 'VINSTOCK',
    tagline: 'MOTION GRAPHICS ENGINE',
    sublabel: 'LIMITED RELEASE',
    accentColor: '#F59E0B',
  },
});

const audioTrack = reactive({
  file: null,
  fileName: '',
  url: '',
  naturalDuration: 10,
  startTime: 0.5,
  duration: 8.5,
  volume: 0.85,
  muted: false,
  waveformPeaks: [
    0.25, 0.42, 0.68, 0.54, 0.85, 0.92, 0.61, 0.48, 0.74, 0.89,
    0.66, 0.39, 0.57, 0.81, 0.95, 0.72, 0.64, 0.51, 0.77, 0.84,
    0.62, 0.45, 0.69, 0.88, 0.73, 0.55, 0.41, 0.63, 0.52, 0.34,
  ],
});

let rafId = null;
let lastFrameTimestamp = null;
const seekListeners = new Set();

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

export function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutBack(t) {
  const x = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Deterministic envelope helper derived strictly from master timeline progress (0..1),
 * duration, and animationSpeed. Used identically by live Vue DOM components and frame exporter.
 */
export function computeAnimationEnvelope(progress, duration = 5, speed = 1) {
  const p = clamp(progress, 0, 1);
  const safeSpeed = clamp(Number(speed) || 1, 0.25, 3);
  // Base transition window is ~0.85s adjusted by speed, capped at 35% of track duration
  const transitionDuration = Math.min(duration * 0.35, 0.85 / safeSpeed);
  const transitionRatio = clamp(transitionDuration / Math.max(0.2, duration), 0.08, 0.4);

  let enterProgress = 1;
  let exitProgress = 0;

  if (p < transitionRatio) {
    enterProgress = clamp(p / transitionRatio, 0, 1);
  } else if (p > 1 - transitionRatio) {
    exitProgress = clamp((p - (1 - transitionRatio)) / transitionRatio, 0, 1);
  }

  const visibility = enterProgress * (1 - exitProgress);
  return {
    progress: p,
    enter: easeOutCubic(enterProgress),
    enterBack: easeOutBack(enterProgress),
    exit: easeInOutCubic(exitProgress),
    visibility: easeOutCubic(visibility),
  };
}

export function useMotionTimeline() {
  const isVideoActive = computed(() => {
    if (!videoTrack.url) return false;
    const cur = Number(composition.currentTime) || 0;
    const start = Number(videoTrack.startTime) || 0;
    const dur = Math.max(0.1, Number(videoTrack.duration) || 0);
    return cur >= start && cur <= start + dur;
  });

  const videoLocalTime = computed(() => {
    const cur = Number(composition.currentTime) || 0;
    const start = Number(videoTrack.startTime) || 0;
    return Math.max(0, cur - start);
  });

  const isAnimationActive = computed(() => {
    if (!animationTrack.animationId) return false;
    const cur = Number(composition.currentTime) || 0;
    const start = Number(animationTrack.startTime) || 0;
    const dur = Math.max(0.1, Number(animationTrack.duration) || 0);
    return cur >= start && cur <= start + dur;
  });

  const animationProgress = computed(() => {
    const dur = Number(animationTrack.duration) || 0;
    if (dur <= 0) return 0;
    const cur = Number(composition.currentTime) || 0;
    const start = Number(animationTrack.startTime) || 0;
    const raw = (cur - start) / dur;
    return clamp(raw, 0, 1);
  });

  const isAudioActive = computed(() => {
    if (!audioTrack.url) return false;
    const cur = Number(composition.currentTime) || 0;
    const start = Number(audioTrack.startTime) || 0;
    const dur = Math.max(0.1, Number(audioTrack.duration) || 0);
    return cur >= start && cur <= start + dur;
  });

  const audioLocalTime = computed(() => {
    const cur = Number(composition.currentTime) || 0;
    const start = Number(audioTrack.startTime) || 0;
    return Math.max(0, cur - start);
  });

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastFrameTimestamp = null;
  }

  function tick(now) {
    if (!composition.isPlaying || composition.isExporting) {
      stopLoop();
      return;
    }

    if (lastFrameTimestamp === null) {
      lastFrameTimestamp = now;
    }

    const deltaSec = (now - lastFrameTimestamp) / 1000;
    lastFrameTimestamp = now;

    const nextTime = composition.currentTime + deltaSec;
    if (nextTime >= composition.duration) {
      composition.currentTime = composition.duration;
      composition.isPlaying = false;
      stopLoop();
      notifySeek(composition.currentTime);
      return;
    }

    composition.currentTime = nextTime;
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (composition.isExporting) return;
    if (composition.currentTime >= composition.duration - 0.02) {
      composition.currentTime = 0;
      notifySeek(0);
    }
    composition.isPlaying = true;
    lastFrameTimestamp = null;
    stopLoop();
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    composition.isPlaying = false;
    stopLoop();
  }

  function togglePlay() {
    if (composition.isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function seekTo(timeSec) {
    const target = clamp(Number(timeSec) || 0, 0, composition.duration);
    composition.currentTime = target;
    lastFrameTimestamp = performance.now();
    notifySeek(target);
  }

  function restart() {
    pause();
    seekTo(0);
  }

  function onSeek(callback) {
    seekListeners.add(callback);
    return () => seekListeners.delete(callback);
  }

  function notifySeek(timeSec) {
    seekListeners.forEach((cb) => {
      try {
        cb(timeSec);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function selectTrack(trackKey) {
    composition.selectedTrack = trackKey;
  }

  function selectAnimationPreset(animationId) {
    const found = VINSTOCK_ANIMATIONS.find((a) => a.id === animationId);
    if (!found) return;
    animationTrack.animationId = found.id;
    animationTrack.x = found.defaultProps.x;
    animationTrack.y = found.defaultProps.y;
    animationTrack.scale = found.defaultProps.scale;
    animationTrack.animationSpeed = found.defaultProps.animationSpeed;
    Object.assign(animationTrack.customProperties, found.defaultProps.customProperties);
    composition.selectedTrack = 'animation';

    // Ensure current playhead is inside the animation window so user immediately sees it
    if (
      composition.currentTime < animationTrack.startTime ||
      composition.currentTime > animationTrack.startTime + animationTrack.duration
    ) {
      seekTo(
        clamp(
          animationTrack.startTime + Math.min(1.2, animationTrack.duration * 0.3),
          0,
          composition.duration
        )
      );
    }
  }

  function setVideoFile(file) {
    if (!file) return;
    if (videoTrack.url && videoTrack.url.startsWith('blob:')) {
      URL.revokeObjectURL(videoTrack.url);
    }
    const url = URL.createObjectURL(file);
    videoTrack.file = file;
    videoTrack.fileName = file.name || 'uploaded-video.mp4';
    videoTrack.url = url;
    composition.selectedTrack = 'video';

    // Probe natural metadata
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = Number.isFinite(tempVideo.duration) && tempVideo.duration > 0 ? tempVideo.duration : 10;
      videoTrack.naturalDuration = Number(dur.toFixed(2));
      videoTrack.naturalWidth = tempVideo.videoWidth || 1920;
      videoTrack.naturalHeight = tempVideo.videoHeight || 1080;
      videoTrack.duration = Number(Math.min(dur, composition.duration - videoTrack.startTime).toFixed(2)) || 8;
    };
  }

  function setAudioFile(file) {
    if (!file) return;
    if (audioTrack.url && audioTrack.url.startsWith('blob:')) {
      URL.revokeObjectURL(audioTrack.url);
    }
    const url = URL.createObjectURL(file);
    audioTrack.file = file;
    audioTrack.fileName = file.name || 'uploaded-audio.mp3';
    audioTrack.url = url;
    composition.selectedTrack = 'audio';

    const tempAudio = document.createElement('audio');
    tempAudio.preload = 'metadata';
    tempAudio.src = url;
    tempAudio.onloadedmetadata = () => {
      const dur = Number.isFinite(tempAudio.duration) && tempAudio.duration > 0 ? tempAudio.duration : 10;
      audioTrack.naturalDuration = Number(dur.toFixed(2));
      audioTrack.duration = Number(Math.min(dur, composition.duration - audioTrack.startTime).toFixed(2)) || 8;
    };
  }

  function formatTimecode(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * composition.fps);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }

  return {
    composition,
    videoTrack,
    animationTrack,
    audioTrack,
    animations: VINSTOCK_ANIMATIONS,
    isVideoActive,
    videoLocalTime,
    isAnimationActive,
    animationProgress,
    isAudioActive,
    audioLocalTime,
    play,
    pause,
    togglePlay,
    seekTo,
    restart,
    onSeek,
    selectTrack,
    selectAnimationPreset,
    setVideoFile,
    setAudioFile,
    formatTimecode,
  };
}
