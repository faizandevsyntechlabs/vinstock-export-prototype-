<script setup>
import { ref } from 'vue';
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';

const { composition, audioTrack, setAudioFile } = useMotionTimeline();
const fileInputRef = ref(null);

function triggerAudioUpload() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    setAudioFile(file);
  }
}

function toggleMute() {
  audioTrack.muted = !audioTrack.muted;
}
</script>

<template>
  <div class="space-y-5">
    <!-- Source Audio Upload Control -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Audio Source</span>
        <span class="text-[11px] font-mono text-slate-400">MP3 · WAV · M4A</span>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
        class="hidden"
        @change="onFileSelected"
      />

      <div class="p-3 rounded-lg bg-[#0B0D11] border border-[#242A38] space-y-2.5">
        <div class="text-xs font-mono text-slate-300 truncate">
          {{ audioTrack.fileName || 'No audio uploaded' }}
        </div>
        <button
          type="button"
          class="w-full py-2 px-3 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          @click="triggerAudioUpload"
        >
          {{ audioTrack.url ? 'Replace Audio File' : 'Upload Audio (MP3 / WAV / M4A)' }}
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
            :value="audioTrack.startTime"
            type="number"
            min="0"
            :max="composition.duration - 0.5"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
            @input="audioTrack.startTime = Math.max(0, Number($event.target.value) || 0)"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Duration (s)</label>
          <input
            :value="audioTrack.duration"
            type="number"
            min="0.5"
            :max="composition.duration"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
            @input="audioTrack.duration = Math.max(0.5, Number($event.target.value) || 0.5)"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- Gain & Mute Controls -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Audio Level</span>
        <button
          type="button"
          class="px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer"
          :class="
            audioTrack.muted
              ? 'bg-red-500/20 border-red-400 text-red-200'
              : 'bg-[#151922] border-[#242A38] text-slate-300 hover:text-white'
          "
          @click="toggleMute"
        >
          {{ audioTrack.muted ? 'Muted (Click to Unmute)' : 'Mute Track' }}
        </button>
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Master Track Volume</span>
          <span class="font-mono text-slate-200">
            {{ audioTrack.muted ? '0% (Muted)' : `${Math.round(audioTrack.volume * 100)}%` }}
          </span>
        </div>
        <input
          v-model.number="audioTrack.volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          :disabled="audioTrack.muted"
          class="w-full disabled:opacity-40"
        />
      </div>
    </div>
  </div>
</template>
