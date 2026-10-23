const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { relationshipRoutes } = require('../controllers/relationships');
const { resourceController, resources } = require('../controllers/resources');

function createApiRouter(pool) {
  const router = express.Router();

  router.get('/health', asyncHandler(async (req, res) => {
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  }));

  router.get('/metadata', (req, res) => {
    res.json(Object.entries(resources).map(([name, resource]) => ({
      name,
      primaryKey: resource.primaryKey,
      fields: resource.fields
    })));
  });

  for (const [path, resource] of Object.entries(resources)) {
    const controller = resourceController(pool, resource);
    router.get(`/${path}`, controller.list);
    router.get(`/${path}/:id`, controller.get);
    router.post(`/${path}`, controller.create);
    router.put(`/${path}/:id`, controller.update);
    router.patch(`/${path}/:id`, controller.update);
    router.delete(`/${path}/:id`, controller.remove);
  }

  relationshipRoutes(router, pool);
  return router;
}

module.exports = { createApiRouter };
