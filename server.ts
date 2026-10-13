import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth.js';
import { internshipsRouter } from './server/routes/internships.js';
import { resumesRouter } from './server/routes/resumes.js';
import { communityRouter } from './server/routes/community.js';
import { subscriptionsRouter } from './server/routes/subscriptions.js';
import { webhooksRouter } from './server/routes/webhooks.js';
import { getISTFormattedString, getISTTime } from './server/timeUtils.js';
import { emailService } from './server/emailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Startup environment validation
console.log('='.repeat(60));
console.log('🚀 [INTERNCONNECT BACKEND SERVER INITIALIZING]');
console.log(`🕒 IST Current Time: ${getISTFormattedString()}`);
console.log(`✉️ Email Service: ${JSON.stringify(emailService.getStatus())}`);
console.log(`💳 Razorpay Configured: ${Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_ID.includes('YourKeyIdHere'))}`);
console.log(`🔥 Firebase Project ID: ${process.env.FIREBASE_PROJECT_ID || 'Not set (Local Storage Engine Active)'}`);
console.log('='.repeat(60));

// Body parser with rawBody retention for webhook HMAC signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
    limit: '10mb',
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy for x-forwarded-for IP tracking
app.set('trust proxy', 1);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/internships', internshipsRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/community', communityRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/webhooks', webhooksRouter);

// Health check and environment diagnostics endpoint
app.get('/api/health', (_req, res) => {
  const ist = getISTTime();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ist: {
      formatted: getISTFormattedString(),
      hours: ist.hours,
      minutes: ist.minutes,
      mobileWindowOpen: ist.hours >= 10 && ist.hours < 13,
      paymentWindowOpen: ist.hours >= 10 && ist.hours < 11,
    },
    services: {
      email: emailService.getStatus(),
      razorpay: {
        configured: Boolean(
          process.env.RAZORPAY_KEY_ID &&
          process.env.RAZORPAY_KEY_SECRET &&
          !process.env.RAZORPAY_KEY_ID.includes('YourKeyIdHere')
        ),
      },
    },
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve production static assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dev mode: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ InternConnect running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
