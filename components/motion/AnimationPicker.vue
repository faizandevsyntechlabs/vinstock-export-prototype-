<script setup>
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';

const { animationTrack, animations, selectAnimationPreset } = useMotionTimeline();
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-300">VINSTOCK Motion Library</span>
      <span class="text-[11px] font-mono text-slate-400">HTML / Vue Overlay</span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="item in animations"
        :key="item.id"
        type="button"
        class="text-left p-2.5 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between"
        :class="
          animationTrack.animationId === item.id
            ? 'bg-amber-500/15 border-amber-400 text-white'
            : 'bg-[#151922] border-[#242A38] text-slate-300 hover:border-slate-600'
        "
        @click="selectAnimationPreset(item.id)"
      >
        <div>
          <div class="text-[10px] font-mono text-amber-400/90 uppercase tracking-wider">
            {{ item.category }}
          </div>
          <div class="text-xs font-semibold mt-0.5 truncate">
            {{ item.name }}
          </div>
        </div>
        <p class="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-snug">
          {{ item.description }}
        </p>
      </button>
    </div>
  </div>
</template>
