import { GoogleGenerativeAI } from '@google/generative-ai';
import { MeetingDTO } from '../services/calendarService';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const formatMeetingsWithGemini = async (meetings: MeetingDTO[]): Promise<string> => {
  if (!meetings.length) return '📅 Nenhuma reunião encontrada no período.';

  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });

  // Ordena por horário
  const sorted = meetings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Transforma em lista simples para enviar ao Gemini
  const resumo = sorted.map(m => {
    const dia = dayjs(m.start).locale('pt-br').format('dddd – DD/MM');
    const hora = dayjs(m.start).locale('pt-br').format('HH:mm');
    return `${dia} – ${hora} – ${m.clienteNome}`;
  });

  const prompt = `
Abaixo está uma lista de reuniões com data, hora e nome do cliente. 
Formate em um texto organizado por dia da semana, no estilo de agenda para WhatsApp. 
Use emojis (📅, 🗓), quebras de linha, e escreva o nome do dia da semana em MAIÚSCULAS.
Deixe em português brasileiro.

Formato esperado:
📅 Agenda Presencial - (De 25/08 à 29/08)

SEGUNDA-FEIRA – 25/08
🗓 13:00 – Cliente Exemplo
🗓 15:00 – Outro Cliente

Lista:
${resumo.join('\n')}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Erro ao formatar reuniões com Gemini:', error);
    return '❌ Erro ao gerar mensagem formatada.';
  }
};
