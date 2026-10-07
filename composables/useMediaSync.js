import { watch, onBeforeUnmount } from 'vue';
import { useMotionTimeline, clamp } from './useMotionTimeline.js';

const videoElementsMap = new Map();
const audioElementsMap = new Map();

export function useMediaSync() {
  const {
    composition,
    videoTrack,
    videoTracks,
    audioTrack,
    audioTracks,
    isVideoActive,
    isAudioActive,
    onSeek,
  } = useMotionTimeline();

  function registerVideoElement(trackIdOrEl, maybeEl) {
    if (typeof trackIdOrEl === 'string') {
      if (maybeEl) {
        videoElementsMap.set(trackIdOrEl, maybeEl);
      } else {
        videoElementsMap.delete(trackIdOrEl);
      }
    } else if (trackIdOrEl) {
      const id = videoTracks[0]?.id || 'video_1';
      videoElementsMap.set(id, trackIdOrEl);
    }
    syncVideoState(true);
  }

  function registerAudioElement(trackIdOrEl, maybeEl) {
    if (typeof trackIdOrEl === 'string') {
      if (maybeEl) {
        audioElementsMap.set(trackIdOrEl, maybeEl);
      } else {
        audioElementsMap.delete(trackIdOrEl);
      }
    } else if (trackIdOrEl) {
      const id = audioTracks[0]?.id || 'audio_1';
      audioElementsMap.set(id, trackIdOrEl);
    }
    syncAudioState(true);
  }

  function syncSingleVideoTrack(vTrack, forceSeek = false) {
    const videoEl = videoElementsMap.get(vTrack.id);
    if (!videoEl || !vTrack.url || composition.isExporting) return;

    const rate = clamp(Number(vTrack.playbackRate) || 1, 0.25, 4);
    if (Math.abs((videoEl.playbackRate || 1) - rate) > 0.01) {
      try {
        videoEl.playbackRate = rate;
      } catch (_e) {}
    }

    videoEl.volume = clamp(Number(vTrack.volume ?? 0.8), 0, 1);

    const vStart = Number(vTrack.startTime) || 0;
    const vDur = Math.max(0.1, Number(vTrack.duration) || 0);
    const trimIn = Math.max(0, Number(vTrack.trimStart) || 0);
    const maxMediaDur = Math.max(0.2, videoEl.duration || vTrack.naturalDuration || 10);
    const trimOut = clamp(Number(vTrack.trimEnd) || maxMediaDur, trimIn + 0.1, maxMediaDur);

    const elapsedInClip = composition.currentTime - vStart;
    const withinWindow =
      composition.currentTime >= vStart &&
      composition.currentTime <= vStart + vDur;

    if (withinWindow) {
      const clampedSourceTime = clamp(trimIn + elapsedInClip * rate, trimIn, trimOut);
      const drift = Math.abs((videoEl.currentTime || 0) - clampedSourceTime);

      if (forceSeek || !composition.isPlaying) {
        if (drift > 0.03) {
          try {
            videoEl.currentTime = clampedSourceTime;
          } catch (_e) {}
        }
      } else if (drift > 0.24 * rate) {
        try {
          videoEl.currentTime = clampedSourceTime;
        } catch (_e) {}
      }

      if (composition.isPlaying && videoEl.paused && (videoEl.currentTime || 0) < trimOut - 0.02) {
        videoEl.play().catch(() => {});
      } else if (
        (!composition.isPlaying || (videoEl.currentTime || 0) >= trimOut) &&
        !videoEl.paused
      ) {
        videoEl.pause();
      }
    } else {
      if (!videoEl.paused) {
        videoEl.pause();
      }
    }
  }

  function syncVideoState(forceSeek = false) {
    if (composition.isExporting) return;
    for (const vTrack of videoTracks) {
      syncSingleVideoTrack(vTrack, forceSeek);
    }
  }

  function computeAudioFadeMultiplier(aTrack, elapsedInClip, clipDuration) {
    const fadeIn = Math.max(0, Number(aTrack.fadeIn) || 0);
    const fadeOut = Math.max(0, Number(aTrack.fadeOut) || 0);
    let mult = 1;
    if (fadeIn > 0.01 && elapsedInClip < fadeIn) {
      mult *= clamp(elapsedInClip / fadeIn, 0, 1);
    }
    const remaining = clipDuration - elapsedInClip;
    if (fadeOut > 0.01 && remaining < fadeOut) {
      mult *= clamp(remaining / fadeOut, 0, 1);
    }
    return clamp(mult, 0, 1);
  }

  function syncSingleAudioTrack(aTrack, forceSeek = false) {
    const audioEl = audioElementsMap.get(aTrack.id);
    if (!audioEl || !aTrack.url || composition.isExporting) return;

    const rate = clamp(Number(aTrack.playbackRate) || 1, 0.25, 4);
    if (Math.abs((audioEl.playbackRate || 1) - rate) > 0.01) {
      try {
        audioEl.playbackRate = rate;
      } catch (_e) {}
    }

    const aStart = Number(aTrack.startTime) || 0;
    const aDur = Math.max(0.1, Number(aTrack.duration) || 0);
    const trimIn = Math.max(0, Number(aTrack.trimStart) || 0);
    const maxMediaDur = Math.max(0.2, audioEl.duration || aTrack.naturalDuration || 10);
    const trimOut = clamp(Number(aTrack.trimEnd) || maxMediaDur, trimIn + 0.1, maxMediaDur);

    const elapsedInClip = composition.currentTime - aStart;
    const withinWindow =
      composition.currentTime >= aStart &&
      composition.currentTime <= aStart + aDur;

    const fadeMult = withinWindow ? computeAudioFadeMultiplier(aTrack, elapsedInClip, aDur) : 0;
    audioEl.muted = Boolean(aTrack.muted);
    audioEl.volume = aTrack.muted
      ? 0
      : clamp(Number(aTrack.volume ?? 0.85) * fadeMult, 0, 1);

    if (withinWindow && !aTrack.muted) {
      const clampedLocal = clamp(trimIn + elapsedInClip * rate, trimIn, trimOut);
      const drift = Math.abs((audioEl.currentTime || 0) - clampedLocal);

      if (forceSeek || !composition.isPlaying) {
        if (drift > 0.03) {
          try {
            audioEl.currentTime = clampedLocal;
          } catch (_e) {}
        }
      } else if (drift > 0.24 * rate) {
        try {
          audioEl.currentTime = clampedLocal;
        } catch (_e) {}
      }

      if (composition.isPlaying && audioEl.paused && (audioEl.currentTime || 0) < trimOut - 0.02) {
        audioEl.play().catch(() => {});
      } else if (
        (!composition.isPlaying || (audioEl.currentTime || 0) >= trimOut) &&
        !audioEl.paused
      ) {
        audioEl.pause();
      }
    } else {
      if (!audioEl.paused) {
        audioEl.pause();
      }
    }
  }

  function syncAudioState(forceSeek = false) {
    if (composition.isExporting) return;
    for (const aTrack of audioTracks) {
      syncSingleAudioTrack(aTrack, forceSeek);
    }
  }

  function seekSingleVideoForExport(vTrack, masterTimeSec) {
    return new Promise((resolve) => {
      const videoEl = videoElementsMap.get(vTrack.id);
      if (!videoEl || !vTrack.url) {
        resolve(null);
        return;
      }

      const vStart = Number(vTrack.startTime) || 0;
      const vDur = Math.max(0.1, Number(vTrack.duration) || 0);
      const withinWindow = masterTimeSec >= vStart && masterTimeSec <= vStart + vDur;

      if (!withinWindow) {
        resolve(null);
        return;
      }

      if (!videoEl.paused) {
        videoEl.pause();
      }

      const rate = clamp(Number(vTrack.playbackRate) || 1, 0.25, 4);
      const maxDur = Math.max(0.05, (videoEl.duration || vTrack.naturalDuration || 10) - 0.01);
      const trimIn = Math.max(0, Number(vTrack.trimStart) || 0);
      const trimOut = clamp(Number(vTrack.trimEnd) || maxDur, trimIn + 0.05, maxDur);
      const targetLocal = clamp(trimIn + (masterTimeSec - vStart) * rate, trimIn, trimOut);

      if (Math.abs(videoEl.currentTime - targetLocal) < 0.015 && videoEl.readyState >= 2) {
        resolve({ track: vTrack, videoEl });
        return;
      }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        videoEl.removeEventListener('seeked', done);
        resolve({ track: vTrack, videoEl });
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

  /**
   * Seeks all active video tracks at `masterTimeSec` in parallel for multi-video MP4/WebM export.
   */
  async function seekAllVideosForExport(masterTimeSec) {
    const promises = videoTracks.map((vTrack) => seekSingleVideoForExport(vTrack, masterTimeSec));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
  }

  // Legacy single-video helper for backward compatibility
  async function seekVideoElementForExport(masterTimeSec) {
    const first = await seekSingleVideoForExport(videoTrack, masterTimeSec);
    return first ? first.videoEl : null;
  }

  const stopWatch = watch(
    () => [
      composition.currentTime,
      composition.isPlaying,
      videoTracks
        .map(
          (v) =>
            `${v.id}:${v.startTime}:${v.duration}:${v.trimStart}:${v.trimEnd}:${v.playbackRate}:${v.volume}:${v.url}`
        )
        .join('|'),
      audioTracks
        .map(
          (a) =>
            `${a.id}:${a.startTime}:${a.duration}:${a.trimStart}:${a.trimEnd}:${a.playbackRate}:${a.fadeIn}:${a.fadeOut}:${a.volume}:${a.muted}:${a.url}`
        )
        .join('|'),
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
    registerVideoElement,
    registerAudioElement,
    syncVideoState,
    syncAudioState,
    seekVideoElementForExport,
    seekAllVideosForExport,
    isVideoActive,
    isAudioActive,
  };
}
