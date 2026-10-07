<script setup>
import { ref, computed } from 'vue';
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';
import PlaybackControls from './PlaybackControls.vue';
import TimelineRuler from './TimelineRuler.vue';
import TimelineTrack from './TimelineTrack.vue';

const {
  composition,
  animationTracks,
  videoTracks,
  audioTracks,
  textTracks,
  imageTracks,
  animations,
  selectTrack,
  removeAnimationTrack,
  removeTextTrack,
  addImageTrack,
  removeImageTrack,
  addVideoTrack,
  removeVideoTrack,
  addAudioTrack,
  removeAudioTrack,
  seekTo,
} = useMotionTimeline();

const timelineVideoInputRef = ref(null);
const timelineAudioInputRef = ref(null);
const timelineImageInputRef = ref(null);

function getAnimationName(animationId) {
  const found = animations.find((a) => a.id === animationId);
  return found ? found.name : 'Animated Title';
}

const playheadLeftPercent = computed(() => {
  const total = Math.max(1, Number(composition.duration) || 10);
  return clamp((composition.currentTime / total) * 100, 0, 100);
});

function getVideoTrimLabel(vItem) {
  if (!vItem.url) return '';
  const tIn = Number(vItem.trimStart) || 0;
  const tOut = Number(vItem.trimEnd) || Number(vItem.duration) || 0;
  const rate = Number(vItem.playbackRate) || 1;
  return `In ${tIn.toFixed(1)}s · Out ${tOut.toFixed(1)}s${rate !== 1 ? ` · ${rate}x` : ''}`;
}

function getAudioTrimLabel(aItem) {
  if (!aItem.url) return '';
  const tIn = Number(aItem.trimStart) || 0;
  const tOut = Number(aItem.trimEnd) || Number(aItem.duration) || 0;
  const rate = Number(aItem.playbackRate) || 1;
  return `In ${tIn.toFixed(1)}s · Out ${tOut.toFixed(1)}s${rate !== 1 ? ` · ${rate}x` : ''}`;
}

function updateBasicItemTiming(item, { startTime, duration }) {
  item.startTime = startTime;
  item.duration = duration;
}

function updateVideoItemTiming(vItem, { mode, startTime, duration }) {
  const prevStart = Number(vItem.startTime) || 0;
  const maxNat = Math.max(0.5, Number(vItem.naturalDuration) || 10);
  const rate = clamp(Number(vItem.playbackRate) || 1, 0.25, 4);

  if (mode === 'trim-left') {
    const delta = startTime - prevStart;
    const nextTrimIn = clamp((Number(vItem.trimStart) || 0) + delta * rate, 0, maxNat - 0.2);
    vItem.trimStart = Number(nextTrimIn.toFixed(2));
    vItem.startTime = startTime;
    vItem.duration = duration;
    vItem.trimEnd = Number(
      clamp(vItem.trimStart + duration * rate, vItem.trimStart + 0.2, maxNat).toFixed(2)
    );
  } else if (mode === 'trim-right') {
    const tIn = Number(vItem.trimStart) || 0;
    const nextTrimOut = clamp(tIn + duration * rate, tIn + 0.2, maxNat);
    vItem.trimEnd = Number(nextTrimOut.toFixed(2));
    vItem.duration = Number(((vItem.trimEnd - tIn) / rate).toFixed(2));
  } else {
    vItem.startTime = startTime;
    vItem.duration = duration;
  }
}

function updateAudioItemTiming(aItem, { mode, startTime, duration }) {
  const prevStart = Number(aItem.startTime) || 0;
  const maxNat = Math.max(0.5, Number(aItem.naturalDuration) || 10);
  const rate = clamp(Number(aItem.playbackRate) || 1, 0.25, 4);

  if (mode === 'trim-left') {
    const delta = startTime - prevStart;
    const nextTrimIn = clamp((Number(aItem.trimStart) || 0) + delta * rate, 0, maxNat - 0.2);
    aItem.trimStart = Number(nextTrimIn.toFixed(2));
    aItem.startTime = startTime;
    aItem.duration = duration;
    aItem.trimEnd = Number(
      clamp(aItem.trimStart + duration * rate, aItem.trimStart + 0.2, maxNat).toFixed(2)
    );
  } else if (mode === 'trim-right') {
    const tIn = Number(aItem.trimStart) || 0;
    const nextTrimOut = clamp(tIn + duration * rate, tIn + 0.2, maxNat);
    aItem.trimEnd = Number(nextTrimOut.toFixed(2));
    aItem.duration = Number(((aItem.trimEnd - tIn) / rate).toFixed(2));
  } else {
    aItem.startTime = startTime;
    aItem.duration = duration;
  }
}

function triggerAddVideoFiles() {
  timelineVideoInputRef.value?.click();
}

function onTimelineVideoFiles(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    const emptySlot = videoTracks.find((v) => !v.url);
    if (emptySlot) {
      const idx = videoTracks.indexOf(emptySlot);
      if (idx !== -1) videoTracks.splice(idx, 1);
      addVideoTrack(file, { startTime: 0, pip: false });
    } else {
      addVideoTrack(file);
    }
  });
  e.target.value = '';
}

function triggerAddAudioFiles() {
  timelineAudioInputRef.value?.click();
}

function onTimelineAudioFiles(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    addAudioTrack(file);
  });
  e.target.value = '';
}

function triggerAddImageFiles() {
  timelineImageInputRef.value?.click();
}

function onTimelineImageFiles(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) {
    addImageTrack();
    return;
  }
  files.forEach((file) => {
    addImageTrack(file);
  });
  e.target.value = '';
}
</script>

<template>
  <section class="w-full bg-[#0E1117] border-t border-[#222733] flex flex-col shrink-0">
    <!-- Hidden Multi-File Inputs for Adding Videos, Audios, and Images -->
    <input
      ref="timelineVideoInputRef"
      type="file"
      multiple
      accept="video/mp4,video/webm"
      class="hidden"
      @change="onTimelineVideoFiles"
    />
    <input
      ref="timelineAudioInputRef"
      type="file"
      multiple
      accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
      class="hidden"
      @change="onTimelineAudioFiles"
    />
    <input
      ref="timelineImageInputRef"
      type="file"
      multiple
      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
      class="hidden"
      @change="onTimelineImageFiles"
    />

    <!-- Top Transport & Timecode Bar -->
    <PlaybackControls
      @add-video="triggerAddVideoFiles"
      @add-audio="triggerAddAudioFiles"
      @add-image="triggerAddImageFiles"
    />

    <!-- Ruler + Multi-Layer Track Container -->
    <div class="relative flex flex-col max-h-64 overflow-y-auto">
      <TimelineRuler />

      <!-- 1. VINSTOCK HTML/Vue Component Layers (Supports Multiple HTML Motion Layers) -->
      <TimelineTrack
        v-for="aItem in animationTracks"
        :key="aItem.id"
        :track-key="aItem.id"
        :label="aItem.label"
        :sublabel="getAnimationName(aItem.animationId)"
        :trim-info="`z${aItem.zIndex} · ${aItem.transitionIn !== 'none' ? aItem.transitionIn : 'direct'}`"
        :start-time="aItem.startTime"
        :duration="aItem.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'animation' && composition.selectedAnimationId === aItem.id"
        :has-content="Boolean(aItem.animationId)"
        :removable="animationTracks.length > 1"
        :keyframes="aItem.keyframes"
        color-class="amber"
        @select="selectTrack('animation', aItem.id)"
        @update-timing="(payload) => updateBasicItemTiming(aItem, payload)"
        @remove="removeAnimationTrack(aItem.id)"
        @scrub="seekTo"
      />

      <!-- 2. Text Overlay Layers (Independent Timeline Tracks) -->
      <TimelineTrack
        v-for="tItem in textTracks"
        :key="tItem.id"
        :track-key="tItem.id"
        :label="tItem.label"
        :sublabel="tItem.text"
        :trim-info="`z${tItem.zIndex}`"
        :start-time="tItem.startTime"
        :duration="tItem.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'text' && composition.selectedTextId === tItem.id"
        :has-content="true"
        :removable="true"
        :keyframes="tItem.keyframes"
        color-class="purple"
        @select="selectTrack('text', tItem.id)"
        @update-timing="(payload) => updateBasicItemTiming(tItem, payload)"
        @remove="removeTextTrack(tItem.id)"
        @scrub="seekTo"
      />

      <!-- 3. Image Overlay Layers (Independent Timeline Tracks) -->
      <TimelineTrack
        v-for="imgItem in imageTracks"
        :key="imgItem.id"
        :track-key="imgItem.id"
        :label="imgItem.label"
        :sublabel="imgItem.fileName || 'Image Overlay'"
        :trim-info="`z${imgItem.zIndex}`"
        :start-time="imgItem.startTime"
        :duration="imgItem.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'image' && composition.selectedImageId === imgItem.id"
        :has-content="Boolean(imgItem.url)"
        :removable="true"
        :keyframes="imgItem.keyframes"
        color-class="fuchsia"
        @select="selectTrack('image', imgItem.id)"
        @update-timing="(payload) => updateBasicItemTiming(imgItem, payload)"
        @remove="removeImageTrack(imgItem.id)"
        @scrub="seekTo"
      />

      <!-- 4. Video Tracks (Supports Multiple Videos) -->
      <TimelineTrack
        v-for="vItem in videoTracks"
        :key="vItem.id"
        :track-key="vItem.id"
        :label="vItem.label"
        :sublabel="vItem.fileName || 'No video uploaded'"
        :trim-info="getVideoTrimLabel(vItem)"
        :start-time="vItem.startTime"
        :duration="vItem.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'video' && composition.selectedVideoId === vItem.id"
        :has-content="Boolean(vItem.url)"
        :removable="videoTracks.length > 1 || Boolean(vItem.url)"
        :keyframes="vItem.keyframes"
        color-class="sky"
        @select="selectTrack('video', vItem.id)"
        @update-timing="(payload) => updateVideoItemTiming(vItem, payload)"
        @remove="removeVideoTrack(vItem.id)"
        @scrub="seekTo"
      />

      <!-- 5. Audio Tracks (Supports Multiple Audios) -->
      <TimelineTrack
        v-for="aItem in audioTracks"
        :key="aItem.id"
        :track-key="aItem.id"
        :label="aItem.label"
        :sublabel="aItem.fileName || 'No audio uploaded'"
        :trim-info="getAudioTrimLabel(aItem)"
        :start-time="aItem.startTime"
        :duration="aItem.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'audio' && composition.selectedAudioId === aItem.id"
        :has-content="Boolean(aItem.url)"
        :removable="audioTracks.length > 1 || Boolean(aItem.url)"
        :waveform-peaks="aItem.waveformPeaks"
        color-class="emerald"
        @select="selectTrack('audio', aItem.id)"
        @update-timing="(payload) => updateAudioItemTiming(aItem, payload)"
        @remove="removeAudioTrack(aItem.id)"
        @scrub="seekTo"
      />

      <!-- Synchronized Vertical Playhead Overlay spanning Ruler + All Tracks -->
      <div class="pointer-events-none absolute top-0 bottom-0 left-52 right-0 overflow-hidden z-30">
        <div
          class="absolute top-0 bottom-0 w-px bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]"
          :style="{ left: `${playheadLeftPercent}%` }"
        >
          <div class="w-3 h-3 -ml-[5.5px] bg-amber-400 rotate-45 rounded-[2px]" />
        </div>
      </div>
    </div>
  </section>
</template>
