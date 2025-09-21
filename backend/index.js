const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow specific origins based on environment
const getAllowedOrigins = () => {
  const baseOrigins = [
    'http://localhost:5173', // Frontend dev server
    'http://localhost:3000', // Backend dev server
    process.env.PRODUCTION_BACKEND_URL || 'https://clarity-vault-ai-backendd.vercel.app', // Production backend
  ];

  // Add production frontend URL from environment variable
  if (process.env.PRODUCTION_FRONTEND_URL) {
    baseOrigins.push(process.env.PRODUCTION_FRONTEND_URL);
  }

  // Allow multiple frontend URLs (comma-separated)
  if (process.env.FRONTEND_URLS) {
    const additionalUrls = process.env.FRONTEND_URLS.split(',').map(url => url.trim());
    baseOrigins.push(...additionalUrls);
  }

  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    baseOrigins.push('*');
  }

  return baseOrigins.filter(Boolean); // Remove any undefined values
};

const allowedOrigins = getAllowedOrigins();

app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? [...allowedOrigins, '*'] : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/files', require('./routes/files'));
app.use('/api/file-processing', require('./routes/fileProcessing'));
app.use('/', require('./routes/auth')); // Auth routes at root level to match Java backend

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : ['CORS configured']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;