import { reactive, ref, computed } from 'vue';

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
      rotation: 0,
      opacity: 1,
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
      rotation: 0,
      opacity: 1,
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
      rotation: 0,
      opacity: 1,
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
      rotation: 0,
      opacity: 1,
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

export const ASPECT_RATIO_PRESETS = [
  { id: '16:9', label: '16:9', name: '16:9 Widescreen', width: 1920, height: 1080 },
  { id: '16:9-720', label: '16:9 (720p)', name: '16:9 HD 720p', width: 1280, height: 720 },
  { id: '9:16', label: '9:16', name: '9:16 Vertical', width: 1080, height: 1920 },
  { id: '1:1', label: '1:1', name: '1:1 Square', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', name: '4:5 Portrait', width: 1080, height: 1350 },
  { id: '21:9', label: '21:9', name: '21:9 Ultrawide', width: 2560, height: 1080 },
];

export const TRANSITION_TYPES = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'crossfade', label: 'Crossfade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
];

const DEFAULT_WAVEFORM = [
  0.25, 0.42, 0.68, 0.54, 0.85, 0.92, 0.61, 0.48, 0.74, 0.89,
  0.66, 0.39, 0.57, 0.81, 0.95, 0.72, 0.64, 0.51, 0.77, 0.84,
  0.62, 0.45, 0.69, 0.88, 0.73, 0.55, 0.41, 0.63, 0.52, 0.34,
];

let trackCounter = 1;
function createTrackId(prefix) {
  return `${prefix}_${Date.now()}_${trackCounter++}`;
}

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

export function createAnimationTrackObject(overrides = {}) {
  return reactive({
    id: overrides.id || createTrackId('anim'),
    type: 'animation',
    label: overrides.label || 'VINSTOCK Motion 1',
    animationId: overrides.animationId || 'animated-title',
    startTime: overrides.startTime ?? 0.8,
    duration: overrides.duration ?? 6.5,
    x: overrides.x ?? 960,
    y: overrides.y ?? 500,
    scale: overrides.scale ?? 1,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    zIndex: overrides.zIndex ?? 30,
    animationSpeed: overrides.animationSpeed ?? 1,
    transitionIn: overrides.transitionIn || 'none',
    transitionOut: overrides.transitionOut || 'none',
    transitionDuration: overrides.transitionDuration ?? 0.6,
    keyframes: reactive(overrides.keyframes ? [...overrides.keyframes] : []),
    customProperties: reactive({
      text: 'BEYOND THE FRAME',
      subtext: 'VINSTOCK MOTION SERIES · 2026',
      fontSize: 84,
      primaryText: 'John Smith',
      secondaryText: 'Creative Director',
      brandLabel: 'VINSTOCK',
      tagline: 'MOTION GRAPHICS ENGINE',
      sublabel: 'LIMITED RELEASE',
      accentColor: '#F59E0B',
      ...(overrides.customProperties || {}),
    }),
  });
}

export function createVideoTrackObject(overrides = {}) {
  return reactive({
    id: overrides.id || createTrackId('video'),
    type: 'video',
    label: overrides.label || 'Video 1',
    file: overrides.file || null,
    fileName: overrides.fileName || '',
    url: overrides.url || '',
    naturalWidth: overrides.naturalWidth || 1920,
    naturalHeight: overrides.naturalHeight || 1080,
    naturalDuration: overrides.naturalDuration || 10,
    trimStart: overrides.trimStart ?? 0,
    trimEnd: overrides.trimEnd ?? 10,
    startTime: overrides.startTime ?? 0,
    duration: overrides.duration ?? 6,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 1920,
    height: overrides.height ?? 1080,
    scale: overrides.scale ?? 1,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    zIndex: overrides.zIndex ?? 10,
    playbackRate: overrides.playbackRate ?? 1,
    volume: overrides.volume ?? 0.8,
    cropTop: overrides.cropTop ?? 0,
    cropRight: overrides.cropRight ?? 0,
    cropBottom: overrides.cropBottom ?? 0,
    cropLeft: overrides.cropLeft ?? 0,
    transitionIn: overrides.transitionIn || 'none',
    transitionOut: overrides.transitionOut || 'none',
    transitionDuration: overrides.transitionDuration ?? 0.6,
    keyframes: reactive(overrides.keyframes ? [...overrides.keyframes] : []),
  });
}

export function createAudioTrackObject(overrides = {}) {
  return reactive({
    id: overrides.id || createTrackId('audio'),
    type: 'audio',
    label: overrides.label || 'Audio 1',
    file: overrides.file || null,
    fileName: overrides.fileName || '',
    url: overrides.url || '',
    naturalDuration: overrides.naturalDuration || 10,
    trimStart: overrides.trimStart ?? 0,
    trimEnd: overrides.trimEnd ?? 10,
    startTime: overrides.startTime ?? 0,
    duration: overrides.duration ?? 8.5,
    volume: overrides.volume ?? 0.85,
    playbackRate: overrides.playbackRate ?? 1,
    fadeIn: overrides.fadeIn ?? 0,
    fadeOut: overrides.fadeOut ?? 0,
    muted: overrides.muted ?? false,
    waveformPeaks: overrides.waveformPeaks || [...DEFAULT_WAVEFORM],
  });
}

export function createTextTrackObject(overrides = {}) {
  return reactive({
    id: overrides.id || createTrackId('text'),
    type: 'text',
    label: overrides.label || 'Text 1',
    text: overrides.text || 'STUDIO CAPTION OVERLAY',
    fontSize: overrides.fontSize ?? 52,
    fontWeight: overrides.fontWeight || '700',
    color: overrides.color || '#FFFFFF',
    backgroundColor: overrides.backgroundColor || 'rgba(15, 23, 42, 0.75)',
    borderColor: overrides.borderColor || '#38BDF8',
    startTime: overrides.startTime ?? 1.0,
    duration: overrides.duration ?? 5.0,
    x: overrides.x ?? 960,
    y: overrides.y ?? 920,
    scale: overrides.scale ?? 1,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    zIndex: overrides.zIndex ?? 25,
    transitionIn: overrides.transitionIn || 'fade',
    transitionOut: overrides.transitionOut || 'fade',
    transitionDuration: overrides.transitionDuration ?? 0.5,
    keyframes: reactive(overrides.keyframes ? [...overrides.keyframes] : []),
  });
}

export function createImageTrackObject(overrides = {}) {
  return reactive({
    id: overrides.id || createTrackId('image'),
    type: 'image',
    label: overrides.label || 'Image 1',
    file: overrides.file || null,
    fileName: overrides.fileName || 'studio-badge.svg',
    url: overrides.url || '',
    imageElement: overrides.imageElement || null,
    startTime: overrides.startTime ?? 1.5,
    duration: overrides.duration ?? 5.0,
    x: overrides.x ?? 240,
    y: overrides.y ?? 200,
    width: overrides.width ?? 320,
    height: overrides.height ?? 180,
    scale: overrides.scale ?? 1,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    zIndex: overrides.zIndex ?? 20,
    cropTop: overrides.cropTop ?? 0,
    cropRight: overrides.cropRight ?? 0,
    cropBottom: overrides.cropBottom ?? 0,
    cropLeft: overrides.cropLeft ?? 0,
    transitionIn: overrides.transitionIn || 'fade',
    transitionOut: overrides.transitionOut || 'fade',
    transitionDuration: overrides.transitionDuration ?? 0.5,
    keyframes: reactive(overrides.keyframes ? [...overrides.keyframes] : []),
  });
}

// Singleton composition state
const composition = reactive({
  duration: 10,
  currentTime: 0,
  isPlaying: false,
  isExporting: false,
  width: 1920,
  height: 1080,
  aspectRatio: '16:9',
  zoomMode: 'fit', // 'fit' | 'manual'
  zoomLevel: 0.5,
  fps: 30,
  selectedTrack: 'animation', // 'animation' | 'video' | 'audio' | 'text' | 'image'
  selectedAnimationId: '',
  selectedVideoId: '',
  selectedAudioId: '',
  selectedTextId: '',
  selectedImageId: '',
  previewQuality: '1080p · 30fps',
});

const initialAnim = createAnimationTrackObject({ id: 'anim_1', label: 'VINSTOCK Motion 1', zIndex: 30 });
const initialVideo = createVideoTrackObject({ id: 'video_1', label: 'Video 1', zIndex: 10 });
const initialAudio = createAudioTrackObject({ id: 'audio_1', label: 'Audio 1', startTime: 0.5 });

const animationTracks = reactive([initialAnim]);
const videoTracks = reactive([initialVideo]);
const audioTracks = reactive([initialAudio]);
const textTracks = reactive([]);
const imageTracks = reactive([]);

composition.selectedAnimationId = initialAnim.id;
composition.selectedVideoId = initialVideo.id;
composition.selectedAudioId = initialAudio.id;

// Active proxies so existing components referencing `animationTrack`, `videoTrack`, `audioTrack`
// seamlessly read/write the currently selected layer of that type!
function makeActiveProxy(list, getSelectedId, fallbackObj) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const current = list.find((t) => t.id === getSelectedId()) || list[0] || fallbackObj;
        return current ? current[prop] : undefined;
      },
      set(_target, prop, value) {
        const current = list.find((t) => t.id === getSelectedId()) || list[0];
        if (current) {
          current[prop] = value;
        }
        return true;
      },
    }
  );
}

const activeAnimationProxy = makeActiveProxy(
  animationTracks,
  () => composition.selectedAnimationId,
  initialAnim
);
const activeVideoProxy = makeActiveProxy(
  videoTracks,
  () => composition.selectedVideoId,
  initialVideo
);
const activeAudioProxy = makeActiveProxy(
  audioTracks,
  () => composition.selectedAudioId,
  initialAudio
);
const fallbackText = createTextTrackObject({ id: 'text_fallback' });
const activeTextProxy = makeActiveProxy(
  textTracks,
  () => composition.selectedTextId,
  fallbackText
);
const fallbackImage = createImageTrackObject({ id: 'image_fallback' });
const activeImageProxy = makeActiveProxy(
  imageTracks,
  () => composition.selectedImageId,
  fallbackImage
);

// Undo / Redo History Stack
const undoStack = ref([]);
const redoStack = ref([]);
const MAX_HISTORY = 35;

function serializeTrackList(list) {
  return list.map((item) => {
    const copy = { ...item };
    if (item.keyframes) {
      copy.keyframes = item.keyframes.map((k) => ({ ...k }));
    }
    if (item.customProperties) {
      copy.customProperties = { ...item.customProperties };
    }
    if (item.waveformPeaks) {
      copy.waveformPeaks = [...item.waveformPeaks];
    }
    return copy;
  });
}

function captureSnapshot() {
  return {
    duration: composition.duration,
    width: composition.width,
    height: composition.height,
    aspectRatio: composition.aspectRatio,
    selectedTrack: composition.selectedTrack,
    selectedAnimationId: composition.selectedAnimationId,
    selectedVideoId: composition.selectedVideoId,
    selectedAudioId: composition.selectedAudioId,
    selectedTextId: composition.selectedTextId,
    selectedImageId: composition.selectedImageId,
    animationTracks: serializeTrackList(animationTracks),
    videoTracks: serializeTrackList(videoTracks),
    audioTracks: serializeTrackList(audioTracks),
    textTracks: serializeTrackList(textTracks),
    imageTracks: serializeTrackList(imageTracks),
  };
}

function restoreSnapshot(snap) {
  if (!snap) return;
  composition.duration = snap.duration;
  composition.width = snap.width;
  composition.height = snap.height;
  composition.aspectRatio = snap.aspectRatio;
  composition.selectedTrack = snap.selectedTrack;
  composition.selectedAnimationId = snap.selectedAnimationId;
  composition.selectedVideoId = snap.selectedVideoId;
  composition.selectedAudioId = snap.selectedAudioId;
  composition.selectedTextId = snap.selectedTextId;
  composition.selectedImageId = snap.selectedImageId;

  animationTracks.splice(
    0,
    animationTracks.length,
    ...snap.animationTracks.map((a) => createAnimationTrackObject(a))
  );
  videoTracks.splice(
    0,
    videoTracks.length,
    ...snap.videoTracks.map((v) => createVideoTrackObject(v))
  );
  audioTracks.splice(
    0,
    audioTracks.length,
    ...snap.audioTracks.map((a) => createAudioTrackObject(a))
  );
  textTracks.splice(
    0,
    textTracks.length,
    ...snap.textTracks.map((t) => createTextTrackObject(t))
  );
  imageTracks.splice(
    0,
    imageTracks.length,
    ...snap.imageTracks.map((img) => createImageTrackObject(img))
  );
}

export function saveHistoryState() {
  undoStack.value.push(captureSnapshot());
  if (undoStack.value.length > MAX_HISTORY) {
    undoStack.value.shift();
  }
  redoStack.value = [];
}

export function undo() {
  if (undoStack.value.length === 0) return;
  const current = captureSnapshot();
  redoStack.value.push(current);
  const prev = undoStack.value.pop();
  restoreSnapshot(prev);
}

export function redo() {
  if (redoStack.value.length === 0) return;
  const current = captureSnapshot();
  undoStack.value.push(current);
  const next = redoStack.value.pop();
  restoreSnapshot(next);
}

export function computeAnimationEnvelope(progress, duration = 5, speed = 1) {
  const p = clamp(progress, 0, 1);
  const safeSpeed = clamp(Number(speed) || 1, 0.25, 3);
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

/**
 * Evaluates keyframe interpolation + transition effects (fade, crossfade, slide, zoom)
 * for any visual layer (animation, video, text, image) at `masterTimeSec`.
 */
export function evaluateLayerSpatialState(layer, masterTimeSec) {
  if (!layer) {
    return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  }

  let baseX = Number(layer.x) || 0;
  let baseY = Number(layer.y) || 0;
  let baseScale = Number(layer.scale) ?? 1;
  let baseRotation = Number(layer.rotation) || 0;
  let baseOpacity = clamp(Number(layer.opacity ?? 1), 0, 1);

  // 1. Interpolate keyframes if present
  const kfs = Array.isArray(layer.keyframes) ? layer.keyframes : [];
  if (kfs.length > 0) {
    const sorted = [...kfs].sort((a, b) => Number(a.time) - Number(b.time));
    const t = Number(masterTimeSec) || 0;

    if (t <= Number(sorted[0].time)) {
      const k = sorted[0];
      baseX = Number(k.x ?? baseX);
      baseY = Number(k.y ?? baseY);
      baseScale = Number(k.scale ?? baseScale);
      baseRotation = Number(k.rotation ?? baseRotation);
      baseOpacity = clamp(Number(k.opacity ?? baseOpacity), 0, 1);
    } else if (t >= Number(sorted[sorted.length - 1].time)) {
      const k = sorted[sorted.length - 1];
      baseX = Number(k.x ?? baseX);
      baseY = Number(k.y ?? baseY);
      baseScale = Number(k.scale ?? baseScale);
      baseRotation = Number(k.rotation ?? baseRotation);
      baseOpacity = clamp(Number(k.opacity ?? baseOpacity), 0, 1);
    } else {
      for (let i = 0; i < sorted.length - 1; i++) {
        const k1 = sorted[i];
        const k2 = sorted[i + 1];
        const t1 = Number(k1.time);
        const t2 = Number(k2.time);
        if (t >= t1 && t <= t2) {
          const span = Math.max(0.001, t2 - t1);
          const alpha = easeInOutCubic((t - t1) / span);
          baseX = Number(k1.x ?? baseX) + (Number(k2.x ?? baseX) - Number(k1.x ?? baseX)) * alpha;
          baseY = Number(k1.y ?? baseY) + (Number(k2.y ?? baseY) - Number(k1.y ?? baseY)) * alpha;
          baseScale =
            Number(k1.scale ?? baseScale) +
            (Number(k2.scale ?? baseScale) - Number(k1.scale ?? baseScale)) * alpha;
          baseRotation =
            Number(k1.rotation ?? baseRotation) +
            (Number(k2.rotation ?? baseRotation) - Number(k1.rotation ?? baseRotation)) * alpha;
          baseOpacity = clamp(
            Number(k1.opacity ?? baseOpacity) +
              (Number(k2.opacity ?? baseOpacity) - Number(k1.opacity ?? baseOpacity)) * alpha,
            0,
            1
          );
          break;
        }
      }
    }
  }

  // 2. Apply Transition In / Transition Out (fade, crossfade, slide, zoom)
  const start = Number(layer.startTime) || 0;
  const dur = Math.max(0.2, Number(layer.duration) || 5);
  const elapsed = (Number(masterTimeSec) || 0) - start;
  const remaining = dur - elapsed;
  const transDur = clamp(Number(layer.transitionDuration) || 0.6, 0.1, dur * 0.48);

  const transIn = layer.transitionIn || 'none';
  const transOut = layer.transitionOut || 'none';

  let transOpacity = 1;
  let offsetX = 0;
  let offsetY = 0;
  let scaleMult = 1;

  if (transIn !== 'none' && elapsed >= 0 && elapsed < transDur) {
    const p = easeOutCubic(clamp(elapsed / transDur, 0, 1));
    if (transIn === 'fade' || transIn === 'crossfade') {
      transOpacity *= p;
      if (transIn === 'crossfade') {
        scaleMult *= 0.96 + 0.04 * p;
      }
    } else if (transIn === 'slide') {
      transOpacity *= p;
      offsetY += (1 - p) * 90;
    } else if (transIn === 'zoom') {
      transOpacity *= p;
      scaleMult *= 0.45 + 0.55 * p;
    }
  }

  if (transOut !== 'none' && remaining >= 0 && remaining < transDur) {
    const p = easeOutCubic(clamp(remaining / transDur, 0, 1));
    if (transOut === 'fade' || transOut === 'crossfade') {
      transOpacity *= p;
      if (transOut === 'crossfade') {
        scaleMult *= 1.04 - 0.04 * p;
      }
    } else if (transOut === 'slide') {
      transOpacity *= p;
      offsetY -= (1 - p) * 90;
    } else if (transOut === 'zoom') {
      transOpacity *= p;
      scaleMult *= 0.45 + 0.55 * p;
    }
  }

  return {
    x: baseX + offsetX,
    y: baseY + offsetY,
    scale: Math.max(0.05, baseScale * scaleMult),
    rotation: baseRotation,
    opacity: clamp(baseOpacity * transOpacity, 0, 1),
  };
}

export function isTrackActiveAt(track, timeSec) {
  if (!track) return false;
  if ((track.type === 'video' || track.type === 'audio' || track.type === 'image') && !track.url) {
    return false;
  }
  const cur = Number(timeSec) || 0;
  const start = Number(track.startTime) || 0;
  const dur = Math.max(0.1, Number(track.duration) || 0);
  return cur >= start && cur <= start + dur;
}

export function isVideoTrackActiveAt(vTrack, timeSec) {
  return isTrackActiveAt(vTrack, timeSec);
}

export function isAudioTrackActiveAt(aTrack, timeSec) {
  return isTrackActiveAt(aTrack, timeSec);
}

let rafId = null;
let lastFrameTimestamp = null;
const seekListeners = new Set();

export function useMotionTimeline() {
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const isVideoActive = computed(() =>
    videoTracks.some((v) => isTrackActiveAt(v, composition.currentTime))
  );

  const videoLocalTime = computed(() => {
    const cur = Number(composition.currentTime) || 0;
    const start = Number(activeVideoProxy.startTime) || 0;
    const rate = clamp(Number(activeVideoProxy.playbackRate) || 1, 0.25, 4);
    const trimIn = Math.max(0, Number(activeVideoProxy.trimStart) || 0);
    const trimOut = Math.max(
      trimIn + 0.1,
      Number(activeVideoProxy.trimEnd) || activeVideoProxy.naturalDuration || 10
    );
    return clamp(trimIn + Math.max(0, cur - start) * rate, trimIn, trimOut);
  });

  const isAnimationActive = computed(() =>
    animationTracks.some((a) => isTrackActiveAt(a, composition.currentTime))
  );

  const animationProgress = computed(() => {
    const dur = Number(activeAnimationProxy.duration) || 0;
    if (dur <= 0) return 0;
    const cur = Number(composition.currentTime) || 0;
    const start = Number(activeAnimationProxy.startTime) || 0;
    return clamp((cur - start) / dur, 0, 1);
  });

  const isAudioActive = computed(() =>
    audioTracks.some((a) => isTrackActiveAt(a, composition.currentTime))
  );

  const audioLocalTime = computed(() => {
    const cur = Number(composition.currentTime) || 0;
    const start = Number(activeAudioProxy.startTime) || 0;
    const rate = clamp(Number(activeAudioProxy.playbackRate) || 1, 0.25, 4);
    const trimIn = Math.max(0, Number(activeAudioProxy.trimStart) || 0);
    return trimIn + Math.max(0, cur - start) * rate;
  });

  /**
   * Returns all visual layers (video, image, text, animation) sorted by `zIndex` ascending.
   */
  const sortedVisualLayers = computed(() => {
    const all = [
      ...videoTracks,
      ...imageTracks,
      ...textTracks,
      ...animationTracks,
    ];
    return all.sort((a, b) => (Number(a.zIndex) || 10) - (Number(b.zIndex) || 10));
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

  function selectTrack(trackKey, itemId = null) {
    composition.selectedTrack = trackKey;
    if (trackKey === 'animation' && itemId) {
      composition.selectedAnimationId = itemId;
    } else if (trackKey === 'video' && itemId) {
      composition.selectedVideoId = itemId;
    } else if (trackKey === 'audio' && itemId) {
      composition.selectedAudioId = itemId;
    } else if (trackKey === 'text' && itemId) {
      composition.selectedTextId = itemId;
    } else if (trackKey === 'image' && itemId) {
      composition.selectedImageId = itemId;
    }
  }

  function moveLayerZIndex(layer, delta) {
    if (!layer) return;
    saveHistoryState();
    layer.zIndex = clamp((Number(layer.zIndex) || 10) + delta, 1, 200);
  }

  function addKeyframeAtPlayhead(layer) {
    if (!layer) return;
    saveHistoryState();
    if (!Array.isArray(layer.keyframes)) {
      layer.keyframes = reactive([]);
    }
    const t = Number(composition.currentTime.toFixed(2));
    const currentSpatial = evaluateLayerSpatialState(layer, t);
    const existingIdx = layer.keyframes.findIndex((k) => Math.abs(Number(k.time) - t) < 0.08);
    const kfData = {
      id: createTrackId('kf'),
      time: t,
      x: Math.round(Number(layer.x) || currentSpatial.x || 0),
      y: Math.round(Number(layer.y) || currentSpatial.y || 0),
      scale: Number((Number(layer.scale) || currentSpatial.scale || 1).toFixed(2)),
      rotation: Math.round(Number(layer.rotation) || 0),
      opacity: Number(clamp(Number(layer.opacity ?? 1), 0, 1).toFixed(2)),
    };

    if (existingIdx !== -1) {
      layer.keyframes[existingIdx] = { ...layer.keyframes[existingIdx], ...kfData };
    } else {
      layer.keyframes.push(kfData);
      layer.keyframes.sort((a, b) => Number(a.time) - Number(b.time));
    }
  }

  function removeKeyframe(layer, kfId) {
    if (!layer || !Array.isArray(layer.keyframes)) return;
    saveHistoryState();
    const idx = layer.keyframes.findIndex((k) => k.id === kfId);
    if (idx !== -1) {
      layer.keyframes.splice(idx, 1);
    }
  }

  function clearKeyframes(layer) {
    if (!layer || !Array.isArray(layer.keyframes)) return;
    saveHistoryState();
    layer.keyframes.splice(0, layer.keyframes.length);
  }

  function setScreenSize(width, height, aspectLabel = null) {
    saveHistoryState();
    const prevW = composition.width || 1920;
    const prevH = composition.height || 1080;
    const nextW = Math.round(clamp(Number(width) || 1920, 320, 3840) / 2) * 2;
    const nextH = Math.round(clamp(Number(height) || 1080, 240, 2160) / 2) * 2;

    if (prevW > 0 && prevH > 0) {
      animationTracks.forEach((at) => {
        at.x = Math.round((Number(at.x) / prevW) * nextW);
        at.y = Math.round((Number(at.y) / prevH) * nextH);
      });
      textTracks.forEach((tt) => {
        tt.x = Math.round((Number(tt.x) / prevW) * nextW);
        tt.y = Math.round((Number(tt.y) / prevH) * nextH);
      });
    }

    videoTracks.forEach((vt) => {
      if (
        Math.abs((Number(vt.width) || prevW) - prevW) <= 40 &&
        Math.abs((Number(vt.height) || prevH) - prevH) <= 40 &&
        Math.abs(Number(vt.x) || 0) <= 20 &&
        Math.abs(Number(vt.y) || 0) <= 20
      ) {
        vt.x = 0;
        vt.y = 0;
        vt.width = nextW;
        vt.height = nextH;
        vt.scale = 1;
      }
    });

    composition.width = nextW;
    composition.height = nextH;

    if (aspectLabel) {
      composition.aspectRatio = aspectLabel;
    } else {
      const matched = ASPECT_RATIO_PRESETS.find((p) => p.width === nextW && p.height === nextH);
      if (matched) {
        composition.aspectRatio = matched.id;
      } else {
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(nextW, nextH);
        const rw = Math.round(nextW / divisor);
        const rh = Math.round(nextH / divisor);
        composition.aspectRatio = rw <= 32 && rh <= 32 ? `${rw}:${rh}` : 'Custom';
      }
    }

    composition.previewQuality = `${nextW}×${nextH} · ${composition.fps}fps`;
  }

  function setAspectRatioPreset(presetId) {
    const found = ASPECT_RATIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setScreenSize(found.width, found.height, found.id);
  }

  function setZoom(level) {
    if (level === 'fit') {
      composition.zoomMode = 'fit';
      return;
    }
    composition.zoomMode = 'manual';
    composition.zoomLevel = clamp(Number(level) || 0.5, 0.15, 2.0);
  }

  function stepZoom(delta) {
    composition.zoomMode = 'manual';
    composition.zoomLevel = Number(
      clamp((Number(composition.zoomLevel) || 0.5) + delta, 0.15, 2.0).toFixed(2)
    );
  }

  // --- VINSTOCK HTML/Vue Animation Layers (Multiple) ---
  function addAnimationTrack(presetId = 'lower-third') {
    saveHistoryState();
    const found = VINSTOCK_ANIMATIONS.find((a) => a.id === presetId) || VINSTOCK_ANIMATIONS[0];
    const index = animationTracks.length + 1;
    const newAnim = createAnimationTrackObject({
      label: `VINSTOCK Motion ${index}`,
      animationId: found.id,
      startTime: Math.min(composition.duration - 2, 0.5 * index),
      duration: Math.min(5.5, composition.duration),
      x: Math.round((found.defaultProps.x / 1920) * composition.width),
      y: Math.round((found.defaultProps.y / 1080) * composition.height),
      scale: found.defaultProps.scale,
      zIndex: 30 + index,
      customProperties: { ...found.defaultProps.customProperties },
    });
    animationTracks.push(newAnim);
    composition.selectedTrack = 'animation';
    composition.selectedAnimationId = newAnim.id;
    return newAnim;
  }

  function removeAnimationTrack(trackId) {
    if (animationTracks.length <= 1) return;
    saveHistoryState();
    const idx = animationTracks.findIndex((a) => a.id === trackId);
    if (idx === -1) return;
    animationTracks.splice(idx, 1);
    animationTracks.forEach((a, i) => {
      a.label = `VINSTOCK Motion ${i + 1}`;
    });
    if (composition.selectedAnimationId === trackId) {
      composition.selectedAnimationId =
        animationTracks[Math.max(0, idx - 1)]?.id || animationTracks[0]?.id || '';
    }
  }

  function selectAnimationPreset(animationId) {
    saveHistoryState();
    const found = VINSTOCK_ANIMATIONS.find((a) => a.id === animationId);
    if (!found) return;
    activeAnimationProxy.animationId = found.id;
    activeAnimationProxy.x = Math.round((found.defaultProps.x / 1920) * composition.width);
    activeAnimationProxy.y = Math.round((found.defaultProps.y / 1080) * composition.height);
    activeAnimationProxy.scale = found.defaultProps.scale;
    activeAnimationProxy.animationSpeed = found.defaultProps.animationSpeed;
    Object.assign(activeAnimationProxy.customProperties, found.defaultProps.customProperties);
    composition.selectedTrack = 'animation';

    if (
      composition.currentTime < activeAnimationProxy.startTime ||
      composition.currentTime > activeAnimationProxy.startTime + activeAnimationProxy.duration
    ) {
      seekTo(
        clamp(
          activeAnimationProxy.startTime + Math.min(1.2, activeAnimationProxy.duration * 0.3),
          0,
          composition.duration
        )
      );
    }
  }

  // --- Text Overlay Layers ---
  function addTextTrack(overrides = {}) {
    saveHistoryState();
    const index = textTracks.length + 1;
    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;
    const newText = createTextTrackObject({
      label: `Text ${index}`,
      text: overrides.text || `CAPTION LAYER ${index}`,
      x: Math.round(compW * 0.5),
      y: Math.round(compH * (0.82 - ((index - 1) % 3) * 0.12)),
      startTime: overrides.startTime ?? 0.5,
      duration: overrides.duration ?? 6.0,
      zIndex: 25 + index,
      ...overrides,
    });
    textTracks.push(newText);
    composition.selectedTrack = 'text';
    composition.selectedTextId = newText.id;
    return newText;
  }

  function removeTextTrack(trackId) {
    saveHistoryState();
    const idx = textTracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    textTracks.splice(idx, 1);
    textTracks.forEach((t, i) => {
      t.label = `Text ${i + 1}`;
    });
    if (composition.selectedTextId === trackId) {
      composition.selectedTextId = textTracks[Math.max(0, idx - 1)]?.id || '';
      if (!composition.selectedTextId) {
        composition.selectedTrack = 'animation';
      }
    }
  }

  // --- Image Overlay Layers ---
  function populateImageTrackFile(targetImg, file) {
    if (targetImg.url && targetImg.url.startsWith('blob:')) {
      URL.revokeObjectURL(targetImg.url);
    }
    const url = URL.createObjectURL(file);
    targetImg.file = file;
    targetImg.fileName = file.name || 'overlay-image.png';
    targetImg.url = url;

    const img = new Image();
    img.onload = () => {
      targetImg.imageElement = img;
      const natW = img.naturalWidth || 400;
      const natH = img.naturalHeight || 300;
      const maxDim = 420;
      const ratio = Math.min(maxDim / natW, maxDim / natH, 1);
      targetImg.width = Math.round(natW * ratio);
      targetImg.height = Math.round(natH * ratio);
    };
    img.src = url;
  }

  function createSampleSvgImageUrl(index = 1) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0F172A"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
      </defs>
      <rect width="360" height="200" rx="18" fill="url(#g)" stroke="#F59E0B" stroke-width="4"/>
      <circle cx="70" cy="100" r="36" fill="#F59E0B" opacity="0.2"/>
      <polygon points="62,82 88,100 62,118" fill="#F59E0B"/>
      <text x="125" y="95" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="bold">VINSTOCK</text>
      <text x="125" y="122" fill="#38BDF8" font-family="monospace" font-size="13" font-weight="bold">IMAGE LAYER #${index}</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return new File([blob], `vinstock-graphic-${index}.svg`, { type: 'image/svg+xml' });
  }

  function addImageTrack(file = null, overrides = {}) {
    saveHistoryState();
    const index = imageTracks.length + 1;
    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;
    const actualFile = file || createSampleSvgImageUrl(index);

    const newImg = createImageTrackObject({
      label: `Image ${index}`,
      x: overrides.x ?? Math.round(compW * 0.12 + (index - 1) * 40),
      y: overrides.y ?? Math.round(compH * 0.14 + (index - 1) * 40),
      width: overrides.width ?? 360,
      height: overrides.height ?? 200,
      startTime: overrides.startTime ?? 0.8,
      duration: overrides.duration ?? 6.0,
      zIndex: 20 + index,
      ...overrides,
    });

    imageTracks.push(newImg);
    populateImageTrackFile(newImg, actualFile);
    composition.selectedTrack = 'image';
    composition.selectedImageId = newImg.id;
    return newImg;
  }

  function setImageFile(file, targetTrackId = null) {
    if (!file) return;
    saveHistoryState();
    const target = targetTrackId
      ? imageTracks.find((t) => t.id === targetTrackId)
      : imageTracks.find((t) => t.id === composition.selectedImageId) || imageTracks[0];
    if (!target) {
      addImageTrack(file);
      return;
    }
    populateImageTrackFile(target, file);
    composition.selectedTrack = 'image';
    composition.selectedImageId = target.id;
  }

  function removeImageTrack(trackId) {
    saveHistoryState();
    const idx = imageTracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    const [removed] = imageTracks.splice(idx, 1);
    if (removed?.url && removed.url.startsWith('blob:')) {
      URL.revokeObjectURL(removed.url);
    }
    imageTracks.forEach((t, i) => {
      t.label = `Image ${i + 1}`;
    });
    if (composition.selectedImageId === trackId) {
      composition.selectedImageId = imageTracks[Math.max(0, idx - 1)]?.id || '';
      if (!composition.selectedImageId) {
        composition.selectedTrack = 'animation';
      }
    }
  }

  // --- Video Layers ---
  function populateVideoTrackMetadata(targetTrack, file) {
    if (targetTrack.url && targetTrack.url.startsWith('blob:')) {
      URL.revokeObjectURL(targetTrack.url);
    }
    const url = URL.createObjectURL(file);
    targetTrack.file = file;
    targetTrack.fileName = file.name || 'uploaded-video.mp4';
    targetTrack.url = url;

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur =
        Number.isFinite(tempVideo.duration) && tempVideo.duration > 0 ? tempVideo.duration : 6;
      const cleanDur = Number(dur.toFixed(2));
      targetTrack.naturalDuration = cleanDur;
      targetTrack.naturalWidth = tempVideo.videoWidth || 1920;
      targetTrack.naturalHeight = tempVideo.videoHeight || 1080;
      targetTrack.trimStart = 0;
      targetTrack.trimEnd = cleanDur;
      targetTrack.duration =
        Number(Math.min(cleanDur, Math.max(1, composition.duration - targetTrack.startTime)).toFixed(2)) ||
        cleanDur;
      targetTrack.trimEnd = Number(Math.min(cleanDur, targetTrack.duration).toFixed(2));
    };
  }

  function setVideoFile(file, targetTrackId = null) {
    if (!file) return;
    let target = targetTrackId
      ? videoTracks.find((t) => t.id === targetTrackId)
      : videoTracks.find((t) => !t.url) ||
        videoTracks.find((t) => t.id === composition.selectedVideoId) ||
        videoTracks[0];

    if (!target) {
      addVideoTrack(file);
      return;
    }

    populateVideoTrackMetadata(target, file);
    composition.selectedTrack = 'video';
    composition.selectedVideoId = target.id;
  }

  function addVideoTrack(file = null, options = {}) {
    saveHistoryState();
    const index = videoTracks.length + 1;
    const isPip = index > 1 && options.pip !== false;
    const compW = Number(composition.width) || 1920;
    const compH = Number(composition.height) || 1080;

    const newTrack = createVideoTrackObject({
      label: `Video ${index}`,
      startTime: options.startTime ?? (index > 1 ? Math.min(1.5, composition.duration * 0.2) : 0),
      duration: options.duration ?? 6,
      x: options.x ?? (isPip ? Math.round(compW * 0.56) : 0),
      y: options.y ?? (isPip ? Math.round(compH * 0.52) : 0),
      width: options.width ?? (isPip ? Math.round(compW * 0.4) : compW),
      height: options.height ?? (isPip ? Math.round(compH * 0.4) : compH),
      scale: 1,
      zIndex: 10 + index,
      volume: index > 1 ? 0.6 : 0.8,
      ...options,
    });

    videoTracks.push(newTrack);
    if (file) {
      populateVideoTrackMetadata(newTrack, file);
    }

    composition.selectedTrack = 'video';
    composition.selectedVideoId = newTrack.id;
    return newTrack;
  }

  function removeVideoTrack(trackId) {
    saveHistoryState();
    if (videoTracks.length <= 1) {
      const only = videoTracks[0];
      if (only.url && only.url.startsWith('blob:')) {
        URL.revokeObjectURL(only.url);
      }
      only.file = null;
      only.fileName = '';
      only.url = '';
      return;
    }
    const idx = videoTracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    const [removed] = videoTracks.splice(idx, 1);
    if (removed?.url && removed.url.startsWith('blob:')) {
      URL.revokeObjectURL(removed.url);
    }
    videoTracks.forEach((t, i) => {
      t.label = `Video ${i + 1}`;
    });
    if (composition.selectedVideoId === trackId) {
      composition.selectedVideoId =
        videoTracks[Math.max(0, idx - 1)]?.id || videoTracks[0]?.id || '';
    }
  }

  /**
   * Splits the currently selected video track at the playhead into two independent video tracks.
   */
  function splitVideoAtPlayhead(targetTrackId = null) {
    const vItem = targetTrackId
      ? videoTracks.find((v) => v.id === targetTrackId)
      : videoTracks.find((v) => v.id === composition.selectedVideoId) || videoTracks[0];
    if (!vItem || !vItem.url) return;

    const cur = Number(composition.currentTime) || 0;
    const start = Number(vItem.startTime) || 0;
    const dur = Number(vItem.duration) || 0;
    if (cur <= start + 0.25 || cur >= start + dur - 0.25) return;

    saveHistoryState();
    const rate = clamp(Number(vItem.playbackRate) || 1, 0.25, 4);
    const firstClipDur = Number((cur - start).toFixed(2));
    const secondClipDur = Number((dur - firstClipDur).toFixed(2));
    const splitSourcePoint = Number(
      ((Number(vItem.trimStart) || 0) + firstClipDur * rate).toFixed(2)
    );
    const origTrimEnd = Number(vItem.trimEnd) || Number(vItem.naturalDuration) || 10;

    // Update Part 1
    vItem.duration = firstClipDur;
    vItem.trimEnd = splitSourcePoint;

    // Create Part 2 as a new independent video track starting right at the playhead
    const secondUrl = vItem.file ? URL.createObjectURL(vItem.file) : vItem.url;
    const part2 = createVideoTrackObject({
      label: `Video ${videoTracks.length + 1} (Split)`,
      file: vItem.file,
      fileName: vItem.fileName,
      url: secondUrl,
      naturalWidth: vItem.naturalWidth,
      naturalHeight: vItem.naturalHeight,
      naturalDuration: vItem.naturalDuration,
      trimStart: splitSourcePoint,
      trimEnd: origTrimEnd,
      startTime: Number(cur.toFixed(2)),
      duration: secondClipDur,
      x: vItem.x,
      y: vItem.y,
      width: vItem.width,
      height: vItem.height,
      scale: vItem.scale,
      rotation: vItem.rotation,
      opacity: vItem.opacity,
      zIndex: vItem.zIndex,
      playbackRate: vItem.playbackRate,
      volume: vItem.volume,
      cropTop: vItem.cropTop,
      cropRight: vItem.cropRight,
      cropBottom: vItem.cropBottom,
      cropLeft: vItem.cropLeft,
      transitionIn: 'none',
      transitionOut: vItem.transitionOut,
      transitionDuration: vItem.transitionDuration,
    });

    videoTracks.push(part2);
    composition.selectedTrack = 'video';
    composition.selectedVideoId = part2.id;
    notifySeek(composition.currentTime);
  }

  // --- Audio Layers ---
  function populateAudioTrackMetadata(targetTrack, file) {
    if (targetTrack.url && targetTrack.url.startsWith('blob:')) {
      URL.revokeObjectURL(targetTrack.url);
    }
    const url = URL.createObjectURL(file);
    targetTrack.file = file;
    targetTrack.fileName = file.name || 'uploaded-audio.mp3';
    targetTrack.url = url;

    const tempAudio = document.createElement('audio');
    tempAudio.preload = 'metadata';
    tempAudio.src = url;
    tempAudio.onloadedmetadata = () => {
      const dur =
        Number.isFinite(tempAudio.duration) && tempAudio.duration > 0 ? tempAudio.duration : 8.5;
      const cleanDur = Number(dur.toFixed(2));
      targetTrack.naturalDuration = cleanDur;
      targetTrack.trimStart = 0;
      targetTrack.trimEnd = cleanDur;
      targetTrack.duration =
        Number(Math.min(cleanDur, Math.max(1, composition.duration - targetTrack.startTime)).toFixed(2)) ||
        8;
      targetTrack.trimEnd = Number(Math.min(cleanDur, targetTrack.duration).toFixed(2));
    };
  }

  function setAudioFile(file, targetTrackId = null) {
    if (!file) return;
    let target = targetTrackId
      ? audioTracks.find((t) => t.id === targetTrackId)
      : audioTracks.find((t) => !t.url) ||
        audioTracks.find((t) => t.id === composition.selectedAudioId) ||
        audioTracks[0];

    if (!target) {
      addAudioTrack(file);
      return;
    }

    populateAudioTrackMetadata(target, file);
    composition.selectedTrack = 'audio';
    composition.selectedAudioId = target.id;
  }

  function addAudioTrack(file = null, options = {}) {
    saveHistoryState();
    const index = audioTracks.length + 1;
    const variedPeaks = DEFAULT_WAVEFORM.map((p, idx) =>
      Number(clamp(p * (0.75 + ((idx + index * 3) % 5) * 0.1), 0.18, 0.98).toFixed(2))
    );

    const newTrack = createAudioTrackObject({
      label: `Audio ${index}`,
      startTime: options.startTime ?? (index > 1 ? 1.0 : 0.5),
      duration: options.duration ?? 8.0,
      volume: options.volume ?? 0.8,
      waveformPeaks: variedPeaks,
      ...options,
    });

    audioTracks.push(newTrack);
    if (file) {
      populateAudioTrackMetadata(newTrack, file);
    }

    composition.selectedTrack = 'audio';
    composition.selectedAudioId = newTrack.id;
    return newTrack;
  }

  function removeAudioTrack(trackId) {
    saveHistoryState();
    if (audioTracks.length <= 1) {
      const only = audioTracks[0];
      if (only.url && only.url.startsWith('blob:')) {
        URL.revokeObjectURL(only.url);
      }
      only.file = null;
      only.fileName = '';
      only.url = '';
      return;
    }
    const idx = audioTracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    const [removed] = audioTracks.splice(idx, 1);
    if (removed?.url && removed.url.startsWith('blob:')) {
      URL.revokeObjectURL(removed.url);
    }
    audioTracks.forEach((t, i) => {
      t.label = `Audio ${i + 1}`;
    });
    if (composition.selectedAudioId === trackId) {
      composition.selectedAudioId =
        audioTracks[Math.max(0, idx - 1)]?.id || audioTracks[0]?.id || '';
    }
  }

  function setAudioTrim(newTrimStart, newTrimEnd) {
    const maxNat = Math.max(0.5, Number(activeAudioProxy.naturalDuration) || 10);
    const rate = clamp(Number(activeAudioProxy.playbackRate) || 1, 0.25, 4);
    const tStart = Number(clamp(Number(newTrimStart) || 0, 0, maxNat - 0.2).toFixed(2));
    const tEnd = Number(clamp(Number(newTrimEnd) || maxNat, tStart + 0.2, maxNat).toFixed(2));
    activeAudioProxy.trimStart = tStart;
    activeAudioProxy.trimEnd = tEnd;
    activeAudioProxy.duration = Number(((tEnd - tStart) / rate).toFixed(2));
    notifySeek(composition.currentTime);
  }

  function splitAudioAtPlayhead(targetTrackId = null) {
    const aItem = targetTrackId
      ? audioTracks.find((a) => a.id === targetTrackId)
      : audioTracks.find((a) => a.id === composition.selectedAudioId) || audioTracks[0];
    if (!aItem || !aItem.url) return;

    const cur = Number(composition.currentTime) || 0;
    const start = Number(aItem.startTime) || 0;
    const dur = Number(aItem.duration) || 0;
    if (cur <= start + 0.25 || cur >= start + dur - 0.25) return;

    saveHistoryState();
    const rate = clamp(Number(aItem.playbackRate) || 1, 0.25, 4);
    const firstClipDur = Number((cur - start).toFixed(2));
    const secondClipDur = Number((dur - firstClipDur).toFixed(2));
    const splitSourcePoint = Number(
      ((Number(aItem.trimStart) || 0) + firstClipDur * rate).toFixed(2)
    );
    const origTrimEnd = Number(aItem.trimEnd) || Number(aItem.naturalDuration) || 10;

    aItem.duration = firstClipDur;
    aItem.trimEnd = splitSourcePoint;

    const secondUrl = aItem.file ? URL.createObjectURL(aItem.file) : aItem.url;
    const part2 = createAudioTrackObject({
      label: `Audio ${audioTracks.length + 1} (Split)`,
      file: aItem.file,
      fileName: aItem.fileName,
      url: secondUrl,
      naturalDuration: aItem.naturalDuration,
      trimStart: splitSourcePoint,
      trimEnd: origTrimEnd,
      startTime: Number(cur.toFixed(2)),
      duration: secondClipDur,
      volume: aItem.volume,
      playbackRate: aItem.playbackRate,
      fadeIn: 0,
      fadeOut: aItem.fadeOut,
      muted: aItem.muted,
      waveformPeaks: [...(aItem.waveformPeaks || DEFAULT_WAVEFORM)],
    });

    audioTracks.push(part2);
    composition.selectedTrack = 'audio';
    composition.selectedAudioId = part2.id;
    notifySeek(composition.currentTime);
  }

  function setVideoTrim(newTrimStart, newTrimEnd) {
    const maxNat = Math.max(0.5, Number(activeVideoProxy.naturalDuration) || 10);
    const rate = clamp(Number(activeVideoProxy.playbackRate) || 1, 0.25, 4);
    const tStart = Number(clamp(Number(newTrimStart) || 0, 0, maxNat - 0.2).toFixed(2));
    const tEnd = Number(clamp(Number(newTrimEnd) || maxNat, tStart + 0.2, maxNat).toFixed(2));
    activeVideoProxy.trimStart = tStart;
    activeVideoProxy.trimEnd = tEnd;
    activeVideoProxy.duration = Number(((tEnd - tStart) / rate).toFixed(2));
    notifySeek(composition.currentTime);
  }

  function trimVideoStartToPlayhead() {
    const cur = Number(composition.currentTime) || 0;
    const vStart = Number(activeVideoProxy.startTime) || 0;
    const vDur = Number(activeVideoProxy.duration) || 5;
    if (cur <= vStart || cur >= vStart + vDur - 0.2) return;

    saveHistoryState();
    const rate = clamp(Number(activeVideoProxy.playbackRate) || 1, 0.25, 4);
    const delta = Number((cur - vStart).toFixed(2));
    const maxNat = Math.max(0.5, Number(activeVideoProxy.naturalDuration) || 10);
    const nextTrimStart = clamp(
      (Number(activeVideoProxy.trimStart) || 0) + delta * rate,
      0,
      maxNat - 0.2
    );
    const nextTrimEnd = Math.max(nextTrimStart + 0.2, Number(activeVideoProxy.trimEnd) || maxNat);

    activeVideoProxy.startTime = Number(cur.toFixed(2));
    activeVideoProxy.trimStart = Number(nextTrimStart.toFixed(2));
    activeVideoProxy.trimEnd = Number(nextTrimEnd.toFixed(2));
    activeVideoProxy.duration = Number(
      ((activeVideoProxy.trimEnd - activeVideoProxy.trimStart) / rate).toFixed(2)
    );
    selectTrack('video', activeVideoProxy.id);
    notifySeek(composition.currentTime);
  }

  function trimVideoEndToPlayhead() {
    const cur = Number(composition.currentTime) || 0;
    const vStart = Number(activeVideoProxy.startTime) || 0;
    const vDur = Number(activeVideoProxy.duration) || 5;
    if (cur <= vStart + 0.2 || cur > vStart + vDur) return;

    saveHistoryState();
    const rate = clamp(Number(activeVideoProxy.playbackRate) || 1, 0.25, 4);
    const newDuration = Number((cur - vStart).toFixed(2));
    const maxNat = Math.max(0.5, Number(activeVideoProxy.naturalDuration) || 10);
    const tStart = Number(activeVideoProxy.trimStart) || 0;
    const nextTrimEnd = clamp(tStart + newDuration * rate, tStart + 0.2, maxNat);

    activeVideoProxy.trimEnd = Number(nextTrimEnd.toFixed(2));
    activeVideoProxy.duration = Number(((activeVideoProxy.trimEnd - tStart) / rate).toFixed(2));
    selectTrack('video', activeVideoProxy.id);
    notifySeek(composition.currentTime);
  }

  function resetVideoTrim() {
    saveHistoryState();
    const maxNat = Math.max(0.5, Number(activeVideoProxy.naturalDuration) || 10);
    const rate = clamp(Number(activeVideoProxy.playbackRate) || 1, 0.25, 4);
    activeVideoProxy.trimStart = 0;
    activeVideoProxy.trimEnd = Number(maxNat.toFixed(2));
    activeVideoProxy.duration = Number(
      Math.min(maxNat / rate, Math.max(0.5, composition.duration - activeVideoProxy.startTime)).toFixed(2)
    );
    notifySeek(composition.currentTime);
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
    animationTrack: activeAnimationProxy,
    animationTracks,
    videoTrack: activeVideoProxy,
    videoTracks,
    audioTrack: activeAudioProxy,
    audioTracks,
    textTrack: activeTextProxy,
    textTracks,
    imageTrack: activeImageProxy,
    imageTracks,
    sortedVisualLayers,
    animations: VINSTOCK_ANIMATIONS,
    aspectPresets: ASPECT_RATIO_PRESETS,
    transitionTypes: TRANSITION_TYPES,
    isVideoActive,
    isVideoTrackActiveAt,
    isTrackActiveAt,
    videoLocalTime,
    isAnimationActive,
    animationProgress,
    isAudioActive,
    isAudioTrackActiveAt,
    audioLocalTime,
    evaluateLayerSpatialState,
    play,
    pause,
    togglePlay,
    seekTo,
    restart,
    onSeek,
    selectTrack,
    moveLayerZIndex,
    addKeyframeAtPlayhead,
    removeKeyframe,
    clearKeyframes,
    saveHistoryState,
    undo,
    redo,
    canUndo,
    canRedo,
    setScreenSize,
    setAspectRatioPreset,
    setZoom,
    stepZoom,
    addAnimationTrack,
    removeAnimationTrack,
    selectAnimationPreset,
    addTextTrack,
    removeTextTrack,
    addImageTrack,
    setImageFile,
    removeImageTrack,
    setVideoFile,
    addVideoTrack,
    removeVideoTrack,
    splitVideoAtPlayhead,
    setVideoTrim,
    trimVideoStartToPlayhead,
    trimVideoEndToPlayhead,
    resetVideoTrim,
    setAudioFile,
    addAudioTrack,
    removeAudioTrack,
    setAudioTrim,
    splitAudioAtPlayhead,
    formatTimecode,
  };
}
