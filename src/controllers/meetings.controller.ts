// src/controllers/meetings.controller.ts
import { Request, Response } from 'express';
import { handleMeetingCreation } from '../services/serviceApp';

export const createMeeting = async (req: Request, res: Response) => {
  try {
    const result = await handleMeetingCreation(req.body);
    res.status(200).json({ success: true, message: result });
  } catch (error: any) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
