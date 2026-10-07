<script setup>
import { computed } from 'vue';
import { computeAnimationEnvelope, clamp } from '../../../composables/useMotionTimeline.js';

const props = defineProps({
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 6.0 },
  speed: { type: Number, default: 1 },
  scale: { type: Number, default: 1 },
  customProperties: {
    type: Object,
    default: () => ({
      brandLabel: 'VINSTOCK',
      tagline: 'MOTION GRAPHICS ENGINE',
      accentColor: '#10B981',
    }),
  },
});

const env = computed(() => computeAnimationEnvelope(props.progress, props.duration, props.speed));

const rootStyle = computed(() => {
  const { enterBack, exit, visibility } = env.value;
  const s = (0.65 + 0.35 * enterBack - 0.25 * exit) * (Number(props.scale) || 1);
  return {
    opacity: visibility,
    transform: `translate(-50%, -50%) scale(${s.toFixed(3)})`,
  };
});

const outerRingStyle = computed(() => {
  const deg = props.progress * 180 * (Number(props.speed) || 1);
  return {
    transform: `rotate(${deg.toFixed(1)}deg)`,
    borderColor: props.customProperties?.accentColor || '#10B981',
  };
});

const innerDiamondStyle = computed(() => {
  const deg = 45 - (1 - env.value.enter) * 90 + props.progress * 45;
  return {
    transform: `rotate(${deg.toFixed(1)}deg)`,
    backgroundColor: props.customProperties?.accentColor || '#10B981',
  };
});

const labelStyle = computed(() => {
  const reveal = clamp((env.value.enter - 0.2) / 0.8, 0, 1);
  return {
    opacity: reveal,
    transform: `translate3d(0, ${((1 - reveal) * 18).toFixed(1)}px, 0)`,
  };
});
</script>

<template>
  <div
    class="pointer-events-none select-none flex flex-col items-center justify-center px-12 py-9 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/15 shadow-2xl"
    :style="rootStyle"
  >
    <!-- Geometric Emblem -->
    <div class="relative w-28 h-28 flex items-center justify-center mb-6">
      <!-- Outer Dashed Architectural Ring -->
      <div
        class="absolute inset-0 rounded-full border-2 border-dashed opacity-75"
        :style="outerRingStyle"
      />
      <!-- Secondary Frame Box -->
      <div class="absolute inset-3 rounded-xl border border-white/25 rotate-12" />
      <!-- Core Rotated Diamond -->
      <div
        class="w-12 h-12 rounded-lg shadow-lg flex items-center justify-center"
        :style="innerDiamondStyle"
      >
        <div class="w-4 h-4 rounded-sm bg-slate-950" />
      </div>
    </div>

    <!-- Brand Identity Text -->
    <div :style="labelStyle" class="text-center">
      <div class="font-display text-4xl font-extrabold tracking-wider text-white uppercase">
        {{ customProperties?.brandLabel || 'VINSTOCK' }}
      </div>
      <div
        class="mt-1.5 font-mono text-xs font-semibold tracking-[0.28em] uppercase"
        :style="{ color: customProperties?.accentColor || '#10B981' }"
      >
        {{ customProperties?.tagline || 'MOTION GRAPHICS ENGINE' }}
      </div>
    </div>
  </div>
</template>
