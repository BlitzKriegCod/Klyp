import { Request, Response } from 'express';
import { SubtitlesService } from '../services/subtitles.service';

export class SubtitlesController {
  static async search(req: Request, res: Response) {
    const { query, language = 'eng', apiKey } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const data = await SubtitlesService.searchSubtitles(query, language, apiKey);
    return res.json(data);
  }

  static async download(req: Request, res: Response) {
    const { fileId, query = 'Movie', language = 'en', osUsername, osPassword, apiKey } = req.body;
    const data = await SubtitlesService.downloadSubtitle(fileId, query, language, osUsername, osPassword, apiKey);
    return res.json(data);
  }
}
