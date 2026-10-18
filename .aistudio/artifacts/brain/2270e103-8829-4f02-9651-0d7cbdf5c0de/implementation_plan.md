# Home Screen & Backend Engine Audit Implementation Plan

Comprehensive audit and upgrade plan for Klyp's Home view and backend download/extraction engine. Implements batch multi-line URL extraction, direct clipboard paste integration, active transfer monitoring widgets, recent downloads library preview, and actionable error recovery.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following functional and interface decisions were confirmed to enhance the Home dashboard and backend extraction pipeline:

- **Confirmed Decision 1 (Batch URLs & Clipboard Integration)**: The Home input will support both single URLs and multi-line batch URL input (allowing users to paste up to 20 URLs at once), accompanied by a "Paste from Clipboard" button with automatic protocol validation.
- **Confirmed Decision 2 (Direct Dashboard Widgets)**: The Home view will incorporate two live workflow widgets: an active transfer progress card (with real-time speed, ETA, and pause/resume controls) and a recent completed downloads section (allowing 1-click playback and disk export).
- **Confirmed Decision 3 (Actionable Error Handling & Server Resilience)**: Extraction failures will display actionable toasts and inline alerts with a 1-click Retry button, diagnostic explanation, and intelligent fallbacks (such as suggesting Audio-only extraction or proxy routing).

---

## 1. Overview & Core Concept

- **What It Does**: Transforms Klyp's Home view from a simple URL box into an intelligent media command center. Users can paste single or batch URLs directly from the clipboard, immediately see extraction results and playlist detection, monitor active downloads in real time without leaving the page, and instantly replay recent completions.
- **Target Audience / Persona**: Users who frequently queue content from YouTube, Vimeo, Bilibili, TikTok, SoundCloud, and streaming platforms and want rapid queueing and immediate feedback.
- **Key Value**: Drastically reduces repetitive actions, eliminates navigation friction to the Queue view for quick downloads, and improves backend reliability.

---

## 2. User Experience & Visual Design

### Key User Flows & Interactions

1. **Intelligent URL Extraction with Multi-Line & Clipboard Support**:
   - Primary input toggles seamlessly between single-line and expandable multi-line text input.
   - Dedicated "Paste from Clipboard" button uses `navigator.clipboard.readText()` to auto-insert and clean copied URLs.
   - When multiple URLs are detected, a batch badge indicates `3 URLs detected`, extracting them concurrently with individual progress spinners.
2. **Actionable Error Recovery**:
   - If an extraction fails (e.g. platform rate limit, bot challenge, or private video), Klyp displays a clear alert showing the exact error, with an instant **Retry** button and alternative suggestions (e.g., "Switch to Audio Extraction" or "Try via Search Screen").
3. **Live Active Transfer Widget on Home**:
   - If a download is running in the background, a compact card appears on the Home dashboard showing the media thumbnail, title, live speed (e.g. `4.2 MB/s`), remaining time (`ETA 00:35`), and inline Pause/Resume controls.
4. **Recent Downloads Carousel / Quick-Access Row**:
   - Displays the last 3-4 completed downloads with media thumbnail, title, format badge, and a prominent 1-click **Play** button that triggers the built-in media player modal.

### Visual Styling & Component Hierarchy

- **Header**: Standardized `PageHeader` with Klyp brand icon, version badge, and server engine status (`yt-dlp 2026.08.19 & FFmpeg 4.4`).
- **Elevated Cards**: Standardized `SurfaceCard` components using `#252526` surface and `#2d2d2d` borders.
- **Input Styling**: `#1e1e1e` background with focus border `#10b981`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Batch URL Parsing on Client & Server**
  - *Chosen Approach*: The client splits multiline input into cleaned URLs and sends them to `/api/extract/batch`. The server handles them concurrently with a concurrency limit of 5.
  - *Why*: Prevents server thread exhaustion while delivering instantaneous feedback for playlists and batch links.
  - *Alternatives Considered*: Forcing users to submit one URL at a time (rejected as cumbersome for album and video series workflows).
- **Decision 2: Direct Home Dashboard Monitoring**
  - *Chosen Approach*: Surface active transfer status and recent items directly on Home.
  - *Why*: Reduces context switching according to Fitts's Law; users can immediately verify that their download started without navigating to the Queue tab.
  - *Alternatives Considered*: Strictly hiding downloads inside the Queue tab (rejected as inefficient).

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              HomeScreen                                │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ PageHeader (Klyp Title, Engine Health Status Badge)               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ SurfaceCard: Media Download Input                                 │ │
│  │  • Single / Multi-line input toggle                               │ │
│  │  • "Paste from Clipboard" button                                  │ │
│  │  • Quick test URL chips                                           │ │
│  │  • Actionable extraction error banner with Retry & Fallback       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ SurfaceCard: Active Download Progress Widget (Conditional)        │ │
│  │  • Thumbnail, Title, Speed, ETA, % Bar                            │ │
│  │  • Pause / Resume and "Open Queue" shortcut                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ SurfaceCard: Recent Downloads (History Preview)                   │ │
│  │  • Last 3 completed items with 1-click Play and Disk Export       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ SurfaceCard: Quick Actions Grid (Music, Search, Queue, Subs)      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Backend Endpoint Additions in `server.ts`

1. `POST /api/extract/batch`: Accepts an array of `{ urls: string[] }`, runs concurrent extraction, and returns array of `{ results: VideoInfo[], errors: { url, error }[] }`.
2. `GET /api/engine/health`: Returns engine availability (`yt-dlp` binary version, `ffmpeg` version, downloads folder path and free space).

---

## Verification & Testing Plan

1. **URL Input & Clipboard Testing**: Test pasting single YouTube/Vimeo links and pasting 3 multi-line URLs simultaneously. Test clipboard paste button.
2. **Extraction & Error Handling**: Test valid and invalid/malformed URLs to verify that the actionable error alert renders with the Retry button.
3. **Live Active Download Widget**: Enqueue a download and verify that the active transfer progress widget updates smoothly on the Home screen.
4. **Recent Completed Downloads**: Complete a download and verify that it immediately appears in the Home recent items row with working media playback.
5. **Compilation & Lint Verification**: Run `compile_applet` and `lint_applet` to ensure zero compilation or TypeScript errors.
