<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';
import { useMotionExport } from '../../composables/useMotionExport.js';
import { useSampleMedia } from '../../composables/useSampleMedia.js';
import PreviewCanvas from './PreviewCanvas.vue';
import PropertiesPanel from './PropertiesPanel.vue';
import Timeline from './Timeline.vue';
import ExportModal from './ExportModal.vue';

const {
  composition,
  videoTrack,
  videoTracks,
  audioTrack,
  audioTracks,
  aspectPresets,
  setAspectRatioPreset,
  setVideoFile,
  addVideoTrack,
  setAudioFile,
  addAudioTrack,
  undo,
  redo,
  togglePlay,
} = useMotionTimeline();

const { openExportModal } = useMotionExport();
const { isGeneratingSample, loadSampleMedia } = useSampleMedia();

const headerVideoInputRef = ref(null);
const headerAudioInputRef = ref(null);

function triggerHeaderVideoUpload() {
  headerVideoInputRef.value?.click();
}

function triggerHeaderAudioUpload() {
  headerAudioInputRef.value?.click();
}

function onHeaderVideoChange(e) {
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

function onHeaderAudioChange(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((file) => {
    const emptySlot = audioTracks.find((a) => !a.url);
    if (emptySlot) {
      setAudioFile(file, emptySlot.id);
    } else {
      addAudioTrack(file);
    }
  });
  e.target.value = '';
}

function onHeaderAspectChange(e) {
  setAspectRatioPreset(e.target.value);
}

function onGlobalKeyDown(e) {
  const tag = (e.target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  } else if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown);
  if (!videoTrack.url && !audioTrack.url) {
    loadSampleMedia();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown);
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#0B0D11] text-[#F1F5F9] overflow-hidden">
    <!-- Hidden File Inputs for Top Bar Quick Upload (Supports Multiple Files) -->
    <input
      ref="headerVideoInputRef"
      type="file"
      multiple
      accept="video/mp4,video/webm"
      class="hidden"
      @change="onHeaderVideoChange"
    />
    <input
      ref="headerAudioInputRef"
      type="file"
      multiple
      accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*"
      class="hidden"
      @change="onHeaderAudioChange"
    />

    <!-- 1. TOP HEADER (3-Zone Contract) -->
    <header
      class="h-14 shrink-0 px-5 bg-[#11141B] border-b border-[#222733] flex items-center justify-between select-none"
    >
      <!-- Zone 1: Single Brand Wordmark -->
      <a href="#top" class="font-display text-lg font-extrabold tracking-wider text-white whitespace-nowrap">
        VINSTOCK
      </a>

      <!-- Zone 2: Project Title & Media Upload Controls -->
      <nav class="flex items-center gap-5 text-xs font-medium text-slate-300">
        <span class="text-slate-200 font-semibold whitespace-nowrap">
          Motion Export Prototype
        </span>
        <span class="text-slate-600" aria-hidden="true">·</span>
        <button
          type="button"
          class="hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
          @click="triggerHeaderVideoUpload"
        >
          Upload Video
        </button>
        <button
          type="button"
          class="hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
          @click="triggerHeaderAudioUpload"
        >
          Upload Audio
        </button>
        <button
          type="button"
          :disabled="isGeneratingSample"
          class="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          @click="loadSampleMedia"
        >
          {{ isGeneratingSample ? 'Loading Sample...' : 'Reload Sample Media' }}
        </button>
        <span class="hidden lg:inline text-slate-600" aria-hidden="true">·</span>
        <select
          :value="composition.aspectRatio"
          class="hidden lg:inline-block bg-[#0B0D11] border border-[#242A38] rounded px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          title="Select Composition Aspect Ratio & Screen Size"
          @change="onHeaderAspectChange"
        >
          <option
            v-for="preset in aspectPresets"
            :key="preset.id"
            :value="preset.id"
          >
            {{ preset.name }} ({{ preset.width }}×{{ preset.height }})
          </option>
          <option v-if="!aspectPresets.some((p) => p.id === composition.aspectRatio)" :value="composition.aspectRatio">
            Custom ({{ composition.width }}×{{ composition.height }})
          </option>
        </select>
      </nav>

      <!-- Zone 3: Primary Export Action -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          @click="openExportModal"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export MP4 / WebM</span>
        </button>
      </div>
    </header>

    <!-- 2. MAIN WORKSPACE: Center/Left Preview Canvas + Right Contextual Properties Panel -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <PreviewCanvas />
      <PropertiesPanel />
    </div>

    <!-- 3. MASTER TIMELINE: Playback Controls + Ruler + Multi-Layer Synchronized Tracks -->
    <Timeline />

    <!-- 4. MP4 / WEBM EXPORT MODAL -->
    <ExportModal />
  </div>
</template>
