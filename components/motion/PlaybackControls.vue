<script setup>
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';

const emit = defineEmits(['add-video', 'add-audio', 'add-image']);

const {
  composition,
  videoTrack,
  videoTracks,
  audioTracks,
  animationTracks,
  textTracks,
  imageTracks,
  togglePlay,
  restart,
  seekTo,
  undo,
  redo,
  canUndo,
  canRedo,
  addAnimationTrack,
  addTextTrack,
  splitVideoAtPlayhead,
  splitAudioAtPlayhead,
  trimVideoStartToPlayhead,
  trimVideoEndToPlayhead,
  resetVideoTrim,
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

function splitSelectedAtPlayhead() {
  if (composition.selectedTrack === 'audio') {
    splitAudioAtPlayhead();
  } else {
    splitVideoAtPlayhead();
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#11141B] border-b border-[#222733] select-none">
    <!-- Left: Transport, Undo/Redo, Trim & Split Controls -->
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        :disabled="!canUndo"
        class="px-2 py-1.5 rounded-md bg-[#181C26] hover:bg-[#222836] disabled:opacity-35 text-slate-200 text-xs font-mono border border-[#262C3A] transition-colors cursor-pointer"
        title="Undo (Ctrl+Z)"
        @click="undo"
      >
        ↶ Undo
      </button>

      <button
        type="button"
        :disabled="!canRedo"
        class="px-2 py-1.5 rounded-md bg-[#181C26] hover:bg-[#222836] disabled:opacity-35 text-slate-200 text-xs font-mono border border-[#262C3A] transition-colors cursor-pointer"
        title="Redo (Ctrl+Y)"
        @click="redo"
      >
        ↷ Redo
      </button>

      <span class="text-slate-700 mx-0.5">|</span>

      <button
        type="button"
        class="px-2.5 py-1.5 rounded-md bg-[#181C26] hover:bg-[#222836] text-slate-200 text-xs font-medium border border-[#262C3A] transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
        title="Restart composition (0.0s)"
        @click="restart"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
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
        class="px-3.5 py-1.5 rounded-md font-semibold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        @click="togglePlay"
      >
        <svg v-if="!composition.isPlaying" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <svg v-else class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
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

      <!-- Quick Video Trim & Split at Playhead Controls -->
      <div class="hidden xl:flex items-center gap-1 ml-1 pl-2 border-l border-[#222733]">
        <button
          v-if="videoTrack.url"
          type="button"
          class="px-2 py-1 rounded bg-[#151922] hover:bg-sky-500/20 text-sky-300 border border-[#242A38] hover:border-sky-400/50 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
          title="Trim video start (In-Point) to current playhead"
          @click="trimVideoStartToPlayhead"
        >
          [ Trim In
        </button>
        <button
          v-if="videoTrack.url"
          type="button"
          class="px-2 py-1 rounded bg-[#151922] hover:bg-sky-500/20 text-sky-300 border border-[#242A38] hover:border-sky-400/50 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
          title="Trim video end (Out-Point) to current playhead"
          @click="trimVideoEndToPlayhead"
        >
          Trim Out ]
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded bg-[#151922] hover:bg-amber-500/20 text-amber-300 border border-[#242A38] hover:border-amber-400/50 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
          title="Split selected Video or Audio clip at Playhead"
          @click="splitSelectedAtPlayhead"
        >
          ✂ Split @ Playhead
        </button>
      </div>
    </div>

    <!-- Center: Master Clock Timecode Readout -->
    <div class="flex items-center gap-2.5 font-mono text-xs">
      <div class="flex items-center gap-2 px-3 py-1 rounded bg-[#0B0D11] border border-[#222733]">
        <span class="text-amber-400 font-semibold">{{ formatTimecode(composition.currentTime) }}</span>
        <span class="text-slate-600">/</span>
        <span class="text-slate-400">{{ formatTimecode(composition.duration) }}</span>
      </div>
      <div class="hidden md:flex items-center gap-1.5 text-slate-400">
        <span class="text-slate-200">{{ (Number(composition.currentTime) || 0).toFixed(2) }}s</span>
      </div>
    </div>

    <!-- Right: Add Independent Layer Buttons & Total Composition Duration Control -->
    <div class="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
      <button
        type="button"
        class="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
        title="Add another VINSTOCK HTML/Vue motion layer"
        @click="addAnimationTrack('lower-third')"
      >
        + HTML ({{ animationTracks.length }})
      </button>

      <button
        type="button"
        class="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-400/40 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
        title="Add a new Text Overlay layer"
        @click="addTextTrack()"
      >
        + Text ({{ textTracks.length }})
      </button>

      <button
        type="button"
        class="px-2 py-1 rounded bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-400/40 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
        title="Add a new Image Overlay layer"
        @click="emit('add-image')"
      >
        + Image ({{ imageTracks.length }})
      </button>

      <button
        type="button"
        class="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/40 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
        title="Upload & add another video track"
        @click="emit('add-video')"
      >
        + Video ({{ videoTracks.length }})
      </button>

      <button
        type="button"
        class="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
        title="Upload & add another audio track"
        @click="emit('add-audio')"
      >
        + Audio ({{ audioTracks.length }})
      </button>

      <span class="text-slate-700">|</span>

      <label for="comp-duration-input" class="whitespace-nowrap">Dur:</label>
      <input
        id="comp-duration-input"
        type="number"
        min="4"
        max="30"
        step="1"
        :value="composition.duration"
        class="w-14 px-1.5 py-1 rounded bg-[#0B0D11] border border-[#222733] text-slate-200 text-right font-mono focus:outline-none focus:border-amber-500"
        @change="updateDuration"
      />
    </div>
  </div>
</template>
