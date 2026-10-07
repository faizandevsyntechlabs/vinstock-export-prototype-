<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';
import { useMediaSync } from '../../composables/useMediaSync.js';
import AnimatedTitle from './animations/AnimatedTitle.vue';
import LowerThird from './animations/LowerThird.vue';
import ShapeReveal from './animations/ShapeReveal.vue';
import AnimatedBadge from './animations/AnimatedBadge.vue';

const {
  composition,
  videoTrack,
  animationTrack,
  audioTrack,
  isVideoActive,
  isAnimationActive,
  animationProgress,
  selectTrack,
} = useMotionTimeline();

const { registerVideoElement, registerAudioElement } = useMediaSync();

const viewportContainerRef = ref(null);
const videoElementRef = ref(null);
const audioElementRef = ref(null);

const canvasScale = ref(0.45);
let resizeObserver = null;

function updateCanvasScale() {
  const container = viewportContainerRef.value;
  if (!container) return;
  const pad = 40;
  const availW = Math.max(320, container.clientWidth - pad);
  const availH = Math.max(180, container.clientHeight - pad);
  const scaleX = availW / 1920;
  const scaleY = availH / 1080;
  canvasScale.value = Math.min(scaleX, scaleY, 1);
}

onMounted(() => {
  if (videoElementRef.value) {
    registerVideoElement(videoElementRef.value);
  }
  if (audioElementRef.value) {
    registerAudioElement(audioElementRef.value);
  }
  updateCanvasScale();
  if (typeof ResizeObserver !== 'undefined' && viewportContainerRef.value) {
    resizeObserver = new ResizeObserver(() => updateCanvasScale());
    resizeObserver.observe(viewportContainerRef.value);
  }
  window.addEventListener('resize', updateCanvasScale);
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', updateCanvasScale);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});

const activeAnimationComponent = computed(() => {
  switch (animationTrack.animationId) {
    case 'animated-title':
      return AnimatedTitle;
    case 'lower-third':
      return LowerThird;
    case 'shape-reveal':
      return ShapeReveal;
    case 'animated-badge':
      return AnimatedBadge;
    default:
      return AnimatedTitle;
  }
});

const scaledStageStyle = computed(() => {
  const w = Math.round(1920 * canvasScale.value);
  const h = Math.round(1080 * canvasScale.value);
  return {
    width: `${w}px`,
    height: `${h}px`,
  };
});

const logicalStageStyle = computed(() => ({
  width: '1920px',
  height: '1080px',
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'top left',
}));

const videoLayerStyle = computed(() => {
  const s = Number(videoTrack.scale) || 1;
  const w = (Number(videoTrack.width) || 1920) * s;
  const h = (Number(videoTrack.height) || 1080) * s;
  return {
    left: `${videoTrack.x}px`,
    top: `${videoTrack.y}px`,
    width: `${w}px`,
    height: `${h}px`,
  };
});

const animationLayerStyle = computed(() => ({
  left: `${animationTrack.x}px`,
  top: `${animationTrack.y}px`,
}));

// Direct interactive dragging & resizing on the 1920x1080 logical canvas
const dragState = ref(null);

function startVideoDrag(e) {
  e.stopPropagation();
  selectTrack('video');
  dragState.value = {
    type: 'video-move',
    startX: e.clientX,
    startY: e.clientY,
    initialX: Number(videoTrack.x) || 0,
    initialY: Number(videoTrack.y) || 0,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startVideoResize(e) {
  e.stopPropagation();
  selectTrack('video');
  dragState.value = {
    type: 'video-resize',
    startX: e.clientX,
    startY: e.clientY,
    initialW: Number(videoTrack.width) || 1920,
    initialH: Number(videoTrack.height) || 1080,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startAnimationDrag(e) {
  e.stopPropagation();
  selectTrack('animation');
  dragState.value = {
    type: 'animation-move',
    startX: e.clientX,
    startY: e.clientY,
    initialX: Number(animationTrack.x) || 960,
    initialY: Number(animationTrack.y) || 540,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!dragState.value) return;
  const scale = canvasScale.value || 0.5;
  const dx = (e.clientX - dragState.value.startX) / scale;
  const dy = (e.clientY - dragState.value.startY) / scale;

  if (dragState.value.type === 'video-move') {
    videoTrack.x = Math.round(clamp(dragState.value.initialX + dx, -1200, 1800));
    videoTrack.y = Math.round(clamp(dragState.value.initialY + dy, -900, 1000));
  } else if (dragState.value.type === 'video-resize') {
    const aspect = (dragState.value.initialW || 16) / (dragState.value.initialH || 9);
    const nextW = Math.round(clamp(dragState.value.initialW + dx, 240, 3840));
    videoTrack.width = nextW;
    videoTrack.height = Math.round(nextW / aspect);
  } else if (dragState.value.type === 'animation-move') {
    animationTrack.x = Math.round(clamp(dragState.value.initialX + dx, 60, 1860));
    animationTrack.y = Math.round(clamp(dragState.value.initialY + dy, 60, 1020));
  }
}

function onPointerUp() {
  dragState.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}
</script>

<template>
  <div
    ref="viewportContainerRef"
    class="relative flex-1 flex flex-col items-center justify-center bg-[#090B0E] overflow-hidden select-none p-4"
  >
    <!-- Top Canvas Status Bar (Unboxed metadata with separators) -->
    <div class="w-full flex items-center justify-between px-2 pb-2.5 text-xs text-slate-400">
      <div class="flex items-center gap-2 font-mono">
        <span class="text-slate-200 font-medium">1920 × 1080</span>
        <span aria-hidden="true">·</span>
        <span>16:9 Aspect</span>
        <span aria-hidden="true">·</span>
        <span>Zoom {{ Math.round(canvasScale * 100) }}%</span>
      </div>
      <div class="flex items-center gap-2 font-mono text-slate-400">
        <span>Drag elements on canvas to reposition</span>
      </div>
    </div>

    <!-- Responsive 16:9 Stage Wrapper -->
    <div
      class="relative shadow-2xl border border-[#222733] bg-[#0B0D11] overflow-hidden rounded-md"
      :style="scaledStageStyle"
    >
      <!-- Logical 1920x1080 Composition Coordinate Space -->
      <div class="relative overflow-hidden bg-[#0B0D11]" :style="logicalStageStyle">
        <!-- Subtle Studio Safe-Area Guides -->
        <div
          class="pointer-events-none absolute inset-[54px] border border-dashed border-white/[0.05] rounded"
        />

        <!-- LAYER 1: Uploaded Video Track -->
        <div
          v-show="videoTrack.url && isVideoActive"
          class="absolute cursor-move group"
          :class="{
            'ring-2 ring-sky-400/90': composition.selectedTrack === 'video',
            'hover:ring-1 hover:ring-sky-400/50': composition.selectedTrack !== 'video',
          }"
          :style="videoLayerStyle"
          @pointerdown="startVideoDrag"
        >
          <video
            ref="videoElementRef"
            :src="videoTrack.url"
            class="w-full h-full object-cover pointer-events-none block"
            playsinline
            preload="auto"
          />

          <!-- Bottom-right interactive resize handle when Video is selected -->
          <div
            v-if="composition.selectedTrack === 'video'"
            class="absolute -bottom-3 -right-3 w-7 h-7 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg flex items-center justify-center"
            title="Drag to resize video layer"
            @pointerdown.stop="startVideoResize"
          >
            <div class="w-2 h-2 border-r-2 border-b-2 border-slate-950" />
          </div>
        </div>

        <!-- Empty Video Hint when no video uploaded or playhead outside video window -->
        <div
          v-if="!videoTrack.url"
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-500"
        >
          <p class="font-mono text-xl tracking-wide text-slate-500/70">
            No video layer uploaded · Upload MP4/WebM or Load Sample Media
          </p>
        </div>

        <!-- LAYER 2: VINSTOCK HTML/Vue Animation Overlay -->
        <div
          v-if="isAnimationActive"
          class="absolute z-20 cursor-move"
          :style="animationLayerStyle"
          @pointerdown="startAnimationDrag"
        >
          <!-- Selection bounding frame indicator -->
          <div
            class="relative rounded-xl transition-shadow"
            :class="{
              'ring-2 ring-amber-400/80 ring-offset-4 ring-offset-transparent':
                composition.selectedTrack === 'animation',
            }"
          >
            <component
              :is="activeAnimationComponent"
              :progress="animationProgress"
              :duration="animationTrack.duration"
              :speed="animationTrack.animationSpeed"
              :scale="animationTrack.scale"
              :custom-properties="animationTrack.customProperties"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- LAYER 3: Synchronized Master Audio Element (non-visual) -->
    <audio
      ref="audioElementRef"
      :src="audioTrack.url"
      preload="auto"
      class="hidden"
    />
  </div>
</template>
