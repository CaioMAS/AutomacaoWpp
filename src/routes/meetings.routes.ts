// src/routes/meetings.routes.ts
import { Router } from 'express';
import { createMeeting } from '../controllers/meetings.controller';

const router = Router();

router.post('/', createMeeting);

export default router;
