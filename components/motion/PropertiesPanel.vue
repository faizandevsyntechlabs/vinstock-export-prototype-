<script setup>
import { ref, computed } from 'vue';
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';
import AnimationProperties from './AnimationProperties.vue';
import VideoProperties from './VideoProperties.vue';
import AudioProperties from './AudioProperties.vue';

const {
  composition,
  textTrack,
  textTracks,
  imageTrack,
  imageTracks,
  transitionTypes,
  selectTrack,
  addTextTrack,
  removeTextTrack,
  addImageTrack,
  setImageFile,
  removeImageTrack,
  moveLayerZIndex,
  addKeyframeAtPlayhead,
  removeKeyframe,
  clearKeyframes,
  seekTo,
} = useMotionTimeline();

const imageFileInputRef = ref(null);
const addImageFileInputRef = ref(null);

const panelHeaderTitle = computed(() => {
  if (composition.selectedTrack === 'video') return 'Video Layer Settings';
  if (composition.selectedTrack === 'audio') return 'Audio Layer Settings';
  if (composition.selectedTrack === 'text') return 'Text Overlay Settings';
  if (composition.selectedTrack === 'image') return 'Image Overlay Settings';
  return 'HTML Motion Settings';
});

const textSwatches = ['#FFFFFF', '#F59E0B', '#38BDF8', '#10B981', '#F43F5E', '#A855F7'];

function onSelectTextTab() {
  if (textTracks.length === 0) {
    addTextTrack();
  } else {
    selectTrack('text', composition.selectedTextId || textTracks[0].id);
  }
}

function onSelectImageTab() {
  if (imageTracks.length === 0) {
    addImageTrack();
  } else {
    selectTrack('image', composition.selectedImageId || imageTracks[0].id);
  }
}

function triggerReplaceImage() {
  imageFileInputRef.value?.click();
}

function triggerAddImageFile() {
  addImageFileInputRef.value?.click();
}

function onReplaceImageSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    setImageFile(file, imageTrack.id);
  }
  e.target.value = '';
}

function onAddImageFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) {
    addImageTrack();
    return;
  }
  files.forEach((f) => addImageTrack(f));
  e.target.value = '';
}
</script>

<template>
  <aside
    class="w-84 shrink-0 bg-[#11141B] border-l border-[#222733] flex flex-col h-full overflow-hidden select-none"
  >
    <!-- Contextual Track Switcher Tabs (HTML, Video, Audio, Text, Image) -->
    <div class="p-3 border-b border-[#222733]">
      <div class="grid grid-cols-5 gap-1 p-1 rounded-lg bg-[#0B0D11] border border-[#1E232E]">
        <button
          type="button"
          class="py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'animation'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="selectTrack('animation')"
        >
          HTML
        </button>
        <button
          type="button"
          class="py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'video'
              ? 'bg-sky-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="selectTrack('video')"
        >
          Video
        </button>
        <button
          type="button"
          class="py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'audio'
              ? 'bg-emerald-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="selectTrack('audio')"
        >
          Audio
        </button>
        <button
          type="button"
          class="py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'text'
              ? 'bg-purple-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="onSelectTextTab"
        >
          Text
        </button>
        <button
          type="button"
          class="py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="
            composition.selectedTrack === 'image'
              ? 'bg-fuchsia-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="onSelectImageTab"
        >
          Image
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between px-0.5">
        <h2 class="text-sm font-semibold text-white">
          {{ panelHeaderTitle }}
        </h2>
        <span class="text-[11px] font-mono text-slate-400">Inspector</span>
      </div>
    </div>

    <!-- Scrollable Contextual Settings Body -->
    <div class="flex-1 overflow-y-auto p-4">
      <AnimationProperties v-if="composition.selectedTrack === 'animation'" />
      <VideoProperties v-else-if="composition.selectedTrack === 'video'" />
      <AudioProperties v-else-if="composition.selectedTrack === 'audio'" />

      <!-- TEXT OVERLAY INSPECTOR -->
      <div v-else-if="composition.selectedTrack === 'text'" class="space-y-5">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-300">
              Text Layers ({{ textTracks.length }})
            </span>
            <button
              type="button"
              class="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 text-purple-200 text-[11px] font-mono cursor-pointer"
              @click="addTextTrack()"
            >
              + Add Text
            </button>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tItem in textTracks"
              :key="tItem.id"
              type="button"
              class="px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer"
              :class="
                composition.selectedTextId === tItem.id
                  ? 'bg-purple-400 text-slate-950 font-semibold border-purple-300'
                  : 'bg-[#151922] border-[#242A38] text-slate-300 hover:text-white'
              "
              @click="selectTrack('text', tItem.id)"
            >
              {{ tItem.label }} · z{{ tItem.zIndex }}
            </button>
          </div>

          <div v-if="textTracks.length > 0" class="flex justify-end">
            <button
              type="button"
              class="text-[11px] font-mono text-red-400 hover:text-red-300 cursor-pointer"
              @click="removeTextTrack(textTrack.id)"
            >
              Remove Text Layer
            </button>
          </div>
        </div>

        <template v-if="textTracks.length > 0">
          <div class="border-t border-[#222733]" />

          <div class="space-y-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Caption Text</label>
              <input
                v-model="textTrack.text"
                type="text"
                class="w-full px-3 py-1.5 rounded-md bg-[#0B0D11] border border-[#242A38] text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400">Font Size</span>
                <span class="font-mono text-slate-200">{{ textTrack.fontSize }}px</span>
              </div>
              <input
                v-model.number="textTrack.fontSize"
                type="range"
                min="24"
                max="120"
                step="2"
                class="w-full"
              />
            </div>

            <div>
              <label class="block text-xs text-slate-400 mb-1.5">Text Color</label>
              <div class="flex items-center gap-2">
                <button
                  v-for="hex in textSwatches"
                  :key="hex"
                  type="button"
                  class="w-6 h-6 rounded-md border cursor-pointer"
                  :class="
                    textTrack.color === hex
                      ? 'scale-110 border-white ring-2 ring-white/30'
                      : 'border-white/20'
                  "
                  :style="{ backgroundColor: hex }"
                  @click="textTrack.color = hex"
                />
              </div>
            </div>
          </div>

          <div class="border-t border-[#222733]" />

          <div class="space-y-3">
            <div class="text-xs font-semibold text-slate-300">Transform & Layer Order</div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">X Position (px)</label>
                <input
                  v-model.number="textTrack.x"
                  type="number"
                  step="10"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Y Position (px)</label>
                <input
                  v-model.number="textTrack.y"
                  type="number"
                  step="10"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400">Scale</span>
                <span class="font-mono text-slate-200">{{ Math.round((Number(textTrack.scale) || 1) * 100) }}%</span>
              </div>
              <input
                v-model.number="textTrack.scale"
                type="range"
                min="0.4"
                max="2.5"
                step="0.05"
                class="w-full"
              />
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-400">Rotation</span>
                  <span class="font-mono text-slate-200">{{ textTrack.rotation || 0 }}°</span>
                </div>
                <input
                  v-model.number="textTrack.rotation"
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
                  <span class="font-mono text-slate-200">{{ Math.round((Number(textTrack.opacity ?? 1)) * 100) }}%</span>
                </div>
                <input
                  v-model.number="textTrack.opacity"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  class="w-full"
                />
              </div>
            </div>

            <div class="flex items-center justify-between p-2 rounded bg-[#0B0D11] border border-[#242A38]">
              <span class="text-xs text-slate-400">Layer Order (z{{ textTrack.zIndex }})</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-[#181C26] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
                  @click="moveLayerZIndex(textTrack, -5)"
                >
                  ↓ Back
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-[#181C26] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
                  @click="moveLayerZIndex(textTrack, 5)"
                >
                  ↑ Front
                </button>
              </div>
            </div>
          </div>

          <div class="border-t border-[#222733]" />

          <div class="space-y-3">
            <div class="text-xs font-semibold text-slate-300">Timeline, Transitions & Keyframes</div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Start Time (s)</label>
                <input
                  v-model.number="textTrack.startTime"
                  type="number"
                  min="0"
                  step="0.1"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Duration (s)</label>
                <input
                  v-model.number="textTrack.duration"
                  type="number"
                  min="0.5"
                  step="0.1"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Transition In</label>
                <select
                  v-model="textTrack.transitionIn"
                  class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                >
                  <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Transition Out</label>
                <select
                  v-model="textTrack.transitionOut"
                  class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                >
                  <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-xs font-semibold text-slate-300">
                Keyframes ({{ textTrack.keyframes?.length || 0 }})
              </span>
              <button
                type="button"
                class="px-2 py-1 rounded bg-purple-500/20 border border-purple-400/50 text-purple-200 text-[11px] font-mono cursor-pointer"
                @click="addKeyframeAtPlayhead(textTrack)"
              >
                ◆ + Keyframe @ {{ composition.currentTime.toFixed(1) }}s
              </button>
            </div>

            <div v-if="textTrack.keyframes?.length" class="space-y-1 max-h-24 overflow-y-auto">
              <div
                v-for="kf in textTrack.keyframes"
                :key="kf.id"
                class="flex items-center justify-between px-2.5 py-1 rounded bg-[#0B0D11] border border-[#242A38] text-[11px] font-mono"
              >
                <button type="button" class="text-purple-300 cursor-pointer" @click="seekTo(kf.time)">
                  ◆ {{ Number(kf.time).toFixed(2) }}s ({{ kf.x }},{{ kf.y }})
                </button>
                <button type="button" class="text-slate-500 hover:text-red-400 cursor-pointer" @click="removeKeyframe(textTrack, kf.id)">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- IMAGE OVERLAY INSPECTOR -->
      <div v-else-if="composition.selectedTrack === 'image'" class="space-y-5">
        <input
          ref="imageFileInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
          class="hidden"
          @change="onReplaceImageSelected"
        />
        <input
          ref="addImageFileInputRef"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
          class="hidden"
          @change="onAddImageFilesSelected"
        />

        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-300">
              Image Layers ({{ imageTracks.length }})
            </span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="px-2 py-1 rounded bg-[#181C26] border border-[#262C3A] text-slate-200 text-[11px] font-mono cursor-pointer"
                @click="addImageTrack()"
              >
                + Badge
              </button>
              <button
                type="button"
                class="px-2 py-1 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 text-[11px] font-mono cursor-pointer"
                @click="triggerAddImageFile"
              >
                + Upload Image
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="imgItem in imageTracks"
              :key="imgItem.id"
              type="button"
              class="px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer"
              :class="
                composition.selectedImageId === imgItem.id
                  ? 'bg-fuchsia-400 text-slate-950 font-semibold border-fuchsia-300'
                  : 'bg-[#151922] border-[#242A38] text-slate-300 hover:text-white'
              "
              @click="selectTrack('image', imgItem.id)"
            >
              {{ imgItem.label }} · z{{ imgItem.zIndex }}
            </button>
          </div>
        </div>

        <template v-if="imageTracks.length > 0">
          <div class="p-3 rounded-lg bg-[#0B0D11] border border-[#242A38] space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono text-slate-300 truncate">{{ imageTrack.fileName }}</span>
              <button
                type="button"
                class="text-[11px] font-mono text-red-400 hover:text-red-300 cursor-pointer"
                @click="removeImageTrack(imageTrack.id)"
              >
                Remove
              </button>
            </div>
            <button
              type="button"
              class="w-full py-1.5 px-2.5 rounded bg-[#181C26] hover:bg-[#222836] border border-[#262C3A] text-xs text-slate-200 cursor-pointer"
              @click="triggerReplaceImage"
            >
              Replace Image File
            </button>
          </div>

          <div class="border-t border-[#222733]" />

          <div class="space-y-3">
            <div class="text-xs font-semibold text-slate-300">Position, Size, Rotation & Layer Order</div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">X Position (px)</label>
                <input
                  v-model.number="imageTrack.x"
                  type="number"
                  step="10"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Y Position (px)</label>
                <input
                  v-model.number="imageTrack.y"
                  type="number"
                  step="10"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Width (px)</label>
                <input
                  v-model.number="imageTrack.width"
                  type="number"
                  min="40"
                  step="10"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Height (px)</label>
                <input
                  v-model.number="imageTrack.height"
                  type="number"
                  min="40"
                  step="10"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-400">Rotation</span>
                  <span class="font-mono text-slate-200">{{ imageTrack.rotation || 0 }}°</span>
                </div>
                <input
                  v-model.number="imageTrack.rotation"
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
                  <span class="font-mono text-slate-200">{{ Math.round((Number(imageTrack.opacity ?? 1)) * 100) }}%</span>
                </div>
                <input
                  v-model.number="imageTrack.opacity"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  class="w-full"
                />
              </div>
            </div>

            <div class="flex items-center justify-between p-2 rounded bg-[#0B0D11] border border-[#242A38]">
              <span class="text-xs text-slate-400">Layer Order (z{{ imageTrack.zIndex }})</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-[#181C26] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
                  @click="moveLayerZIndex(imageTrack, -5)"
                >
                  ↓ Back
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-[#181C26] text-xs font-mono text-slate-200 border border-[#262C3A] cursor-pointer"
                  @click="moveLayerZIndex(imageTrack, 5)"
                >
                  ↑ Front
                </button>
              </div>
            </div>
          </div>

          <div class="border-t border-[#222733]" />

          <div class="space-y-3">
            <div class="text-xs font-semibold text-slate-300">Timeline, Transitions & Keyframes</div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Start Time (s)</label>
                <input
                  v-model.number="imageTrack.startTime"
                  type="number"
                  min="0"
                  step="0.1"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Duration (s)</label>
                <input
                  v-model.number="imageTrack.duration"
                  type="number"
                  min="0.5"
                  step="0.1"
                  class="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Transition In</label>
                <select
                  v-model="imageTrack.transitionIn"
                  class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                >
                  <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Transition Out</label>
                <select
                  v-model="imageTrack.transitionOut"
                  class="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white"
                >
                  <option v-for="t in transitionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-xs font-semibold text-slate-300">
                Keyframes ({{ imageTrack.keyframes?.length || 0 }})
              </span>
              <button
                type="button"
                class="px-2 py-1 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 text-[11px] font-mono cursor-pointer"
                @click="addKeyframeAtPlayhead(imageTrack)"
              >
                ◆ + Keyframe @ {{ composition.currentTime.toFixed(1) }}s
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </aside>
</template>
