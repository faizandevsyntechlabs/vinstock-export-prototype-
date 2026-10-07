<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';

const { composition, seekTo } = useMotionTimeline();

const rulerRef = ref(null);
const isScrubbing = ref(false);

const ticks = computed(() => {
  const total = Math.max(1, Number(composition.duration) || 10);
  const list = [];
  const step = total <= 12 ? 1 : 2;
  for (let s = 0; s <= total; s += step) {
    list.push({
      sec: s,
      leftPercent: (s / total) * 100,
    });
  }
  return list;
});

function updateSeekFromClientX(clientX) {
  const el = rulerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  seekTo(ratio * composition.duration);
}

function onPointerDown(e) {
  isScrubbing.value = true;
  updateSeekFromClientX(e.clientX);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!isScrubbing.value) return;
  updateSeekFromClientX(e.clientX);
}

function onPointerUp() {
  isScrubbing.value = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <div class="flex items-stretch border-b border-[#222733] bg-[#0E1117] h-7 select-none">
    <!-- Left Track Header Spacer -->
    <div class="w-52 shrink-0 border-r border-[#222733] px-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
      <span>MASTER TIMELINE</span>
      <span>0s – {{ composition.duration }}s</span>
    </div>

    <!-- Interactive Ruler Area -->
    <div
      ref="rulerRef"
      class="relative flex-1 cursor-ew-resize overflow-hidden"
      @pointerdown="onPointerDown"
    >
      <!-- Major Second Ticks -->
      <div
        v-for="tick in ticks"
        :key="tick.sec"
        class="absolute top-0 bottom-0 flex flex-col justify-end pb-1 pointer-events-none"
        :style="{ left: `${tick.leftPercent}%` }"
      >
        <div class="h-2.5 border-l border-slate-600/70" />
        <span class="text-[10px] font-mono text-slate-400 pl-1 leading-none">
          {{ tick.sec }}s
        </span>
      </div>
    </div>
  </div>
</template>
