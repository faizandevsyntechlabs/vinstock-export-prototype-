<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
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
  aspectPresets,
  isVideoActive,
  isAnimationActive,
  animationProgress,
  selectTrack,
  setScreenSize,
  setAspectRatioPreset,
  setZoom,
  stepZoom,
} = useMotionTimeline();

const { registerVideoElement, registerAudioElement } = useMediaSync();

const viewportContainerRef = ref(null);
const videoElementRef = ref(null);
const audioElementRef = ref(null);

const fitScale = ref(0.45);
let resizeObserver = null;

function calculateFitScale() {
  const container = viewportContainerRef.value;
  if (!container) return;
  const padX = 56;
  const padY = 76;
  const availW = Math.max(240, container.clientWidth - padX);
  const availH = Math.max(160, container.clientHeight - padY);
  const compW = Math.max(320, Number(composition.width) || 1920);
  const compH = Math.max(240, Number(composition.height) || 1080);
  const scaleX = availW / compW;
  const scaleY = availH / compH;
  const nextFit = clamp(Math.min(scaleX, scaleY, 1.2), 0.12, 1.5);
  fitScale.value = nextFit;
  if (composition.zoomMode === 'fit') {
    composition.zoomLevel = Number(nextFit.toFixed(2));
  }
}

const effectiveScale = computed(() => {
  if (composition.zoomMode === 'fit') {
    return fitScale.value;
  }
  return clamp(Number(composition.zoomLevel) || 0.5, 0.15, 2.0);
});

watch(
  () => [composition.width, composition.height, composition.zoomMode],
  () => {
    calculateFitScale();
  }
);

onMounted(() => {
  if (videoElementRef.value) {
    registerVideoElement(videoElementRef.value);
  }
  if (audioElementRef.value) {
    registerAudioElement(audioElementRef.value);
  }
  calculateFitScale();
  if (typeof ResizeObserver !== 'undefined' && viewportContainerRef.value) {
    resizeObserver = new ResizeObserver(() => calculateFitScale());
    resizeObserver.observe(viewportContainerRef.value);
  }
  window.addEventListener('resize', calculateFitScale);
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', calculateFitScale);
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
  const w = Math.round((Number(composition.width) || 1920) * effectiveScale.value);
  const h = Math.round((Number(composition.height) || 1080) * effectiveScale.value);
  return {
    width: `${w}px`,
    height: `${h}px`,
  };
});

const logicalStageStyle = computed(() => ({
  width: `${Number(composition.width) || 1920}px`,
  height: `${Number(composition.height) || 1080}px`,
  transform: `scale(${effectiveScale.value})`,
  transformOrigin: 'top left',
}));

const videoLayerStyle = computed(() => {
  const s = Number(videoTrack.scale) || 1;
  const w = (Number(videoTrack.width) || 1920) * s;
  const h = (Number(videoTrack.height) || 1080) * s;
  return {
    left: `${Number(videoTrack.x) || 0}px`,
    top: `${Number(videoTrack.y) || 0}px`,
    width: `${w}px`,
    height: `${h}px`,
  };
});

const animationLayerStyle = computed(() => ({
  left: `${Number(animationTrack.x) || 960}px`,
  top: `${Number(animationTrack.y) || 540}px`,
}));

function fitVideoToScreen() {
  videoTrack.x = 0;
  videoTrack.y = 0;
  videoTrack.width = Number(composition.width) || 1920;
  videoTrack.height = Number(composition.height) || 1080;
  videoTrack.scale = 1;
  selectTrack('video');
}

function onWheelZoom(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    stepZoom(delta);
  }
}

// Interactive dragging & 8-way extending/resizing of Video Container, Animation, and Screen Frame
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

/**
 * 8-Directional Video Container Resize/Extend by Mouse:
 * directions: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
 */
function startVideoExtend(e, direction) {
  e.stopPropagation();
  selectTrack('video');
  const s = Number(videoTrack.scale) || 1;
  // Normalize scale into width/height so edge dragging behaves 1:1 in logical pixels
  const currentW = Math.round((Number(videoTrack.width) || 1920) * s);
  const currentH = Math.round((Number(videoTrack.height) || 1080) * s);
  videoTrack.width = currentW;
  videoTrack.height = currentH;
  videoTrack.scale = 1;

  dragState.value = {
    type: 'video-extend',
    direction,
    startX: e.clientX,
    startY: e.clientY,
    initialX: Number(videoTrack.x) || 0,
    initialY: Number(videoTrack.y) || 0,
    initialW: currentW,
    initialH: currentH,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startScreenExtend(e, direction) {
  e.stopPropagation();
  dragState.value = {
    type: 'screen-extend',
    direction,
    startX: e.clientX,
    startY: e.clientY,
    initialW: Number(composition.width) || 1920,
    initialH: Number(composition.height) || 1080,
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
  const scale = effectiveScale.value || 0.5;
  const dx = (e.clientX - dragState.value.startX) / scale;
  const dy = (e.clientY - dragState.value.startY) / scale;

  if (dragState.value.type === 'video-move') {
    videoTrack.x = Math.round(clamp(dragState.value.initialX + dx, -2400, 3200));
    videoTrack.y = Math.round(clamp(dragState.value.initialY + dy, -2000, 2400));
  } else if (dragState.value.type === 'video-extend') {
    const dir = dragState.value.direction;
    let nextX = dragState.value.initialX;
    let nextY = dragState.value.initialY;
    let nextW = dragState.value.initialW;
    let nextH = dragState.value.initialH;
    const minSize = 120;

    if (dir.includes('e')) {
      nextW = Math.round(clamp(dragState.value.initialW + dx, minSize, 5000));
    }
    if (dir.includes('s')) {
      nextH = Math.round(clamp(dragState.value.initialH + dy, minSize, 5000));
    }
    if (dir.includes('w')) {
      const possibleW = dragState.value.initialW - dx;
      if (possibleW >= minSize) {
        nextW = Math.round(possibleW);
        nextX = Math.round(dragState.value.initialX + dx);
      }
    }
    if (dir.includes('n')) {
      const possibleH = dragState.value.initialH - dy;
      if (possibleH >= minSize) {
        nextH = Math.round(possibleH);
        nextY = Math.round(dragState.value.initialY + dy);
      }
    }

    videoTrack.x = nextX;
    videoTrack.y = nextY;
    videoTrack.width = nextW;
    videoTrack.height = nextH;
  } else if (dragState.value.type === 'screen-extend') {
    const dir = dragState.value.direction;
    let nextW = dragState.value.initialW;
    let nextH = dragState.value.initialH;
    if (dir.includes('e')) {
      nextW = Math.round(clamp(dragState.value.initialW + dx * 2, 480, 3840));
    }
    if (dir.includes('s')) {
      nextH = Math.round(clamp(dragState.value.initialH + dy * 2, 360, 2160));
    }
    setScreenSize(nextW, nextH);
  } else if (dragState.value.type === 'animation-move') {
    const maxW = Number(composition.width) || 1920;
    const maxH = Number(composition.height) || 1080;
    animationTrack.x = Math.round(clamp(dragState.value.initialX + dx, 40, maxW - 40));
    animationTrack.y = Math.round(clamp(dragState.value.initialY + dy, 40, maxH - 40));
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
    class="relative flex-1 flex flex-col bg-[#090B0E] overflow-hidden select-none"
    @wheel="onWheelZoom"
  >
    <!-- Functional Canvas Control Bar: Screen Size, Aspect Ratio, Zoom & Fit Video -->
    <div
      class="w-full px-4 py-2 bg-[#0E1117] border-b border-[#222733] flex flex-wrap items-center justify-between gap-3 text-xs z-30 shrink-0"
    >
      <!-- Left: Screen Size (W × H) & Aspect Ratio Presets -->
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Aspect Ratio Selector Buttons -->
        <div class="flex items-center gap-1 bg-[#0B0D11] p-1 rounded-lg border border-[#222733]">
          <button
            v-for="preset in aspectPresets"
            :key="preset.id"
            type="button"
            class="px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
            :class="
              composition.aspectRatio === preset.id
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            "
            :title="`${preset.name} (${preset.width}×${preset.height})`"
            @click="setAspectRatioPreset(preset.id)"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Editable Screen Width × Height Inputs -->
        <div class="flex items-center gap-1.5 font-mono text-xs bg-[#0B0D11] px-2.5 py-1 rounded-lg border border-[#222733]">
          <span class="text-slate-400 text-[11px]">Screen:</span>
          <input
            type="number"
            min="320"
            max="3840"
            step="20"
            :value="composition.width"
            class="w-14 bg-transparent text-white text-center focus:outline-none focus:text-amber-400"
            title="Screen Width (px)"
            @change="setScreenSize($event.target.value, composition.height)"
          />
          <span class="text-slate-500">×</span>
          <input
            type="number"
            min="240"
            max="2160"
            step="20"
            :value="composition.height"
            class="w-14 bg-transparent text-white text-center focus:outline-none focus:text-amber-400"
            title="Screen Height (px)"
            @change="setScreenSize(composition.width, $event.target.value)"
          />
          <span class="text-slate-500 text-[10px]">px</span>
        </div>

        <!-- Fit Video Container to Screen Button -->
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg bg-[#151922] hover:bg-[#1E2430] text-sky-300 border border-[#242A38] font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap"
          title="Stretch video container to match current screen dimensions"
          @click="fitVideoToScreen"
        >
          Fit Video to Screen
        </button>
      </div>

      <!-- Right: Functional Zoom Controls -->
      <div class="flex items-center gap-2 font-mono">
        <div class="flex items-center gap-1 bg-[#0B0D11] p-1 rounded-lg border border-[#222733]">
          <button
            type="button"
            class="px-2 py-0.5 rounded text-slate-300 hover:bg-[#181C26] hover:text-white cursor-pointer"
            title="Zoom Out"
            @click="stepZoom(-0.1)"
          >
            −
          </button>

          <input
            type="range"
            min="0.15"
            max="1.5"
            step="0.05"
            :value="effectiveScale"
            class="w-20 cursor-pointer"
            title="Zoom Level"
            @input="setZoom($event.target.value)"
          />

          <span class="w-11 text-center text-[11px] text-slate-200">
            {{ Math.round(effectiveScale * 100) }}%
          </span>

          <button
            type="button"
            class="px-2 py-0.5 rounded text-slate-300 hover:bg-[#181C26] hover:text-white cursor-pointer"
            title="Zoom In"
            @click="stepZoom(0.1)"
          >
            +
          </button>

          <button
            type="button"
            class="px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
            :class="
              composition.zoomMode === 'fit'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            "
            title="Auto-fit canvas to viewport"
            @click="setZoom('fit')"
          >
            Fit
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable / Zoomable Stage Viewport -->
    <div class="relative flex-1 flex items-center justify-center overflow-auto p-6">
      <!-- Responsive Stage Frame Wrapper with Mouse Screen-Resize Handles -->
      <div
        class="relative shadow-2xl border border-[#262C3A] bg-[#0B0D11] rounded-md shrink-0 group/stage"
        :style="scaledStageStyle"
      >
        <!-- Outer Stage Right Edge Handle (Extend Screen Width by Mouse) -->
        <div
          class="absolute top-0 bottom-0 -right-2.5 w-2.5 cursor-ew-resize z-40 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity"
          title="Drag to extend screen width"
          @pointerdown="startScreenExtend($event, 'e')"
        >
          <div class="w-1 h-10 rounded-full bg-amber-400/80" />
        </div>

        <!-- Outer Stage Bottom Edge Handle (Extend Screen Height by Mouse) -->
        <div
          class="absolute left-0 right-0 -bottom-2.5 h-2.5 cursor-ns-resize z-40 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity"
          title="Drag to extend screen height"
          @pointerdown="startScreenExtend($event, 's')"
        >
          <div class="h-1 w-10 rounded-full bg-amber-400/80" />
        </div>

        <!-- Outer Stage Bottom-Right Corner Handle (Extend Screen Size by Mouse) -->
        <div
          class="absolute -bottom-3 -right-3 w-4 h-4 cursor-nwse-resize z-40 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity"
          title="Drag corner to resize screen dimensions"
          @pointerdown="startScreenExtend($event, 'se')"
        >
          <div class="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-slate-950" />
        </div>

        <!-- Logical Composition Coordinate Space -->
        <div class="relative overflow-hidden bg-[#0B0D11] rounded-md" :style="logicalStageStyle">
          <!-- Subtle Studio Safe-Area Guides -->
          <div
            class="pointer-events-none absolute inset-[4%] border border-dashed border-white/[0.06] rounded"
          />

          <!-- LAYER 1: Uploaded Video Track with 8-Directional Mouse Extend Handles -->
          <div
            v-show="videoTrack.url && isVideoActive"
            class="absolute cursor-move group/video"
            :class="{
              'ring-2 ring-sky-400': composition.selectedTrack === 'video',
              'hover:ring-2 hover:ring-sky-400/60': composition.selectedTrack !== 'video',
            }"
            :style="videoLayerStyle"
            @pointerdown="startVideoDrag"
          >
            <video
              ref="videoElementRef"
              :src="videoTrack.url"
              class="w-full h-full object-fill pointer-events-none block"
              playsinline
              preload="auto"
            />

            <!-- Video Dimensions Badge on Hover / Selection -->
            <div
              v-if="composition.selectedTrack === 'video'"
              class="pointer-events-none absolute top-3 left-3 px-3 py-1 rounded bg-slate-950/85 border border-sky-400/50 text-sky-300 font-mono text-lg shadow"
            >
              Video: {{ Math.round(videoTrack.width * (videoTrack.scale || 1)) }} ×
              {{ Math.round(videoTrack.height * (videoTrack.scale || 1)) }}px (Drag edges/corners to extend)
            </div>

            <!-- 8-Directional Mouse Extend Handles for Video Container -->
            <!-- East (Right Edge) -->
            <div
              class="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-20 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ew-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
              title="Drag right edge to extend video width"
              @pointerdown.stop="startVideoExtend($event, 'e')"
            />
            <!-- West (Left Edge) -->
            <div
              class="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-20 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ew-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
              title="Drag left edge to extend video width"
              @pointerdown.stop="startVideoExtend($event, 'w')"
            />
            <!-- South (Bottom Edge) -->
            <div
              class="absolute left-1/2 -bottom-3 -translate-x-1/2 w-20 h-6 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
              title="Drag bottom edge to extend video height"
              @pointerdown.stop="startVideoExtend($event, 's')"
            />
            <!-- North (Top Edge) -->
            <div
              class="absolute left-1/2 -top-3 -translate-x-1/2 w-20 h-6 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
              title="Drag top edge to extend video height"
              @pointerdown.stop="startVideoExtend($event, 'n')"
            />

            <!-- South-East (Bottom-Right Corner) -->
            <div
              class="absolute -bottom-4 -right-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg hover:scale-110 transition-transform"
              title="Drag corner to extend video container"
              @pointerdown.stop="startVideoExtend($event, 'se')"
            />
            <!-- South-West (Bottom-Left Corner) -->
            <div
              class="absolute -bottom-4 -left-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nesw-resize shadow-lg hover:scale-110 transition-transform"
              title="Drag corner to extend video container"
              @pointerdown.stop="startVideoExtend($event, 'sw')"
            />
            <!-- North-East (Top-Right Corner) -->
            <div
              class="absolute -top-4 -right-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nesw-resize shadow-lg hover:scale-110 transition-transform"
              title="Drag corner to extend video container"
              @pointerdown.stop="startVideoExtend($event, 'ne')"
            />
            <!-- North-West (Top-Left Corner) -->
            <div
              class="absolute -top-4 -left-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg hover:scale-110 transition-transform"
              title="Drag corner to extend video container"
              @pointerdown.stop="startVideoExtend($event, 'nw')"
            />
          </div>

          <!-- Empty Video Hint when no video uploaded -->
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
