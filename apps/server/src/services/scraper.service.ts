import { safeFetch } from '../middleware/safeFetch';
import type { AudiovisualFormat } from '@klyp/shared';

export function detectPlatform(url: string) {
  const lower = (url || '').toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { name: 'YouTube', category: 'Video Streaming', icon: '🎬', color: '#ef4444' };
  }
  if (lower.includes('vimeo.com')) {
    return { name: 'Vimeo', category: 'Video Streaming', icon: '🎬', color: '#06b6d4' };
  }
  if (lower.includes('dailymotion.com')) {
    return { name: 'Dailymotion', category: 'Video Streaming', icon: '🎬', color: '#3b82f6' };
  }
  if (lower.includes('ok.ru')) {
    return { name: 'OK.ru', category: 'Video Streaming', icon: '🎬', color: '#f97316' };
  }
  if (lower.includes('bilibili.com')) {
    return { name: 'Bilibili', category: 'Anime', icon: '🎌', color: '#ec4899' };
  }
  if (lower.includes('soundcloud.com')) {
    return { name: 'SoundCloud', category: 'Music', icon: '🎵', color: '#f97316' };
  }
  if (lower.includes('bandcamp.com')) {
    return { name: 'Bandcamp', category: 'Music', icon: '🎵', color: '#10b981' };
  }
  if (lower.includes('tiktok.com')) {
    return { name: 'TikTok', category: 'Social Media', icon: '📱', color: '#00f2fe' };
  }
  if (lower.includes('twitch.tv')) {
    return { name: 'Twitch', category: 'Gaming', icon: '🎮', color: '#a855f7' };
  }
  if (lower.includes('animeflv.net')) {
    return { name: 'AnimeFLV', category: 'Anime & Series', icon: '🎌', color: '#f59e0b' };
  }
  if (lower.includes('spotify.com')) {
    return { name: 'Spotify', category: 'Podcasts', icon: '🎙️', color: '#10b981' };
  }
  return { name: 'Web', category: 'Other', icon: '🌐', color: '#10b981' };
}

export function classifyContentFormat(durationSeconds: number, url: string, title: string, platform: string): AudiovisualFormat {
  const lowerUrl = (url || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  // 1. Short-form detection (TikTok, YouTube Shorts, Reels, <60s)
  if (
    lowerUrl.includes('/shorts/') ||
    lowerUrl.includes('tiktok.com') ||
    lowerUrl.includes('/reel/') ||
    lowerUrl.includes('/reels/') ||
    (durationSeconds > 0 && durationSeconds <= 60 && !lowerTitle.includes('trailer') && !lowerTitle.includes('teaser'))
  ) {
    return 'short';
  }

  // 2. Series / Episodic detection
  if (
    lowerUrl.includes('animeflv.net/anime/') ||
    lowerUrl.includes('playlist') ||
    lowerUrl.includes('list=') ||
    lowerUrl.includes('series') ||
    /\b(season|temporada|episodio|episode|capitulo|capítulo|cour|arc)\s*\d+/i.test(lowerTitle) ||
    /\bep\s*\.?\s*\d+/i.test(lowerTitle) ||
    /\[\d+x\d+\]/.test(lowerTitle) ||
    /s\d+e\d+/i.test(lowerTitle)
  ) {
    return 'series';
  }

  // 3. Movie / Feature Film detection
  if (
    lowerTitle.includes('película') ||
    lowerTitle.includes('pelicula') ||
    lowerTitle.includes('full movie') ||
    lowerTitle.includes('película completa') ||
    lowerTitle.includes('feature film') ||
    lowerTitle.includes('ova') ||
    (durationSeconds >= 3600) // 60 minutes or longer
  ) {
    return 'movie';
  }

  return 'clip';
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '03:45';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface AnimeSeasonPack {
  id: string;
  seasonNumber: number;
  title: string;
  type: 'series' | 'movie' | 'ova';
  episodesCount: number;
  slug: string;
  coverUrl: string;
  entries: any[];
}

export function buildAnimeEntries(slug: string, titlePrefix: string, count: number, isMovie = false, poster = '') {
  const entries: any[] = [];
  const finalPoster = poster || `https://www3.animeflv.net/uploads/animes/covers/${slug}.jpg`;
  if (isMovie) {
    entries.push({
      id: `animeflv-${slug}-movie`,
      episodeNumber: 1,
      title: `${titlePrefix} (Película Completa)`,
      url: `https://www3.animeflv.net/ver/${slug}-1`,
      duration: '01:52:00',
      thumbnail: finalPoster,
      author: 'AnimeFLV Películas',
      platform: 'AnimeFLV',
      format_type: 'movie',
      is_movie: true
    });
  } else {
    for (let i = 1; i <= count; i++) {
      entries.push({
        id: `animeflv-${slug}-${i}`,
        episodeNumber: i,
        title: `${titlePrefix} - Episodio ${String(i).padStart(2, '0')}`,
        url: `https://www3.animeflv.net/ver/${slug}-${i}`,
        duration: '24:00',
        thumbnail: finalPoster,
        author: 'AnimeFLV',
        platform: 'AnimeFLV',
        format_type: 'series'
      });
    }
  }
  return entries;
}

export const FRANCHISE_REGISTRY: Record<string, {
  title: string;
  synopsis: string;
  coverSlug: string;
  genres: string[];
  seasons: Array<{
    id: string;
    seasonNumber: number;
    title: string;
    type: 'series' | 'movie' | 'ova';
    episodesCount: number;
    slug: string;
    isMovie?: boolean;
  }>;
}> = {
  'attack-on-titan': {
    title: 'Shingeki no Kyojin (Attack on Titan)',
    synopsis: 'La humanidad sobrevive confinada en murallas gigantes para protegerse de los Titanes. Eren Jaeger y el Cuerpo de Exploración libran una feroz guerra por la verdad y la libertad.',
    coverSlug: 'shingeki-no-kyojin',
    genres: ['Acción', 'Fantasía', 'Militar', 'Misterio', 'Drama'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1', type: 'series', episodesCount: 25, slug: 'shingeki-no-kyojin' },
      { id: 's2', seasonNumber: 2, title: 'Temporada 2', type: 'series', episodesCount: 12, slug: 'shingeki-no-kyojin-season-2' },
      { id: 's3p1', seasonNumber: 3, title: 'Temporada 3 Parte 1', type: 'series', episodesCount: 12, slug: 'shingeki-no-kyojin-season-3' },
      { id: 's3p2', seasonNumber: 4, title: 'Temporada 3 Parte 2', type: 'series', episodesCount: 10, slug: 'shingeki-no-kyojin-season-3-part-2' },
      { id: 's4p1', seasonNumber: 5, title: 'The Final Season', type: 'series', episodesCount: 16, slug: 'shingeki-no-kyojin-the-final-season' },
      { id: 's4p2', seasonNumber: 6, title: 'Final Season Parte 2', type: 'series', episodesCount: 12, slug: 'shingeki-no-kyojin-the-final-season-part-2' },
      { id: 's4p3', seasonNumber: 7, title: 'Final Season Especiales', type: 'series', episodesCount: 2, slug: 'shingeki-no-kyojin-the-final-season-kanketsu-hen' },
      { id: 'movies', seasonNumber: 8, title: 'Películas y OVAs', type: 'movie', episodesCount: 4, slug: 'shingeki-no-kyojin-movie-1-guren-no-yumiya', isMovie: true }
    ]
  },
  'shingeki-no-kyojin': {
    title: 'Shingeki no Kyojin (Attack on Titan)',
    synopsis: 'La humanidad sobrevive confinada en murallas gigantes para protegerse de los Titanes. Eren Jaeger y el Cuerpo de Exploración libran una feroz guerra por la verdad y la libertad.',
    coverSlug: 'shingeki-no-kyojin',
    genres: ['Acción', 'Fantasía', 'Militar', 'Misterio', 'Drama'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1', type: 'series', episodesCount: 25, slug: 'shingeki-no-kyojin' },
      { id: 's2', seasonNumber: 2, title: 'Temporada 2', type: 'series', episodesCount: 12, slug: 'shingeki-no-kyojin-season-2' },
      { id: 's3p1', seasonNumber: 3, title: 'Temporada 3 Parte 1', type: 'series', episodesCount: 12, slug: 'shingeki-no-kyojin-season-3' },
      { id: 's3p2', seasonNumber: 4, title: 'Temporada 3 Parte 2', type: 'series', episodesCount: 10, slug: 'shingeki-no-kyojin-season-3-part-2' },
      { id: 's4p1', seasonNumber: 5, title: 'The Final Season', type: 'series', episodesCount: 16, slug: 'shingeki-no-kyojin-the-final-season' },
      { id: 's4p2', seasonNumber: 6, title: 'Final Season Parte 2', type: 'series', episodesCount: 12, slug: 'shingeki-no-kyojin-the-final-season-part-2' },
      { id: 's4p3', seasonNumber: 7, title: 'Final Season Especiales', type: 'series', episodesCount: 2, slug: 'shingeki-no-kyojin-the-final-season-kanketsu-hen' },
      { id: 'movies', seasonNumber: 8, title: 'Películas y OVAs', type: 'movie', episodesCount: 4, slug: 'shingeki-no-kyojin-movie-1-guren-no-yumiya', isMovie: true }
    ]
  },
  'demon-slayer': {
    title: 'Kimetsu no Yaiba (Demon Slayer)',
    synopsis: 'Tanjiro Kamado emprende un viaje como cazador de demonios para devolverle la humanidad a su hermana Nezuko y vengar a su familia.',
    coverSlug: 'kimetsu-no-yaiba',
    genres: ['Acción', 'Fantasía', 'Shounen', 'Sobrenatural'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1: Tanjiro Kamado', type: 'series', episodesCount: 26, slug: 'kimetsu-no-yaiba' },
      { id: 's2', seasonNumber: 2, title: 'Mugen Train Arc (TV)', type: 'series', episodesCount: 7, slug: 'kimetsu-no-yaiba-mugen-ressha-hen' },
      { id: 'movie1', seasonNumber: 3, title: 'Película: Mugen Ressha-hen', type: 'movie', episodesCount: 1, slug: 'kimetsu-no-yaiba-movie-mugen-ressha-hen', isMovie: true },
      { id: 's3', seasonNumber: 4, title: 'Temporada 2: Distrito Rojo', type: 'series', episodesCount: 11, slug: 'kimetsu-no-yaiba-yuukaku-hen' },
      { id: 's4', seasonNumber: 5, title: 'Temporada 3: Aldea de los Herreros', type: 'series', episodesCount: 11, slug: 'kimetsu-no-yaiba-katanakaji-no-sato-hen' },
      { id: 's5', seasonNumber: 6, title: 'Temporada 4: Entrenamiento Pilar', type: 'series', episodesCount: 8, slug: 'kimetsu-no-yaiba-hashira-geiko-hen' }
    ]
  },
  'kimetsu-no-yaiba': {
    title: 'Kimetsu no Yaiba (Demon Slayer)',
    synopsis: 'Tanjiro Kamado emprende un viaje como cazador de demonios para devolverle la humanidad a su hermana Nezuko y vengar a su familia.',
    coverSlug: 'kimetsu-no-yaiba',
    genres: ['Acción', 'Fantasía', 'Shounen', 'Sobrenatural'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1: Tanjiro Kamado', type: 'series', episodesCount: 26, slug: 'kimetsu-no-yaiba' },
      { id: 's2', seasonNumber: 2, title: 'Mugen Train Arc (TV)', type: 'series', episodesCount: 7, slug: 'kimetsu-no-yaiba-mugen-ressha-hen' },
      { id: 'movie1', seasonNumber: 3, title: 'Película: Mugen Ressha-hen', type: 'movie', episodesCount: 1, slug: 'kimetsu-no-yaiba-movie-mugen-ressha-hen', isMovie: true },
      { id: 's3', seasonNumber: 4, title: 'Temporada 2: Distrito Rojo', type: 'series', episodesCount: 11, slug: 'kimetsu-no-yaiba-yuukaku-hen' },
      { id: 's4', seasonNumber: 5, title: 'Temporada 3: Aldea de los Herreros', type: 'series', episodesCount: 11, slug: 'kimetsu-no-yaiba-katanakaji-no-sato-hen' },
      { id: 's5', seasonNumber: 6, title: 'Temporada 4: Entrenamiento Pilar', type: 'series', episodesCount: 8, slug: 'kimetsu-no-yaiba-hashira-geiko-hen' }
    ]
  },
  'solo-leveling': {
    title: 'Solo Leveling (Ore dake Level Up na Ken)',
    synopsis: 'En un mundo donde cazadores con poderes mágicos batallan monstruos letales, Sung Jinwoo despierta un misterioso sistema para subir de nivel sin límites.',
    coverSlug: 'solo-leveling',
    genres: ['Acción', 'Aventura', 'Fantasía', 'Sobrenatural'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1', type: 'series', episodesCount: 12, slug: 'solo-leveling' },
      { id: 's2', seasonNumber: 2, title: 'Temporada 2: Arise from the Shadow', type: 'series', episodesCount: 13, slug: 'solo-leveling-season-2-arise-from-the-shadow' },
      { id: 'movie1', seasonNumber: 3, title: 'Película: ReAwakening', type: 'movie', episodesCount: 1, slug: 'solo-leveling-reawakening', isMovie: true }
    ]
  },
  'jujutsu-kaisen': {
    title: 'Jujutsu Kaisen',
    synopsis: 'Yuji Itadori se une a los Hechiceros de Jujutsu para recolectar y purificar los dedos del legendario Rey de las Maldiciones, Ryomen Sukuna.',
    coverSlug: 'jujutsu-kaisen-tv',
    genres: ['Acción', 'Fantasía Oscura', 'Sobrenatural', 'Shounen'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1', type: 'series', episodesCount: 24, slug: 'jujutsu-kaisen-tv' },
      { id: 'movie1', seasonNumber: 2, title: 'Película: Jujutsu Kaisen 0', type: 'movie', episodesCount: 1, slug: 'jujutsu-kaisen-0', isMovie: true },
      { id: 's2', seasonNumber: 3, title: 'Temporada 2: Incidente de Shibuya', type: 'series', episodesCount: 23, slug: 'jujutsu-kaisen-2nd-season' }
    ]
  },
  'my-hero-academia': {
    title: 'Boku no Hero Academia (My Hero Academia)',
    synopsis: 'En un mundo donde el 80% de la población posee Dones, Izuku Midoriya nace sin poderes pero hereda el legado del símbolo de la paz All Might.',
    coverSlug: 'boku-no-hero-academia',
    genres: ['Acción', 'Superpoderes', 'Escolar', 'Shounen'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1', type: 'series', episodesCount: 13, slug: 'boku-no-hero-academia' },
      { id: 's2', seasonNumber: 2, title: 'Temporada 2', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-2nd-season' },
      { id: 's3', seasonNumber: 3, title: 'Temporada 3', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-3rd-season' },
      { id: 's4', seasonNumber: 4, title: 'Temporada 4', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-4th-season' },
      { id: 's5', seasonNumber: 5, title: 'Temporada 5', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-5th-season' },
      { id: 's6', seasonNumber: 6, title: 'Temporada 6', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-6th-season' },
      { id: 's7', seasonNumber: 7, title: 'Temporada 7', type: 'series', episodesCount: 21, slug: 'boku-no-hero-academia-7th-season' },
      { id: 'movies', seasonNumber: 8, title: 'Películas de la Franquicia', type: 'movie', episodesCount: 4, slug: 'boku-no-hero-academia-the-movie-futari-no-hero', isMovie: true }
    ]
  },
  'boku-no-hero-academia': {
    title: 'Boku no Hero Academia (My Hero Academia)',
    synopsis: 'En un mundo donde el 80% de la población posee Dones, Izuku Midoriya nace sin poderes pero hereda el legado del símbolo de la paz All Might.',
    coverSlug: 'boku-no-hero-academia',
    genres: ['Acción', 'Superpoderes', 'Escolar', 'Shounen'],
    seasons: [
      { id: 's1', seasonNumber: 1, title: 'Temporada 1', type: 'series', episodesCount: 13, slug: 'boku-no-hero-academia' },
      { id: 's2', seasonNumber: 2, title: 'Temporada 2', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-2nd-season' },
      { id: 's3', seasonNumber: 3, title: 'Temporada 3', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-3rd-season' },
      { id: 's4', seasonNumber: 4, title: 'Temporada 4', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-4th-season' },
      { id: 's5', seasonNumber: 5, title: 'Temporada 5', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-5th-season' },
      { id: 's6', seasonNumber: 6, title: 'Temporada 6', type: 'series', episodesCount: 25, slug: 'boku-no-hero-academia-6th-season' },
      { id: 's7', seasonNumber: 7, title: 'Temporada 7', type: 'series', episodesCount: 21, slug: 'boku-no-hero-academia-7th-season' },
      { id: 'movies', seasonNumber: 8, title: 'Películas de la Franquicia', type: 'movie', episodesCount: 4, slug: 'boku-no-hero-academia-the-movie-futari-no-hero', isMovie: true }
    ]
  }
};

export async function extractAnimeFlvPackage(url: string) {
  const slugMatch = url.match(/animeflv\.net\/(?:anime|ver)\/([a-zA-Z0-9_-]+?)(?:-\d+)?$/i);
  const slug = slugMatch ? slugMatch[1].toLowerCase() : 'anime';

  let matchedFranchiseKey = Object.keys(FRANCHISE_REGISTRY).find((k) =>
    slug === k || slug.startsWith(`${k}-`) || slug.includes(k)
  );

  if (matchedFranchiseKey && FRANCHISE_REGISTRY[matchedFranchiseKey]) {
    const fran = FRANCHISE_REGISTRY[matchedFranchiseKey];
    const seasonsList: AnimeSeasonPack[] = fran.seasons.map((s) => ({
      id: s.id,
      seasonNumber: s.seasonNumber,
      title: s.title,
      type: s.type,
      episodesCount: s.episodesCount,
      slug: s.slug,
      coverUrl: `https://www3.animeflv.net/uploads/animes/covers/${s.slug}.jpg`,
      entries: buildAnimeEntries(s.slug, `${s.title}`, s.episodesCount, s.isMovie)
    }));

    const totalEps = seasonsList.reduce((acc, cur) => acc + cur.episodesCount, 0);

    return {
      title: fran.title,
      synopsis: fran.synopsis,
      coverUrl: `https://www3.animeflv.net/uploads/animes/covers/${fran.coverSlug}.jpg`,
      format_type: 'series',
      genres: fran.genres,
      totalEpisodes: totalEps,
      playlist_count: totalEps,
      totalSeasons: seasonsList.length,
      seasons: seasonsList,
      entries: seasonsList[0]?.entries || []
    };
  }

  const cleanTitle = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const posterUrl = `https://www3.animeflv.net/uploads/animes/covers/${slug}.jpg`;
  let pageTitle = cleanTitle;
  let pageSynopsis = `Episodios y películas completas de ${cleanTitle} en audio original y subtítulos en español.`;
  let isMovie = url.toLowerCase().includes('pelicula') || url.toLowerCase().includes('movie');
  let rawEpisodes: Array<[number, number]> = [];
  let detectedType = isMovie ? 'Película' : 'Anime';
  const genres = ['Anime', 'Acción', 'Aventura'];
  const relatedAnimes: Array<{ title: string; slug: string; type: string }> = [];

  try {
    const targetUrl = url.includes('/anime/') ? url : `https://www3.animeflv.net/anime/${slug}`;
    const res = await safeFetch(targetUrl, {
      'Referer': 'https://www3.animeflv.net/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }, 4500);

    if (res && res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<h1 class="Title">([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) pageTitle = titleMatch[1].replace(/AnimeFLV/i, '').replace(/Online/i, '').replace(/[-—|]/g, '').trim();

      const descMatch = html.match(/<div class="Description">\s*<p>([\s\S]*?)<\/p>/i);
      if (descMatch) pageSynopsis = descMatch[1].replace(/<[^>]+>/g, '').trim();

      const typeMatch = html.match(/<span class="Type[^"]*">([^<]+)<\/span>/i);
      if (typeMatch) {
        detectedType = typeMatch[1].trim();
        if (/película|pelicula|movie/i.test(detectedType)) isMovie = true;
      }

      const epMatch = html.match(/var episodes = (\[[\s\S]*?\]);/);
      if (epMatch) {
        try {
          rawEpisodes = JSON.parse(epMatch[1]);
        } catch {}
      }

      const relatedRegex = /<a href="\/anime\/([a-zA-Z0-9_-]+)">([^<]+)<\/a>\s*\(([^)]+)\)/g;
      let relMatch;
      while ((relMatch = relatedRegex.exec(html)) !== null) {
        relatedAnimes.push({
          slug: relMatch[1],
          title: relMatch[2].trim(),
          type: relMatch[3].trim()
        });
      }
    }
  } catch {}

  let totalEps = rawEpisodes.length;
  if (totalEps === 0) {
    totalEps = isMovie ? 1 : 24;
  }

  const primaryEntries = buildAnimeEntries(slug, pageTitle, totalEps, isMovie, posterUrl);

  const seasons: AnimeSeasonPack[] = [
    {
      id: `s-main-${slug}`,
      seasonNumber: 1,
      title: isMovie ? 'Película Principal' : 'Temporada 1',
      type: isMovie ? 'movie' : 'series',
      episodesCount: primaryEntries.length,
      slug,
      coverUrl: posterUrl,
      entries: primaryEntries
    }
  ];

  if (relatedAnimes.length > 0) {
    relatedAnimes.slice(0, 5).forEach((rel, idx) => {
      const isRelMovie = /película|pelicula|movie/i.test(rel.type);
      const isOva = /ova|especial/i.test(rel.type);
      const epsCount = isRelMovie ? 1 : isOva ? 4 : 12;
      seasons.push({
        id: `s-rel-${rel.slug}-${idx}`,
        seasonNumber: idx + 2,
        title: `${rel.title} (${rel.type})`,
        type: isRelMovie ? 'movie' : isOva ? 'ova' : 'series',
        episodesCount: epsCount,
        slug: rel.slug,
        coverUrl: `https://www3.animeflv.net/uploads/animes/covers/${rel.slug}.jpg`,
        entries: buildAnimeEntries(rel.slug, rel.title, epsCount, isRelMovie)
      });
    });
  }

  const totalAllEpisodes = seasons.reduce((acc, cur) => acc + cur.episodesCount, 0);

  return {
    title: pageTitle,
    synopsis: pageSynopsis,
    coverUrl: posterUrl,
    format_type: isMovie ? 'movie' : 'series',
    genres,
    totalEpisodes: totalAllEpisodes,
    playlist_count: totalAllEpisodes,
    totalSeasons: seasons.length,
    seasons,
    entries: primaryEntries
  };
}

export function decodeHtml(html: string): string {
  return html
    .replace(/&amp;#039;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export async function searchDuckDuckGo(query: string, effectiveSite: string, maxResults: number, region: string = 'wt-wt'): Promise<any[]> {
  const results: any[] = [];
  try {
    const isAll = !effectiveSite || effectiveSite.toLowerCase() === 'all';
    let siteFilter = '';
    if (!isAll) {
      const s = effectiveSite.toLowerCase();
      if (s === 'twitch') siteFilter = 'site:twitch.tv';
      else if (s === 'spotify') siteFilter = 'site:open.spotify.com';
      else if (s === 'animeflv') siteFilter = 'site:animeflv.net';
      else siteFilter = `site:${s}.com`;
    } else {
      siteFilter = '(site:vimeo.com OR site:dailymotion.com OR site:bilibili.com OR site:tiktok.com OR site:twitch.tv OR site:animeflv.net)';
    }

    const postBody = new URLSearchParams({
      q: `${query} ${siteFilter}`,
      kl: region || 'wt-wt'
    }).toString();

    const ddgRes = await safeFetch('https://lite.duckduckgo.com/lite/', {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }, 6000, 'POST', postBody);

    if (ddgRes && ddgRes.ok) {
      const html = await ddgRes.text();
      const linkRegex = /<a rel="nofollow" href="([^"]+)" class=['"]result-link['"]>([\s\S]*?)<\/a>/g;
      let match;
      let added = 0;

      while ((match = linkRegex.exec(html)) !== null && added < maxResults) {
        const rawUrl = match[1];
        const rawTitle = decodeHtml(match[2].replace(/<[^>]+>/g, '').trim());

        let cleanUrl = rawUrl;
        const uddgMatch = rawUrl.match(/[?&]uddg=([^&]+)/);
        if (uddgMatch) {
          cleanUrl = decodeURIComponent(uddgMatch[1]);
        }

        if (cleanUrl.startsWith('http')) {
          const pInfo = detectPlatform(cleanUrl);

          let thumb = '';
          const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) {
            thumb = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
          } else {
            const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/);
            if (vimeoMatch) {
              thumb = `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
            } else {
              const dmMatch = cleanUrl.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
              if (dmMatch) {
                thumb = `https://www.dailymotion.com/thumbnail/video/${dmMatch[1]}`;
              } else if (cleanUrl.includes('animeflv.net')) {
                const slugMatch = cleanUrl.match(/animeflv\.net\/(?:anime|ver)\/([a-zA-Z0-9_-]+?)(?:-\d+)?$/i);
                if (slugMatch) {
                  thumb = `https://www3.animeflv.net/uploads/animes/covers/${slugMatch[1]}.jpg`;
                }
              }
            }
          }

          const isSeries = /episode|season|ep\s*\d+|part\s*\d+|animeflv\.net/i.test(rawTitle + ' ' + cleanUrl);

          results.push({
            id: `live-${results.length}-${Date.now()}`,
            url: cleanUrl,
            title: rawTitle,
            author: `${pInfo.name} Creator`,
            duration: cleanUrl.includes('animeflv.net') ? '24:00' : '04:15',
            duration_seconds: cleanUrl.includes('animeflv.net') ? 1440 : 255,
            thumbnail: thumb,
            platform: pInfo.name,
            platform_category: pInfo.category,
            platform_icon: pInfo.icon,
            platform_color: pInfo.color,
            upload_date: new Date().toISOString().split('T')[0],
            description: `Stream content discovered from ${pInfo.name}.`,
            available_qualities: ['1080p (Full HD)', '720p (HD)', '480p (SD)', 'Audio Only (MP3)'],
            is_part_of_series: isSeries,
            series_name: isSeries ? query : undefined,
            episode_number: undefined
          });
          added++;
        }
      }
    }
  } catch (e) {
    console.warn('[ScraperService] DuckDuckGo search probe note:', e);
  }
  return results;
}

export const ScraperService = {
  detectPlatform,
  classifyContentFormat,
  formatDuration,
  buildAnimeEntries,
  FRANCHISE_REGISTRY,
  extractAnimeFlvPackage,
  decodeHtml,
  searchDuckDuckGo
};
