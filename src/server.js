import express from 'express';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import helmet from 'helmet';
import hpp from 'hpp';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';
import royaltyRoutes from './routes/royaltyRoutes.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware - CORS MUST be first to handle preflight requests
const allowedOrigins = [
  'https://www.dashboard-literaturechronicle.com',
  'https://dashboard-literaturechronicle.com',
  'https://literature-chronicle-publisher-dash.vercel.app',
  'https://literature-chronicle-publisher-dashboard-frontend-reg0jq3dn.vercel.app',
  'https://literaturechronicle-publisher-dashboard-8yda.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive with origins to avoid CORS issues
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS Blocked: Origin ${origin} is not in the whitelist`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for simplicity in this dashboard environment, or configure it carefully
})); 
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  message: 'Too many requests, please try again after 15 minutes',
});
app.use('/api', limiter);

// Body Parser
app.use(express.json());

// Resolve paths
const frontendPath = path.resolve(__dirname, '../../frontend/dist');

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);

// Development Redirect & Standalone Reset Page
app.get('/reset-password/:token', (req, res) => {
  let host = req.get('host');
  // If local dev, redirect to Vite port 3000
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const frontendURL = `${req.protocol}://${host.replace('8080', '3000')}/reset-password/${req.params.token}`;
    return res.redirect(frontendURL);
  }
  
  // In Production (Render/Vercel):
  // Check if frontend build exists, if not, serve the built-in backend reset page
  const indexHtml = path.resolve(frontendPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.sendFile(path.resolve(__dirname, 'reset-password.html'));
  }
});

app.use('/api/platforms', platformRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/royalties', royaltyRoutes);

// Serve frontend static files and handle SPA routing
if (fs.existsSync(frontendPath)) {
  console.log(`[Production] Serving static files from: ${frontendPath}`);
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API Route Not Found' });
    }
    
    const indexHtml = path.resolve(frontendPath, 'index.html');
    console.log(`[Production] Attempting to serve: ${indexHtml}`);
    
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      console.error(`[Production] ERROR: index.html not found at ${indexHtml}`);
      res.status(404).send(`Frontend folder exists, but index.html is missing at: ${indexHtml}`);
    }
  });
} else {
  console.warn(`[Production] WARNING: Frontend build folder NOT FOUND at: ${frontendPath}`);
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API Route Not Found' });
    }
    res.status(404).send(`Frontend build not found. Path checked: ${frontendPath}. Please ensure "npm run build" is part of your build command.`);
  });
}

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Export the app for Vercel
export default app;




// Only listen when not in Vercel environment (Vercel handles execution via export)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Server URL: http://localhost:${PORT}`);
  });
}

// Handle graceful shutdown - only in non-Vercel environment
if (!process.env.VERCEL) {
  const gracefulShutdown = () => {
    console.log('Shutting down server...');
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}
