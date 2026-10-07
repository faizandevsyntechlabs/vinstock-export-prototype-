<script setup>
import { computed } from 'vue';
import { computeAnimationEnvelope } from '../../../composables/useMotionTimeline.js';

const props = defineProps({
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 5.0 },
  speed: { type: Number, default: 1 },
  scale: { type: Number, default: 1 },
  customProperties: {
    type: Object,
    default: () => ({
      text: 'FEATURED',
      sublabel: 'LIMITED RELEASE',
      accentColor: '#EF4444',
    }),
  },
});

const env = computed(() => computeAnimationEnvelope(props.progress, props.duration, props.speed));

const badgeStyle = computed(() => {
  const { enterBack, exit, visibility } = env.value;
  // Subtle continuous pulse while active
  const pulse = 1 + Math.sin(props.progress * Math.PI * 6 * (Number(props.speed) || 1)) * 0.035;
  const s = (0.5 + 0.5 * enterBack - 0.3 * exit) * pulse * (Number(props.scale) || 1);
  const tilt = (1 - enterBack) * -12;
  return {
    opacity: visibility,
    transform: `translate(-50%, -50%) scale(${s.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`,
  };
});

const accent = computed(() => props.customProperties?.accentColor || '#EF4444');
</script>

<template>
  <div
    class="pointer-events-none select-none flex items-center gap-4 px-7 py-4 rounded-xl bg-slate-950/90 border-2 shadow-2xl"
    :style="[badgeStyle, { borderColor: accent }]"
  >
    <!-- Live Pulse Beacon -->
    <div class="relative flex items-center justify-center w-5 h-5">
      <span
        class="absolute inset-0 rounded-full opacity-40"
        :style="{ backgroundColor: accent, transform: `scale(${(1 + (progress % 0.25) * 3).toFixed(2)})` }"
      />
      <span class="relative w-3.5 h-3.5 rounded-full" :style="{ backgroundColor: accent }" />
    </div>

    <!-- Callout Copy -->
    <div class="flex flex-col text-left">
      <span
        class="font-display text-3xl font-extrabold tracking-tight text-white leading-none uppercase whitespace-nowrap"
      >
        {{ customProperties?.text || 'FEATURED' }}
      </span>
      <span
        class="mt-1 font-mono text-[11px] font-semibold tracking-[0.22em] uppercase whitespace-nowrap"
        :style="{ color: accent }"
      >
        {{ customProperties?.sublabel || 'LIMITED RELEASE' }}
      </span>
    </div>
  </div>
</template>
