import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { enviarMensagemContato } from '../services/whatsappService';
import { initDb } from '../db/registro';

// --- IMPORTANTE ---
// Se já possui estes helpers em outro arquivo (ex: utils/calendar.ts),
// troque por imports e remova estas definições duplicadas.
const extrairClienteDoSummary = (summary?: string) => {
  if (!summary) return undefined;
  const m = summary.match(/Reuni[aã]o\s+com\s+(.+)/i);
  if (!m) return summary.trim();
  const bruto = m[1].trim();
  const nome = bruto.split(/\s[-–—|]\s|[-–—|]/)[0]?.trim();
  return nome || bruto;
};

const extrairChefe = (descricao: string) => {
  const m = descricao.match(/(?:chefe|coordenador|consultor)\s*[:\-]\s*([^\n]+)/i);
  if (!m) return undefined;
  const bruto = m[1].trim();
  const nome = bruto.split(/\s[-–—|]\s|[-–—|]/)[0]?.trim();
  return nome || bruto;
};

const extrairNumero = (descricao: string) => descricao.match(/\d{12,13}/)?.[0];

const auth = new JWT({
  email: process.env.GOOGLE_CALENDAR_EMAIL,
  key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.split(String.raw`\n`).join('\n') || '',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

const calendar = google.calendar({ version: 'v3', auth });

export async function checkMeetingsMissing24Hours() {
  const db = await initDb();
  const tz = process.env.TIMEZONE || 'America/Sao_Paulo';
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  // janelas do dia atual (UTC)
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
    const startISO = event.start?.dateTime;
    if (!startISO || !event.id) continue;

    const startDate = new Date(startISO);
    const diffMin = Math.round((startDate.getTime() - Date.now()) / 60_000);

    // ~24h antes (1440 min). Margem de 7 min para compensar o polling.
    if (diffMin >= 1439 && diffMin <= 1446) {
      // evita duplicidade POR TIPO
      const kind = '24h';
      const alreadySent = await db.get(
        'SELECT 1 FROM sent_reminders WHERE event_id = ? AND start_time = ? AND kind = ?',
        event.id,
        startISO,
        kind
      );
      if (alreadySent) continue;

      const descricao = event.description || '';
      const clienteNome = extrairClienteDoSummary(event.summary || '') || 'Cliente';
      const chefeNome = extrairChefe(descricao) || 'Responsável';
      const numero = extrairNumero(descricao);
      if (!numero) continue;

      const dataFmt = formatDataLocal(startISO);
      const horaFmt = formatHoraLocal(startISO);

      // 🔔 Mensagem 24h antes
      const mensagem = `🔔 Lembrete de reunião (24h antes)

Oi, ${clienteNome}! Passando para te lembrar da sua reunião do *Desafio Empreendedor* com o *${chefeNome}*.

📅 Data: ${dataFmt}
🕒 Horário: ${horaFmt}`;

      await enviarMensagemContato(numero, mensagem);

      await db.run(
        'INSERT INTO sent_reminders (event_id, start_time, kind) VALUES (?, ?, ?)',
        event.id,
        startISO,
        kind
      );
    }
  }

  await db.close();
}
