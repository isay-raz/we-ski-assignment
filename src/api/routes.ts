import { Router } from 'express';
import { SearchController } from '../controller/searchController';

export function createSearchRouter(controller: SearchController): Router {
  const router = Router();
  router.post('/search', controller.createSearch);
  router.get('/search/:id', controller.getSearch);
  return router;
}
