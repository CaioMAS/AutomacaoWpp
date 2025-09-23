import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { enviarMensagemContato } from '../services/whatsappService';
import { initDb } from '../db/registro';

// 🔎 tenta extrair o nome do chefe da descrição
const extrairChefe = (descricao: string) => {
  const m = descricao.match(/(?:chefe|coordenador|consultor)\s*:\s*([^\n]+)/i);
  return m?.[1]?.trim();
};

// 🔎 tenta extrair número (12 a 13 dígitos, com DDI+DDD) da descrição
const extrairNumero = (descricao: string) => descricao.match(/\d{12,13}/)?.[0];

const auth = new JWT({
  email: process.env.GOOGLE_CALENDAR_EMAIL,
  key:
    process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.split(String.raw`\n`).join('\n') ||
    '',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

const calendar = google.calendar({ version: 'v3', auth });

export async function checkMeetingsMissing1Hour() {
  const db = await initDb();
  const tz = process.env.TIMEZONE || 'America/Sao_Paulo';
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  // Usamos instantes UTC para cálculo (sem tocar em TZ aqui)
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items || [];

  // Apenas para exibir hora local quando montar a mensagem
  const formatHoraLocal = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  const formatDataLocal = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));

  for (const event of events) {
    const startISO = event.start?.dateTime; // ex.: "2025-09-23T19:20:00-03:00"
    if (!startISO || !event.id) continue;

    // ✅ Cálculo em UTC puro (nada de reaplicar fuso aqui)
    const startDate = new Date(startISO);
    const diffMin = Math.round((startDate.getTime() - Date.now()) / 60_000);

    // Janela de 1h (ajuste conforme seu polling; aqui ~59–66 min)
    if (diffMin >= 59 && diffMin <= 66) {
      // Evita duplicidade (ID + horário de início ISO)
      const alreadySent = await db.get(
        'SELECT 1 FROM sent_reminders WHERE event_id = ? AND start_time = ?',
        event.id,
        startISO
      );
      if (alreadySent) continue;

      const descricao = event.description || '';
      const clienteNome = event.summary || 'Cliente';
      const chefeNome = extrairChefe(descricao) || 'Responsável';
      const numero = extrairNumero(descricao);
      if (!numero) continue;

      // 📅 Exibição em TZ local APENAS para o texto (sem afetar cálculo)
      const dataFmt = formatDataLocal(startISO); // "23/09/2025"
      const horaFmt = formatHoraLocal(startISO); // "19:20"

      const mensagem = `⏰ Olá, ${clienteNome}! Passando para lembrar que sua reunião sobre o *Desafio Empreendedor* com *${chefeNome}* começa em *1 hora*.
📅 ${dataFmt} às ${horaFmt}
Se precisar ajustar o horário, me avise por aqui. Até já!`;

      await enviarMensagemContato(numero, mensagem);

      await db.run(
        'INSERT INTO sent_reminders (event_id, start_time) VALUES (?, ?)',
        event.id,
        startISO
      );
    }
  }

  await db.close();
}
