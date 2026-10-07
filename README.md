# VINSTOCK Motion Export Prototype

A working proof-of-concept for the **VINSTOCK Motion Export** capability. It demonstrates that a browser-rendered HTML/Vue animation overlay, an uploaded video file, and an uploaded audio file can be synchronized on a single master timeline, previewed live, customized contextually, and exported into a single playable H.264/AAC `.mp4` file using FFmpeg.

---

## 1. Dependencies & Why Each Was Added

- **`vue` & `@vitejs/plugin-vue`**: Enables Vue 3 Composition API (`.vue` Single File Components) in JavaScript (`<script setup>`).
- **`ffmpeg-static`** (alongside system `/usr/bin/ffmpeg`): Provides a reliable FFmpeg binary on the server for encoding frame sequences into `libx264` (`yuv420p`) video and mixing/delaying/trimming uploaded audio into `aac` inside a faststart `.mp4` container.
- **`tailwindcss` & `@tailwindcss/vite`**: Utility-first styling for the dark-themed VINSTOCK studio editor interface.

---

## 2. How to Install & Run

```bash
# Install dependencies
npm install

# Start the development server (Express FFmpeg API + Vite Vue 3 frontend on port 3000)
npm run dev

# Build for production
npm run build
```

---

## 3. Project Structure (Nuxt / Vue 3 Compatible)

```text
pages/
  motion-editor.vue                 # Nuxt-ready page wrapper
components/motion/
  MotionEditor.vue                  # Top header, workspace layout, and modal orchestration
  PreviewCanvas.vue                 # 1920×1080 logical 16:9 composition stage with drag/resize
  Timeline.vue                      # Master timeline with playhead & 3 synchronized tracks
  TimelineTrack.vue                 # Draggable & resizable track block row
  TimelineRuler.vue                 # Interactive timecode ruler with click/drag scrubbing
  PlaybackControls.vue              # Play, pause, restart, frame-step, and timecode readout
  PropertiesPanel.vue               # Single contextual right-side inspector
  AnimationProperties.vue           # Contextual settings for VINSTOCK HTML/Vue overlays
  AnimationPicker.vue               # Picker for the 4 included VINSTOCK animations
  VideoProperties.vue               # Contextual settings for uploaded video track
  AudioProperties.vue               # Contextual settings for uploaded audio track
  ExportModal.vue                   # 5-stage real FFmpeg MP4 export modal & preview player
  animations/
    AnimatedTitle.vue               # Animation 1: Kinetic headline & reveal bar
    LowerThird.vue                  # Animation 2: Broadcast lower-third nameplate
    ShapeReveal.vue                 # Animation 3: Geometric logo / shape reveal
    AnimatedBadge.vue               # Animation 4: Promotional callout badge
composables/
  useMotionTimeline.js              # Master clock, track state, and deterministic envelope math
  useMediaSync.js                   # Synchronizes <video> and <audio> elements to master clock
  useMotionExport.js                # Frame-by-frame compositor and FFmpeg export client
  useSampleMedia.js                 # Generates playable sample WebM video & WAV audio on load
server/api/
  export-mp4.js                     # Server-side FFmpeg H.264 + AAC muxing & download endpoints
```

---

## 4. How to Use the Editor

1. **Sample Media or Custom Upload**: On launch, a synthesized studio backdrop video and stereo WAV audio score are loaded automatically so you can test playback and export immediately. Click **Upload Video** (`MP4` / `WebM`) or **Upload Audio** (`MP3` / `WAV` / `M4A`) in the top bar or right inspector to load your own media files.
2. **Choose a VINSTOCK Animation**: Select the **VINSTOCK Animation** track (or the **Animation** tab in the right panel) and pick one of the 4 browser-rendered Vue animations (`Animated Title`, `Lower Third`, `Logo / Shape Reveal`, `Callout / Badge`).
3. **Customize Track Properties**:
   - **Animation**: Edit text, font size, accent color, X/Y position, scale, animation speed, start time, and duration. You can also drag the animation directly on the preview canvas.
   - **Video**: Edit start time, duration, X/Y position, width, height, scale, and volume. You can also drag and resize the video directly on the preview canvas.
   - **Audio**: Edit start time, duration, volume slider, or mute/unmute.
4. **Scrub & Play**: Use the timeline ruler or transport controls (`Play`, `Pause`, `Restart`) to scrub or play the synchronized composition.
5. **Export MP4**: Click **Export MP4** in the top header, choose `1280 × 720` or `1920 × 1080` (`30 FPS`), and click **Start MP4 Export**. Preview the resulting MP4 right in the modal or click **Download MP4**.

---

## 5. How Master Timeline & HTML/Vue Animation Synchronization Works

- **Single Source of Truth (`useMotionTimeline.js`)**: `composition.currentTime`, `composition.duration`, and `composition.isPlaying` drive the entire application via a `requestAnimationFrame` clock.
- **Media Offset Math (`useMediaSync.js`)**:
  - Video local time is `composition.currentTime - videoTrack.startTime`, active only when `currentTime` is within `[startTime, startTime + duration]`.
  - Audio local time is `composition.currentTime - audioTrack.startTime`, active only when `currentTime` is within `[startTime, startTime + duration]` and `!audioTrack.muted`.
- **Deterministic Vue Animation Progress**:
  - Instead of free-running CSS animations that drift on pause or scrub, every Vue animation component receives `progress = clamp((currentTime - animationTrack.startTime) / animationTrack.duration, 0, 1)`.
  - `computeAnimationEnvelope(progress, duration, speed)` deterministically calculates entry easing (`enter`, `enterBack`), hold, and exit easing (`exit`, `visibility`) for any timestamp `t`.

---

## 6. How MP4 Export & FFmpeg Processing Work

1. **Preparing (`/api/export/init`)**: Creates an isolated render session directory and uploads the audio track buffer along with timing (`startTime`, `duration`) and gain (`volume`, `muted`) metadata.
2. **Rendering Frames (`/api/export/frames`)**: Steps `masterTime` frame-by-frame (`frameIdx / 30` from `0` to `duration`). For each frame:
   - Seeks the `<video>` element to `masterTime - videoTrack.startTime` and waits for the decoded frame (`seeked` event), drawing it with `(x, y, width * scale, height * scale)`.
   - Renders the active VINSTOCK animation at `masterTime` using the exact same `computeAnimationEnvelope` math and custom properties.
3. **FFmpeg Encoding (`/api/export/finalize`)**:
   - Encodes the frame sequence with `libx264` (`-pix_fmt yuv420p -preset fast -crf 20 -movflags +faststart`).
   - Filters the uploaded audio using FFmpeg's `atrim`, `volume`, `adelay` (in milliseconds matching `audioTrack.startTime * 1000`), and `apad`, encoding to stereo `aac` (`192k`).

---

## 7. Prototype Limitations vs. Production Integration with VINSTOCK

### Prototype-Only Simplifications
- **Single Track per Type**: Locked to 1 Video track, 1 VINSTOCK Animation track, and 1 Audio track.
- **2D Canvas Mirroring for Export**: To keep the standalone POC fast and dependency-light without requiring a headless Chromium cluster on the backend, the 4 prototype Vue animations share deterministic math (`computeAnimationEnvelope`) with the frame compositor.

### Reusable Architecture for Production VINSTOCK Integration
- **`pages/motion-editor.vue`, `components/motion/*`, and `composables/*`**: Written in standard Vue 3 Composition API (JavaScript) + Tailwind CSS so they can be copied directly into the existing VINSTOCK Nuxt application alongside the existing HTML export workflow.
- **Multi-Track Expansion**: `videoTrack`, `animationTrack`, and `audioTrack` use a normalized schema (`startTime`, `duration`, `x`, `y`, `scale`) that can be converted into arrays (`videoTracks[]`, `animationTracks[]`, `audioTracks[]`) with `zIndex` ordering.
- **Server-Side FFmpeg Pipeline (`server/api/export-mp4.js`)**: Can be moved directly into Nuxt's `server/api/` directory or scaled onto a background worker queue.
