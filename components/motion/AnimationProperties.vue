<script setup>
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';
import AnimationPicker from './AnimationPicker.vue';

const {
  composition,
  animationTrack,
  animationTracks,
  transitionTypes,
  selectTrack,
  addAnimationTrack,
  removeAnimationTrack,
  moveLayerZIndex,
  addKeyframeAtPlayhead,
  removeKeyframe,
  clearKeyframes,
  seekTo,
  saveHistoryState,
} = useMotionTimeline();

const accentSwatches = ['#F59E0B', '#38BDF8', '#10B981', '#EF4444', '#A855F7', '#F8FAFC'];
const badgePresets = ['NEW', 'SALE', 'FEATURED', 'EXCLUSIVE'];

function applyBadgePreset(label) {
  saveHistoryState();
  animationTrack.customProperties.text = label;
}

function alignPreset(position) {
  saveHistoryState();
  const w = Number(composition.width) || 1920;
  const h = Number(composition.height) || 1080;
  if (position === 'center') {
    animationTrack.x = Math.round(w * 0.5);
    animationTrack.y = Math.round(h * 0.5);
  } else if (position === 'lower-left') {
    animationTrack.x = Math.round(w * 0.08);
    animationTrack.y = Math.round(h * 0.8);
  } else if (position === 'top-right') {
    animationTrack.x = Math.round(w * 0.82);
    animationTrack.y = Math.round(h * 0.17);
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- 0. Multi-HTML Component Layer Selector -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">
          HTML Motion Layers ({{ animationTracks.length }})
        </span>
        <button
          type="button"
          class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap"
          @click="addAnimationTrack('lower-third')"
        >
          + Add HTML Layer
        </button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="aItem in animationTracks"
          :key="aItem.id"
          type="button"
          class="px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer flex items-center gap-1.5"
          :class="
            composition.selectedAnimationId === aItem.id
              ? 'bg-amber-500 text-slate-950 font-semibold border-amber-300'
              : 'bg-[#151922] border-[#242A38] text-slate-300 hover:text-white'
          "
          @click="selectTrack('animation', aItem.id)"
        >
          <span>{{ aItem.label }}</span>
          <span class="text-[10px] opacity-75">z{{ aItem.zIndex }}</span>
        </button>
      </div>

      <div v-if="animationTracks.length > 1" class="flex justify-end">
        <button
          type="button"
          class="text-[11px] font-mono text-red-400 hover:text-red-300 cursor-pointer"
          @click="removeAnimationTrack(animationTrack.id)"
        >
          Remove Current HTML Layer
        </button>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 1. VINSTOCK Animation Library Picker -->
    <AnimationPicker />

    <div class="border-t border-[#222733]" />

    <!-- 2. Dynamic Custom Properties per Animation Type -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Overlay Content & Style</div>

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

    <!-- 3. Position, Scale, Rotation, Opacity & Layer Order -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">Transform & Layer Order</span>
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

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-400">Rotation</span>
            <span class="font-mono text-slate-200">{{ animationTrack.rotation || 0 }}°</span>
          </div>
          <input
            v-model.number="animationTrack.rotation"
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
            <span class="font-mono text-slate-200">{{ Math.round((Number(animationTrack.opacity ?? 1)) * 100) }}%</span>
          </div>
          <input
            v-model.number="animationTrack.opacity"
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            class="w-full"
          />
        </div>
      </div>

      <div class="flex items-center justify-between p-2 rounded bg-[#0B0D11] border border-[#242A38]">
        <span class="text-xs text-slate-400">Layer Order (Z-Index: <strong class="text-amber-300 font-mono">{{ animationTrack.zIndex }}</strong>)</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-2 py-1 rounded bg-[#181C26] hover:bg-[#222836] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
            @click="moveLayerZIndex(animationTrack, -5)"
          >
            ↓ Send Back
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded bg-[#181C26] hover:bg-[#222836] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
            @click="moveLayerZIndex(animationTrack, 5)"
          >
            ↑ Bring Front
          </button>
        </div>
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

    <!-- 4. Timeline Window & Transitions -->
    <div class="space-y-3">
      <div class="text-xs font-semibold text-slate-300">Timeline Window & Transitions</div>
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
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Transition In</label>
          <select
            v-model="animationTrack.transitionIn"
            class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          >
            <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-slate-400 mb-1">Transition Out</label>
          <select
            v-model="animationTrack.transitionOut"
            class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
          >
            <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="border-t border-[#222733]" />

    <!-- 5. Keyframe Animation -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-300">
          Keyframes ({{ animationTrack.keyframes?.length || 0 }})
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-mono cursor-pointer"
            @click="addKeyframeAtPlayhead(animationTrack)"
          >
            ◆ + Keyframe @ {{ composition.currentTime.toFixed(1) }}s
          </button>
          <button
            v-if="animationTrack.keyframes?.length"
            type="button"
            class="px-1.5 py-1 rounded bg-[#181C26] text-[10px] font-mono text-slate-400 hover:text-red-300 cursor-pointer"
            @click="clearKeyframes(animationTrack)"
          >
            Clear
          </button>
        </div>
      </div>

      <div v-if="animationTrack.keyframes?.length" class="space-y-1 max-h-28 overflow-y-auto">
        <div
          v-for="kf in animationTrack.keyframes"
          :key="kf.id"
          class="flex items-center justify-between px-2.5 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-[11px] font-mono"
        >
          <button
            type="button"
            class="text-amber-300 hover:underline cursor-pointer"
            @click="seekTo(kf.time)"
          >
            ◆ {{ Number(kf.time).toFixed(2) }}s ({{ kf.x }},{{ kf.y }} · {{ Math.round(kf.scale * 100) }}% · {{ kf.rotation }}°)
          </button>
          <button
            type="button"
            class="text-slate-500 hover:text-red-400 cursor-pointer"
            @click="removeKeyframe(animationTrack, kf.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
