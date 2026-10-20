# Comprehensive Turborepo Monorepo & Event-Driven MVC Restructuring Plan

Exhaustive architectural blueprint to restructure Klyp into a **Turborepo Monorepo** (`apps/web`, `apps/server`, `packages/shared`) with a modular **Event-Driven MVC Backend**, guaranteeing **100% zero feature loss** across all existing screens, dialogs, music streaming, subtitle scrapers, video mirrors, and engine integrations.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Zero Feature Loss Guarantee**:
> In response to your feedback (*"No estás contemplando todas las funcionalidades, la migración no debe omitir nada de lo que ya está implementado"*), this revised plan contains a complete, item-by-item functional matrix ensuring that **100% of existing capabilities** are preserved without omitting or simplifying a single feature, screen, modal, or endpoint.

### Confirmed Monorepo Choices:
1. **Monorepo Engine**: **Turborepo** (`turbo.json`) with standard workspace management (`apps/*`, `packages/*`).
2. **Backend Architecture**: **Event-Driven MVC**:
   - **Controllers**: Thin HTTP entry points parsing parameters and delegating to services.
   - **Services**: Autonomous domain logic (Scrapers, Resolvers, YtDlp Process Manager, Subtitle Engine, Music Aggregator).
   - **EventBus**: Typed Node.js `EventEmitter` emitting download lifecycle events (`task:queued`, `task:progress`, `task:completed`, `task:failed`, `task:cancelled`).
   - **Workers**: `TaskQueueWorker` managing download concurrency, rate limiting, and SSE dispatching.
3. **Shared Contract (`packages/shared`)**: Single source of truth for TypeScript interfaces (`SearchResult`, `DownloadTask`, `MediaPackage`, `MusicTrack`, `SubtitlesResult`, `TaskEventMap`).
4. **AI Studio Runtime Compliance**: Root `dev` and `start` scripts orchestrated to run on **port 3000** with Vite development middleware mounted seamlessly on the Express server.

---

## 1. Zero-Feature-Loss Inventory & Migration Matrix

Every feature currently present in the monolithic codebase is accounted for below and assigned to its target location in the monorepo:

| # | Current Feature / Component | Existing File | Target Location | Migration Preservation Guarantee |
|---|---|---|---|---|
| 1 | **Home URL & Batch Extractor** | `src/views/HomeScreen.tsx` | `apps/web/src/views/HomeScreen.tsx` | URL input, batch multi-line URL analyzer, format pills (MP4, MP3, WAV), quality presets, engine health badge. |
| 2 | **Universal Audiovisual Search** | `src/views/SearchScreen.tsx` | `apps/web/src/views/SearchScreen.tsx` | Format tabs (Movies, Series, Shorts, Clips), 8 platform chips (YouTube, AnimeFLV, Vimeo, TikTok, etc.), batch queue, grid/list view. |
| 3 | **Queue & Active Task Manager** | `src/views/QueueScreen.tsx` | `apps/web/src/views/QueueScreen.tsx` | Live download progress bars, speed/ETA metrics, pause/resume, cancel, retry, clear completed, reveal file. |
| 4 | **Music Hub & Track Explorer** | `src/views/MusicScreen.tsx` | `apps/web/src/views/MusicScreen.tsx` | iTunes/Deezer search, track listings, album covers, discography inspector, batch album downloader. |
| 5 | **Persistent Bottom Audio Player** | `src/components/music/MusicPlayerBar.tsx` | `apps/web/src/components/music/MusicPlayerBar.tsx` | Audio scrubber, volume slider, play/pause, track metadata display, stream playback via `/api/music/stream`. |
| 6 | **Download History & Persistence** | `src/views/HistoryScreen.tsx`, `src/controllers/historyController.ts` | `apps/web/src/views/HistoryScreen.tsx`, `apps/web/src/controllers/historyController.ts` | Persisted history store, search/filter history, re-download, export logs, storage management. |
| 7 | **Subtitle Discovery & Downloader** | `src/views/SubtitlesScreen.tsx` | `apps/web/src/views/SubtitlesScreen.tsx` | Multi-language subtitle search, format choice (SRT, VTT), preview window, direct download trigger. |
| 8 | **Engine & Network Settings** | `src/views/SettingsScreen.tsx`, `src/controllers/settingsController.ts` | `apps/web/src/views/SettingsScreen.tsx`, `apps/web/src/controllers/settingsController.ts` | Concurrency limits, default output directories, cookie file paths, user-agent overrides, network retry options. |
| 9 | **Media & Franchise Package Dialog** | `src/components/MediaPackageDialog.tsx`, `src/components/SeriesDialog.tsx` | `apps/web/src/components/MediaPackageDialog.tsx` | Season & movie tabs (Temporadas 1–N, Películas), cour range buttons, episode selection checkboxes, global quality picker. |
| 10 | **Dual-Mode Media Player Modal** | `src/components/MediaPlayerModal.tsx` | `apps/web/src/components/MediaPlayerModal.tsx` | HTML5 `<video>` for direct streams, responsive iframe embeds for YouTube/Vimeo nocookie, mirror host switcher. |
| 11 | **Album Tracklist Modal** | `src/components/AlbumTracklistModal.tsx` | `apps/web/src/components/AlbumTracklistModal.tsx` | Full album tracklist view, preview audio buttons, batch queue all tracks. |
| 12 | **Platform Health Modal** | `src/components/PlatformHealthModal.tsx` | `apps/web/src/components/PlatformHealthModal.tsx` | Live ping checks for YouTube, TikTok, AnimeFLV, Vimeo, SoundCloud, Bilibili. |
| 13 | **Batch Compare & Quality Dialogs** | `src/components/BatchCompareDialog.tsx`, `src/components/QualityDialog.tsx` | `apps/web/src/components/` | Stream resolution comparison, audio bitrate selection, file size estimation. |
| 14 | **Extraction APIs** (`/api/extract`, `/api/extract/batch`) | `server.ts` | `apps/server/src/controllers/extract.controller.ts` | yt-dlp metadata extractor, format listing, oEmbed fallback on bot-detection blocks. |
| 15 | **Franchise & Mirror APIs** (`/api/media/package`, `/api/media/mirrors`, `/api/playlist/expand`) | `server.ts` | `apps/server/src/controllers/media.controller.ts` | AnimeFLV franchise scraper, related series extractor, multi-host mirror resolver (Streamtape, MEGA, YourUpload, Mp4Upload). |
| 16 | **Download Engine & SSE APIs** (`/api/download/start`, `cancel`, `status`, `file/*`) | `server.ts` | `apps/server/src/controllers/download.controller.ts`, `taskQueue.worker.ts` | Spawn yt-dlp child processes, parse percentage/speed regex, event-driven SSE updates, direct file serving. |
| 17 | **Search & Suggestions APIs** (`/api/search`, `/api/search/suggestions`) | `server.ts` | `apps/server/src/controllers/search.controller.ts` | DuckDuckGo HTML scraping, AnimeFLV direct search, autocomplete suggestions, content type classifier. |
| 18 | **Music Discovery APIs** (`/api/music/*`) | `server.ts` | `apps/server/src/controllers/music.controller.ts` | iTunes / Deezer search, artist discography, album tracks, audio preview proxy, batch downloader. |
| 19 | **Subtitles APIs** (`/api/subtitles/*`) | `server.ts` | `apps/server/src/controllers/subtitles.controller.ts` | Subtitle search via yt-dlp (`--list-subs`), subtitle download and conversion. |
| 20 | **System & Health APIs** (`/api/status`, `/api/engine/health`, `/api/platform-health`, `/api/media/sample`) | `server.ts` | `apps/server/src/controllers/system.controller.ts` | yt-dlp binary presence, ffmpeg presence, platform connectivity pings, sample media stream. |

---

## 2. Turborepo Monorepo Layout

```
.
├── turbo.json                          # Turborepo task definitions (build, dev, lint)
├── package.json                        # Root package.json with workspaces: ["apps/*", "packages/*"]
├── tsconfig.base.json                  # Shared base TypeScript configuration
├── bin/                                # yt-dlp and ffmpeg executables
│   └── yt-dlp
├── packages/
│   └── shared/                         # @klyp/shared - Shared types, models & events
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                # Master export
│           ├── types/
│           │   ├── search.ts           # SearchResult, FormatType, SearchFilters
│           │   ├── download.ts         # DownloadTask, TaskStatus, QualityOptions
│           │   ├── media.ts            # MediaPackage, Episode, MirrorSource, Season
│           │   ├── music.ts            # MusicTrack, MusicAlbum, ArtistDiscography
│           │   ├── subtitles.ts        # SubtitleTrack, SubtitleSearchParams
│           │   └── system.ts           # EngineHealth, PlatformStatus
│           └── events/
│               └── taskEvents.ts       # Typed DownloadEventMap for EventBus & SSE
└── apps/
    ├── web/                            # Frontend SPA (React 19 + Vite + Tailwind v4)
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── index.html
    │   └── src/
    │       ├── App.tsx                 # Master view router & dialog orchestrator
    │       ├── main.tsx                # Entry point
    │       ├── index.css               # Tailwind CSS theme tokens
    │       ├── views/                  # All 7 screens: Home, Search, Queue, Music, History, Subtitles, Settings
    │       ├── components/             # All 8 dialogs/modals + common + music components
    │       └── controllers/            # Client-side historyController & settingsController
    └── server/                         # Backend Service (Express + MVC + Event-Driven)
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── app.ts                  # Express setup, middleware, router mount
            ├── server.ts               # Dev/prod bootstrap on port 3000 (mounts Vite in dev)
            ├── config/
            │   ├── env.ts              # PORT, paths, timeouts
            │   └── binaries.ts         # yt-dlp & ffmpeg path verification
            ├── events/
            │   └── downloadEventBus.ts # Node.js EventEmitter for download lifecycle
            ├── workers/
            │   └── taskQueueWorker.ts  # Concurrency queue and progress dispatcher
            ├── controllers/            # 7 specialized controllers covering all 20+ endpoints
            │   ├── extract.controller.ts
            │   ├── search.controller.ts
            │   ├── media.controller.ts
            │   ├── download.controller.ts
            │   ├── music.controller.ts
            │   ├── subtitles.controller.ts
            │   └── system.controller.ts
            ├── services/               # Reusable business logic
            │   ├── scraper.service.ts  # DuckDuckGo and AnimeFLV parsing
            │   ├── resolver.service.ts # YouTube oEmbed & mirror video hosts
            │   ├── ytdlp.service.ts    # Child process spawn & regex progress parsing
            │   ├── music.service.ts    # iTunes / Deezer API integrations
            │   └── file.service.ts     # Temp directory & media stream helpers
            ├── routes/                 # Express route modules
            │   ├── extract.routes.ts
            │   ├── search.routes.ts
            │   ├── media.routes.ts
            │   ├── download.routes.ts
            │   ├── music.routes.ts
            │   ├── subtitles.routes.ts
            │   ├── system.routes.ts
            │   └── index.ts            # Root /api router
            └── middleware/
                ├── errorHandler.ts     # Standardized JSON error response
                └── safeFetch.ts        # Timeout-guarded web fetch utility
```

---

## 3. Event-Driven MVC Backend Architecture (`apps/server`)

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   apps/web                                       │
│                                                                                  │
│   [HomeScreen]    [SearchScreen]    [QueueScreen]    [MusicScreen]   [Subtitles] │
│        │                │                 │                │              │      │
│        └────────────────┴────────┬────────┴────────────────┴──────────────┘      │
│                                  │ HTTP / SSE Requests                           │
└──────────────────────────────────┼───────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             apps/server (MVC Router)                             │
│                                                                                  │
│  /api/extract   /api/search    /api/media    /api/download   /api/music   /api/..│
│       │              │              │              │              │         │    │
│  ┌────┴──────────────┴──────────────┴──────────────┴──────────────┴─────────┴──┐ │
│  │                              Controllers                                    │ │
│  │ ExtractController | SearchController | MediaController | DownloadController │ │
│  │ MusicController   | SubtitlesController | SystemController                  │ │
│  └────┬─────────────────────────────┬──────────────────────┬────────────────────┘ │
│       │                             │                      │                      │
│       ▼                             ▼                      ▼                      │
│  ┌─────────────────────────┐   ┌──────────────────────┐   ┌────────────────────┐ │
│  │        Services         │   │  DownloadEventBus    │   │  TaskQueueWorker   │ │
│  │ • ScraperService (Anime)│   │  (EventEmitter)      │   │ • Concurrency: 3   │ │
│  │ • ResolverService (Hosts│   │  - task:queued       │◄──┤ • Queue Scheduler  │ │
│  │ • YtDlpService          │   │  - task:progress     │   │ • Progress Parser  │ │
│  │ • MusicService (iTunes) │   │  - task:completed    │   └─────────┬──────────┘ │
│  │ • FileService           │   │  - task:failed       │             │            │
│  └─────────────────────────┘   └──────────┬───────────┘             │            │
│                                           │                         ▼            │
│                                           ▼                  ┌──────────────┐    │
│                                   ┌────────────────┐         │ yt-dlp child │    │
│                                   │ SSE Broadcast  │         │ process      │    │
│                                   │ to Web Client  │         └──────────────┘    │
│                                   └────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Step-by-Step Migration Execution Plan

### Phase A: Monorepo Foundation & Shared Package
1. **Initialize `turbo.json`**: Configure caching and execution graph for `build`, `dev`, and `lint`.
2. **Update Root `package.json`**: Add `workspaces: ["apps/*", "packages/*"]` and Turborepo dev/build scripts.
3. **Construct `packages/shared`**: Extract and centralize every interface from `src/types/index.ts` and new event models:
   - `search.ts`: `SearchResult`, `FormatType`, `ContentFormat`, `PlatformDomain`.
   - `download.ts`: `DownloadTask`, `DownloadTaskStatus`, `QualityPreset`.
   - `media.ts`: `MediaPackage`, `EpisodeItem`, `MirrorHost`, `SeasonTab`.
   - `music.ts`: `MusicTrack`, `MusicAlbum`, `ArtistDiscography`.
   - `subtitles.ts`: `SubtitleTrack`, `SubtitleSearchResponse`.
   - `events.ts`: `TaskProgressEvent`, `TaskStatusChangeEvent`, `DownloadEventMap`.

### Phase B: MVC Backend Migration (`apps/server`)
1. **Directory Setup**: Create `apps/server/src` with `controllers`, `services`, `events`, `workers`, `routes`, `middleware`, and `config`.
2. **Implement Core Services**:
   - `scraper.service.ts`: Port AnimeFLV multi-season package scraper and DuckDuckGo HTML parser.
   - `resolver.service.ts`: Port YouTube oEmbed fallbacks and mirror host resolvers (Streamtape, MEGA, YourUpload, Mp4Upload).
   - `ytdlp.service.ts`: Port child-process spawn logic with format extraction, TikTok unwatermarked options, and Shorts flags.
   - `music.service.ts`: Port iTunes/Deezer track, artist, album, and preview streaming logic.
   - `subtitles.service.ts`: Port yt-dlp subtitle detection and conversion.
3. **Implement Event-Driven Engine**:
   - `downloadEventBus.ts`: Singleton typed emitter for download status and progress.
   - `taskQueueWorker.ts`: Concurrency-managed queue processing tasks and emitting progress events.
4. **Implement Controllers & Routes**:
   - Map all 20+ API routes without dropping a single query parameter or response field.
5. **Implement Server Entry (`apps/server/src/server.ts`)**:
   - Maintain AI Studio development environment compliance on **port 3000**.
   - Mount Vite dev middleware when running in development mode.

### Phase C: Frontend Migration (`apps/web`)
1. **Directory Setup**: Move existing React application to `apps/web/`.
2. **Update Dependencies**: Link `@klyp/shared` in `apps/web/package.json`.
3. **Preserve All 7 Screens**:
   - `HomeScreen.tsx`: Full extractor options and health badge.
   - `SearchScreen.tsx`: Audiovisual format pills, domain chips, grid/list toggle.
   - `QueueScreen.tsx`: Real-time task manager and action controls.
   - `MusicScreen.tsx`: Music catalog search, album inspection.
   - `HistoryScreen.tsx`: Persisted download log.
   - `SubtitlesScreen.tsx`: Subtitles search and download.
   - `SettingsScreen.tsx`: Configuration and engine preferences.
4. **Preserve All Modals & Components**:
   - `MediaPackageDialog.tsx` & `SeriesDialog.tsx`: Franchise seasons, cour selection, mirror links.
   - `MediaPlayerModal.tsx`: Dual-mode embedded player.
   - `MusicPlayerBar.tsx`: Persistent audio playback bar.
   - `AlbumTracklistModal.tsx`, `PlatformHealthModal.tsx`, `BatchCompareDialog.tsx`, `QualityDialog.tsx`.

### Phase D: Build Verification & Smoke Testing
1. **Lint & Typecheck**: Run `npm run lint` across all workspaces to guarantee zero type errors.
2. **Turborepo Build**: Run `npm run build` to confirm production compilation of both `apps/web` and `apps/server`.
3. **Dev Server Verification**: Verify server starts on `http://0.0.0.0:3000`.
4. **API Regression Verification**:
   - Test `/api/engine/health` (engine ready).
   - Test `/api/search` with AnimeFLV & DuckDuckGo.
   - Test `/api/media/package` with franchise series.
   - Test `/api/media/mirrors` for host resolvers.
   - Test `/api/music/search` and preview audio streams.
   - Test `/api/subtitles/search`.
   - Test `/api/download/start` with EventBus progress propagation.
