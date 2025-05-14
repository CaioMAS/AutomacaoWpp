// src/app.ts
import express from 'express';
import dotenv from 'dotenv';
import meetingRoutes from './routes/meetings.routes';

dotenv.config();

const app = express();

app.use(express.json());
app.use('/api/meetings', meetingRoutes);

export default app;
