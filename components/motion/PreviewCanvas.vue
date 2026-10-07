<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  useMotionTimeline,
  isTrackActiveAt,
  evaluateLayerSpatialState,
  clamp,
} from '../../composables/useMotionTimeline.js';
import { useMediaSync } from '../../composables/useMediaSync.js';
import AnimatedTitle from './animations/AnimatedTitle.vue';
import LowerThird from './animations/LowerThird.vue';
import ShapeReveal from './animations/ShapeReveal.vue';
import AnimatedBadge from './animations/AnimatedBadge.vue';

const {
  composition,
  videoTrack,
  videoTracks,
  animationTracks,
  textTracks,
  imageTracks,
  audioTracks,
  aspectPresets,
  selectTrack,
  saveHistoryState,
  setScreenSize,
  setAspectRatioPreset,
  setZoom,
  stepZoom,
} = useMotionTimeline();

const { registerVideoElement, registerAudioElement } = useMediaSync();

const viewportContainerRef = ref(null);

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

function resolveAnimationComponent(animationId) {
  switch (animationId) {
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
}

function getAnimationItemProgress(aItem) {
  const dur = Number(aItem.duration) || 0;
  if (dur <= 0) return 0;
  const cur = Number(composition.currentTime) || 0;
  const start = Number(aItem.startTime) || 0;
  return clamp((cur - start) / dur, 0, 1);
}

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

function getCropClipPath(item) {
  const top = clamp(Number(item.cropTop) || 0, 0, 45);
  const right = clamp(Number(item.cropRight) || 0, 0, 45);
  const bottom = clamp(Number(item.cropBottom) || 0, 0, 45);
  const left = clamp(Number(item.cropLeft) || 0, 0, 45);
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return 'none';
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}

function getVideoLayerStyle(vItem) {
  const spatial = evaluateLayerSpatialState(vItem, composition.currentTime);
  const w = (Number(vItem.width) || 1920) * spatial.scale;
  const h = (Number(vItem.height) || 1080) * spatial.scale;
  return {
    left: `${spatial.x}px`,
    top: `${spatial.y}px`,
    width: `${w}px`,
    height: `${h}px`,
    opacity: spatial.opacity,
    transform: spatial.rotation ? `rotate(${spatial.rotation}deg)` : 'none',
    transformOrigin: 'center center',
    zIndex: Number(vItem.zIndex) || 10,
  };
}

function getImageLayerStyle(imgItem) {
  const spatial = evaluateLayerSpatialState(imgItem, composition.currentTime);
  const w = (Number(imgItem.width) || 320) * spatial.scale;
  const h = (Number(imgItem.height) || 180) * spatial.scale;
  return {
    left: `${spatial.x}px`,
    top: `${spatial.y}px`,
    width: `${w}px`,
    height: `${h}px`,
    opacity: spatial.opacity,
    transform: spatial.rotation ? `rotate(${spatial.rotation}deg)` : 'none',
    transformOrigin: 'center center',
    zIndex: Number(imgItem.zIndex) || 20,
  };
}

function getTextLayerStyle(tItem) {
  const spatial = evaluateLayerSpatialState(tItem, composition.currentTime);
  return {
    left: `${spatial.x}px`,
    top: `${spatial.y}px`,
    opacity: spatial.opacity,
    transform: `translate(-50%, -50%) scale(${spatial.scale}) rotate(${spatial.rotation}deg)`,
    transformOrigin: 'center center',
    zIndex: Number(tItem.zIndex) || 25,
  };
}

function getAnimationLayerStyle(aItem) {
  const spatial = evaluateLayerSpatialState(aItem, composition.currentTime);
  return {
    left: `${spatial.x}px`,
    top: `${spatial.y}px`,
    opacity: spatial.opacity,
    transform: spatial.rotation ? `rotate(${spatial.rotation}deg)` : 'none',
    transformOrigin: 'center center',
    zIndex: Number(aItem.zIndex) || 30,
  };
}

function isVideoSelected(vItem) {
  return composition.selectedTrack === 'video' && composition.selectedVideoId === vItem.id;
}

function isAnimationSelected(aItem) {
  return composition.selectedTrack === 'animation' && composition.selectedAnimationId === aItem.id;
}

function isTextSelected(tItem) {
  return composition.selectedTrack === 'text' && composition.selectedTextId === tItem.id;
}

function isImageSelected(imgItem) {
  return composition.selectedTrack === 'image' && composition.selectedImageId === imgItem.id;
}

const hasAnyVideoUploaded = computed(() => videoTracks.some((v) => Boolean(v.url)));

function fitVideoToScreen() {
  saveHistoryState();
  videoTrack.x = 0;
  videoTrack.y = 0;
  videoTrack.width = Number(composition.width) || 1920;
  videoTrack.height = Number(composition.height) || 1080;
  videoTrack.scale = 1;
  videoTrack.rotation = 0;
  selectTrack('video', videoTrack.id);
}

function onWheelZoom(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    stepZoom(delta);
  }
}

// Interactive dragging & 8-way extending/resizing of Video, Image, Text, Animation, and Screen Frame
const dragState = ref(null);

function startLayerDrag(e, trackType, targetItem) {
  e.stopPropagation();
  saveHistoryState();
  selectTrack(trackType, targetItem.id);
  dragState.value = {
    type: 'layer-move',
    trackType,
    targetTrack: targetItem,
    startX: e.clientX,
    startY: e.clientY,
    initialX: Number(targetItem.x) || 0,
    initialY: Number(targetItem.y) || 0,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startBoxExtend(e, trackType, targetItem, direction) {
  e.stopPropagation();
  saveHistoryState();
  selectTrack(trackType, targetItem.id);
  const s = Number(targetItem.scale) || 1;
  const currentW = Math.round((Number(targetItem.width) || 320) * s);
  const currentH = Math.round((Number(targetItem.height) || 180) * s);
  targetItem.width = currentW;
  targetItem.height = currentH;
  targetItem.scale = 1;

  dragState.value = {
    type: 'box-extend',
    targetTrack: targetItem,
    direction,
    startX: e.clientX,
    startY: e.clientY,
    initialX: Number(targetItem.x) || 0,
    initialY: Number(targetItem.y) || 0,
    initialW: currentW,
    initialH: currentH,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startScreenExtend(e, direction) {
  e.stopPropagation();
  saveHistoryState();
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

function onPointerMove(e) {
  if (!dragState.value) return;
  const scale = effectiveScale.value || 0.5;
  const dx = (e.clientX - dragState.value.startX) / scale;
  const dy = (e.clientY - dragState.value.startY) / scale;

  if (dragState.value.type === 'layer-move') {
    const target = dragState.value.targetTrack;
    if (!target) return;
    target.x = Math.round(clamp(dragState.value.initialX + dx, -2400, 3840));
    target.y = Math.round(clamp(dragState.value.initialY + dy, -2000, 2400));
  } else if (dragState.value.type === 'box-extend') {
    const target = dragState.value.targetTrack;
    if (!target) return;
    const dir = dragState.value.direction;
    let nextX = dragState.value.initialX;
    let nextY = dragState.value.initialY;
    let nextW = dragState.value.initialW;
    let nextH = dragState.value.initialH;
    const minSize = 80;

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

    target.x = nextX;
    target.y = nextY;
    target.width = nextW;
    target.height = nextH;
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

        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg bg-[#151922] hover:bg-[#1E2430] text-sky-300 border border-[#242A38] font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap"
          title="Stretch selected video container to match current screen dimensions"
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
      <div
        class="relative shadow-2xl border border-[#262C3A] bg-[#0B0D11] rounded-md shrink-0 group/stage"
        :style="scaledStageStyle"
      >
        <!-- Outer Stage Right Edge Handle -->
        <div
          class="absolute top-0 bottom-0 -right-2.5 w-2.5 cursor-ew-resize z-40 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity"
          title="Drag to extend screen width"
          @pointerdown="startScreenExtend($event, 'e')"
        >
          <div class="w-1 h-10 rounded-full bg-amber-400/80" />
        </div>

        <!-- Outer Stage Bottom Edge Handle -->
        <div
          class="absolute left-0 right-0 -bottom-2.5 h-2.5 cursor-ns-resize z-40 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity"
          title="Drag to extend screen height"
          @pointerdown="startScreenExtend($event, 's')"
        >
          <div class="h-1 w-10 rounded-full bg-amber-400/80" />
        </div>

        <!-- Outer Stage Bottom-Right Corner Handle -->
        <div
          class="absolute -bottom-3 -right-3 w-4 h-4 cursor-nwse-resize z-40 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity"
          title="Drag corner to resize screen dimensions"
          @pointerdown="startScreenExtend($event, 'se')"
        >
          <div class="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-slate-950" />
        </div>

        <!-- Logical Composition Coordinate Space -->
        <div class="relative overflow-hidden bg-[#0B0D11] rounded-md" :style="logicalStageStyle">
          <div
            class="pointer-events-none absolute inset-[4%] border border-dashed border-white/[0.06] rounded"
          />

          <!-- LAYER GROUP A: All Uploaded Video Tracks with 8-Directional Mouse Extend Handles & Crop -->
          <div
            v-for="vItem in videoTracks"
            :key="vItem.id"
            v-show="vItem.url && isTrackActiveAt(vItem, composition.currentTime)"
            class="absolute cursor-move group/video"
            :class="{
              'ring-2 ring-sky-400': isVideoSelected(vItem),
              'hover:ring-2 hover:ring-sky-400/60': !isVideoSelected(vItem),
            }"
            :style="getVideoLayerStyle(vItem)"
            @pointerdown="startLayerDrag($event, 'video', vItem)"
          >
            <video
              :ref="(el) => registerVideoElement(vItem.id, el)"
              :src="vItem.url"
              class="w-full h-full object-fill pointer-events-none block"
              :style="{ clipPath: getCropClipPath(vItem) }"
              playsinline
              preload="auto"
            />

            <!-- Video Dimensions Badge on Selection -->
            <div
              v-if="isVideoSelected(vItem)"
              class="pointer-events-none absolute top-3 left-3 px-3 py-1 rounded bg-slate-950/85 border border-sky-400/50 text-sky-300 font-mono text-lg shadow"
            >
              {{ vItem.label }} · z{{ vItem.zIndex }} ·
              {{ Math.round(vItem.width * (vItem.scale || 1)) }}×{{ Math.round(vItem.height * (vItem.scale || 1)) }}px
            </div>

            <!-- 8-Directional Mouse Extend Handles when this Video Track is selected -->
            <template v-if="isVideoSelected(vItem)">
              <div
                class="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-20 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ew-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'e')"
              />
              <div
                class="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-20 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ew-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'w')"
              />
              <div
                class="absolute left-1/2 -bottom-3 -translate-x-1/2 w-20 h-6 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 's')"
              />
              <div
                class="absolute left-1/2 -top-3 -translate-x-1/2 w-20 h-6 bg-sky-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-lg opacity-90 hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'n')"
              />
              <div
                class="absolute -bottom-4 -right-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'se')"
              />
              <div
                class="absolute -bottom-4 -left-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nesw-resize shadow-lg hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'sw')"
              />
              <div
                class="absolute -top-4 -right-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nesw-resize shadow-lg hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'ne')"
              />
              <div
                class="absolute -top-4 -left-4 w-8 h-8 bg-sky-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg hover:scale-110 transition-transform"
                @pointerdown.stop="startBoxExtend($event, 'video', vItem, 'nw')"
              />
            </template>
          </div>

          <!-- LAYER GROUP B: All Image Overlay Layers with 8-Way Resize & Crop -->
          <div
            v-for="imgItem in imageTracks"
            :key="imgItem.id"
            v-show="imgItem.url && isTrackActiveAt(imgItem, composition.currentTime)"
            class="absolute cursor-move"
            :class="{
              'ring-2 ring-fuchsia-400': isImageSelected(imgItem),
              'hover:ring-2 hover:ring-fuchsia-400/60': !isImageSelected(imgItem),
            }"
            :style="getImageLayerStyle(imgItem)"
            @pointerdown="startLayerDrag($event, 'image', imgItem)"
          >
            <img
              :src="imgItem.url"
              :alt="imgItem.label"
              class="w-full h-full object-fill pointer-events-none block rounded"
              :style="{ clipPath: getCropClipPath(imgItem) }"
            />
            <template v-if="isImageSelected(imgItem)">
              <div
                class="absolute -bottom-3 -right-3 w-6 h-6 bg-fuchsia-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg"
                @pointerdown.stop="startBoxExtend($event, 'image', imgItem, 'se')"
              />
              <div
                class="absolute -top-3 -left-3 w-6 h-6 bg-fuchsia-400 border-2 border-slate-950 rounded-sm cursor-nwse-resize shadow-lg"
                @pointerdown.stop="startBoxExtend($event, 'image', imgItem, 'nw')"
              />
            </template>
          </div>

          <!-- LAYER GROUP C: All Text Overlay Layers -->
          <div
            v-for="tItem in textTracks"
            :key="tItem.id"
            v-show="isTrackActiveAt(tItem, composition.currentTime)"
            class="absolute cursor-move"
            :style="getTextLayerStyle(tItem)"
            @pointerdown="startLayerDrag($event, 'text', tItem)"
          >
            <div
              class="px-7 py-3.5 rounded-xl border-2 whitespace-nowrap shadow-xl transition-shadow"
              :class="{
                'ring-4 ring-purple-400/80': isTextSelected(tItem),
              }"
              :style="{
                color: tItem.color || '#FFFFFF',
                backgroundColor: tItem.backgroundColor || 'rgba(15, 23, 42, 0.78)',
                borderColor: tItem.borderColor || '#38BDF8',
                fontSize: `${Number(tItem.fontSize) || 52}px`,
                fontWeight: tItem.fontWeight || '700',
              }"
            >
              {{ tItem.text }}
            </div>
          </div>

          <!-- Empty Video Hint when no video uploaded -->
          <div
            v-if="!hasAnyVideoUploaded"
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-500"
          >
            <p class="font-mono text-xl tracking-wide text-slate-500/70">
              No video layer uploaded · Upload MP4/WebM or Load Sample Media
            </p>
          </div>

          <!-- LAYER GROUP D: Multiple VINSTOCK HTML/Vue Animation Overlays -->
          <div
            v-for="aItem in animationTracks"
            :key="aItem.id"
            v-show="isTrackActiveAt(aItem, composition.currentTime)"
            class="absolute cursor-move"
            :style="getAnimationLayerStyle(aItem)"
            @pointerdown="startLayerDrag($event, 'animation', aItem)"
          >
            <div
              class="relative rounded-xl transition-shadow"
              :class="{
                'ring-2 ring-amber-400/80 ring-offset-4 ring-offset-transparent':
                  isAnimationSelected(aItem),
              }"
            >
              <component
                :is="resolveAnimationComponent(aItem.animationId)"
                :progress="getAnimationItemProgress(aItem)"
                :duration="aItem.duration"
                :speed="aItem.animationSpeed"
                :scale="evaluateLayerSpatialState(aItem, composition.currentTime).scale"
                :custom-properties="aItem.customProperties"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SYNCHRONIZED MASTER AUDIO ELEMENTS (Supports Multiple Audio Tracks) -->
    <audio
      v-for="aItem in audioTracks"
      :key="aItem.id"
      :ref="(el) => registerAudioElement(aItem.id, el)"
      :src="aItem.url"
      preload="auto"
      class="hidden"
    />
  </div>
</template>
