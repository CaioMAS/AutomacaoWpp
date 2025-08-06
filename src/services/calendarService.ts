import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const auth = new JWT({
  email: process.env.GOOGLE_CALENDAR_EMAIL,
  key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.split(String.raw`\n`).join('\n') || '',
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * Cria um evento de reunião no Google Calendar com nome e número do cliente.
 * @param clienteNome Nome do cliente
 * @param clienteNumero Número do cliente (ex: 553898001014)
 * @param dataHora Data e hora da reunião em ISO string
 */
export const createGoogleCalendarEvent = async (
  clienteNome: string,
  clienteNumero: string,
  dataHora: string
): Promise<void> => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || '';
  const start = new Date(dataHora);
  const end = new Date(start.getTime() + 30 * 60000); // duração: 30 minutos

  const event = {
    summary: `Reunião com ${clienteNome}`,
    description: `Reunião marcada automaticamente.\nCliente: ${clienteNome}\nNúmero: ${clienteNumero}`,
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
    console.log(`📅 Evento criado com sucesso no Google Calendar para ${clienteNome}.`);
  } catch (error) {
    console.error('❌ Erro ao criar evento no Google Calendar:', error);
    throw error;
  }
};
