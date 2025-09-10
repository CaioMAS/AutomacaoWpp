import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import meetingRoutes from './routes/meetings.routes';

dotenv.config();

const app = express();

// ✅ Libera o CORS
app.use(cors());

// ✅ Lê o corpo das requisições como JSON
app.use(express.json());

// ✅ Rotas
app.use('/api/meetings', meetingRoutes);

export default app;
