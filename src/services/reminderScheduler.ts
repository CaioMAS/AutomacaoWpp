import { checkMeetingsMissing1Hour } from './checkMeetingsMissing1Hour';

export const iniciarMonitoramentoDeLembretes = () => {
  console.log('🕒 Iniciando verificação automática de reuniões a cada 5 minutos...');
  
  // Executa logo que a aplicação sobe
  checkMeetingsMissing1Hour();

  // Executa a cada 5 minutos (300 mil ms)
  setInterval(() => {
    checkMeetingsMissing1Hour();
  }, 5 * 60 * 1000);
};
