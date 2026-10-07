<script setup>
import { ref } from 'vue';
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';

const { composition, videoTrack, setVideoFile } = useMotionTimeline();
const fileInputRef = ref(null);

function triggerVideoUpload() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    setVideoFile(file);
  }
}

function resetVideoTransform() {
  videoTrack.x = 0;
  videoTrack.y = 0;
  videoTrack.width = 1920;
  videoTrack.height = 1080;
  videoTrack.scale = 1;
}
</script>

<template>
  <div class="space-y-5">
    <!-- Source File Upload Control -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Video Source</span>
        <span class="text-[11px] font-mono text-slate-400">MP4 · WebM</span>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="video/mp4,video/webm"
        class="hidden"
        @change="onFileSelected"
      />

      <div class="p-3 rounded-lg bg-[#0B0D11] border border-[#242A38] space-y-2.5">
        <div class="text-xs font-mono text-slate-300 truncate">
          {{ videoTrack.fileName || 'No video uploaded' }}
        </div>
        <button
          type="button"
          class="w-full py-2 px-3 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          @click="triggerVideoUpload"
        >
          {{ videoTrack.url ? 'Replace Video File' : 'Upload Video (MP4 / WebM)' }}
        </button>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- Timeline Start & Duration -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Timeline Window</div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Start Time (s)</label>
          <input
            :value="videoTrack.startTime"
            type="number"
            min="0"
            :max="composition.duration - 0.5"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
            @input="videoTrack.startTime = Math.max(0, Number($event.target.value) || 0)"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Duration (s)</label>
          <input
            :value="videoTrack.duration"
            type="number"
            min="0.5"
            :max="composition.duration"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
            @input="videoTrack.duration = Math.max(0.5, Number($event.target.value) || 0.5)"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- Spatial Transform (X, Y, Width, Height, Scale) -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Spatial Transform</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
          @click="resetVideoTransform"
        >
          Fit 1920×1080
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">X Position (px)</label>
          <input
            v-model.number="videoTrack.x"
            type="number"
            step="10"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Y Position (px)</label>
          <input
            v-model.number="videoTrack.y"
            type="number"
            step="10"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Width (px)</label>
          <input
            v-model.number="videoTrack.width"
            type="number"
            min="160"
            max="3840"
            step="20"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Height (px)</label>
          <input
            v-model.number="videoTrack.height"
            type="number"
            min="90"
            max="2160"
            step="20"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Scale Multiplier</span>
          <span class="font-mono text-slate-200">{{ Math.round(videoTrack.scale * 100) }}%</span>
        </div>
        <input
          v-model.number="videoTrack.scale"
          type="range"
          min="0.25"
          max="2.0"
          step="0.05"
          class="w-full"
        />
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- Video Audio Gain -->
    <div class="space-y-2">
      <div class="flex justify-between text-xs">
        <span class="text-slate-400">Embedded Video Volume</span>
        <span class="font-mono text-slate-200">{{ Math.round(videoTrack.volume * 100) }}%</span>
      </div>
      <input
        v-model.number="videoTrack.volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        class="w-full"
      />
    </div>
  </div>
</template>
