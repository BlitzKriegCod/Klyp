/**
 * TypeScript Data Models for Klyp Music & Discography Downloader
 */
export interface MusicTrack {
    id: string;
    trackNumber: number;
    discNumber?: number;
    totalTracks?: number;
    title: string;
    artist: string;
    album: string;
    albumId?: string;
    durationMs: number;
    durationFormatted: string;
    previewUrl?: string;
    isrc?: string;
    releaseDate?: string;
    genre?: string;
    artworkUrl: string;
    downloadUrl?: string;
}
export interface MusicAlbum {
    id: string;
    title: string;
    artist: string;
    artistId?: string;
    releaseDate: string;
    releaseYear: number;
    type: 'album' | 'ep' | 'single' | 'compilation';
    trackCount: number;
    artworkUrl: string;
    genre: string;
    copyright?: string;
    recordLabel?: string;
    tracks?: MusicTrack[];
}
export interface MusicArtist {
    id: string;
    name: string;
    genres: string[];
    artworkUrl?: string;
    albumsCount?: number;
    country?: string;
    disambiguation?: string;
    bio?: string;
}
export interface ArtistDiscography {
    artist: MusicArtist;
    studioAlbums: MusicAlbum[];
    epsAndMiniAlbums: MusicAlbum[];
    singlesAndRemixes: MusicAlbum[];
    compilations: MusicAlbum[];
    totalReleases: number;
}
export interface MusicSearchResponse {
    query: string;
    tracks: MusicTrack[];
    artists: MusicArtist[];
    albums: MusicAlbum[];
    totalResults: number;
}
