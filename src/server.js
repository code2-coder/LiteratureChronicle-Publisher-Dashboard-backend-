import express from 'express';
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
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

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
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Serve frontend static files in production
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/royalties', royaltyRoutes);

// Catch-all route to serve the frontend index.html for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API Route Not Found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

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
