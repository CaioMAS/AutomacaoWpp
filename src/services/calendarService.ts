// calendarService.ts
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const auth = new JWT({
  email: process.env.GOOGLE_CALENDAR_EMAIL,
  key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.split(String.raw`\n`).join('\n') || '',
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

// =========================
// INTERFACES
// =========================
export interface MeetingDTO {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  timezone: string;
  location?: string;
  meetLink?: string;
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  clienteNome?: string;
  clienteNumero?: string;
}

export interface GetMeetingsQuery {
  day?: string;
  start?: string;
  end?: string;
}

// =========================
// FUNÇÃO: CRIAR EVENTO
// =========================
export const createGoogleCalendarEvent = async (
  clienteNome: string,
  clienteNumero: string,
  dataHora: string
): Promise<void> => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID não definido');

  if (!clienteNome || !clienteNumero || !dataHora) {
    throw new Error('Parâmetros obrigatórios ausentes: clienteNome, clienteNumero, dataHora');
  }

  const start = new Date(dataHora);
  if (isNaN(start.getTime())) {
    throw new Error('Formato de data inválido. Use string ISO.');
  }
  const end = new Date(start.getTime() + 30 * 60000);

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
    await calendar.events.insert({ calendarId, requestBody: event });
    console.log(`📅 Evento criado com sucesso no Google Calendar para ${clienteNome}.`);
  } catch (error: any) {
    if (error.response?.data || error.errors) {
      console.error('❌ Erro detalhado da API:', JSON.stringify(error.response?.data || error.errors, null, 2));
    }
    console.error('❌ Erro interno ao criar evento:', error.message || error);
    throw new Error('Erro ao criar evento no Google Calendar. Verifique os logs.');
  }
};

// =========================
// FUNÇÃO: GET MEETINGS
// =========================
export const getMeetings = async (params: GetMeetingsQuery): Promise<MeetingDTO[]> => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID não definido');

  const tz = process.env.TIMEZONE || 'America/Sao_Paulo';
  const hasDay = !!params.day;
  const hasRange = !!params.start && !!params.end;

  if ((hasDay && hasRange) || (!hasDay && !hasRange)) {
    throw new Error('Informe apenas "day" (YYYY-MM-DD) OU "start" e "end" (ISO).');
  }

  const isDateOnly = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const toTZBoundary = (day: string, which: 'start' | 'end'): string => {
    const base = which === 'start' ? 'T00:00:00' : 'T23:59:59.999';
    const local = new Date(new Date(`${day}${base}`).toLocaleString('en-US', { timeZone: tz }));
    return new Date(Date.UTC(
      local.getFullYear(), local.getMonth(), local.getDate(),
      local.getHours(), local.getMinutes(), local.getSeconds(), local.getMilliseconds()
    )).toISOString();
  };

  let timeMin: string;
  let timeMax: string;

  if (hasDay) {
    timeMin = toTZBoundary(params.day!, 'start');
    timeMax = toTZBoundary(params.day!, 'end');
  } else {
    const startRaw = params.start!;
    const endRaw = params.end!;

    timeMin = isDateOnly(startRaw) ? toTZBoundary(startRaw, 'start') : new Date(startRaw).toISOString();
    timeMax = isDateOnly(endRaw) ? toTZBoundary(endRaw, 'end') : new Date(endRaw).toISOString();
  }

  const results: MeetingDTO[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
      pageToken,
    });

    pageToken = res.data.nextPageToken || undefined;
    const items = res.data.items || [];

    for (const ev of items) {
      const startISO = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00.000Z` : '');
      const endISO = ev.end?.dateTime || (ev.end?.date ? `${ev.end.date}T00:00:00.000Z` : '');

      let clienteNome: string | undefined;
      let clienteNumero: string | undefined;
      if (ev.summary) {
        const m = ev.summary.match(/Reuni[aã]o com\s+(.+)/i);
        if (m) clienteNome = m[1].trim();
      }
      if (ev.description) {
        const n = ev.description.match(/(\d{10,15})/);
        if (n) clienteNumero = n[1];
      }

      results.push({
        id: ev.id || '',
        title: ev.summary || '(sem título)',
        description: ev.description || undefined,
        start: startISO,
        end: endISO,
        timezone: ev.start?.timeZone || tz,
        location: ev.location || undefined,
        meetLink: ev.hangoutLink || undefined,
        attendees: (ev.attendees || []).map(a => ({
          email: a.email || undefined,
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || undefined,
        })),
        clienteNome,
        clienteNumero,
      });
    }
  } while (pageToken);

  return results;
};

// =========================
// FUNÇÃO: UPDATE EVENTO
// =========================
export const updateGoogleCalendarEvent = async (
  id: string,
  novaDataHora: string
): Promise<void> => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const tz = process.env.TIMEZONE || 'America/Sao_Paulo';
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID não definido');

  if (!id || !novaDataHora) {
    throw new Error('Parâmetros obrigatórios ausentes: id, novaDataHora');
  }

  try {
    const { data: eventoAtual } = await calendar.events.get({ calendarId, eventId: id });
    if (!eventoAtual) throw new Error('Evento não encontrado');
    if (!eventoAtual.start?.dateTime || !eventoAtual.end?.dateTime) {
      throw new Error('Evento atual não possui start ou end definido.');
    }

    const novoInicio = new Date(novaDataHora);
    if (isNaN(novoInicio.getTime())) throw new Error('novaDataHora inválida');

    const duracaoOriginal = new Date(eventoAtual.end.dateTime).getTime() - new Date(eventoAtual.start.dateTime).getTime();
    const novoFim = new Date(novoInicio.getTime() + duracaoOriginal);

    await calendar.events.update({
      calendarId,
      eventId: id,
      requestBody: {
        ...eventoAtual,
        start: { dateTime: novoInicio.toISOString(), timeZone: tz },
        end: { dateTime: novoFim.toISOString(), timeZone: tz },
      },
    });

    console.log(`✅ Evento ${id} atualizado com sucesso para ${novaDataHora}`);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar evento:', error.message || error);
    throw new Error('Erro ao atualizar evento no Google Calendar.');
  }
};

// =========================
// FUNÇÃO: DELETE EVENTO
// =========================
export const deleteGoogleCalendarEvent = async (id: string): Promise<void> => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID não definido');

  if (!id) throw new Error('Parâmetro "id" do evento é obrigatório.');

  try {
    await calendar.events.delete({ calendarId, eventId: id });
    console.log(`🗑️ Evento ${id} deletado com sucesso`);
  } catch (error: any) {
    console.error('❌ Erro ao deletar evento:', error.message || error);
    throw new Error('Erro ao deletar evento do Google Calendar.');
  }
};
