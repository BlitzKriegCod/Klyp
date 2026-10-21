import { Request, Response } from 'express';
import { MusicService } from '../services/music.service';

export class MusicController {
  static async search(req: Request, res: Response) {
    const rawQ = req.query.q || req.query.query;
    const query = typeof rawQ === 'string' ? rawQ.trim() : '';
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    try {
      const data = await MusicService.searchMusic(query);
      return res.json(data);
    } catch (err: any) {
      console.error('[MusicController] Search error:', err);
      return res.status(500).json({ error: 'Failed to search music catalog', details: err.message });
    }
  }

  static async getDiscography(req: Request, res: Response) {
    const rawId = req.params.id;
    const artistId = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    if (!artistId) return res.status(400).json({ error: 'Artist ID required' });

    try {
      const data = await MusicService.getArtistDiscography(artistId);
      return res.json(data);
    } catch (err: any) {
      console.error('[MusicController] Discography error:', err);
      return res.status(500).json({ error: 'Failed to fetch artist discography', details: err.message });
    }
  }

  static async getTracks(req: Request, res: Response) {
    const rawId = req.params.id;
    const albumId = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    if (!albumId) return res.status(400).json({ error: 'Album ID required' });

    try {
      const data = await MusicService.getAlbumTracks(albumId);
      return res.json(data);
    } catch (err: any) {
      console.error('[MusicController] Album tracks error:', err);
      return res.status(500).json({ error: 'Failed to fetch tracks', details: err.message });
    }
  }

  static async stream(req: Request, res: Response) {
    const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const album = typeof req.query.album === 'string' ? req.query.album.trim() : '';
    const previewUrl = typeof req.query.previewUrl === 'string' ? req.query.previewUrl.trim() : '';

    if (!title && !previewUrl) {
      return res.status(400).json({ error: 'Title or previewUrl required for streaming' });
    }

    try {
      const streamInfo = await MusicService.resolveStream(artist, title, album, previewUrl);
      return res.json(streamInfo);
    } catch (err: any) {
      console.error('[MusicController] Stream error:', err);
      return res.status(500).json({ error: 'Failed to resolve audio stream', details: err.message });
    }
  }

  static async downloadBatch(req: Request, res: Response) {
    const { tracks, format = 'mp3' } = req.body;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ error: 'Tracks array is required' });
    }

    try {
      const queued = await MusicService.batchDownloadMusic(tracks, format);
      return res.json({
        success: true,
        count: queued.length,
        tasks: queued
      });
    } catch (err: any) {
      console.error('[MusicController] Batch download error:', err);
      return res.status(500).json({ error: 'Failed to process batch music download', details: err.message });
    }
  }
}
