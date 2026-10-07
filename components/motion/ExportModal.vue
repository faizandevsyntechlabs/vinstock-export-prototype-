<script setup>
import { computed } from 'vue';
import { useMotionExport } from '../../composables/useMotionExport.js';
import { useMotionTimeline } from '../../composables/useMotionTimeline.js';

const { exportState, closeExportModal, startMp4Export, downloadMp4File } = useMotionExport();
const { composition, videoTrack, animationTrack, audioTrack, animations } = useMotionTimeline();

const steps = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'rendering', label: 'Rendering frames' },
  { key: 'processing', label: 'Processing media' },
  { key: 'encoding', label: 'Encoding' },
  { key: 'complete', label: 'Complete' },
];

const stepOrder = ['preparing', 'rendering', 'processing', 'encoding', 'complete'];

function isStepDone(stepKey) {
  if (exportState.status === 'complete') return true;
  const currentIdx = stepOrder.indexOf(exportState.status);
  const targetIdx = stepOrder.indexOf(stepKey);
  if (currentIdx === -1) return false;
  return targetIdx < currentIdx;
}

function isStepCurrent(stepKey) {
  return exportState.status === stepKey;
}

const isBusy = computed(() =>
  ['preparing', 'rendering', 'processing', 'encoding'].includes(exportState.status)
);

const activeAnimationName = computed(() => {
  const found = animations.find((a) => a.id === animationTrack.animationId);
  return found ? found.name : 'Animated Title';
});

const formattedFileSize = computed(() => {
  if (!exportState.fileSize) return '';
  const kb = exportState.fileSize / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
});
</script>

<template>
  <div
    v-if="exportState.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
  >
    <div
      class="w-full max-w-xl rounded-xl bg-[#11141B] border border-[#262C3A] shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-[#222733] flex items-center justify-between">
        <div>
          <h3 class="font-display text-lg font-bold text-white">Export Composition to MP4</h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Deterministic HTML/Vue frame rasterization + FFmpeg H.264 / AAC muxing
          </p>
        </div>
        <button
          v-if="!isBusy"
          type="button"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C212E] transition-colors cursor-pointer"
          @click="closeExportModal"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        <!-- Export Configuration & Track Summary -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Output Resolution ({{ composition.aspectRatio }})</label>
            <select
              v-model="exportState.resolution"
              :disabled="isBusy"
              class="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white disabled:opacity-50"
            >
              <option value="canvas">
                Full Screen ({{ composition.width }} × {{ composition.height }})
              </option>
              <option value="720p-scale">
                Scaled Fast ({{ Math.round((composition.width * 0.6667) / 2) * 2 }} × {{ Math.round((composition.height * 0.6667) / 2) * 2 }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Encoding Engine</label>
            <select
              v-model="exportState.engine"
              :disabled="isBusy"
              class="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-[#242A38] text-xs font-mono text-white disabled:opacity-50"
            >
              <option value="client-mp4">Browser H.264/AAC (Vercel Ready)</option>
              <option value="server-ffmpeg">Server FFmpeg (Auto-Fallback)</option>
            </select>
          </div>
        </div>

        <!-- Synchronized Track Summary -->
        <div class="p-3.5 rounded-lg bg-[#0B0D11] border border-[#222733] space-y-2 text-xs font-mono">
          <div class="flex items-center justify-between text-slate-300">
            <span class="text-amber-400">VINSTOCK Overlay</span>
            <span>
              {{ activeAnimationName }} ({{ (Number(animationTrack.startTime) || 0).toFixed(1) }}s –
              {{ ((Number(animationTrack.startTime) || 0) + (Number(animationTrack.duration) || 0)).toFixed(1) }}s)
            </span>
          </div>
          <div class="flex items-center justify-between text-slate-300">
            <span class="text-sky-400">Video Layer</span>
            <span>
              {{
                videoTrack.url
                  ? `${videoTrack.fileName} (${(Number(videoTrack.startTime) || 0).toFixed(1)}s – ${((Number(videoTrack.startTime) || 0) + (Number(videoTrack.duration) || 0)).toFixed(1)}s)`
                  : 'Canvas Backdrop Only'
              }}
            </span>
          </div>
          <div class="flex items-center justify-between text-slate-300">
            <span class="text-emerald-400">Audio Track</span>
            <span>
              {{
                audioTrack.url && !audioTrack.muted
                  ? `${audioTrack.fileName} (Vol ${Math.round(audioTrack.volume * 100)}%)`
                  : 'Muted / Silent AAC Stream'
              }}
            </span>
          </div>
        </div>

        <!-- 5-Stage Export Pipeline Checklist -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-200">{{ exportState.phaseLabel }}</span>
            <span class="font-mono text-amber-400">
              <template v-if="exportState.totalFrames > 0 && isBusy">
                Frame {{ exportState.currentFrame }} / {{ exportState.totalFrames }} ·
              </template>
              {{ exportState.progress }}%
            </span>
          </div>

          <div class="w-full h-2 rounded-full bg-[#0B0D11] border border-[#222733] overflow-hidden">
            <div
              class="h-full bg-amber-500 transition-all duration-150"
              :style="{ width: `${exportState.progress}%` }"
            />
          </div>

          <div class="grid grid-cols-5 gap-1.5 pt-1">
            <div
              v-for="step in steps"
              :key="step.key"
              class="px-2 py-1.5 rounded border text-center text-[11px] font-mono transition-colors"
              :class="
                isStepDone(step.key)
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : isStepCurrent(step.key)
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                    : 'bg-[#0B0D11] border-[#1E232E] text-slate-500'
              "
            >
              {{ step.label }}
            </div>
          </div>
        </div>

        <!-- Error Banner -->
        <div
          v-if="exportState.status === 'error'"
          class="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-xs text-red-200"
        >
          {{ exportState.errorMessage }}
        </div>

        <!-- Completed MP4 Preview & Download -->
        <div
          v-if="exportState.status === 'complete' && exportState.downloadUrl"
          class="space-y-3 pt-1"
        >
          <div class="flex items-center justify-between text-xs font-mono text-emerald-400">
            <span>MP4 Export Ready ({{ exportState.resolution }} · {{ exportState.codec }})</span>
            <span v-if="formattedFileSize">{{ formattedFileSize }}</span>
          </div>

          <video
            :src="exportState.downloadUrl"
            controls
            playsinline
            class="w-full rounded-lg border border-[#262C3A] bg-black aspect-video"
          />
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div class="px-6 py-4 bg-[#0D1016] border-t border-[#222733] flex items-center justify-between">
        <button
          type="button"
          :disabled="isBusy"
          class="px-4 py-2 rounded-lg bg-[#181C26] hover:bg-[#222836] text-xs font-medium text-slate-300 border border-[#262C3A] transition-colors disabled:opacity-40 cursor-pointer"
          @click="closeExportModal"
        >
          Close
        </button>

        <div class="flex items-center gap-2.5">
          <button
            v-if="exportState.status === 'complete' && exportState.downloadUrl"
            type="button"
            class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            @click="downloadMp4File"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download MP4</span>
          </button>

          <button
            type="button"
            :disabled="isBusy"
            class="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            @click="startMp4Export"
          >
            {{
              isBusy
                ? 'Rendering & Encoding...'
                : exportState.status === 'complete'
                  ? 'Re-Export MP4'
                  : 'Start MP4 Export'
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
