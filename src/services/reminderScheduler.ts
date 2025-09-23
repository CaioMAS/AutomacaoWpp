import { checkMeetingsMissing1Hour } from './checkMeetingsMissing1Hour';

export function iniciarMonitoramentoDeLembretes(intervaloMinutos = 5) {
  console.log(`🔄 Monitoramento de lembretes iniciado. Intervalo: ${intervaloMinutos} min`);
  setInterval(() => {
    checkMeetingsMissing1Hour().catch(err =>
      console.error('Erro ao verificar reuniões:', err)
    );
  }, intervaloMinutos * 60 * 1000);
}