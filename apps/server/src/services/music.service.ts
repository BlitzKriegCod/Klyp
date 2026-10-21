import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { DOWNLOADS_DIR } from '../config/env';
import { safeFetch, downloadRemoteFile } from '../middleware/safeFetch';
import { hasBinary } from '../config/binaries';
import { FileService } from './file.service';
import { taskQueueWorker } from '../workers/taskQueueWorker';

const MUSIC_DIR = path.resolve(DOWNLOADS_DIR, 'Music');
if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

function runCommandWithTimeout(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

function upscaleArtwork(url?: string): string {
  if (!url) return '';
  return url.replace(/\/\d+x\d+bb\.jpg/i, '/1200x1200bb.jpg');
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export class MusicService {
  static async searchDeezerFallback(query: string) {
    try {
      const res = await safeFetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`, {}, 5000);
      if (!res || !res.ok) return null;
      const json = await res.json();
      const data = json.data || [];
      if (!Array.isArray(data) || data.length === 0) return null;

      const artistMap = new Map<string, any>();
      const albumMap = new Map<string, any>();
      const tracks: any[] = [];

      for (const item of data) {
        if (item.artist && !artistMap.has(String(item.artist.id))) {
          artistMap.set(String(item.artist.id), {
            id: String(item.artist.id),
            name: item.artist.name,
            genres: ['Music'],
            artworkUrl: item.artist.picture_xl || item.artist.picture_big || item.artist.picture_medium || '',
            country: 'Worldwide',
            disambiguation: 'Artist'
          });
        }

        if (item.album && !albumMap.has(String(item.album.id))) {
          albumMap.set(String(item.album.id), {
            id: String(item.album.id),
            title: item.album.title,
            artist: item.artist?.name || 'Artist',
            artistId: item.artist ? String(item.artist.id) : undefined,
            releaseDate: '',
            releaseYear: 2024,
            type: 'album',
            trackCount: 1,
            artworkUrl: item.album.cover_xl || item.album.cover_big || item.album.cover_medium || '',
            genre: 'Music',
            copyright: ''
          });
        }

        tracks.push({
          id: String(item.id),
          trackNumber: 1,
          discNumber: 1,
          totalTracks: 1,
          title: item.title,
          artist: item.artist?.name || 'Artist',
          album: item.album?.title || 'Single',
          albumId: item.album ? String(item.album.id) : undefined,
          durationMs: (item.duration || 180) * 1000,
          durationFormatted: formatDuration(item.duration || 180),
          previewUrl: item.preview || '',
          releaseDate: '',
          genre: 'Music',
          artworkUrl: item.album?.cover_xl || item.album?.cover_big || ''
        });
      }

      return {
        artists: Array.from(artistMap.values()),
        albums: Array.from(albumMap.values()),
        tracks
      };
    } catch {
      return null;
    }
  }

  static async searchMusic(query: string) {
    const [artistRes, albumRes, songRes] = await Promise.all([
      safeFetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=6`, {}, 5000),
      safeFetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=18`, {}, 5000),
      safeFetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=18`, {}, 5000)
    ]);

    const artistData = artistRes && artistRes.ok ? await artistRes.json().catch(() => ({ results: [] })) : { results: [] };
    const albumData = albumRes && albumRes.ok ? await albumRes.json().catch(() => ({ results: [] })) : { results: [] };
    const songData = songRes && songRes.ok ? await songRes.json().catch(() => ({ results: [] })) : { results: [] };

    if (
      (!artistData.results || artistData.results.length === 0) &&
      (!albumData.results || albumData.results.length === 0) &&
      (!songData.results || songData.results.length === 0)
    ) {
      const fallback = await this.searchDeezerFallback(query);
      if (fallback) return fallback;
    }

    const albums = (albumData.results || []).map((a: any) => {
      const year = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 2024;
      const title = a.collectionName || 'Untitled Album';
      let type: 'album' | 'ep' | 'single' | 'compilation' = 'album';
      if (a.collectionType === 'Compilation' || /best of|greatest hits|anthology/i.test(title)) {
        type = 'compilation';
      } else if (/\bEP\b|mini[- ]album/i.test(title) || (a.trackCount && a.trackCount <= 5 && a.trackCount > 2)) {
        type = 'ep';
      } else if (/\bsingle\b/i.test(title) || a.trackCount <= 2) {
        type = 'single';
      }

      return {
        id: String(a.collectionId),
        title,
        artist: a.artistName || 'Unknown Artist',
        artistId: a.artistId ? String(a.artistId) : undefined,
        releaseDate: a.releaseDate || '',
        releaseYear: year,
        type,
        trackCount: a.trackCount || 1,
        artworkUrl: upscaleArtwork(a.artworkUrl100),
        genre: a.primaryGenreName || 'Music',
        copyright: a.copyright || ''
      };
    });

    const artists = (artistData.results || []).map((art: any) => {
      const matchingAlbum = albums.find((al: any) => al.artistId === String(art.artistId) || al.artist.toLowerCase() === art.artistName.toLowerCase());
      return {
        id: String(art.artistId),
        name: art.artistName,
        genres: [art.primaryGenreName].filter(Boolean),
        artworkUrl: matchingAlbum?.artworkUrl || '',
        country: 'Worldwide',
        disambiguation: art.artistType || 'Artist'
      };
    });

    const tracks = (songData.results || []).map((s: any) => {
      const durSec = Math.round((s.trackTimeMillis || 210000) / 1000);
      return {
        id: String(s.trackId),
        trackNumber: s.trackNumber || 1,
        discNumber: s.discNumber || 1,
        totalTracks: s.trackCount || 1,
        title: s.trackName || 'Untitled Song',
        artist: s.artistName || 'Unknown Artist',
        album: s.collectionName || 'Unknown Album',
        albumId: s.collectionId ? String(s.collectionId) : undefined,
        durationMs: s.trackTimeMillis || 210000,
        durationFormatted: formatDuration(durSec),
        previewUrl: s.previewUrl || '',
        releaseDate: s.releaseDate || '',
        genre: s.primaryGenreName || 'Music',
        artworkUrl: upscaleArtwork(s.artworkUrl100)
      };
    });

    return { artists, albums, tracks };
  }

  static async getArtistDiscography(artistId: string) {
    const itunesUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(artistId)}&entity=album&limit=150`;
    const resp = await safeFetch(itunesUrl, {}, 6000);

    if (!resp || !resp.ok) {
      return {
        artist: {
          id: artistId,
          name: 'Artist',
          genres: ['Music'],
          artworkUrl: '',
          albumsCount: 0,
          country: 'Worldwide',
          disambiguation: 'Artist'
        },
        studioAlbums: [],
        epsAndMiniAlbums: [],
        singlesAndRemixes: [],
        compilations: [],
        totalReleases: 0
      };
    }

    const data = await resp.json().catch(() => ({ results: [] }));
    const results = data.results || [];
    if (results.length === 0) {
      throw new Error('Artist not found');
    }

    const artistRaw = results[0];
    const artistName = artistRaw.artistName || 'Artist';

    let country = 'Worldwide';
    let disambiguation = artistRaw.primaryGenreName || 'Artist';
    try {
      const mbRes = await safeFetch(`https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artistName)}&fmt=json&limit=1`, {
        'User-Agent': 'KlypMusic/2.0 ( contact@klyp.local )'
      }, 3500);
      if (mbRes && mbRes.ok) {
        const mbData = await mbRes.json();
        const mbArtist = mbData.artists?.[0];
        if (mbArtist) {
          if (mbArtist.country) country = mbArtist.country;
          if (mbArtist.disambiguation) disambiguation = mbArtist.disambiguation;
        }
      }
    } catch {}

    const rawAlbums = results.slice(1).filter((r: any) => r.collectionName);
    const seenTitles = new Map<string, any>();
    for (const item of rawAlbums) {
      const normTitle = (item.collectionName || '').toLowerCase().replace(/\s*\((?:deluxe|remastered|special edition|bonus track version)[^)]*\)/i, '').trim();
      const existing = seenTitles.get(normTitle);
      if (!existing || (item.trackCount || 0) > (existing.trackCount || 0)) {
        seenTitles.set(normTitle, item);
      }
    }

    const uniqueAlbums = Array.from(seenTitles.values());
    const studioAlbums: any[] = [];
    const epsAndMiniAlbums: any[] = [];
    const singlesAndRemixes: any[] = [];
    const compilations: any[] = [];
    let topArtwork = '';

    for (const a of uniqueAlbums) {
      const year = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 2024;
      const title = a.collectionName || 'Untitled Album';
      const artwork = upscaleArtwork(a.artworkUrl100);
      if (!topArtwork && artwork) topArtwork = artwork;

      const albumObj = {
        id: String(a.collectionId),
        title,
        artist: a.artistName || artistName,
        artistId: String(artistId),
        releaseDate: a.releaseDate || '',
        releaseYear: year,
        trackCount: a.trackCount || 1,
        artworkUrl: artwork,
        genre: a.primaryGenreName || artistRaw.primaryGenreName || 'Music',
        copyright: a.copyright || '',
        recordLabel: a.copyright || ''
      };

      if (a.collectionType === 'Compilation' || /greatest hits|best of|anthology|the collection|gold|essentials/i.test(title)) {
        compilations.push({ ...albumObj, type: 'compilation' });
      } else if (/\bEP\b|mini[- ]album/i.test(title) || (a.trackCount >= 2 && a.trackCount <= 5)) {
        epsAndMiniAlbums.push({ ...albumObj, type: 'ep' });
      } else if (/\bsingle\b|remix/i.test(title) || a.trackCount <= 2) {
        singlesAndRemixes.push({ ...albumObj, type: 'single' });
      } else {
        studioAlbums.push({ ...albumObj, type: 'album' });
      }
    }

    const sortByYear = (arr: any[]) => arr.sort((a, b) => b.releaseYear - a.releaseYear || b.releaseDate.localeCompare(a.releaseDate));
    sortByYear(studioAlbums);
    sortByYear(epsAndMiniAlbums);
    sortByYear(singlesAndRemixes);
    sortByYear(compilations);

    return {
      artist: {
        id: String(artistId),
        name: artistName,
        genres: [artistRaw.primaryGenreName].filter(Boolean),
        artworkUrl: topArtwork,
        albumsCount: studioAlbums.length,
        country,
        disambiguation
      },
      studioAlbums,
      epsAndMiniAlbums,
      singlesAndRemixes,
      compilations,
      totalReleases: studioAlbums.length + epsAndMiniAlbums.length + singlesAndRemixes.length + compilations.length
    };
  }

  static async getAlbumTracks(albumId: string) {
    const itunesUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(albumId)}&entity=song&limit=150`;
    const resp = await safeFetch(itunesUrl, {}, 6000);

    if (!resp || !resp.ok) {
      throw new Error('Failed to fetch album tracks from iTunes');
    }

    const data = await resp.json().catch(() => ({ results: [] }));
    const results = data.results || [];
    if (results.length === 0) {
      throw new Error('Album not found');
    }

    const coll = results[0];
    const albumArtwork = upscaleArtwork(coll.artworkUrl100);
    const releaseYear = coll.releaseDate ? new Date(coll.releaseDate).getFullYear() : 2024;

    const album = {
      id: String(coll.collectionId),
      title: coll.collectionName || 'Untitled Album',
      artist: coll.artistName || 'Unknown Artist',
      artistId: coll.artistId ? String(coll.artistId) : undefined,
      releaseDate: coll.releaseDate || '',
      releaseYear,
      trackCount: coll.trackCount || 0,
      artworkUrl: albumArtwork,
      genre: coll.primaryGenreName || 'Music',
      copyright: coll.copyright || ''
    };

    const songItems = results.slice(1).filter((r: any) => r.wrapperType === 'track' || r.kind === 'song');
    const tracks = songItems.map((s: any) => {
      const durSec = Math.round((s.trackTimeMillis || 180000) / 1000);
      return {
        id: String(s.trackId),
        trackNumber: s.trackNumber || 1,
        discNumber: s.discNumber || 1,
        totalTracks: coll.trackCount || songItems.length,
        title: s.trackName || 'Untitled Track',
        artist: s.artistName || coll.artistName,
        album: s.collectionName || coll.collectionName,
        albumId: String(coll.collectionId),
        durationMs: s.trackTimeMillis || 180000,
        durationFormatted: formatDuration(durSec),
        previewUrl: s.previewUrl || '',
        releaseDate: s.releaseDate || coll.releaseDate || '',
        genre: s.primaryGenreName || coll.primaryGenreName || 'Music',
        artworkUrl: albumArtwork
      };
    });

    tracks.sort((a: any, b: any) => (a.discNumber || 1) - (b.discNumber || 1) || a.trackNumber - b.trackNumber);
    return { album, tracks };
  }

  static async resolveStream(artist: string, title: string, album: string, previewUrl?: string) {
    if (artist && title && fs.existsSync(MUSIC_DIR)) {
      const artistDir = FileService.sanitizePathComponent(artist);
      const possibleArtistPath = path.join(MUSIC_DIR, artistDir);
      if (fs.existsSync(possibleArtistPath)) {
        const findMatchingFile = (dir: string): string | null => {
          try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const f of files) {
              const fullPath = path.join(dir, f.name);
              if (f.isDirectory()) {
                const sub = findMatchingFile(fullPath);
                if (sub) return sub;
              } else if (f.isFile() && /\.(mp3|flac|m4a|wav|ogg)$/i.test(f.name)) {
                if (f.name.toLowerCase().includes(title.toLowerCase())) {
                  return fullPath;
                }
              }
            }
          } catch {}
          return null;
        };

        const localFile = findMatchingFile(possibleArtistPath);
        if (localFile && fs.existsSync(localFile)) {
          const relPath = path.relative(DOWNLOADS_DIR, localFile);
          const webRel = relPath.split(path.sep).map(encodeURIComponent).join('/');
          return {
            source: 'local',
            streamUrl: `/media/${webRel}`,
            title,
            artist,
            album,
            isFullAudio: true,
            isLocal: true
          };
        }
      }
    }

    const hasYtDlp = await hasBinary('yt-dlp');
    if (hasYtDlp && artist && title) {
      try {
        const searchQuery = `${artist} - ${title} official audio`;
        const directStreamCmd = `yt-dlp --socket-timeout 5 -f "ba/b" -g "ytsearch1:${searchQuery.replace(/"/g, '\\"')}"`;
        const rawOutput = await runCommandWithTimeout(directStreamCmd, 6000);
        const resolvedUrl = (rawOutput || '').trim().split('\n')[0];
        if (resolvedUrl && resolvedUrl.startsWith('http')) {
          return {
            source: 'stream',
            streamUrl: resolvedUrl,
            title,
            artist,
            album,
            isFullAudio: true,
            isLocal: false
          };
        }
      } catch {}
    }

    if (previewUrl) {
      return {
        source: 'preview',
        streamUrl: previewUrl,
        title,
        artist,
        album,
        isFullAudio: false,
        isLocal: false
      };
    }

    return {
      source: 'sample',
      streamUrl: '/api/media/sample',
      title: title || 'Audio Track',
      artist: artist || 'Unknown Artist',
      album: album || 'Preview Stream',
      isFullAudio: false,
      isLocal: false
    };
  }

  static async batchDownloadMusic(tracks: any[], format = 'mp3') {
    const queuedTasks: any[] = [];

    for (const track of tracks) {
      const safeTaskId = `mus_${track.id || Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const artistDir = FileService.sanitizePathComponent(track.artist || 'Unknown Artist');
      const yearPrefix = track.releaseYear ? `${track.releaseYear} - ` : '';
      const albumDirName = `${yearPrefix}${FileService.sanitizePathComponent(track.album || 'Unknown Album')}`;
      const targetFolder = path.join(MUSIC_DIR, artistDir, albumDirName);

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const trkNum = String(track.trackNumber || 1).padStart(2, '0');
      const cleanTitle = FileService.sanitizePathComponent(track.title || 'Track');
      const ext = format === 'flac' ? 'flac' : 'mp3';
      const finalFileName = `${trkNum} - ${cleanTitle}.${ext}`;
      const finalFilePath = path.join(targetFolder, finalFileName);
      const relativePath = path.relative(DOWNLOADS_DIR, finalFilePath);
      const webRelativePath = relativePath.split(path.sep).map(encodeURIComponent).join('/');

      queuedTasks.push({
        taskId: safeTaskId,
        title: track.title,
        artist: track.artist,
        album: track.album,
        fileName: finalFileName,
        status: 'queued'
      });

      // Execute worker asynchronously
      (async () => {
        try {
          const tmpCover = path.join('/tmp', `cover_${safeTaskId}.jpg`);
          const tmpAudio = path.join('/tmp', `audio_${safeTaskId}.m4a`);

          if (track.artworkUrl) {
            await downloadRemoteFile(upscaleArtwork(track.artworkUrl), tmpCover);
          }

          let audioAcquired = false;
          if (track.previewUrl) {
            audioAcquired = await downloadRemoteFile(track.previewUrl, tmpAudio);
          }

          if (!audioAcquired) {
            try {
              await runCommandWithTimeout(
                `yt-dlp --socket-timeout 10 -x --audio-format m4a -o "${tmpAudio}" "ytsearch1:${track.artist} - ${track.title} audio"`,
                20000
              );
              if (fs.existsSync(tmpAudio)) audioAcquired = true;
            } catch {}
          }

          if (!audioAcquired || !fs.existsSync(tmpAudio)) return;

          const hasCover = fs.existsSync(tmpCover);
          let ffmpegCmd = '';

          if (format === 'flac') {
            ffmpegCmd = `ffmpeg -y -i "${tmpAudio}" ${hasCover ? `-i "${tmpCover}"` : ''} -map 0:a -c:a flac ` +
              `-metadata title="${(track.title || '').replace(/"/g, '\\"')}" ` +
              `-metadata artist="${(track.artist || '').replace(/"/g, '\\"')}" ` +
              `-metadata album="${(track.album || '').replace(/"/g, '\\"')}" ` +
              `-metadata TRACKNUMBER="${track.trackNumber || 1}" ` +
              `-metadata date="${track.releaseYear || ''}" ` +
              `-metadata genre="${(track.genre || '').replace(/"/g, '\\"')}" ` +
              `"${finalFilePath}"`;
          } else {
            ffmpegCmd = `ffmpeg -y -i "${tmpAudio}" ${hasCover ? `-i "${tmpCover}" -map 0:a -map 1:v -c:v copy -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)"` : '-map 0:a'} ` +
              `-c:a libmp3lame -b:a 320k -id3v2_version 3 ` +
              `-metadata title="${(track.title || '').replace(/"/g, '\\"')}" ` +
              `-metadata artist="${(track.artist || '').replace(/"/g, '\\"')}" ` +
              `-metadata album="${(track.album || '').replace(/"/g, '\\"')}" ` +
              `-metadata track="${track.trackNumber || 1}/${track.totalTracks || track.trackNumber || 1}" ` +
              `-metadata date="${track.releaseYear || ''}" ` +
              `-metadata genre="${(track.genre || '').replace(/"/g, '\\"')}" ` +
              `"${finalFilePath}"`;
          }

          await runCommandWithTimeout(ffmpegCmd, 25000);

          try { if (fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio); } catch {}
          try { if (fs.existsSync(tmpCover)) fs.unlinkSync(tmpCover); } catch {}
        } catch (err) {
          console.error(`[MusicService] Task ${safeTaskId} failed:`, err);
        }
      })();
    }

    return queuedTasks;
  }
}
