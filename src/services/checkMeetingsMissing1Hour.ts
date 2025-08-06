import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { enviarMensagemGrupo } from '../services/whatsappService';
import fs from 'fs';

const auth = new JWT({
  email: process.env.GOOGLE_CALENDAR_EMAIL,
  key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.split(String.raw`\n`).join('\n') || '',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

const calendar = google.calendar({ version: 'v3', auth });

// 🔁 Evita duplicados salvando os IDs dos eventos já notificados
const REGISTRO_PATH = './notificacoes-enviadas.json';

const jaEnviado = (eventId: string): boolean => {
  if (!fs.existsSync(REGISTRO_PATH)) return false;
  const data = JSON.parse(fs.readFileSync(REGISTRO_PATH, 'utf-8'));
  return data.includes(eventId);
};

const marcarComoEnviado = (eventId: string) => {
  const data = fs.existsSync(REGISTRO_PATH)
    ? JSON.parse(fs.readFileSync(REGISTRO_PATH, 'utf-8'))
    : [];
  if (!data.includes(eventId)) {
    data.push(eventId);
    fs.writeFileSync(REGISTRO_PATH, JSON.stringify(data, null, 2));
  }
};

export const checkMeetingsMissing1Hour = async () => {
  const agora = new Date();
  const daquiDuasHoras = new Date(agora.getTime() + 2 * 60 * 60 * 1000);

  try {
    const res = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      timeMin: agora.toISOString(),
      timeMax: daquiDuasHoras.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const eventos = res.data.items || [];

    for (const evento of eventos) {
      const inicio = new Date(evento.start?.dateTime || '');
      const diffMin = (inicio.getTime() - agora.getTime()) / 60000;

      // Verifica se falta entre 59 e 61 minutos
      if (diffMin >= 55 && diffMin <= 65) {
        const id = evento.id!;
        const descricao = evento.description || '';
        const numero = descricao.match(/\d{12,13}/)?.[0]; // Extrai número

        const clienteNome = evento.summary?.replace('Reunião com ', '') || 'cliente';

        if (numero && !jaEnviado(id)) {
          const mensagem = `⏰ Olá, ${clienteNome}! Só passando para lembrar que sua reunião acontecerá em 1 hora (${inicio.toLocaleTimeString('pt-BR')}). Se prepare!`;

          await enviarMensagemGrupo(`${numero}@c.us`, mensagem); // ou enviarMensagemPrivada()
          marcarComoEnviado(id);
          console.log(`📤 Lembrete enviado para ${numero}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar reuniões no Google Calendar:', error);
  }
};

// Executa diretamente
checkMeetingsMissing1Hour();
