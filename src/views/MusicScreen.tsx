import React, { useState, useEffect } from 'react';
import {
  Search,
  Music,
  Disc3,
  Layers,
  Download,
  Play,
  Pause,
  ArrowLeft,
  Loader2,
  ListMusic,
  User,
  Radio,
  Check,
  Sparkles
} from 'lucide-react';
import type {
  MusicAlbum,
  MusicTrack,
  MusicArtist,
  ArtistDiscography,
  MusicSearchResponse
} from '../types/music';
import { AlbumTracklistModal } from '../components/AlbumTracklistModal';
import { PageHeader } from '../components/common/PageHeader';
import { SurfaceCard } from '../components/common/SurfaceCard';

interface MusicScreenProps {
  theme: 'dark' | 'light';
  onQueueBatchTracks: (
    tracks: MusicTrack[],
    format: 'mp3' | 'flac',
    quality: '320kbps' | 'lossless'
  ) => Promise<void>;
  showToast: (msg: string) => void;
}

const FEATURED_ARTISTS = [
  'Daft Punk',
  'The Weeknd',
  'Coldplay',
  'Taylor Swift',
  'Queen',
  'Billie Eilish',
  'Arctic Monkeys',
  'Gorillaz',
  'Dua Lipa',
  'Kendrick Lamar'
];

export const MusicScreen: React.FC<MusicScreenProps> = ({
  theme,
  onQueueBatchTracks,
  showToast
}) => {
  const isDark = theme === 'dark';

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MusicSearchResponse | null>(null);

  // Selected Artist Discography state
  const [selectedArtist, setSelectedArtist] = useState<MusicArtist | null>(null);
  const [discography, setDiscography] = useState<ArtistDiscography | null>(null);
  const [isLoadingDiscography, setIsLoadingDiscography] = useState(false);
  const [activeDiscographyTab, setActiveDiscographyTab] = useState<'albums' | 'eps' | 'singles' | 'compilations'>('albums');

  // Album Inspection Modal
  const [modalAlbum, setModalAlbum] = useState<MusicAlbum | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick single track preview player in search view
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  // Load a default popular artist on first mount
  useEffect(() => {
    loadArtistDiscography('5468295', 'Daft Punk');
  }, []);

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Failed to search music catalog');
      const data: MusicSearchResponse = await res.json();
      setSearchResults(data);
      setSelectedArtist(null);
      setDiscography(null);
    } catch (err: any) {
      showToast(err.message || 'Error searching music');
    } finally {
      setIsSearching(false);
    }
  };

  const loadArtistDiscography = async (artistId: string, artistName?: string) => {
    setIsLoadingDiscography(true);
    try {
      const res = await fetch(`/api/music/artist/${encodeURIComponent(artistId)}/discography`);
      if (!res.ok) throw new Error('Failed to load artist discography');
      const data: ArtistDiscography = await res.json();
      setDiscography(data);
      setSelectedArtist(data.artist);
      setActiveDiscographyTab('albums');
    } catch (err: any) {
      showToast(err.message || 'Could not load discography');
    } finally {
      setIsLoadingDiscography(false);
    }
  };

  const handlePlaySongPreview = (song: MusicTrack) => {
    if (!song.previewUrl) return;

    if (playingSongId === song.id) {
      if (audioPlayer) {
        if (audioPlayer.paused) {
          audioPlayer.play();
        } else {
          audioPlayer.pause();
          setPlayingSongId(null);
        }
      }
    } else {
      if (audioPlayer) {
        audioPlayer.pause();
      }
      const audio = new Audio(song.previewUrl);
      setAudioPlayer(audio);
      setPlayingSongId(song.id);
      audio.onended = () => setPlayingSongId(null);
      audio.play().catch(() => setPlayingSongId(null));
    }
  };

  const handleQuickDownloadTrack = async (track: MusicTrack) => {
    await onQueueBatchTracks([track], 'mp3', '320kbps');
    showToast(`Added "${track.title}" to download queue with embedded metadata!`);
  };

  const handleQuickDownloadAlbum = async (album: MusicAlbum) => {
    try {
      showToast(`Fetching tracklist for ${album.title}...`);
      const res = await fetch(`/api/music/album/${album.id}/tracks`);
      if (!res.ok) throw new Error('Could not fetch album tracks');
      const data = await res.json();
      const tracks: MusicTrack[] = data.tracks || [];
      if (tracks.length === 0) {
        showToast('No tracks found in album');
        return;
      }
      await onQueueBatchTracks(tracks, 'mp3', '320kbps');
      showToast(`Queued ${tracks.length} tracks from "${album.title}" (MP3 320k with album art)!`);
    } catch (err: any) {
      showToast(err.message || 'Error downloading album');
    }
  };

  const handleDownloadFullDiscography = async () => {
    if (!discography) return;
    const allAlbums = [
      ...discography.studioAlbums,
      ...discography.epsAndMiniAlbums
    ];
    if (allAlbums.length === 0) return;

    showToast(`Preparing discography batch for ${discography.artist.name} (${allAlbums.length} albums)...`);
    let totalTracks = 0;

    for (const album of allAlbums) {
      try {
        const res = await fetch(`/api/music/album/${album.id}/tracks`);
        if (res.ok) {
          const data = await res.json();
          const trks: MusicTrack[] = data.tracks || [];
          if (trks.length > 0) {
            await onQueueBatchTracks(trks, 'mp3', '320kbps');
            totalTracks += trks.length;
          }
        }
      } catch {}
    }

    showToast(`Successfully queued ${totalTracks} songs from ${discography.artist.name}'s discography!`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none">
      {/* 1. Standardized PageHeader */}
      <PageHeader
        icon={<Disc3 className="w-6 h-6" />}
        title="Music & Discographies"
        description="Explore artist discographies, inspect tracklists with previews, and download tagged MP3 / FLAC"
        badge={{ text: 'ID3v2 & FLAC', variant: 'emerald' }}
        theme={theme}
        actionSlot={
          selectedArtist ? (
            <button
              type="button"
              onClick={() => {
                setSelectedArtist(null);
                setDiscography(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#2d2d2d] text-gray-300 hover:text-white'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Search</span>
            </button>
          ) : undefined
        }
      />

      {/* 2. Search & Artist Explorer SurfaceCard */}
      <SurfaceCard theme={theme} className="p-5 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist, album, or song title (e.g. Daft Punk, Coldplay, Queen)..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all border font-mono ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] placeholder:text-gray-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] placeholder:text-slate-400'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm shadow-md shadow-[#10b981]/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Music</span>
              </>
            )}
          </button>
        </form>

        {/* Popular Artist Quick-Pick Chips */}
        <div className={`flex flex-wrap items-center gap-2 pt-3.5 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
          <span className={`flex items-center gap-1 font-medium shrink-0 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            <Sparkles className="w-3.5 h-3.5 text-[#10b981]" /> Popular Artists:
          </span>
          {FEATURED_ARTISTS.map((artist) => {
            const isCurrent = searchQuery.toLowerCase() === artist.toLowerCase();
            return (
              <button
                key={artist}
                type="button"
                onClick={() => {
                  setSearchQuery(artist);
                  handleSearch(artist);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                  isCurrent
                    ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40'
                    : isDark
                    ? 'bg-[#1e1e1e] hover:bg-[#282828] border-[#2d2d2d] text-gray-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                {artist}
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* 3. Main Content Area */}
      <div className="space-y-6">
        {/* Loading Discography Spinner */}
        {isLoadingDiscography && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
            <p className="text-sm font-medium">Fetching artist releases & high-resolution artwork...</p>
          </div>
        )}

        {/* Artist Discography View */}
        {!isLoadingDiscography && selectedArtist && discography && (
          <div className="space-y-6 animate-fadeIn">
            {/* Artist Hero Banner */}
            <div
              className={`p-6 md:p-8 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden transition-colors ${
                isDark ? 'bg-[#252526] border-[#2d2d2d] shadow-xl' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-5 z-10">
                {selectedArtist.artworkUrl ? (
                  <img
                    src={selectedArtist.artworkUrl}
                    alt={selectedArtist.name}
                    className={`w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover shadow-xl border shrink-0 ${
                      isDark ? 'border-[#2d2d2d]' : 'border-slate-200'
                    }`}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] shrink-0 border border-[#10b981]/20">
                    <User className="w-10 h-10" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#10b981] font-semibold">
                      {selectedArtist.genres?.[0] || 'Official Artist'}
                    </span>
                    {selectedArtist.country && selectedArtist.country !== 'Worldwide' && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {selectedArtist.country}
                        </span>
                      </>
                    )}
                  </div>

                  <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedArtist.name}
                  </h2>

                  <div className="text-xs text-gray-400 font-mono mt-1.5 flex items-center gap-2 flex-wrap">
                    <span>{discography.studioAlbums.length} Studio Albums</span>
                    <span>·</span>
                    <span>{discography.epsAndMiniAlbums.length} EPs & Mini-Albums</span>
                    <span>·</span>
                    <span>{discography.singlesAndRemixes.length} Singles</span>
                    <span>·</span>
                    <span>{discography.totalReleases} Total Releases</span>
                  </div>
                </div>
              </div>

              {/* Discography Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 z-10">
                <button
                  type="button"
                  onClick={handleDownloadFullDiscography}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white flex items-center gap-2 shadow-md shadow-[#10b981]/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Discography</span>
                </button>
              </div>

              {/* Ambient backdrop glow */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#10b981]/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Discography Category Tabs */}
            <div className={`flex items-center gap-2 border-b pb-2 overflow-x-auto ${isDark ? 'border-[#2d2d2d]' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setActiveDiscographyTab('albums')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeDiscographyTab === 'albums'
                    ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                    : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-[#1e1e1e]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Disc3 className="w-3.5 h-3.5" />
                <span>Studio Albums ({discography.studioAlbums.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDiscographyTab('eps')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeDiscographyTab === 'eps'
                    ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                    : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-[#1e1e1e]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>EPs & Mini-Albums ({discography.epsAndMiniAlbums.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDiscographyTab('singles')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeDiscographyTab === 'singles'
                    ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                    : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-[#1e1e1e]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Singles & Remixes ({discography.singlesAndRemixes.length})</span>
              </button>

              {discography.compilations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveDiscographyTab('compilations')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                    activeDiscographyTab === 'compilations'
                      ? 'bg-[#10b981]/20 text-[#10b981] font-semibold'
                      : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-[#1e1e1e]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Compilations ({discography.compilations.length})</span>
                </button>
              )}
            </div>

            {/* Album Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {(() => {
                let items: MusicAlbum[] = [];
                if (activeDiscographyTab === 'albums') items = discography.studioAlbums;
                else if (activeDiscographyTab === 'eps') items = discography.epsAndMiniAlbums;
                else if (activeDiscographyTab === 'singles') items = discography.singlesAndRemixes;
                else if (activeDiscographyTab === 'compilations') items = discography.compilations;

                if (items.length === 0) {
                  return (
                    <div className="col-span-full py-12 text-center text-gray-400 text-sm">
                      No releases found in this category.
                    </div>
                  );
                }

                return items.map((album) => (
                  <div
                    key={album.id}
                    className={`group rounded-xl border flex flex-col overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                      isDark
                        ? 'bg-[#252526] border-[#2d2d2d] hover:border-[#10b981]/50'
                        : 'bg-white border-slate-200 hover:border-[#10b981]/50 shadow-sm'
                    }`}
                  >
                    {/* Artwork Container */}
                    <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                      <img
                        src={album.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'}
                        alt={album.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Year badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-gray-300 font-semibold">
                        {album.releaseYear}
                      </div>

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-[1px]">
                        <button
                          type="button"
                          onClick={() => {
                            setModalAlbum(album);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer shadow-md"
                        >
                          Tracklist
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDownloadAlbum(album)}
                          title="Quick download full album in MP3 320k"
                          className="p-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white transition-colors cursor-pointer shadow-md"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Album metadata info */}
                    <div className="p-3 flex flex-col flex-1 justify-between">
                      <div>
                        <h4
                          onClick={() => {
                            setModalAlbum(album);
                            setIsModalOpen(true);
                          }}
                          title={album.title}
                          className={`text-xs font-bold truncate hover:text-[#10b981] cursor-pointer ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {album.title}
                        </h4>
                        <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {album.artist}
                        </p>
                      </div>

                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                        isDark ? 'border-[#2d2d2d] text-gray-400' : 'border-slate-200 text-slate-500'
                      }`}>
                        <span>{album.trackCount} Tracks</span>
                        <span className="text-[#10b981]">{album.genre}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Search Results View (Artists, Albums, Songs) */}
        {!isLoadingDiscography && (!selectedArtist || !discography) && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Artists Section */}
            {searchResults?.artists && searchResults.artists.length > 0 && (
              <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#252526] border-[#2d2d2d] shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#10b981] font-mono mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Artists ({searchResults.artists.length})</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.artists.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => loadArtistDiscography(artist.id, artist.name)}
                      className={`group p-3.5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02] ${
                        isDark
                          ? 'bg-[#1e1e1e] border-[#2d2d2d] hover:border-[#10b981]/50 hover:bg-[#282828]'
                          : 'bg-slate-50 border-slate-200 hover:border-[#10b981]/50'
                      }`}
                    >
                      <div className="w-18 h-18 rounded-full overflow-hidden bg-black/40 mb-2.5 border border-white/10 group-hover:ring-2 group-hover:ring-[#10b981]/50 transition-all">
                        {artist.artworkUrl ? (
                          <img
                            src={artist.artworkUrl}
                            alt={artist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <h4 className={`text-xs font-bold truncate w-full group-hover:text-[#10b981] transition-colors ${
                        isDark ? 'text-white' : 'text-slate-800'
                      }`}>
                        {artist.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {artist.genres?.[0] || 'Artist'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Albums Section */}
            {searchResults?.albums && searchResults.albums.length > 0 && (
              <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#252526] border-[#2d2d2d] shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#10b981] font-mono mb-4 flex items-center gap-2">
                  <Disc3 className="w-4 h-4" />
                  <span>Albums ({searchResults.albums.length})</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.albums.map((album) => (
                    <div
                      key={album.id}
                      className={`group rounded-xl border flex flex-col overflow-hidden transition-all ${
                        isDark
                          ? 'bg-[#1e1e1e] border-[#2d2d2d] hover:border-[#10b981]/50'
                          : 'bg-slate-50 border-slate-200 hover:border-[#10b981]/50'
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                        <img
                          src={album.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'}
                          alt={album.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-gray-300">
                          {album.releaseYear}
                        </div>

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setModalAlbum(album);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-gray-200 cursor-pointer"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDownloadAlbum(album)}
                            className="p-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 flex flex-col flex-1 justify-between">
                        <div>
                          <h4
                            onClick={() => {
                              setModalAlbum(album);
                              setIsModalOpen(true);
                            }}
                            title={album.title}
                            className={`text-xs font-bold truncate hover:text-[#10b981] cursor-pointer ${
                              isDark ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {album.title}
                          </h4>
                          <p
                            onClick={() => {
                              if (album.artistId) loadArtistDiscography(album.artistId, album.artist);
                            }}
                            className="text-[11px] text-gray-400 truncate hover:text-[#10b981] cursor-pointer mt-0.5"
                          >
                            {album.artist}
                          </p>
                        </div>

                        <div className={`mt-2 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                          isDark ? 'border-[#2d2d2d] text-gray-400' : 'border-slate-200 text-slate-500'
                        }`}>
                          <span>{album.trackCount} Tracks</span>
                          <span className="text-[#10b981]">{album.genre}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Direct Individual Tracks */}
            {searchResults?.tracks && searchResults.tracks.length > 0 && (
              <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#252526] border-[#2d2d2d] shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#10b981] font-mono mb-4 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span>Songs ({searchResults.tracks.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.tracks.map((track) => {
                    const isPlaying = playingSongId === track.id;

                    return (
                      <div
                        key={track.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                          isPlaying
                            ? 'bg-[#10b981]/15 border-[#10b981]/40'
                            : isDark
                            ? 'bg-[#1e1e1e] border-[#2d2d2d] hover:bg-[#282828]'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {/* Track artwork with play button */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 group">
                          <img
                            src={track.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                          {track.previewUrl && (
                            <button
                              type="button"
                              onClick={() => handlePlaySongPreview(track)}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-90 hover:opacity-100 cursor-pointer"
                            >
                              {isPlaying ? (
                                <Pause className="w-5 h-5 text-[#10b981]" />
                              ) : (
                                <Play className="w-5 h-5 ml-0.5 text-white" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{track.title}</h4>
                          <p className={`text-[11px] truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{track.artist}</p>
                          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="truncate max-w-[120px]">{track.album}</span>
                            <span>•</span>
                            <span>{track.durationFormatted}</span>
                          </div>
                        </div>

                        {/* Download button */}
                        <button
                          type="button"
                          onClick={() => handleQuickDownloadTrack(track)}
                          title="Download song with embedded tags"
                          className="p-2 rounded-lg bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981] hover:text-white transition-colors cursor-pointer shrink-0"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Album Tracklist & Batch Inspection Modal */}
      <AlbumTracklistModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalAlbum(null);
        }}
        album={modalAlbum}
        theme={theme}
        onDownloadTracks={async (selectedTracks, format, quality) => {
          await onQueueBatchTracks(selectedTracks, format, quality);
          showToast(
            `Queued ${selectedTracks.length} tracks in ${format.toUpperCase()} (${quality}) with embedded artwork!`
          );
        }}
      />
    </div>
  );
};
