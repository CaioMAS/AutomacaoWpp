// src/jobs/checkMeetingsMissing1Hour.ts
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { enviarMensagemContato } from '../services/whatsappService';
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

// 🔎 tenta extrair o nome do chefe da descrição (ex.: "Chefe: Daniel Antunes")
const extrairChefe = (descricao: string) => {
  const m = descricao.match(/(?:chefe|coordenador|consultor)\s*:\s*([^\n]+)/i);
  return m?.[1]?.trim();
};

// 🔎 tenta extrair número (12 a 13 dígitos, com DDI+DDD) da descrição
const extrairNumero = (descricao: string) => descricao.match(/\d{12,13}/)?.[0];

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
      const startIso = evento.start?.dateTime;
      if (!startIso) continue; // ignora eventos sem horário (dia inteiro, etc.)

      const inicio = new Date(startIso);
      const diffMin = (inicio.getTime() - agora.getTime()) / 60000;

      // 🎯 faltando ~1h (janela de tolerância para polling)
      if (diffMin >= 55 && diffMin <= 65) {
        const id = evento.id!;
        if (jaEnviado(id)) continue;

        const descricao = evento.description || '';
        const numero = extrairNumero(descricao);
        if (!numero) continue;

        // clienteNome: tenta usar o summary, ex.: "Reunião com Vanessa"
        const clienteNome =
          evento.summary?.replace(/^Reuni[aã]o com\s*/i, '').trim() || 'cliente';

        const chefeNome = extrairChefe(descricao) || 'nossa equipe';
        const horaFmt = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dataFmt = inicio.toLocaleDateString('pt-BR');

        const mensagem =
`⏰ Olá, ${clienteNome}! Passando para lembrar que sua reunião sobre o *Desafio Empreendedor* com *${chefeNome}* começa em *1 hora*.
📅 ${dataFmt} às ${horaFmt}
Se precisar ajustar o horário, me avise por aqui. Até já!`;

        await enviarMensagemContato(numero, mensagem);
        marcarComoEnviado(id);
        console.log(`📤 Lembrete enviado para ${numero} (evento ${id})`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar reuniões no Google Calendar:', error);
  }
};

// Executa diretamente (se desejar rodar standalone)
checkMeetingsMissing1Hour();
