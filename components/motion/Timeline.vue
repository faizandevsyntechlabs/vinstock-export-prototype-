<script setup>
import { computed } from 'vue';
import { useMotionTimeline, clamp } from '../../composables/useMotionTimeline.js';
import PlaybackControls from './PlaybackControls.vue';
import TimelineRuler from './TimelineRuler.vue';
import TimelineTrack from './TimelineTrack.vue';

const {
  composition,
  videoTrack,
  animationTrack,
  audioTrack,
  animations,
  selectTrack,
  seekTo,
} = useMotionTimeline();

const activeAnimationName = computed(() => {
  const found = animations.find((a) => a.id === animationTrack.animationId);
  return found ? found.name : 'Animated Title';
});

const playheadLeftPercent = computed(() => {
  const total = Math.max(1, Number(composition.duration) || 10);
  return clamp((composition.currentTime / total) * 100, 0, 100);
});

function updateAnimationTiming({ startTime, duration }) {
  animationTrack.startTime = startTime;
  animationTrack.duration = duration;
}

function updateVideoTiming({ startTime, duration }) {
  videoTrack.startTime = startTime;
  videoTrack.duration = duration;
}

function updateAudioTiming({ startTime, duration }) {
  audioTrack.startTime = startTime;
  audioTrack.duration = duration;
}
</script>

<template>
  <section class="w-full bg-[#0E1117] border-t border-[#222733] flex flex-col shrink-0">
    <!-- Top Transport & Timecode Bar -->
    <PlaybackControls />

    <!-- Ruler + Three Synchronized Tracks Container -->
    <div class="relative flex flex-col">
      <TimelineRuler />

      <!-- Track 1: VINSTOCK Animation -->
      <TimelineTrack
        track-key="animation"
        label="VINSTOCK Animation"
        :sublabel="activeAnimationName"
        :start-time="animationTrack.startTime"
        :duration="animationTrack.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'animation'"
        :has-content="Boolean(animationTrack.animationId)"
        color-class="amber"
        @select="selectTrack"
        @update-timing="updateAnimationTiming"
        @scrub="seekTo"
      />

      <!-- Track 2: Video -->
      <TimelineTrack
        track-key="video"
        label="Video"
        :sublabel="videoTrack.fileName || 'No video uploaded'"
        :start-time="videoTrack.startTime"
        :duration="videoTrack.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'video'"
        :has-content="Boolean(videoTrack.url)"
        color-class="sky"
        @select="selectTrack"
        @update-timing="updateVideoTiming"
        @scrub="seekTo"
      />

      <!-- Track 3: Audio -->
      <TimelineTrack
        track-key="audio"
        label="Audio"
        :sublabel="audioTrack.fileName || 'No audio uploaded'"
        :start-time="audioTrack.startTime"
        :duration="audioTrack.duration"
        :total-duration="composition.duration"
        :selected="composition.selectedTrack === 'audio'"
        :has-content="Boolean(audioTrack.url)"
        :waveform-peaks="audioTrack.waveformPeaks"
        color-class="emerald"
        @select="selectTrack"
        @update-timing="updateAudioTiming"
        @scrub="seekTo"
      />

      <!-- Synchronized Vertical Playhead Overlay spanning Ruler + All 3 Tracks -->
      <div class="pointer-events-none absolute top-0 bottom-0 left-52 right-0 overflow-hidden z-30">
        <div
          class="absolute top-0 bottom-0 w-px bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]"
          :style="{ left: `${playheadLeftPercent}%` }"
        >
          <!-- Playhead Cap Diamond -->
          <div class="w-3 h-3 -ml-[5.5px] bg-amber-400 rotate-45 rounded-[2px]" />
        </div>
      </div>
    </div>
  </section>
</template>
