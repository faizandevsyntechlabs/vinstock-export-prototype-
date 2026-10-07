<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { clamp, saveHistoryState } from '../../composables/useMotionTimeline.js';

const props = defineProps({
  trackKey: { type: String, required: true },
  label: { type: String, required: true },
  sublabel: { type: String, default: '' },
  trimInfo: { type: String, default: '' },
  startTime: { type: [Number, String], default: 0 },
  duration: { type: [Number, String], default: 5 },
  totalDuration: { type: [Number, String], default: 10 },
  selected: { type: Boolean, default: false },
  hasContent: { type: Boolean, default: true },
  removable: { type: Boolean, default: false },
  colorClass: { type: String, default: 'amber' },
  waveformPeaks: { type: Array, default: () => [] },
  keyframes: { type: Array, default: () => [] },
});

const emit = defineEmits(['select', 'update-timing', 'scrub', 'remove']);

const laneRef = ref(null);
const dragMode = ref(null); // 'move' | 'resize' | 'trim-left'
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
  if (props.colorClass === 'purple') {
    return props.selected
      ? 'bg-purple-500/30 border-purple-400 text-purple-100'
      : 'bg-purple-500/18 border-purple-500/50 text-purple-200/90 hover:bg-purple-500/25';
  }
  if (props.colorClass === 'fuchsia') {
    return props.selected
      ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-100'
      : 'bg-fuchsia-500/18 border-fuchsia-500/50 text-fuchsia-200/90 hover:bg-fuchsia-500/25';
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
  saveHistoryState();
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
  saveHistoryState();
  emit('select', props.trackKey);
  dragMode.value = 'resize';
  dragStartX = e.clientX;
  initialStart = safeStart.value;
  initialDuration = safeDuration.value;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function startBlockTrimLeft(e) {
  e.stopPropagation();
  saveHistoryState();
  emit('select', props.trackKey);
  dragMode.value = 'trim-left';
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
      mode: 'move',
      startTime: nextStart,
      duration: initialDuration,
      deltaStart: Number((nextStart - initialStart).toFixed(2)),
    });
  } else if (dragMode.value === 'resize') {
    const nextDur = Number(
      clamp(initialDuration + deltaSec, 0.5, Math.max(0.5, safeTotal.value - initialStart)).toFixed(2)
    );
    emit('update-timing', {
      mode: 'trim-right',
      startTime: initialStart,
      duration: nextDur,
      deltaDuration: Number((nextDur - initialDuration).toFixed(2)),
    });
  } else if (dragMode.value === 'trim-left') {
    const endPos = initialStart + initialDuration;
    const nextStart = Number(clamp(initialStart + deltaSec, 0, Math.max(0, endPos - 0.5)).toFixed(2));
    const nextDur = Number(Math.max(0.5, endPos - nextStart).toFixed(2));
    emit('update-timing', {
      mode: 'trim-left',
      startTime: nextStart,
      duration: nextDur,
      deltaStart: Number((nextStart - initialStart).toFixed(2)),
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
    class="flex items-stretch h-11 border-b border-[#1E232E] transition-colors select-none"
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
            'bg-purple-400': colorClass === 'purple',
            'bg-fuchsia-400': colorClass === 'fuchsia',
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

      <button
        v-if="removable"
        type="button"
        class="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
        title="Remove track"
        @click.stop="emit('remove')"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Right Timeline Track Lane -->
    <div
      ref="laneRef"
      class="relative flex-1 py-1 overflow-hidden cursor-pointer"
      @mousedown="onLaneClick"
    >
      <!-- Track Block -->
      <div
        v-if="hasContent"
        class="absolute top-1 bottom-1 rounded-md border flex items-center justify-between px-2.5 cursor-grab active:cursor-grabbing overflow-hidden transition-colors"
        :class="blockColorClasses"
        :style="blockStyle"
        @pointerdown="startBlockMove"
      >
        <!-- Left-edge Trim In handle -->
        <div
          class="relative z-10 w-2.5 h-full -ml-2 mr-1 cursor-ew-resize flex items-center justify-center hover:bg-white/25 rounded-l"
          title="Drag left edge to trim start (In-Point)"
          @pointerdown.stop="startBlockTrimLeft"
        >
          <div class="w-0.5 h-4 bg-white/75 rounded" />
        </div>

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
          <span
            v-if="trimInfo"
            class="px-1.5 py-0.5 rounded bg-slate-950/60 text-[10px] border border-white/20"
          >
            {{ trimInfo }}
          </span>
        </div>

        <!-- Right-edge Trim Out / duration handle -->
        <div
          class="relative z-10 w-2.5 h-full -mr-2 ml-1 cursor-ew-resize flex items-center justify-center hover:bg-white/25 rounded-r"
          title="Drag right edge to trim end (Out-Point)"
          @pointerdown.stop="startBlockResize"
        >
          <div class="w-0.5 h-4 bg-white/75 rounded" />
        </div>
      </div>

      <!-- Keyframe Diamond Markers on Lane -->
      <div
        v-for="kf in keyframes"
        :key="kf.id"
        class="pointer-events-none absolute top-1/2 -translate-y-1/2 -ml-1.5 w-2.5 h-2.5 bg-amber-300 border border-slate-950 rotate-45 z-20 shadow"
        :style="{ left: `${clamp((Number(kf.time) / safeTotal) * 100, 0, 100)}%` }"
        :title="`Keyframe @ ${Number(kf.time).toFixed(2)}s`"
      />
    </div>
  </div>
</template>
