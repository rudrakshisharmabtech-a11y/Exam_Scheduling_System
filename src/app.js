const express = require('express');
const path = require('node:path');
const { createApiRouter } = require('./routes/api');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', createApiRouter(pool));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
