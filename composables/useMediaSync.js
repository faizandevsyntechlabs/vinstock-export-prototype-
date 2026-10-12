import { watch, onBeforeUnmount } from 'vue';
import { useMotionTimeline, isTrackActiveAt, clamp } from './useMotionTimeline.js';

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
    setMediaTimeProvider,
  } = useMotionTimeline();

  // Register master timeline media clock provider:
  // When an active video (or audio) is playing smoothly, anchor the timeline's clock
  // to the media element's hardware presentation clock. This completely eliminates
  // drift and avoids continuous decoder-flushing seeks!
  if (typeof setMediaTimeProvider === 'function') {
    setMediaTimeProvider((currentMasterTime) => {
      // 1. Try active playing video
      for (const vTrack of videoTracks) {
        const videoEl = videoElementsMap.get(vTrack.id);
        if (
          videoEl &&
          !videoEl.paused &&
          !videoEl.seeking &&
          videoEl.readyState >= 2 &&
          vTrack.url &&
          isTrackActiveAt(vTrack, currentMasterTime)
        ) {
          const vStart = Number(vTrack.startTime) || 0;
          const trimIn = Math.max(0, Number(vTrack.trimStart) || 0);
          const rate = clamp(Number(vTrack.playbackRate) || 1, 0.25, 4);
          const mediaMasterTime = vStart + (videoEl.currentTime - trimIn) / rate;
          if (Math.abs(currentMasterTime - mediaMasterTime) < 0.9) {
            return mediaMasterTime;
          }
        }
      }

      // 2. Otherwise try active playing audio
      for (const aTrack of audioTracks) {
        const audioEl = audioElementsMap.get(aTrack.id);
        if (
          audioEl &&
          !audioEl.paused &&
          !audioEl.seeking &&
          audioEl.readyState >= 2 &&
          aTrack.url &&
          !aTrack.muted &&
          isTrackActiveAt(aTrack, currentMasterTime)
        ) {
          const aStart = Number(aTrack.startTime) || 0;
          const trimIn = Math.max(0, Number(aTrack.trimStart) || 0);
          const rate = clamp(Number(aTrack.playbackRate) || 1, 0.25, 4);
          const mediaMasterTime = aStart + (audioEl.currentTime - trimIn) / rate;
          if (Math.abs(currentMasterTime - mediaMasterTime) < 0.9) {
            return mediaMasterTime;
          }
        }
      }

      return null;
    });
  }

  function registerVideoElement(trackIdOrEl, maybeEl) {
    const id = typeof trackIdOrEl === 'string' ? trackIdOrEl : (videoTracks[0]?.id || 'video_1');
    const el = typeof trackIdOrEl === 'string' ? maybeEl : trackIdOrEl;

    const existing = videoElementsMap.get(id);
    if (!el) {
      if (existing) videoElementsMap.delete(id);
      return;
    }
    if (existing === el) {
      // Element is already registered! Vue template re-renders call inline refs constantly;
      // returning here prevents continuous force-seeks and decoder pipeline thrashing.
      return;
    }

    videoElementsMap.set(id, el);
    const track = videoTracks.find((v) => v.id === id) || videoTracks[0];
    if (track) {
      syncSingleVideoTrack(track, false);
    }
  }

  function registerAudioElement(trackIdOrEl, maybeEl) {
    const id = typeof trackIdOrEl === 'string' ? trackIdOrEl : (audioTracks[0]?.id || 'audio_1');
    const el = typeof trackIdOrEl === 'string' ? maybeEl : trackIdOrEl;

    const existing = audioElementsMap.get(id);
    if (!el) {
      if (existing) audioElementsMap.delete(id);
      return;
    }
    if (existing === el) {
      return;
    }

    audioElementsMap.set(id, el);
    const track = audioTracks.find((a) => a.id === id) || audioTracks[0];
    if (track) {
      syncSingleAudioTrack(track, false);
    }
  }

  function syncSingleVideoTrack(vTrack, forceSeek = false) {
    const videoEl = videoElementsMap.get(vTrack.id);
    if (!videoEl || !vTrack.url || composition.isExporting) return;

    const userRate = clamp(Number(vTrack.playbackRate) || 1, 0.25, 4);
    const vol = clamp(Number(vTrack.volume ?? 0.8), 0, 1);
    videoEl.volume = vol;
    videoEl.muted = vol === 0;

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
      const clampedSourceTime = clamp(trimIn + elapsedInClip * userRate, trimIn, trimOut);
      const currentTime = videoEl.currentTime || 0;
      const drift = currentTime - clampedSourceTime; // positive: video leads, negative: video lags
      const absDrift = Math.abs(drift);

      if (forceSeek || !composition.isPlaying) {
        // Paused, scrubbing, or explicit seek: seek precisely to clampedSourceTime
        if (absDrift > 0.02 && !videoEl.seeking) {
          try {
            videoEl.currentTime = clampedSourceTime;
          } catch (_e) {}
        }
        if (Math.abs((videoEl.playbackRate || 1) - userRate) > 0.01) {
          try {
            videoEl.playbackRate = userRate;
          } catch (_e) {}
        }
      } else {
        // Continuous playback:
        // Use Phase-Locked Loop (PLL) micro-adjustments instead of seeking!
        // This eliminates hardware decoder thrashing, dropped frames, and slow-motion stutter.
        if (absDrift > 0.9 && !videoEl.seeking) {
          try {
            videoEl.currentTime = clampedSourceTime;
          } catch (_e) {}
        } else {
          let targetRate = userRate;
          if (drift < -0.06) {
            targetRate = Math.min(4, userRate * 1.05);
          } else if (drift > 0.06) {
            targetRate = Math.max(0.25, userRate * 0.95);
          }
          if (Math.abs((videoEl.playbackRate || 1) - targetRate) > 0.01) {
            try {
              videoEl.playbackRate = targetRate;
            } catch (_e) {}
          }
        }
      }

      if (composition.isPlaying) {
        if (videoEl.paused && currentTime < trimOut - 0.05) {
          const p = videoEl.play();
          if (p !== undefined) {
            p.catch(() => {});
          }
        } else if (currentTime >= trimOut - 0.02 && !videoEl.paused) {
          videoEl.pause();
        }
      } else if (!videoEl.paused) {
        videoEl.pause();
      }
    } else {
      if (!videoEl.paused) {
        videoEl.pause();
      }
      if (forceSeek && !videoEl.seeking) {
        const target = composition.currentTime < vStart ? trimIn : trimOut;
        if (Math.abs((videoEl.currentTime || 0) - target) > 0.05) {
          try {
            videoEl.currentTime = target;
          } catch (_e) {}
        }
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

    const userRate = clamp(Number(aTrack.playbackRate) || 1, 0.25, 4);
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
      const clampedLocal = clamp(trimIn + elapsedInClip * userRate, trimIn, trimOut);
      const currentTime = audioEl.currentTime || 0;
      const drift = currentTime - clampedLocal;
      const absDrift = Math.abs(drift);

      if (forceSeek || !composition.isPlaying) {
        if (absDrift > 0.03 && !audioEl.seeking) {
          try {
            audioEl.currentTime = clampedLocal;
          } catch (_e) {}
        }
        if (Math.abs((audioEl.playbackRate || 1) - userRate) > 0.01) {
          try {
            audioEl.playbackRate = userRate;
          } catch (_e) {}
        }
      } else {
        if (absDrift > 0.9 && !audioEl.seeking) {
          try {
            audioEl.currentTime = clampedLocal;
          } catch (_e) {}
        } else {
          let targetRate = userRate;
          if (drift < -0.06) {
            targetRate = Math.min(4, userRate * 1.05);
          } else if (drift > 0.06) {
            targetRate = Math.max(0.25, userRate * 0.95);
          }
          if (Math.abs((audioEl.playbackRate || 1) - targetRate) > 0.01) {
            try {
              audioEl.playbackRate = targetRate;
            } catch (_e) {}
          }
        }
      }

      if (composition.isPlaying) {
        if (audioEl.paused && currentTime < trimOut - 0.05) {
          const p = audioEl.play();
          if (p !== undefined) {
            p.catch(() => {});
          }
        } else if (currentTime >= trimOut - 0.02 && !audioEl.paused) {
          audioEl.pause();
        }
      } else if (!audioEl.paused) {
        audioEl.pause();
      }
    } else {
      if (!audioEl.paused) {
        audioEl.pause();
      }
      if (forceSeek && !audioEl.seeking) {
        const target = composition.currentTime < aStart ? trimIn : trimOut;
        if (Math.abs((audioEl.currentTime || 0) - target) > 0.05) {
          try {
            audioEl.currentTime = target;
          } catch (_e) {}
        }
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
