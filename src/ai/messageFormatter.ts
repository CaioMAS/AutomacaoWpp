import { MeetingDTO } from '../services/calendarService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);

// ===== Helpers =====
const TZ = 'America/Sao_Paulo';

const horaCurta = (iso: string) => {
  const h = (dayjs as any).tz
    ? dayjs(iso).tz(TZ).format('HH:mm')
    : dayjs(iso).locale('pt-br').format('HH:mm');
  return h.endsWith(':00') ? `${h.slice(0, 2)}h` : h.replace(':', 'h');
};

const formatPhoneBR = (num?: string) => {
  if (!num) return undefined;
  const only = num.replace(/\D/g, '');
  const n = only.startsWith('55') ? only.slice(2) : only;
  if (n.length === 11) return `${n.slice(0, 2)} ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0, 2)} ${n.slice(2, 6)}-${n.slice(6)}`;
  return num;
};

const ddmm = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso));

const weekdayUpper = (iso: string) => {
  const w = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' }).format(new Date(iso));
  return w.toUpperCase();
};

// ===== Formatação local determinística =====
export const formatMeetingsWithGemini = async (meetings: MeetingDTO[]): Promise<string> => {
  if (!meetings.length) return '📅 Nenhuma reunião encontrada no período.';

  // Ordena por horário
  const sorted = [...meetings].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Título: De DD/MM à DD/MM (usando min/max reais)
  const inicio = ddmm(sorted[0]!.start);
  const fim = ddmm(sorted[sorted.length - 1]!.start);
  const titulo = `📅 Agenda Presencial - (De ${inicio} à ${fim})`;

  // Agrupa por dia (chave = YYYY-MM-DD no TZ BR)
  const groups = new Map<string, MeetingDTO[]>();
  for (const m of sorted) {
    const d = new Date(m.start);
    const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(d);     // YYYY
    const mo = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit' }).format(d);   // MM
    const da = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).format(d);     // DD
    const key = `${y}-${mo}-${da}`;
    const arr = groups.get(key) || [];
    arr.push(m);
    groups.set(key, arr);
  }

  // Para cada dia, monta blocos
  const diasOrdenados = Array.from(groups.keys()).sort(); // YYYY-MM-DD
  const partes: string[] = [titulo, ''];

  for (const key of diasOrdenados) {
    const lista = groups.get(key)!;
    // Header do dia
    const headerIso = lista[0]!.start;
    const header = `${weekdayUpper(headerIso)} – ${ddmm(headerIso)}`;
    partes.push(header);

    for (const m of lista) {
      const hora = horaCurta(m.start);
      const nome = m.clienteNome ?? '(sem nome)';
      const empresa = m.empresaNome ? ` (${m.empresaNome})` : '';
      const fone = formatPhoneBR(m.clienteNumero);
      const local = m.endereco || m.location || m.cidadeOpcional;

      const linhas: string[] = [];
      linhas.push(`⏰ ${hora} – ${nome}${empresa}`);
      if (fone) linhas.push(`📞 ${fone}`);
      if (local) linhas.push(`📍 ${local}`);
      if (m.referidoPor) linhas.push(`🔗 Referido por: ${m.referidoPor}`);

      if (typeof m.funcionarios === 'number') {
        linhas.push(`👥 ${m.funcionarios} funcionário${m.funcionarios === 1 ? '' : 's'}`);
      }

      if (m.faturamento) linhas.push(`💰 ${m.faturamento}`);
      if (m.observacoes) linhas.push(`💬 ${m.observacoes}`);

      const ig = (m as any).instagram as string | undefined;
      if (ig) linhas.push(`🔗 Instagram: ${ig}`);

      partes.push(linhas.join('\n'));
    }
    partes.push(''); // linha em branco entre dias
  }

  return partes.join('\n');
};

/**
 * Se você ainda quiser usar o Gemini, faça assim (opcional):
 *
 * 1) Construa o texto final localmente (como acima) e retorne direto (sem IA).
 * 2) OU, se for usar IA, passe os blocos já prontos e peça APENAS para agrupar por dia,
 *    com `temperature: 0` e instruções de "NÃO alterar NENHUM número/texto".
 *
 * Qualquer reescrita pela IA pode introduzir erros — por isso o formato local é o mais seguro.
 */
