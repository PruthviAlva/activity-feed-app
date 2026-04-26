// Middleware for error handling
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
    });
  }

  if (err.name === 'MongoError') {
    return res.status(500).json({
      error: 'Database Error',
      details: err.message,
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    details: err.message,
  });
};

// Middleware to validate tenant ID in request
export const tenantMiddleware = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId;

  if (!tenantId) {
    return res.status(400).json({
      error: 'Tenant ID is required',
    });
  }

  req.tenantId = tenantId;
  next();
};

// Middleware to log requests
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });
  next();
};
