import { ref, watch, onBeforeUnmount } from 'vue';
import { useMotionTimeline, clamp } from './useMotionTimeline.js';

const sharedVideoRef = ref(null);
const sharedAudioRef = ref(null);

export function useMediaSync() {
  const {
    composition,
    videoTrack,
    audioTrack,
    isVideoActive,
    isAudioActive,
    onSeek,
  } = useMotionTimeline();

  function registerVideoElement(el) {
    sharedVideoRef.value = el;
    syncVideoState(true);
  }

  function registerAudioElement(el) {
    sharedAudioRef.value = el;
    syncAudioState(true);
  }

  function syncVideoState(forceSeek = false) {
    const videoEl = sharedVideoRef.value;
    if (!videoEl || !videoTrack.url || composition.isExporting) return;

    videoEl.volume = clamp(Number(videoTrack.volume ?? 0.8), 0, 1);

    const localTime = composition.currentTime - videoTrack.startTime;
    const withinWindow =
      composition.currentTime >= videoTrack.startTime &&
      composition.currentTime <= videoTrack.startTime + videoTrack.duration;

    if (withinWindow) {
      const clampedLocal = clamp(localTime, 0, Math.max(0.1, videoEl.duration || videoTrack.naturalDuration || 10));
      const drift = Math.abs((videoEl.currentTime || 0) - clampedLocal);

      if (forceSeek || !composition.isPlaying) {
        if (drift > 0.03) {
          try {
            videoEl.currentTime = clampedLocal;
          } catch (_e) {
            // Ignore transient readiness errors
          }
        }
      } else if (drift > 0.22) {
        try {
          videoEl.currentTime = clampedLocal;
        } catch (_e) {
          // Ignore transient readiness errors
        }
      }

      if (composition.isPlaying && videoEl.paused) {
        videoEl.play().catch(() => {});
      } else if (!composition.isPlaying && !videoEl.paused) {
        videoEl.pause();
      }
    } else {
      if (!videoEl.paused) {
        videoEl.pause();
      }
    }
  }

  function syncAudioState(forceSeek = false) {
    const audioEl = sharedAudioRef.value;
    if (!audioEl || !audioTrack.url || composition.isExporting) return;

    audioEl.muted = Boolean(audioTrack.muted);
    audioEl.volume = audioTrack.muted ? 0 : clamp(Number(audioTrack.volume ?? 0.85), 0, 1);

    const localTime = composition.currentTime - audioTrack.startTime;
    const withinWindow =
      composition.currentTime >= audioTrack.startTime &&
      composition.currentTime <= audioTrack.startTime + audioTrack.duration;

    if (withinWindow && !audioTrack.muted) {
      const clampedLocal = clamp(localTime, 0, Math.max(0.1, audioEl.duration || audioTrack.naturalDuration || 10));
      const drift = Math.abs((audioEl.currentTime || 0) - clampedLocal);

      if (forceSeek || !composition.isPlaying) {
        if (drift > 0.03) {
          try {
            audioEl.currentTime = clampedLocal;
          } catch (_e) {}
        }
      } else if (drift > 0.22) {
        try {
          audioEl.currentTime = clampedLocal;
        } catch (_e) {}
      }

      if (composition.isPlaying && audioEl.paused) {
        audioEl.play().catch(() => {});
      } else if (!composition.isPlaying && !audioEl.paused) {
        audioEl.pause();
      }
    } else {
      if (!audioEl.paused) {
        audioEl.pause();
      }
    }
  }

  /**
   * Deterministic frame-accurate video seek used during MP4 export.
   */
  function seekVideoElementForExport(masterTimeSec) {
    return new Promise((resolve) => {
      const videoEl = sharedVideoRef.value;
      if (!videoEl || !videoTrack.url) {
        resolve(null);
        return;
      }

      const withinWindow =
        masterTimeSec >= videoTrack.startTime &&
        masterTimeSec <= videoTrack.startTime + videoTrack.duration;

      if (!withinWindow) {
        resolve(null);
        return;
      }

      if (!videoEl.paused) {
        videoEl.pause();
      }

      const maxDur = Math.max(0.05, (videoEl.duration || videoTrack.naturalDuration || 10) - 0.01);
      const targetLocal = clamp(masterTimeSec - videoTrack.startTime, 0, maxDur);

      if (Math.abs(videoEl.currentTime - targetLocal) < 0.015 && videoEl.readyState >= 2) {
        resolve(videoEl);
        return;
      }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        videoEl.removeEventListener('seeked', done);
        resolve(videoEl);
      };

      const timeoutId = setTimeout(done, 180);
      videoEl.addEventListener(
        'seeked',
        () => {
          clearTimeout(timeoutId);
          done();
        },
        { once: true }
      );

      try {
        videoEl.currentTime = targetLocal;
      } catch (_e) {
        clearTimeout(timeoutId);
        done();
      }
    });
  }

  const stopWatch = watch(
    () => [
      composition.currentTime,
      composition.isPlaying,
      videoTrack.startTime,
      videoTrack.duration,
      videoTrack.volume,
      videoTrack.url,
      audioTrack.startTime,
      audioTrack.duration,
      audioTrack.volume,
      audioTrack.muted,
      audioTrack.url,
    ],
    () => {
      syncVideoState(false);
      syncAudioState(false);
    }
  );

  const unsubscribeSeek = onSeek(() => {
    syncVideoState(true);
    syncAudioState(true);
  });

  onBeforeUnmount(() => {
    stopWatch();
    unsubscribeSeek();
  });

  return {
    sharedVideoRef,
    sharedAudioRef,
    registerVideoElement,
    registerAudioElement,
    syncVideoState,
    syncAudioState,
    seekVideoElementForExport,
    isVideoActive,
    isAudioActive,
  };
}
