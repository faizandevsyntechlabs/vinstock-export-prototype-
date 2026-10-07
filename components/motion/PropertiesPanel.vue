<script setup>
import { computed } from 'vue';
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';
import AnimationProperties from './AnimationProperties.vue';
import VideoProperties from './VideoProperties.vue';
import AudioProperties from './AudioProperties.vue';

const { composition, selectTrack } = useMotionTimeline();

const panelHeaderTitle = computed(() => {
  if (composition.selectedTrack === 'video') return 'Video Settings';
  if (composition.selectedTrack === 'audio') return 'Audio Settings';
  return 'Animation Settings';
});
</script>

<template>
  <aside
    class="w-84 shrink-0 bg-[#11141B] border-l border-[#222733] flex flex-col h-full overflow-hidden select-none"
  >
    <!-- Contextual Track Switcher Tabs -->
    <div class="p-3 border-b border-[#222733]">
      <div class="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0D11] border border-[#1E232E]">
        <button
          type="button"
          class="py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'animation'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="selectTrack('animation')"
        >
          Animation
        </button>
        <button
          type="button"
          class="py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'video'
              ? 'bg-sky-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="selectTrack('video')"
        >
          Video
        </button>
        <button
          type="button"
          class="py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'audio'
              ? 'bg-emerald-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="selectTrack('audio')"
        >
          Audio
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between px-0.5">
        <h2 class="text-sm font-semibold text-white">
          {{ panelHeaderTitle }}
        </h2>
        <span class="text-[11px] font-mono text-slate-400">Inspector</span>
      </div>
    </div>

    <!-- Scrollable Contextual Settings Body -->
    <div class="flex-1 overflow-y-auto p-4">
      <AnimationProperties v-if="composition.selectedTrack === 'animation'" />
      <VideoProperties v-else-if="composition.selectedTrack === 'video'" />
      <AudioProperties v-else-if="composition.selectedTrack === 'audio'" />
    </div>
  </aside>
</template>
