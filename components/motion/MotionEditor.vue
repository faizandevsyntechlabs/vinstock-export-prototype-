<script setup>
import { ref, onMounted } from 'vue';
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
  audioTrack,
  setVideoFile,
  setAudioFile,
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
  const file = e.target.files?.[0];
  if (file) {
    setVideoFile(file);
  }
}

function onHeaderAudioChange(e) {
  const file = e.target.files?.[0];
  if (file) {
    setAudioFile(file);
  }
}

onMounted(() => {
  // Initialize studio sample video & audio if none uploaded yet so all 3 tracks are immediately playable
  if (!videoTrack.url && !audioTrack.url) {
    loadSampleMedia();
  }
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#0B0D11] text-[#F1F5F9] overflow-hidden">
    <!-- Hidden File Inputs for Top Bar Quick Upload -->
    <input
      ref="headerVideoInputRef"
      type="file"
      accept="video/mp4,video/webm"
      class="hidden"
      @change="onHeaderVideoChange"
    />
    <input
      ref="headerAudioInputRef"
      type="file"
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
        <span class="hidden lg:inline font-mono text-slate-400 whitespace-nowrap">
          {{ composition.previewQuality }}
        </span>
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
          <span>Export MP4</span>
        </button>
      </div>
    </header>

    <!-- 2. MAIN WORKSPACE: Center/Left Preview Canvas + Right Contextual Properties Panel -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <PreviewCanvas />
      <PropertiesPanel />
    </div>

    <!-- 3. MASTER TIMELINE: Playback Controls + Ruler + 3 Synchronized Tracks -->
    <Timeline />

    <!-- 4. REAL FFMPEG MP4 EXPORT MODAL -->
    <ExportModal />
  </div>
</template>
