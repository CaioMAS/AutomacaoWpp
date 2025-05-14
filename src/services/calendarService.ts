import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const auth = new JWT({
  email: process.env.GOOGLE_CALENDAR_EMAIL,
  key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.split(String.raw`\n`).join('\n') || '',
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

export const createGoogleCalendarEvent = async (
  clienteNome: string,
  dataHora: string
): Promise<void> => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || '';
  const start = new Date(dataHora);
  const end = new Date(start.getTime() + 30 * 60000); // duração: 30 minutos

  const event = {
    summary: `Reunião com ${clienteNome}`,
    description: `Reunião marcada automaticamente.`,
    start: {
      dateTime: start.toISOString(),
      timeZone: process.env.TIMEZONE || 'America/Sao_Paulo',
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: process.env.TIMEZONE || 'America/Sao_Paulo',
    },
  };

  try {
    await calendar.events.insert({
      auth,
      calendarId,
      requestBody: event,
    });
    console.log(`📅 Evento criado com sucesso no Google Calendar.`);
  } catch (error) {
    console.error('❌ Erro ao criar evento:', error);
    throw error;
  }
};
