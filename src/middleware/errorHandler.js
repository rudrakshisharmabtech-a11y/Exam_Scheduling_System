function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  return res.status(404).send('Page not found.');
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with that unique value already exists.' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      error: 'This operation conflicts with related records. Check the selected IDs or remove dependent records first.'
    });
  }
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}

module.exports = { errorHandler, notFound };
