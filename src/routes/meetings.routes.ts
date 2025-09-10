import { Router } from 'express';
import {
  createMeeting,
  listMeetings,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meetings.controller';

const router = Router();

/**
 * @route   POST /api/meetings
 * @desc    Cria um novo evento no Google Agenda + WhatsApp
 * @body    {
 *   clienteNome: string,
 *   clienteNumero: string,
 *   dataHora: string (ISO),
 *   chefeNome: string,
 *   cidadeOpcional: string
 * }
 */
router.post('/', createMeeting);

/**
 * @route   GET /api/meetings
 * @desc    Lista eventos por dia ou por intervalo
 * @query   ?day=YYYY-MM-DD   ou   ?start=ISO&end=ISO
 */
router.get('/', listMeetings);

/**
 * @route   PATCH /api/meetings/:id
 * @desc    Atualiza a data/hora de um evento existente
 * @body    { novaDataHora }
 */
router.patch('/:id', updateMeeting);

/**
 * @route   DELETE /api/meetings/:id
 * @desc    Remove um evento do Google Agenda
 */
router.delete('/:id', deleteMeeting);

export default router;
