<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { clamp } from '../../composables/useMotionTimeline.js';

const props = defineProps({
  trackKey: { type: String, required: true },
  label: { type: String, required: true },
  sublabel: { type: String, default: '' },
  startTime: { type: [Number, String], default: 0 },
  duration: { type: [Number, String], default: 5 },
  totalDuration: { type: [Number, String], default: 10 },
  selected: { type: Boolean, default: false },
  hasContent: { type: Boolean, default: true },
  colorClass: { type: String, default: 'amber' },
  waveformPeaks: { type: Array, default: () => [] },
});

const emit = defineEmits(['select', 'update-timing', 'scrub']);

const laneRef = ref(null);
const dragMode = ref(null); // 'move' | 'resize'
let dragStartX = 0;
let initialStart = 0;
let initialDuration = 0;

const safeStart = computed(() => Math.max(0, Number(props.startTime) || 0));
const safeDuration = computed(() => Math.max(0.1, Number(props.duration) || 0.5));
const safeTotal = computed(() => Math.max(1, Number(props.totalDuration) || 10));

const blockStyle = computed(() => {
  const total = safeTotal.value;
  const leftPct = clamp((safeStart.value / total) * 100, 0, 100);
  const widthPct = clamp((safeDuration.value / total) * 100, 2, 100 - leftPct);
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
});

const blockColorClasses = computed(() => {
  if (props.colorClass === 'amber') {
    return props.selected
      ? 'bg-amber-500/30 border-amber-400 text-amber-100'
      : 'bg-amber-500/18 border-amber-500/50 text-amber-200/90 hover:bg-amber-500/25';
  }
  if (props.colorClass === 'sky') {
    return props.selected
      ? 'bg-sky-500/30 border-sky-400 text-sky-100'
      : 'bg-sky-500/18 border-sky-500/50 text-sky-200/90 hover:bg-sky-500/25';
  }
  return props.selected
    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100'
    : 'bg-emerald-500/18 border-emerald-500/50 text-emerald-200/90 hover:bg-emerald-500/25';
});

function onLaneClick(e) {
  emit('select', props.trackKey);
  if (!laneRef.value) return;
  const rect = laneRef.value.getBoundingClientRect();
  const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  emit('scrub', ratio * safeTotal.value);
}

function startBlockMove(e) {
  e.stopPropagation();
  emit('select', props.trackKey);
  dragMode.value = 'move';
  dragStartX = e.clientX;
  initialStart = safeStart.value;
  initialDuration = safeDuration.value;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startBlockResize(e) {
  e.stopPropagation();
  emit('select', props.trackKey);
  dragMode.value = 'resize';
  dragStartX = e.clientX;
  initialStart = safeStart.value;
  initialDuration = safeDuration.value;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
  if (!dragMode.value || !laneRef.value) return;
  const rect = laneRef.value.getBoundingClientRect();
  const deltaSec = ((e.clientX - dragStartX) / Math.max(1, rect.width)) * safeTotal.value;

  if (dragMode.value === 'move') {
    const nextStart = Number(
      clamp(initialStart + deltaSec, 0, Math.max(0, safeTotal.value - 0.5)).toFixed(2)
    );
    emit('update-timing', {
      startTime: nextStart,
      duration: initialDuration,
    });
  } else if (dragMode.value === 'resize') {
    const nextDur = Number(
      clamp(initialDuration + deltaSec, 0.5, Math.max(0.5, safeTotal.value - initialStart)).toFixed(2)
    );
    emit('update-timing', {
      startTime: initialStart,
      duration: nextDur,
    });
  }
}

function onPointerUp() {
  dragMode.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <div
    class="flex items-stretch h-12 border-b border-[#1E232E] transition-colors select-none"
    :class="selected ? 'bg-[#161B26]' : 'bg-[#0F1218] hover:bg-[#131720]'"
    @click="emit('select', trackKey)"
  >
    <!-- Left Track Header -->
    <div
      class="w-52 shrink-0 border-r border-[#222733] px-3 flex items-center justify-between cursor-pointer"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="{
            'bg-amber-400': colorClass === 'amber',
            'bg-sky-400': colorClass === 'sky',
            'bg-emerald-400': colorClass === 'emerald',
          }"
        />
        <div class="truncate">
          <div
            class="text-xs font-medium truncate"
            :class="selected ? 'text-white font-semibold' : 'text-slate-300'"
          >
            {{ label }}
          </div>
          <div class="text-[10px] font-mono text-slate-400 truncate">
            {{ sublabel }}
          </div>
        </div>
      </div>
    </div>

    <!-- Right Timeline Track Lane -->
    <div
      ref="laneRef"
      class="relative flex-1 py-1.5 overflow-hidden cursor-pointer"
      @mousedown="onLaneClick"
    >
      <!-- Track Block -->
      <div
        v-if="hasContent"
        class="absolute top-1.5 bottom-1.5 rounded-md border flex items-center justify-between px-2.5 cursor-grab active:cursor-grabbing overflow-hidden transition-colors"
        :class="blockColorClasses"
        :style="blockStyle"
        @pointerdown="startBlockMove"
      >
        <!-- Optional Audio Waveform Bars -->
        <div
          v-if="waveformPeaks && waveformPeaks.length"
          class="absolute inset-x-2 inset-y-1 flex items-center justify-between gap-0.5 opacity-35 pointer-events-none"
        >
          <span
            v-for="(peak, idx) in waveformPeaks"
            :key="idx"
            class="flex-1 bg-emerald-300 rounded-full"
            :style="{ height: `${Math.round(peak * 100)}%` }"
          />
        </div>

        <div class="relative z-10 flex items-center gap-2 text-[11px] font-mono truncate pointer-events-none">
          <span class="font-semibold truncate">{{ sublabel }}</span>
          <span class="opacity-75">
            {{ safeStart.toFixed(1) }}s – {{ (safeStart + safeDuration).toFixed(1) }}s
          </span>
        </div>

        <!-- Right-edge duration resize handle -->
        <div
          class="relative z-10 w-2 h-full -mr-1.5 cursor-ew-resize flex items-center justify-center hover:bg-white/20 rounded-r"
          title="Drag right edge to adjust duration"
          @pointerdown.stop="startBlockResize"
        >
          <div class="w-0.5 h-4 bg-white/60 rounded" />
        </div>
      </div>
    </div>
  </div>
</template>
