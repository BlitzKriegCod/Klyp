# Real Implementation Plan: Klyp Fullstack Engine

This plan transitions Klyp from simulated frontend behaviors to fully functional backend implementations using **real `yt-dlp` process execution**, **hybrid multi-platform search**, and **live OpenSubtitles REST API connectivity**.

---

## 1. Architecture & Execution Strategy

### User Decisions Confirmed:
1. **Download Delivery**: Server executes real `yt-dlp` CLI commands in background child processes, monitors real stdout progress events, writes media to `downloads/`, and serves completed files for direct browser download and video playback.
2. **Search Backend**: Hybrid architecture combining `yt-dlp` flat-playlist search (`ytsearch`, `scsearch`, etc.) with DuckDuckGo video queries for broad multi-platform coverage.
3. **Subtitles Backend**: Real OpenSubtitles REST API (`https://api.opensubtitles.com/api/v1/subtitles`) using user-provided API credentials from Settings, returning authenticated `.srt` file downloads.

---

## 2. Detailed Technical Plan

### A. Real Download Service & Process Management (`server.ts`)
- **Backend Job Runner (`DownloadEngine`)**:
  - Implement active process registry in Node.js backend (`Map<string, ChildProcess>`).
  - Command generation based on task settings:
    - Quality & format selection: `-f "bestvideo[height<=?]+bestaudio/best"` or `-x --audio-format <format>`.
    - Options: `--newline`, `--progress`, `--write-sub`, `--sub-lang`, `--embed-metadata`, `--embed-thumbnail`, `--sponsorblock-remove`.
    - Output template: `downloads/%(id)s.%(ext)s`.
  - Parse real-time progress from stdout/stderr:
    - Regex: `\[download\]\s+(\d+\.?\d*)%\s+of\s+(~?\d+\.?\d+\w+)\s+at\s+(\d+\.?\d+\w+/s)\s+ETA\s+(\d+:\d+)`
    - Stream real percentage, speed in MB/s, downloaded bytes, and ETA.
  - Endpoints:
    - `POST /api/download/start`: Spawns real `yt-dlp` child process for a given task ID, URL, quality, and audio settings.
    - `POST /api/download/cancel`: Kills spawned child process (`SIGTERM`/`SIGKILL`).
    - `GET /api/download/status/:id`: Returns real active state, percentage, speed, and output file path.
    - `GET /api/download/file/:filename`: Serves media file with `Content-Disposition: attachment` for browser saving.

### B. Real Multi-Platform Search (`server.ts`)
- **Hybrid Search Engine**:
  - YouTube, SoundCloud, and Vimeo: Execute `yt-dlp --dump-json --flat-playlist --socket-timeout 8 "ytsearch<N>:<query>"`.
  - Extended web / other platforms: Query DuckDuckGo HTML/API endpoints to parse real video links from Dailymotion, Bilibili, TikTok, Twitch, and Rumble.
  - Enrich search results with accurate durations, author channels, verified thumbnails, and direct stream links.

### C. Real OpenSubtitles REST API Integration (`server.ts` & `src/views/SubtitlesScreen.tsx`)
- Query OpenSubtitles v1 API:
  - `GET https://api.opensubtitles.com/api/v1/subtitles?query=<query>&languages=<lang>`
  - Pass `Api-Key` header with user's key from Settings (default `FNyoC96mlztsk3ALgNdhfSNapfFY9lOi`).
  - Pass `User-Agent: Klyp v2.0`.
- File Download:
  - Request download token via OpenSubtitles `/api/v1/download` endpoint to obtain genuine `.srt` file buffers.
  - Serve `.srt` directly to client for download and live timestamp preview.

### D. Frontend Controller & UI Wiring
- **`src/App.tsx` & `src/views/QueueScreen.tsx`**:
  - Replace interval random progress generator with SSE or polling against `GET /api/download/status/:id`.
  - Pause/Stop triggers `POST /api/download/cancel`.
  - Start/Resume triggers `POST /api/download/start`.
  - Finished tasks register real server file URL for immediate playback and file download.
- **`src/views/SubtitlesScreen.tsx`**:
  - Connect to backend `/api/subtitles/search` and `/api/subtitles/download` for real OpenSubtitles `.srt` files.

---

## 3. Verification & Validation Steps
1. Verify system dependencies (`yt-dlp --version` and `ffmpeg -version`).
2. Test real metadata extraction on live sample URL (`/api/extract`).
3. Test real download trigger (`/api/download/start`) and monitor stdout progress stream to verify file output in `downloads/`.
4. Test real OpenSubtitles search and file download against live API.
5. Compile and lint codebase (`npm run build`, `npm run lint`).
