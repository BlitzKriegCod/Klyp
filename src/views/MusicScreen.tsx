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
  onPlayTrack?: (track: MusicTrack) => void;
  onPlayAlbum?: (tracks: MusicTrack[], startIndex?: number) => void;
  currentPlayingTrackId?: string | null;
  isPlayingGlobal?: boolean;
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
  showToast,
  onPlayTrack,
  onPlayAlbum,
  currentPlayingTrackId,
  isPlayingGlobal = false
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

  // Loading state for quick album play
  const [loadingAlbumPlayId, setLoadingAlbumPlayId] = useState<string | null>(null);

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

  // Play an entire album immediately via the global streaming engine
  const handleQuickPlayAlbum = async (album: MusicAlbum) => {
    if (!onPlayAlbum) return;
    setLoadingAlbumPlayId(album.id);
    try {
      showToast(`Loading "${album.title}" tracklist for streaming...`);
      const res = await fetch(`/api/music/album/${album.id}/tracks`);
      if (!res.ok) throw new Error('Could not fetch album tracklist');
      const data = await res.json();
      const tracks: MusicTrack[] = data.tracks || [];
      if (tracks.length === 0) {
        showToast('No tracks found in album');
        return;
      }
      onPlayAlbum(tracks, 0);
      showToast(`Streaming "${album.title}" (${tracks.length} tracks)!`);
    } catch (err: any) {
      showToast(err.message || 'Error playing album');
    } finally {
      setLoadingAlbumPlayId(null);
    }
  };

  // Play a single track using the global streaming player bar
  const handleTrackStream = (track: MusicTrack) => {
    if (onPlayTrack) {
      onPlayTrack(track);
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
          const trks = data.tracks || [];
          if (trks.length > 0) {
            await onQueueBatchTracks(trks, 'mp3', '320kbps');
            totalTracks += trks.length;
          }
        }
      } catch {}
    }

    showToast(`Successfully queued ${totalTracks} tracks across all albums for ${discography.artist.name}!`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-32">
      {/* Top Header */}
      <PageHeader
        icon={<Music className="w-5 h-5 text-[#10b981]" />}
        title="Music Explorer & Streaming"
        description="Search artists, stream high-fidelity albums, auto-advance tracks, and batch download discographies with embedded ID3 tags."
        theme={theme}
      />

      {/* Main Search Surface */}
      <SurfaceCard theme={theme} className="p-4 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist, album, or song title (e.g., Daft Punk, The Weeknd, Queen)..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-white placeholder-gray-500 focus:border-[#10b981]'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#10b981]'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#10b981]/20 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-black" />
                <span>Explore Music</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Artist Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Featured:</span>
          </span>
          {FEATURED_ARTISTS.map((artist) => (
            <button
              key={artist}
              type="button"
              onClick={() => {
                setSearchQuery(artist);
                handleSearch(artist);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#1e1e1e] border-[#2d2d2d] text-gray-300 hover:text-white hover:border-[#10b981]/50'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-[#10b981]/50'
              }`}
            >
              {artist}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Loading Spinner */}
        {(isSearching || isLoadingDiscography) && (
          <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-[#10b981]" />
            <p className="text-sm font-medium">
              {isSearching ? 'Searching worldwide music catalogs...' : 'Loading complete discography & high-res artwork...'}
            </p>
          </div>
        )}

        {/* Artist Discography Detailed View */}
        {!isLoadingDiscography && selectedArtist && discography && (
          <div className="space-y-6 animate-fadeIn">
            {/* Artist Hero Banner */}
            <div
              className={`p-6 sm:p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden ${
                isDark ? 'bg-[#252526] border-[#2d2d2d] shadow-2xl' : 'bg-white border-slate-200 shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-6 z-10 text-center sm:text-left">
                {/* Artist Photo */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-[#10b981]/40 shadow-xl shrink-0 group">
                  <img
                    src={selectedArtist.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'}
                    alt={selectedArtist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                </div>

                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-xs uppercase tracking-widest font-mono text-[#10b981] font-semibold">
                      {selectedArtist.disambiguation || 'Verified Artist'}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-xs font-mono text-gray-400">{selectedArtist.country}</span>
                  </div>

                  <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedArtist.name}
                  </h2>

                  <div className="text-xs text-gray-400 font-mono flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
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
                {discography.studioAlbums.length > 0 && onPlayAlbum && (
                  <button
                    type="button"
                    onClick={() => handleQuickPlayAlbum(discography.studioAlbums[0])}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-black flex items-center gap-2 shadow-md shadow-[#10b981]/20 cursor-pointer transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Top Album</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadFullDiscography}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 cursor-pointer transition-all"
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

                return items.map((album) => {
                  const isLoadingThisAlbum = loadingAlbumPlayId === album.id;
                  return (
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

                        {/* Quick Stream Play Button Badge in Bottom-Right */}
                        {onPlayAlbum && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickPlayAlbum(album);
                            }}
                            disabled={isLoadingThisAlbum}
                            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#10b981] hover:bg-[#059669] text-black flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer z-10"
                            title={`Play "${album.title}"`}
                          >
                            {isLoadingThisAlbum ? (
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                        )}

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
                  );
                });
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
                          {onPlayAlbum && (
                            <button
                              type="button"
                              onClick={() => handleQuickPlayAlbum(album)}
                              className="p-2 rounded-lg bg-[#10b981] text-black hover:bg-[#059669] cursor-pointer"
                              title="Stream album"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
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
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
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
                    const isPlaying = currentPlayingTrackId === track.id && isPlayingGlobal;

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
                          <button
                            type="button"
                            onClick={() => handleTrackStream(track)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-90 hover:opacity-100 cursor-pointer"
                            title={isPlaying ? 'Pause' : 'Stream track'}
                          >
                            {isPlaying ? (
                              <Pause className="w-5 h-5 text-[#10b981] fill-current" />
                            ) : (
                              <Play className="w-5 h-5 ml-0.5 text-white fill-current" />
                            )}
                          </button>
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <h4
                            onClick={() => handleTrackStream(track)}
                            className={`text-xs font-bold truncate cursor-pointer hover:text-[#10b981] ${
                              isPlaying ? 'text-[#10b981]' : isDark ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {track.title}
                          </h4>
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
        onPlayAlbum={onPlayAlbum}
        currentPlayingTrackId={currentPlayingTrackId}
        isPlayingGlobal={isPlayingGlobal}
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
