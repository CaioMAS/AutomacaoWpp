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

  // ===== Helpers de TZ robustos =====
  const isDateOnly = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const parseYMD = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return { y, m: m - 1, d };
  };

  // Pega o offset do fuso no instante informado (em minutos)
  function tzOffsetMinutes(timeZone: string, instantUTC: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(instantUTC);
    const name = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+0';
    const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!m) return 0;
    const sign = m[1] === '-' ? -1 : 1;
    const hh = Number(m[2]);
    const mm = m[3] ? Number(m[3]) : 0;
    return sign * (hh * 60 + mm);
  }

  // Retorna [00:00 do dia, 00:00 do dia seguinte) em UTC, respeitando o TZ
  function dayWindowToUTC(day: string, timeZone: string): { timeMin: string; timeMax: string } {
    const { y, m, d } = parseYMD(day);
    // usa meio-dia como “instante seguro” para capturar o offset do dia (evita transições raras)
    const guess = new Date(Date.UTC(y, m, d, 12, 0, 0));
    const off = tzOffsetMinutes(timeZone, guess); // ex.: -180 para GMT-3

    const startUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - off * 60_000;
    const endUtcMs   = Date.UTC(y, m, d + 1, 0, 0, 0, 0) - off * 60_000; // EXCLUSIVO

    return { timeMin: new Date(startUtcMs).toISOString(), timeMax: new Date(endUtcMs).toISOString() };
  }

  function toTZBoundaryISO(input: string, which: 'start' | 'end'): string {
    // Se vier "YYYY-MM-DD", converte para o começo/fim desse dia (exclusive) no TZ
    if (isDateOnly(input)) {
      if (which === 'start') return dayWindowToUTC(input, tz).timeMin;
      // para "end" com date-only, usamos 00:00 do dia seguinte (exclusive)
      return dayWindowToUTC(input, tz).timeMax;
    }
    // Se vier ISO já com offset, só normaliza para ISO UTC
    return new Date(input).toISOString();
  }

  // ===== Define timeMin/timeMax corretos =====
  let timeMin: string;
  let timeMax: string;

  if (hasDay) {
    const { timeMin: tmin, timeMax: tmax } = dayWindowToUTC(params.day!, tz);
    timeMin = tmin;
    timeMax = tmax; // exclusive
  } else {
    timeMin = toTZBoundaryISO(params.start!, 'start');
    timeMax = toTZBoundaryISO(params.end!, 'end'); // exclusivo se for date-only
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
      const endISO   = ev.end?.dateTime   || (ev.end?.date   ? `${ev.end.date}T00:00:00.000Z`   : '');

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
