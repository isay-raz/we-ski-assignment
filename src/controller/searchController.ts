import { NextFunction, Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { searchRequestSchema } from '../api/validation';

export class SearchController {
  constructor(private readonly service: SearchService) {}

  createSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = searchRequestSchema.parse(req.body);
      const id = await this.service.createSearch(query);
      res.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  };

  getSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSearch(req.params.id);
      res.status(200).json({
        status: result.status,
        progress: { completed: result.completedTasks, total: result.totalTasks },
        count: result.accommodations.length,
        accommodations: result.accommodations,
      });
    } catch (error) {
      next(error);
    }
  };
}
