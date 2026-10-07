<script setup>
import { ref, computed } from 'vue';
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';

const {
  composition,
  audioTrack,
  audioTracks,
  selectTrack,
  setAudioFile,
  addAudioTrack,
  removeAudioTrack,
  setAudioTrim,
  splitAudioAtPlayhead,
  saveHistoryState,
} = useMotionTimeline();

const fileInputRef = ref(null);
const addAudioInputRef = ref(null);

function triggerAudioUpload() {
  fileInputRef.value?.click();
}

function triggerAddNewAudio() {
  addAudioInputRef.value?.click();
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    setAudioFile(file, audioTrack.id);
  }
  e.target.value = '';
}

function onAddAudioFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    const emptySlot = audioTracks.find((a) => !a.url);
    if (emptySlot) {
      setAudioFile(file, emptySlot.id);
    } else {
      addAudioTrack(file);
    }
  });
  e.target.value = '';
}

function toggleMute() {
  saveHistoryState();
  audioTrack.muted = !audioTrack.muted;
}

const maxAudioDuration = computed(() => Math.max(0.5, Number(audioTrack.naturalDuration) || 10));
const safeTrimStart = computed(() => clamp(Number(audioTrack.trimStart) || 0, 0, maxAudioDuration.value - 0.2));
const safeTrimEnd = computed(() =>
  clamp(Number(audioTrack.trimEnd) || maxAudioDuration.value, safeTrimStart.value + 0.2, maxAudioDuration.value)
);

function onAudioTrimStartInput(val) {
  setAudioTrim(val, safeTrimEnd.value);
}

function onAudioTrimEndInput(val) {
  setAudioTrim(safeTrimStart.value, val);
}
</script>

<template>
  <div class="space-y-5">
    <!-- 1. Multi-Audio Track Selector & Upload Controls -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">
          Audio Layers ({{ audioTracks.length }})
        </span>
        <button
          type="button"
          class="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
          @click="triggerAddNewAudio"
        >
          + Add Audio
        </button>
      </div>

      <!-- Track Selector Tabs -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="aItem in audioTracks"
          :key="aItem.id"
          type="button"
          class="px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer flex items-center gap-1.5"
          :class="
            composition.selectedAudioId === aItem.id
              ? 'bg-emerald-400 text-slate-950 font-semibold border-emerald-300'
              : 'bg-[#151922] border-[#242A38] text-slate-300 hover:text-white'
          "
          @click="selectTrack('audio', aItem.id)"
        >
          <span>{{ aItem.label }}</span>
          <span v-if="aItem.muted" class="text-[10px] opacity-75">(M)</span>
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
        class="hidden"
        @change="onFileSelected"
      />
      <input
        ref="addAudioInputRef"
        type="file"
        multiple
        accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
        class="hidden"
        @change="onAddAudioFilesSelected"
      />

      <div class="p-3 rounded-lg bg-[#0B0D11] border border-[#242A38] space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-mono text-slate-300 truncate">
            {{ audioTrack.fileName || 'No audio uploaded' }}
          </div>
          <button
            v-if="audioTracks.length > 1 || audioTrack.url"
            type="button"
            class="text-[11px] font-mono text-red-400 hover:text-red-300 cursor-pointer shrink-0"
            @click="removeAudioTrack(audioTrack.id)"
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="py-1.5 px-2.5 rounded-md bg-[#181C26] hover:bg-[#222836] border border-[#262C3A] text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            @click="triggerAudioUpload"
          >
            {{ audioTrack.url ? 'Replace File' : 'Upload File' }}
          </button>
          <button
            type="button"
            class="py-1.5 px-2.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap"
            title="Split audio clip at current playhead into two independent audio tracks"
            @click="splitAudioAtPlayhead(audioTrack.id)"
          >
            ✂ Split @ Playhead
          </button>
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 2. Audio Trimming (In / Out) & Timeline Window -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Audio Trim & Timeline ({{ audioTrack.label }})</div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Trim In (s)</label>
          <input
            :value="safeTrimStart"
            type="number"
            min="0"
            :max="safeTrimEnd - 0.2"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-emerald-200"
            @input="onAudioTrimStartInput($event.target.value)"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Trim Out (s)</label>
          <input
            :value="safeTrimEnd"
            type="number"
            :min="safeTrimStart + 0.2"
            :max="maxAudioDuration"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-emerald-200"
            @input="onAudioTrimEndInput($event.target.value)"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Timeline Start (s)</label>
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

    <!-- 3. Volume, Playback Speed, Fade-In & Fade-Out -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Audio Level, Speed & Fades</span>
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
          {{ audioTrack.muted ? 'Muted (Unmute)' : 'Mute Track' }}
        </button>
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Track Volume</span>
          <span class="font-mono text-slate-200">
            {{ audioTrack.muted ? '0% (Muted)' : `${Math.round((Number(audioTrack.volume) || 0) * 100)}%` }}
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

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Playback Speed</span>
          <span class="font-mono text-slate-200">{{ (Number(audioTrack.playbackRate) || 1).toFixed(2) }}×</span>
        </div>
        <input
          v-model.number="audioTrack.playbackRate"
          type="range"
          min="0.5"
          max="2.5"
          step="0.05"
          class="w-full"
        />
      </div>

      <div class="grid grid-cols-2 gap-2.5 pt-1">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Fade-In (s)</label>
          <input
            v-model.number="audioTrack.fadeIn"
            type="number"
            min="0"
            max="5"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Fade-Out (s)</label>
          <input
            v-model.number="audioTrack.fadeOut"
            type="number"
            min="0"
            max="5"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
      </div>
    </div>
  </div>
</template>
