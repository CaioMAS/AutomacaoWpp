import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { startWhatsApp } from './services/whatsappService';
import { iniciarMonitoramentoDeLembretes } from './services/reminderScheduler';
import { iniciarCheckMeetingsMissingDay8h } from './services/checkMeetingsMissingDay';
import { checkMeetingsMissing24Hours } from './services/checkMeetingsMissing24Hours';
import cron from 'node-cron';


startWhatsApp(); // ⬅️ inicia o cliente assim que o servidor sobe
iniciarMonitoramentoDeLembretes(5);
iniciarCheckMeetingsMissingDay8h(); 

// 🕒 roda a cada 15 min (ajuste conforme seu polling do n8n)
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('⏰ Executando lembretes de 24h antes...');
    await checkMeetingsMissing24Hours();
    console.log('✅ Lembretes de 24h enviados.');
  } catch (err) {
    console.error('❌ Erro ao enviar lembretes de 24h:', (err as any)?.message || err);
  }
}, { timezone: process.env.TIMEZONE || 'America/Sao_Paulo' });

const PORT = process.env.PORT || 5555;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

