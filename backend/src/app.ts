import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/auth.routes.js';
import healthRouter from './routes/health.routes.js';
import errorHandler from './middlewares/error.middleware.js';
import auctionRoutes from './routes/auction.routes.js';
const app = express();

const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auctions', auctionRoutes);
app.use((_req, res) => {
  res.status(404).json({
    status: 'fail',
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

app.use(errorHandler);

export default app;
