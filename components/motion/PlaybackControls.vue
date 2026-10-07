<script setup>
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';

const {
  composition,
  togglePlay,
  restart,
  seekTo,
  formatTimecode,
} = useMotionTimeline();

function stepFrame(deltaFrames) {
  const step = deltaFrames / (composition.fps || 30);
  seekTo(composition.currentTime + step);
}

function updateDuration(e) {
  const val = clamp(Number(e.target.value) || 10, 4, 30);
  composition.duration = val;
  if (composition.currentTime > val) {
    seekTo(val);
  }
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-[#11141B] border-b border-[#222733] select-none">
    <!-- Left: Transport Controls -->
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="px-2.5 py-1.5 rounded-md bg-[#181C26] hover:bg-[#222836] text-slate-200 text-xs font-medium border border-[#262C3A] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        title="Restart composition (0.0s)"
        @click="restart"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span>Restart</span>
      </button>

      <button
        type="button"
        class="p-1.5 rounded-md bg-[#181C26] hover:bg-[#222836] text-slate-300 border border-[#262C3A] transition-colors cursor-pointer"
        title="Previous Frame"
        @click="stepFrame(-1)"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="19 20 9 12 19 4 19 20" />
          <line x1="5" y1="19" x2="5" y2="5" />
        </svg>
      </button>

      <button
        type="button"
        class="px-4 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        :class="
          composition.isPlaying
            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold'
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold'
        "
        @click="togglePlay"
      >
        <svg
          v-if="!composition.isPlaying"
          class="w-3.5 h-3.5 fill-current"
          viewBox="0 0 24 24"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <svg
          v-else
          class="w-3.5 h-3.5 fill-current"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
        <span>{{ composition.isPlaying ? 'Pause' : 'Play' }}</span>
      </button>

      <button
        type="button"
        class="p-1.5 rounded-md bg-[#181C26] hover:bg-[#222836] text-slate-300 border border-[#262C3A] transition-colors cursor-pointer"
        title="Next Frame"
        @click="stepFrame(1)"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 4 15 12 5 20 5 4" />
          <line x1="19" y1="5" x2="19" y2="19" />
        </svg>
      </button>
    </div>

    <!-- Center: Master Clock Timecode Readout -->
    <div class="flex items-center gap-3 font-mono text-xs">
      <div class="flex items-center gap-2 px-3 py-1 rounded bg-[#0B0D11] border border-[#222733]">
        <span class="text-amber-400 font-semibold">{{ formatTimecode(composition.currentTime) }}</span>
        <span class="text-slate-600">/</span>
        <span class="text-slate-400">{{ formatTimecode(composition.duration) }}</span>
      </div>
      <div class="hidden sm:flex items-center gap-1.5 text-slate-400">
        <span class="text-slate-200">{{ (Number(composition.currentTime) || 0).toFixed(2) }}s</span>
        <span>·</span>
        <span>{{ composition.fps }} FPS</span>
      </div>
    </div>

    <!-- Right: Total Composition Duration Control -->
    <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
      <label for="comp-duration-input" class="whitespace-nowrap">Duration (s):</label>
      <input
        id="comp-duration-input"
        type="number"
        min="4"
        max="30"
        step="1"
        :value="composition.duration"
        class="w-16 px-2 py-1 rounded bg-[#0B0D11] border border-[#222733] text-slate-200 text-right font-mono focus:outline-none focus:border-amber-500"
        @change="updateDuration"
      />
    </div>
  </div>
</template>
