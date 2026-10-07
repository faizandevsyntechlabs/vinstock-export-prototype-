<script setup>
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';
import AnimationPicker from './AnimationPicker.vue';

const { composition, animationTrack } = useMotionTimeline();

const accentSwatches = ['#F59E0B', '#38BDF8', '#10B981', '#EF4444', '#A855F7', '#F8FAFC'];
const badgePresets = ['NEW', 'SALE', 'FEATURED', 'EXCLUSIVE'];

function applyBadgePreset(label) {
  animationTrack.customProperties.text = label;
}

function alignPreset(position) {
  if (position === 'center') {
    animationTrack.x = 960;
    animationTrack.y = 540;
  } else if (position === 'lower-left') {
    animationTrack.x = 140;
    animationTrack.y = 860;
  } else if (position === 'top-right') {
    animationTrack.x = 1580;
    animationTrack.y = 180;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- 1. VINSTOCK Animation Library Picker -->
    <AnimationPicker />

    <div class="border-t border-[#222733]" />

    <!-- 2. Dynamic Custom Properties per Animation Type -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Overlay Content & Style</div>

      <!-- Animated Title Custom Controls -->
      <template v-if="animationTrack.animationId === 'animated-title'">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Headline Text</label>
          <input
            v-model="animationTrack.customProperties.text"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Subtitle Kicker</label>
          <input
            v-model="animationTrack.customProperties.subtext"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-400">Text Size</span>
            <span class="font-mono text-slate-200">{{ animationTrack.customProperties.fontSize }}px</span>
          </div>
          <input
            v-model.number="animationTrack.customProperties.fontSize"
            type="range"
            min="40"
            max="130"
            step="2"
            class="w-full"
          />
        </div>
      </template>

      <!-- Lower Third Custom Controls -->
      <template v-else-if="animationTrack.animationId === 'lower-third'">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Primary Text (Name)</label>
          <input
            v-model="animationTrack.customProperties.primaryText"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Secondary Text (Role / Title)</label>
          <input
            v-model="animationTrack.customProperties.secondaryText"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </template>

      <!-- Shape / Logo Reveal Custom Controls -->
      <template v-else-if="animationTrack.animationId === 'shape-reveal'">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Brand / Logo Text</label>
          <input
            v-model="animationTrack.customProperties.brandLabel"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Tagline</label>
          <input
            v-model="animationTrack.customProperties.tagline"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </template>

      <!-- Animated Callout / Badge Custom Controls -->
      <template v-else-if="animationTrack.animationId === 'animated-badge'">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Badge Text</label>
          <input
            v-model="animationTrack.customProperties.text"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <div class="flex items-center gap-1.5 mt-2">
            <button
              v-for="preset in badgePresets"
              :key="preset"
              type="button"
              class="px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer whitespace-nowrap"
              :class="
                animationTrack.customProperties.text === preset
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-[#151922] border-[#242A38] text-slate-400 hover:text-white'
              "
              @click="applyBadgePreset(preset)"
            >
              {{ preset }}
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Secondary Callout Label</label>
          <input
            v-model="animationTrack.customProperties.sublabel"
            type="text"
            class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </template>

      <!-- Accent Color Picker -->
      <div>
        <label class="block text-xs text-slate-400 mb-1.5">Accent Color</label>
        <div class="flex items-center gap-2">
          <button
            v-for="hex in accentSwatches"
            :key="hex"
            type="button"
            class="w-6 h-6 rounded-md border transition-transform cursor-pointer"
            :class="
              animationTrack.customProperties.accentColor === hex
                ? 'scale-110 border-white ring-2 ring-white/30'
                : 'border-white/20 hover:scale-105'
            "
            :style="{ backgroundColor: hex }"
            @click="animationTrack.customProperties.accentColor = hex"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 3. Position, Scale & Speed -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Position & Scale</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
            @click="alignPreset('center')"
          >
            Center
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
            @click="alignPreset('lower-left')"
          >
            Lower
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded bg-[#151922] hover:bg-[#1E2430] text-[10px] font-mono text-slate-300 border border-[#242A38] cursor-pointer"
            @click="alignPreset('top-right')"
          >
            Corner
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">X Position (px)</label>
          <input
            v-model.number="animationTrack.x"
            type="number"
            step="10"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Y Position (px)</label>
          <input
            v-model.number="animationTrack.y"
            type="number"
            step="10"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          />
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Size / Scale</span>
          <span class="font-mono text-slate-200">{{ Math.round((Number(animationTrack.scale) || 1) * 100) }}%</span>
        </div>
        <input
          v-model.number="animationTrack.scale"
          type="range"
          min="0.4"
          max="2.0"
          step="0.05"
          class="w-full"
        />
      </div>

      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-400">Animation Speed</span>
          <span class="font-mono text-slate-200">{{ (Number(animationTrack.animationSpeed) || 1).toFixed(2) }}×</span>
        </div>
        <input
          v-model.number="animationTrack.animationSpeed"
          type="range"
          min="0.4"
          max="2.5"
          step="0.1"
          class="w-full"
        />
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 4. Timeline Synchronization -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Timeline Window</div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Start Time (s)</label>
          <input
            :value="animationTrack.startTime"
            type="number"
            min="0"
            :max="composition.duration - 0.5"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
            @input="animationTrack.startTime = Math.max(0, Number($event.target.value) || 0)"
          />
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Duration (s)</label>
          <input
            :value="animationTrack.duration"
            type="number"
            min="0.5"
            :max="composition.duration"
            step="0.1"
            class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
            @input="animationTrack.duration = Math.max(0.5, Number($event.target.value) || 0.5)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
