# Dedicated Music & Discography Downloader with Complete Metadata & High-Res Album Art

Comprehensive architectural plan to introduce a dedicated **Music Hub** in Klyp, isolating music workflows from video downloads. Powers artist discography exploration (Studio Albums, EPs, Singles), instant tracklist inspection with 30-second audio previews, and multi-track batch downloading in MP3 (320kbps) and FLAC formats with embedded high-resolution album art and complete ID3v2/Vorbis tags.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions below have been aligned with your preferences from Phase 1 clarifications:

- **Metadata & Art Engine**: Hybrid iTunes Search & Lookup API + MusicBrainz API. Provides sub-second lookup times, high-resolution artwork (up to 1400×1400px), complete track numbering, release years, copyright notices, and official genre taxonomies without requiring external API keys.
- **Dedicated Sidebar Section**: A new primary navigation item **"Music & Discographies"** (`music`) in Klyp's sidebar, providing an independent music-first workflow separated from video downloads.
- **Audio Formats & Tag Embedding**: Supports selectable **MP3 320kbps** and **FLAC Lossless**, utilizing `yt-dlp` and `ffmpeg` to embed title, artist, album, track number, total tracks, release year, genre, and embedded high-res cover art directly into audio containers.
- **Discography Hierarchy**: Artist view categorizes discographies into **Studio Albums**, **EPs & Mini-Albums**, and **Singles**, with collapsible tracklists, select-all checkboxes, individual track play previews, and one-click batch album queuing.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms Klyp into a dual-engine media powerhouse by establishing a dedicated Music Hub. Users can search any artist, album, or track; browse complete official discographies categorized by release type; listen to instant 30-second audio previews; select specific tracks or entire albums; and download them with embedded album art and pristine metadata.
- **Target Audience / Persona**: Music collectors, audiophiles, offline listeners, and digital DJs who require organized music libraries with embedded ID3 tags, correct track numbers, and high-resolution album art without manually editing files.
- **Key Value**: Eliminates disorganized, poorly tagged audio downloads by integrating authoritative metadata services (iTunes & MusicBrainz) with multi-source audio downloaders and real FFmpeg tagging.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Navigating to Music Hub**: User clicks the new **"Music & Discographies"** entry with a music note icon in the sidebar.
2. **Searching Artist / Album**: User enters an artist name (e.g., "Daft Punk", "The Weeknd", "Coldplay") or album name into the search bar. The system suggests top artist matches and album results.
3. **Exploring Discography**:
   - Selecting an artist opens their Discography View with artist banner, genre tags, and statistics (total albums, singles, release span).
   - Three categorized sections: **Studio Albums**, **EPs & Mini-Albums**, and **Singles & Remixes**.
   - Each album card presents high-res artwork, release year, track count, and duration.
4. **Inspecting Tracklist & Audio Previews**:
   - Clicking an album reveals its tracklist modal or expanded accordion.
   - User can click the Play button on any track to preview a 30-second snippet directly in the UI.
   - User toggles checkboxes for desired tracks or clicks "Select All (N tracks)".
5. **Configuring & Starting Download**:
   - User chooses target format (**MP3 320kbps** or **FLAC Lossless**) and clicks **"Download Album"** or **"Download Selected (N)"**.
   - Tasks are dispatched to Klyp's download queue with metadata tags (`title`, `artist`, `album`, `track`, `year`, `genre`, `artwork`).
6. **Queue & History Monitoring**:
   - Audio tasks display music badges, album thumbnails, artist names, and real-time audio extraction progress.
   - Completed files are stored in a dedicated `Music/` subfolder organized as `Artist/Album/XX - Title.ext`.

#### Visual Identity & Theme
- **Aesthetic Direction**: Sleek studio workstation aesthetic, consistent with Klyp's dark theme (`#121212` canvas, `#1e1e1e` cards, `#2d2d2d` borders) with emerald accents (`#10b981`) and subtle indigo/violet touches for audio wave badges.
- **Typography & Hierarchy**: Clean display type for artist headlines (`font-bold text-2xl tracking-tight`), compact sans body (`text-sm`), and monospace tabular figures (`font-mono tabular-nums text-xs`) for durations, track numbers, and bitrates.
- **Zero-Pill Discipline**: Metadata displayed as quiet, unboxed text separated by typographic middots (`Daft Punk · 2001 · 14 tracks · Dance`), avoiding colorful pill sandwiches.
- **Interactive Feedback & Motion**:
   - Smooth card hover lift with subtle shadow (`hover:border-[#10b981]/50`).
   - Waveform/audio equalizer animation on active previewing tracks.
   - Responsive download counter badge in navigation.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Dedicated Music Navigation vs. Combined Video View
- **Chosen Approach**: Distinct **"Music & Discographies"** sidebar tab and dedicated `MusicScreen` view component.
- **Why**: Music discovery revolves around artists, albums, discographies, tracklists, and cover art, which clash with video search (channels, video thumbnails, resolutions like 1080p/4K). Separating them creates focused workflows for both use cases.
- **Alternatives Considered**: Mode toggle in the top bar (rejected due to Top Bar Contract constraints) or tabs inside the search screen (cluttered and compromised layout).

#### Decision 2: Metadata Architecture (iTunes + MusicBrainz)
- **Chosen Approach**: Server-side proxy endpoints (`/api/music/search`, `/api/music/artist`, `/api/music/album`) combining iTunes Search & Lookup API with MusicBrainz categorization.
- **Why**: iTunes delivers sub-second responses, 1400×1400px artwork, 30-second audio previews, and track-level metadata without API keys or harsh rate limits. MusicBrainz categorizes release groups (Studio Albums vs EPs vs Singles).
- **Alternatives Considered**: Spotify API (requires developer account and client secrets) or Deezer API (limited rate limits and geo-restrictions).

#### Decision 3: Audio Extraction & Embedded ID3/FLAC Tagging
- **Chosen Approach**: `yt-dlp` audio extraction pipeline paired with FFmpeg post-processing arguments:
  ```bash
  --extract-audio --audio-format mp3 --audio-quality 0 \
  --embed-thumbnail --embed-metadata \
  --postprocessor-args "ffmpeg:-id3v2_version 3 -metadata title='...' -metadata artist='...' -metadata album='...'"
  ```
- **Why**: Ensures that downloaded files are fully self-contained. When opened in Apple Music, VLC, foobar2000, or mobile music players, the album cover, artist, and track numbers render immediately without external taggers.

#### Decision 4: File Organization Structure
- **Chosen Approach**: Standardized music library folder structure:
  `<DownloadDir>/Music/<Artist>/<Year> - <Album>/<TrackNumber> - <TrackTitle>.<ext>`
- **Why**: Prevents cluttering the generic video download folder and keeps discographies cleanly organized.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│                                                                        │
│   Sidebar Navigation ('music' screen)                                  │
│      │                                                                 │
│      ▼                                                                 │
│   MusicScreen                                                          │
│   ├── MusicSearchBar (Artist / Album / Song Query)                     │
│   ├── ArtistDiscographyHeader (Bio, Genres, Metrics)                  │
│   ├── DiscographyTabs (Studio Albums · EPs · Singles)                  │
│   ├── AlbumGrid & AlbumCards (High-Res Cover, Year, Track Count)      │
│   ├── AlbumTracklistModal (Tracklist, 30s Audio Preview, Selection)   │
│   └── MusicBatchBar (Selected count, Format MP3/FLAC, Download Action) │
│                                                                        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼ HTTP JSON
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│                                                                        │
│   server.ts Routes:                                                    │
│   ├── GET  /api/music/search?q=...                                     │
│   │    └── Queries iTunes & MusicBrainz, returns artists & albums      │
│   ├── GET  /api/music/artist/:id/discography                           │
│   │    └── Groups releases into Studio Albums, EPs, and Singles        │
│   ├── GET  /api/music/album/:id/tracks                                 │
│   │    └── Returns full tracklist with durations & 30s AAC previews    │
│   ├── POST /api/music/download/batch                                   │
│   │    └── Matches tracks to high-quality audio streams and queues     │
│   └── POST /api/download/start (Enhanced Audio Engine)                 │
│        └── Spawns yt-dlp + ffmpeg with embedded ID3v2 & cover art      │
│                                                                        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼ CLI Execution
┌────────────────────────────────────────────────────────────────────────┐
│                  yt-dlp + ffmpeg Tagging Pipeline                      │
│                                                                        │
│   1. Fetches optimal audio stream (YouTube Music / SoundCloud / Web)  │
│   2. Converts to MP3 (320kbps CBR) or FLAC (Lossless)                  │
│   3. Downloads high-res album art (1200x1200px)                        │
│   4. FFmpeg embeds APIC cover art, ID3v2.3 tags, and track numbering   │
│   5. Saves to /downloads/Music/Artist/Album/XX - Title.mp3             │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Data Interfaces (`src/types/music.ts`):
```typescript
export interface MusicTrack {
  id: string;
  trackNumber: number;
  discNumber?: number;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  previewUrl?: string; // 30s AAC preview stream
  isrc?: string;
  selected?: boolean;
}

export interface MusicAlbum {
  id: string;
  title: string;
  artist: string;
  releaseDate: string;
  releaseYear: number;
  type: 'album' | 'ep' | 'single' | 'compilation';
  trackCount: number;
  artworkUrl: string; // High-res cover art (up to 1400x1400)
  genre: string;
  copyright?: string;
  tracks?: MusicTrack[];
}

export interface ArtistProfile {
  id: string;
  name: string;
  genres: string[];
  artworkUrl?: string;
  albumsCount: number;
  albums: MusicAlbum[];
}
```

---

### 5. Implementation Stages & Verification Plan

1. **Backend Integration (`server.ts`)**:
   - Implement `/api/music/search`, `/api/music/artist/:id/discography`, and `/api/music/album/:id/tracks` proxying iTunes and MusicBrainz.
   - Implement `/api/music/download/batch` and enrich `startServerDownload` with custom ID3v2/Vorbis tagging parameters.
2. **Frontend Music Hub Components**:
   - Create `src/views/MusicScreen.tsx` with artist search, discography sections, and album card grid.
   - Create `src/components/AlbumTracklistModal.tsx` with track selection, audio preview player, and batch download triggers.
   - Update `src/components/Sidebar.tsx` and `src/App.tsx` with the new `'music'` route and audio task badges.
3. **Download Engine & Tag Verification**:
   - Test artist searches (e.g. "Daft Punk", "Queen", "Taylor Swift", "Dua Lipa").
   - Test album tracklist expansion and 30-second audio previews.
   - Verify batch audio queue dispatch with MP3/FLAC formats and verify embedded ID3 tags and album cover art.
