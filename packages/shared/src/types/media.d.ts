export interface EpisodeItem {
    id: string;
    title: string;
    episodeNumber: number;
    url: string;
    duration?: string;
    thumbnail?: string;
    author?: string;
    seasonNumber?: number;
}
export interface SeasonInfo {
    seasonNumber: number;
    seasonTitle: string;
    url?: string;
    episodeCount: number;
    episodes: EpisodeItem[];
}
export interface RelatedFranchiseItem {
    title: string;
    url: string;
    relationType: 'sequel' | 'prequel' | 'movie' | 'ova' | 'side_story' | 'season';
}
export interface MirrorHostSource {
    server: string;
    title: string;
    url: string;
    type?: 'embed' | 'direct';
}
export interface MediaPackageResponse {
    type: 'series' | 'movie' | 'playlist' | 'single';
    title: string;
    synopsis?: string;
    poster?: string;
    banner?: string;
    rating?: string;
    genres?: string[];
    totalEpisodes: number;
    totalSeasons?: number;
    seasons?: SeasonInfo[];
    episodes: EpisodeItem[];
    related?: RelatedFranchiseItem[];
    mirrors?: MirrorHostSource[];
}
