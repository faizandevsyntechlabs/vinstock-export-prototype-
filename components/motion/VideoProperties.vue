<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';

const {
  composition,
  videoTrack,
  videoTracks,
  transitionTypes,
  selectTrack,
  setVideoFile,
  addVideoTrack,
  removeVideoTrack,
  splitVideoAtPlayhead,
  setVideoTrim,
  trimVideoStartToPlayhead,
  trimVideoEndToPlayhead,
  resetVideoTrim,
  moveLayerZIndex,
  addKeyframeAtPlayhead,
  removeKeyframe,
  clearKeyframes,
  saveHistoryState,
  seekTo,
} = useMotionTimeline();

const fileInputRef = ref(null);
const addVideoInputRef = ref(null);
const trimBarRef = ref(null);
const activeTrimHandle = ref(null); // 'in' | 'out'

function triggerVideoUpload() {
  fileInputRef.value?.click();
}

function triggerAddNewVideo() {
  addVideoInputRef.value?.click();
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    setVideoFile(file, videoTrack.id);
  }
  e.target.value = '';
}

function onAddVideoFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    const emptySlot = videoTracks.find((v) => !v.url);
    if (emptySlot) {
      setVideoFile(file, emptySlot.id);
    } else {
      addVideoTrack(file);
    }
  });
  e.target.value = '';
}

function resetVideoTransform() {
  saveHistoryState();
  videoTrack.x = 0;
  videoTrack.y = 0;
  videoTrack.width = Number(composition.width) || 1920;
  videoTrack.height = Number(composition.height) || 1080;
  videoTrack.scale = 1;
  videoTrack.rotation = 0;
  videoTrack.opacity = 1;
}

function resetVideoCrop() {
  saveHistoryState();
  videoTrack.cropTop = 0;
  videoTrack.cropRight = 0;
  videoTrack.cropBottom = 0;
  videoTrack.cropLeft = 0;
}

function setVideoSpeedPreset(rate) {
  saveHistoryState();
  videoTrack.playbackRate = rate;
}

const maxSourceDuration = computed(() => Math.max(0.5, Number(videoTrack.naturalDuration) || 10));
const safeTrimStart = computed(() => clamp(Number(videoTrack.trimStart) || 0, 0, maxSourceDuration.value - 0.2));
const safeTrimEnd = computed(() =>
  clamp(Number(videoTrack.trimEnd) || maxSourceDuration.value, safeTrimStart.value + 0.2, maxSourceDuration.value)
);
const trimmedDuration = computed(() => Number((safeTrimEnd.value - safeTrimStart.value).toFixed(2)));

const trimRangeStyle = computed(() => {
  const total = maxSourceDuration.value;
  const leftPct = clamp((safeTrimStart.value / total) * 100, 0, 100);
  const widthPct = clamp(((safeTrimEnd.value - safeTrimStart.value) / total) * 100, 2, 100 - leftPct);
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
});

function onTrimStartInput(val) {
  const nextIn = clamp(Number(val) || 0, 0, safeTrimEnd.value - 0.2);
  setVideoTrim(nextIn, safeTrimEnd.value);
  seekTo(Number(videoTrack.startTime) || 0);
}

function onTrimEndInput(val) {
  const nextOut = clamp(Number(val) || maxSourceDuration.value, safeTrimStart.value + 0.2, maxSourceDuration.value);
  setVideoTrim(safeTrimStart.value, nextOut);
  seekTo((Number(videoTrack.startTime) || 0) + Math.max(0, nextOut - safeTrimStart.value - 0.05));
}

function startTrimHandleDrag(e, handleType) {
  e.stopPropagation();
  saveHistoryState();
  activeTrimHandle.value = handleType;
  window.addEventListener('pointermove', onTrimPointerMove);
  window.addEventListener('pointerup', onTrimPointerUp);
}

function onTrimPointerMove(e) {
  if (!activeTrimHandle.value || !trimBarRef.value) return;
  const rect = trimBarRef.value.getBoundingClientRect();
  const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const targetSec = Number((ratio * maxSourceDuration.value).toFixed(2));

  if (activeTrimHandle.value === 'in') {
    onTrimStartInput(targetSec);
  } else if (activeTrimHandle.value === 'out') {
    onTrimEndInput(targetSec);
  }
}

function onTrimPointerUp() {
  activeTrimHandle.value = null;
  window.removeEventListener('pointermove', onTrimPointerMove);
  window.removeEventListener('pointerup', onTrimPointerUp);
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onTrimPointerMove);
  window.removeEventListener('pointerup', onTrimPointerUp);
});
</script>

<template>
  <div class="space-y-5">
    <!-- 1. Multi-Video Track Selector & Source Upload Control -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">
          Video Layers ({{ videoTracks.length }})
        </span>
        <button
          type="button"
          class="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
          @click="triggerAddNewVideo"
        >
          + Add Video
        </button>
      </div>

      <!-- Track Pills / Tabs -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="vItem in videoTracks"
          :key="vItem.id"
          type="button"
          class="px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer flex items-center gap-1.5"
          :class="
            composition.selectedVideoId === vItem.id
              ? 'bg-sky-400 text-slate-950 font-semibold border-sky-300'
              : 'bg-[#151922] border-[#242A38] text-slate-300 hover:text-white'
          "
          @click="selectTrack('video', vItem.id)"
        >
          <span>{{ vItem.label }}</span>
          <span class="text-[10px] opacity-75">z{{ vItem.zIndex }}</span>
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="video/mp4,video/webm"
        class="hidden"
        @change="onFileSelected"
      />
      <input
        ref="addVideoInputRef"
        type="file"
        multiple
        accept="video/mp4,video/webm"
        class="hidden"
        @change="onAddVideoFilesSelected"
      />

      <div class="p-3 rounded-lg bg-[#0B0D11] border border-[#242A38] space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-mono text-slate-300 truncate">
            {{ videoTrack.fileName || 'No video uploaded' }}
          </div>
          <button
            v-if="videoTracks.length > 1 || videoTrack.url"
            type="button"
            class="text-[11px] font-mono text-red-400 hover:text-red-300 cursor-pointer shrink-0"
            @click="removeVideoTrack(videoTrack.id)"
          >
            Remove
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="py-1.5 px-2.5 rounded-md bg-[#181C26] hover:bg-[#222836] border border-[#262C3A] text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            @click="triggerVideoUpload"
          >
            {{ videoTrack.url ? 'Replace File' : 'Upload File' }}
          </button>
          <button
            type="button"
            class="py-1.5 px-2.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap"
            title="Split video clip at current playhead into two layers"
            @click="splitVideoAtPlayhead(videoTrack.id)"
          >
            ✂ Split @ Playhead
          </button>
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 2. Video Trimming & Splitting -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Trim & Split Clip</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
          @click="resetVideoTrim"
        >
          Reset Trim
        </button>
      </div>

      <div class="p-2.5 rounded-lg bg-[#0B0D11] border border-[#242A38] space-y-2">
        <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Source: {{ maxSourceDuration.toFixed(1) }}s</span>
          <span class="text-sky-300 font-semibold">Clip: {{ trimmedDuration.toFixed(2) }}s</span>
        </div>

        <div
          ref="trimBarRef"
          class="relative h-8 rounded bg-[#151922] border border-[#262C3A] select-none overflow-visible"
        >
          <div
            class="absolute top-0 bottom-0 bg-sky-500/25 border-y border-sky-400 flex items-center justify-between"
            :style="trimRangeStyle"
          >
            <div
              class="w-3 h-full -ml-1.5 bg-sky-400 hover:bg-sky-300 rounded-l cursor-ew-resize flex items-center justify-center shadow"
              @pointerdown="startTrimHandleDrag($event, 'in')"
            >
              <div class="w-0.5 h-3.5 bg-slate-950 rounded" />
            </div>
            <div
              class="w-3 h-full -mr-1.5 bg-sky-400 hover:bg-sky-300 rounded-r cursor-ew-resize flex items-center justify-center shadow"
              @pointerdown="startTrimHandleDrag($event, 'out')"
            >
              <div class="w-0.5 h-3.5 bg-slate-950 rounded" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label class="block text-[10px] font-mono text-slate-400 mb-1">Trim In (s)</label>
            <input
              :value="safeTrimStart"
              type="number"
              min="0"
              :max="safeTrimEnd - 0.2"
              step="0.1"
              class="w-full px-2 py-1 rounded bg-[#141821] border border-[#242A38] text-xs font-mono text-sky-200"
              @input="onTrimStartInput($event.target.value)"
            />
          </div>
          <div>
            <label class="block text-[10px] font-mono text-slate-400 mb-1">Trim Out (s)</label>
            <input
              :value="safeTrimEnd"
              type="number"
              :min="safeTrimStart + 0.2"
              :max="maxSourceDuration"
              step="0.1"
              class="w-full px-2 py-1 rounded bg-[#141821] border border-[#242A38] text-xs font-mono text-sky-200"
              @input="onTrimEndInput($event.target.value)"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            class="py-1.5 px-2 rounded bg-[#151922] hover:bg-sky-500/20 border border-[#242A38] text-[11px] font-mono text-sky-300 cursor-pointer whitespace-nowrap"
            @click="trimVideoStartToPlayhead"
          >
            [ Set In @ Playhead
          </button>
          <button
            type="button"
            class="py-1.5 px-2 rounded bg-[#151922] hover:bg-sky-500/20 border border-[#242A38] text-[11px] font-mono text-sky-300 cursor-pointer whitespace-nowrap"
            @click="trimVideoEndToPlayhead"
          >
            Set Out @ Playhead ]
          </button>
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 3. Playback Speed & Volume -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Speed & Audio</span>
        <div class="flex items-center gap-1">
          <button
            v-for="spd in [0.5, 1, 1.5, 2]"
            :key="spd"
            type="button"
            class="px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer"
            :class="
              Number(videoTrack.playbackRate) === spd
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-[#151922] border-[#242A38] text-slate-400 hover:text-white'
            "
            @click="setVideoSpeedPreset(spd)"
          >
            {{ spd }}×
          </button>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Playback Speed</span>
          <span class="font-mono text-slate-200">{{ (Number(videoTrack.playbackRate) || 1).toFixed(2) }}×</span>
        </div>
        <input
          v-model.number="videoTrack.playbackRate"
          type="range"
          min="0.25"
          max="3"
          step="0.05"
          class="w-full"
        />
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Embedded Video Volume</span>
          <span class="font-mono text-slate-200">{{ Math.round((Number(videoTrack.volume) || 0) * 100) }}%</span>
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

    <div class="border-t border-[#222733]" />

    <!-- 4. Video Cropping (%) -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Video Crop (%)</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
          @click="resetVideoCrop"
        >
          Reset Crop
        </button>
      </div>
      <div class="grid grid-cols-4 gap-1.5">
        <div>
          <label class="block text-[10px] text-slate-400 mb-1">Top %</label>
          <input
            v-model.number="videoTrack.cropTop"
            type="number"
            min="0"
            max="45"
            class="w-full px-2 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 mb-1">Right %</label>
          <input
            v-model.number="videoTrack.cropRight"
            type="number"
            min="0"
            max="45"
            class="w-full px-2 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 mb-1">Bottom %</label>
          <input
            v-model.number="videoTrack.cropBottom"
            type="number"
            min="0"
            max="45"
            class="w-full px-2 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 mb-1">Left %</label>
          <input
            v-model.number="videoTrack.cropLeft"
            type="number"
            min="0"
            max="45"
            class="w-full px-2 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 5. Spatial Transform, Rotation, Opacity & Layer Order -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Spatial Transform</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
          @click="resetVideoTransform"
        >
          Fit {{ composition.width }}×{{ composition.height }}
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
          <span class="font-mono text-slate-200">{{ Math.round((Number(videoTrack.scale) || 1) * 100) }}%</span>
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

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-400">Rotation</span>
            <span class="font-mono text-slate-200">{{ videoTrack.rotation || 0 }}°</span>
          </div>
          <input
            v-model.number="videoTrack.rotation"
            type="range"
            min="-180"
            max="180"
            step="1"
            class="w-full"
          />
        </div>
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-400">Opacity</span>
            <span class="font-mono text-slate-200">{{ Math.round((Number(videoTrack.opacity ?? 1)) * 100) }}%</span>
          </div>
          <input
            v-model.number="videoTrack.opacity"
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            class="w-full"
          />
        </div>
      </div>

      <div class="flex items-center justify-between p-2 rounded bg-[#0B0D11] border border-[#242A38]">
        <span class="text-xs text-slate-400">Layer Order (z{{ videoTrack.zIndex }})</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-2 py-1 rounded bg-[#181C26] hover:bg-[#222836] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
            @click="moveLayerZIndex(videoTrack, -5)"
          >
            ↓ Back
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded bg-[#181C26] hover:bg-[#222836] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
            @click="moveLayerZIndex(videoTrack, 5)"
          >
            ↑ Front
          </button>
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 6. Timeline Placement, Transitions & Keyframes -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Timeline Window & Transitions</div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Timeline Start (s)</label>
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
          <label class="block text-[11px] text-slate-400 mb-1">Clip Duration (s)</label>
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
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Transition In</label>
          <select
            v-model="videoTrack.transitionIn"
            class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          >
            <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Transition Out</label>
          <select
            v-model="videoTrack.transitionOut"
            class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          >
            <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1">
        <span class="text-xs font-semibold text-slate-300">
          Keyframes ({{ videoTrack.keyframes?.length || 0 }})
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-[11px] font-mono cursor-pointer"
            @click="addKeyframeAtPlayhead(videoTrack)"
          >
            ◆ + Keyframe @ {{ composition.currentTime.toFixed(1) }}s
          </button>
          <button
            v-if="videoTrack.keyframes?.length"
            type="button"
            class="px-1.5 py-1 rounded bg-[#181C26] text-[10px] font-mono text-slate-400 hover:text-red-300 cursor-pointer"
            @click="clearKeyframes(videoTrack)"
          >
            Clear
          </button>
        </div>
      </div>

      <div v-if="videoTrack.keyframes?.length" class="space-y-1 max-h-24 overflow-y-auto">
        <div
          v-for="kf in videoTrack.keyframes"
          :key="kf.id"
          class="flex items-center justify-between px-2.5 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-[11px] font-mono"
        >
          <button
            type="button"
            class="text-sky-300 hover:underline cursor-pointer"
            @click="seekTo(kf.time)"
          >
            ◆ {{ Number(kf.time).toFixed(2) }}s ({{ kf.x }},{{ kf.y }} · {{ Math.round(kf.scale * 100) }}% · {{ kf.rotation }}°)
          </button>
          <button
            type="button"
            class="text-slate-500 hover:text-red-400 cursor-pointer"
            @click="removeKeyframe(videoTrack, kf.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
