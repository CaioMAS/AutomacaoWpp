import { Request, Response } from 'express';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getMeetings,
  GetMeetingsQuery,
  updateGoogleCalendarEvent 
} from '../services/calendarService';
import { formatMeetingsWithGemini } from '../ai/messageFormatter';
import { confirmarReuniaoWhatsApp } from '../services/whatsappService';

// POST /api/meetings
export const createMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteNome, clienteNumero, dataHora, chefeNome, cidadeOpcional } = req.body as {
      clienteNome?: string;
      clienteNumero?: string;
      dataHora?: string;
      chefeNome?: string;
      cidadeOpcional?: string;
    };

    // ✅ Verifica se todos os campos obrigatórios estão presentes
    if (!clienteNome || !clienteNumero || !dataHora || !chefeNome || !cidadeOpcional) {
      res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: clienteNome, clienteNumero, dataHora, chefeNome, cidadeOpcional.',
      });
      return;
    }

    // Cria evento no Google Agenda
    await createGoogleCalendarEvent(clienteNome, clienteNumero, dataHora, chefeNome);

    // Envia mensagem via WhatsApp confirmando a reunião
    await confirmarReuniaoWhatsApp({
      clienteNome,
      clienteNumero,
      chefeNome,
      dataHoraISO: dataHora,
      cidadeOpcional,
    });

    res.status(201).json({
      success: true,
      message: 'Evento criado e WhatsApp enviado com sucesso.',
    });
  } catch (error: any) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/meetings?day=YYYY-MM-DD   OU   /api/meetings?start=ISO&end=ISO
export const listMeetings = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: GetMeetingsQuery = {
      day: (req.query.day as string) || undefined,
      start: (req.query.start as string) || undefined,
      end: (req.query.end as string) || undefined,
    };

    const data = await getMeetings(query);
    const mensagem = await formatMeetingsWithGemini(data);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
      mensagem,
    });
  } catch (error: any) {
    const mensagemErro = error?.message || 'Erro desconhecido ao listar reuniões.';
    if (mensagemErro.includes('Informe apenas "day"')) {
      res.status(400).json({ success: false, error: mensagemErro });
      return;
    }
    console.error('Erro ao listar reuniões:', error);
    res.status(500).json({ success: false, error: mensagemErro });
  }
};

// PATCH /api/meetings/:id
export const updateMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { novaDataHora } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Parâmetro "id" é obrigatório na URL.',
      });
      return;
    }

    if (!novaDataHora) {
      res.status(400).json({
        success: false,
        error: 'Campo "novaDataHora" é obrigatório (formato ISO).',
      });
      return;
    }

    await updateGoogleCalendarEvent(id, novaDataHora);

    res.status(200).json({
      success: true,
      message: `Evento atualizado para ${novaDataHora}`,
    });
  } catch (error: any) {
    const mensagemErro = error?.message || 'Erro desconhecido ao atualizar reunião.';
    console.error('Erro ao atualizar reunião:', error);
    res.status(500).json({ success: false, error: mensagemErro });
  }
};

// DELETE /api/meetings/:id
export const deleteMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({ success: false, error: 'Parâmetro "id" é obrigatório na URL.' });
      return;
    }

    await deleteGoogleCalendarEvent(id);

    res.status(200).json({
      success: true,
      message: `Evento ${id} deletado com sucesso.`,
    });
  } catch (error: any) {
    const mensagemErro = error?.message || 'Erro desconhecido ao deletar reunião.';

    if (error?.response?.status === 404) {
      res.status(404).json({ success: false, error: 'Evento não encontrado para deletar.' });
      return;
    }

    console.error('Erro ao deletar reunião:', error);
    res.status(500).json({ success: false, error: mensagemErro });
  }
};
