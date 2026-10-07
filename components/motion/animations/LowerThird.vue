<script setup>
import { computed } from 'vue';
import { computeAnimationEnvelope, clamp } from '../../../composables/useMotionTimeline.js';

const props = defineProps({
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 5.5 },
  speed: { type: Number, default: 1 },
  scale: { type: Number, default: 1 },
  customProperties: {
    type: Object,
    default: () => ({
      primaryText: 'John Smith',
      secondaryText: 'Creative Director',
      accentColor: '#F59E0B',
    }),
  },
});

const env = computed(() => computeAnimationEnvelope(props.progress, props.duration, props.speed));

const wrapperStyle = computed(() => {
  const { enter, exit, visibility } = env.value;
  const slideX = -(1 - enter) * 64 - exit * 44;
  const currentScale = Number(props.scale) || 1;
  return {
    opacity: visibility,
    transform: `translate3d(${slideX.toFixed(1)}px, -50%, 0) scale(${currentScale.toFixed(3)})`,
    transformOrigin: 'left center',
  };
});

const pillarStyle = computed(() => {
  const heightPercent = clamp(env.value.enter * 100 * (1 - env.value.exit), 0, 100);
  return {
    height: `${heightPercent.toFixed(1)}%`,
    backgroundColor: props.customProperties?.accentColor || '#F59E0B',
  };
});

const primaryStyle = computed(() => {
  const reveal = clamp((env.value.enter - 0.1) / 0.9, 0, 1);
  return {
    opacity: reveal,
    transform: `translate3d(${((1 - reveal) * -20).toFixed(1)}px, 0, 0)`,
  };
});

const secondaryStyle = computed(() => {
  const reveal = clamp((env.value.enter - 0.28) / 0.72, 0, 1);
  return {
    opacity: reveal,
    transform: `translate3d(${((1 - reveal) * -16).toFixed(1)}px, 0, 0)`,
  };
});
</script>

<template>
  <div
    class="pointer-events-none select-none flex items-stretch bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-lg overflow-hidden shadow-2xl min-w-[440px]"
    :style="wrapperStyle"
  >
    <!-- Animated Left Broadcast Pillar -->
    <div class="w-3 bg-white/10 flex items-end">
      <div class="w-full" :style="pillarStyle" />
    </div>

    <!-- Lower-Third Content -->
    <div class="px-7 py-5 flex flex-col justify-center">
      <div
        class="font-display text-4xl font-bold text-white tracking-tight leading-tight whitespace-nowrap"
        :style="primaryStyle"
      >
        {{ customProperties?.primaryText || 'John Smith' }}
      </div>
      <div
        class="mt-1.5 flex items-center gap-2.5 font-mono text-base font-medium uppercase tracking-widest"
        :style="[secondaryStyle, { color: customProperties?.accentColor || '#F59E0B' }]"
      >
        <span class="inline-block w-2 h-2 rounded-full" :style="{ backgroundColor: customProperties?.accentColor || '#F59E0B' }" />
        <span>{{ customProperties?.secondaryText || 'Creative Director' }}</span>
      </div>
    </div>
  </div>
</template>
