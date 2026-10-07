<script setup>
import { computed } from 'vue';
import { computeAnimationEnvelope, clamp } from '../../../composables/useMotionTimeline.js';

const props = defineProps({
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 6.5 },
  speed: { type: Number, default: 1 },
  scale: { type: Number, default: 1 },
  customProperties: {
    type: Object,
    default: () => ({
      text: 'BEYOND THE FRAME',
      subtext: 'VINSTOCK MOTION SERIES · 2026',
      fontSize: 84,
      accentColor: '#F59E0B',
    }),
  },
});

const env = computed(() => computeAnimationEnvelope(props.progress, props.duration, props.speed));

const containerStyle = computed(() => {
  const { enter, exit, visibility } = env.value;
  const translateY = (1 - enter) * 48 - exit * 32;
  const currentScale = (0.92 + 0.08 * enter - 0.05 * exit) * (Number(props.scale) || 1);
  return {
    opacity: visibility,
    transform: `translate(-50%, -50%) translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${currentScale.toFixed(3)})`,
  };
});

const barWidthPercent = computed(() => {
  const { enter, exit } = env.value;
  return clamp(enter * 100 * (1 - exit * 0.8), 0, 100);
});

const subtextStyle = computed(() => {
  const delayed = clamp((env.value.enter - 0.25) / 0.75, 0, 1) * (1 - env.value.exit);
  const trackingEm = 0.22 + (1 - delayed) * 0.14;
  return {
    opacity: delayed,
    letterSpacing: `${trackingEm.toFixed(3)}em`,
    transform: `translate3d(0, ${((1 - delayed) * 14).toFixed(1)}px, 0)`,
  };
});

const fontSizePx = computed(() => clamp(Number(props.customProperties?.fontSize) || 84, 32, 140));
const accentColor = computed(() => props.customProperties?.accentColor || '#F59E0B');
</script>

<template>
  <div
    class="pointer-events-none select-none flex flex-col items-center text-center px-10 py-7 rounded-xl bg-slate-950/65 backdrop-blur-md border border-white/10 shadow-2xl"
    :style="containerStyle"
  >
    <!-- Top Accent Rule -->
    <div class="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
      <div
        class="h-full rounded-full"
        :style="{ width: `${barWidthPercent}%`, backgroundColor: accentColor }"
      />
    </div>

    <!-- Main Kinetic Headline -->
    <h1
      class="font-display font-extrabold text-white tracking-tight leading-none whitespace-nowrap drop-shadow-lg"
      :style="{ fontSize: `${fontSizePx}px` }"
    >
      {{ customProperties?.text || 'BEYOND THE FRAME' }}
    </h1>

    <!-- Subheadline Kicker -->
    <p
      class="mt-4 font-mono text-sm font-semibold uppercase text-slate-200 whitespace-nowrap"
      :style="subtextStyle"
    >
      {{ customProperties?.subtext || 'VINSTOCK MOTION SERIES · 2026' }}
    </p>
  </div>
</template>
