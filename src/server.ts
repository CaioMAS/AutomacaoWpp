// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { startWhatsApp } from './services/whatsappService';
import { iniciarMonitoramentoDeLembretes } from './services/reminderScheduler';
import { iniciarCheckMeetingsMissingDay8h } from './services/checkMeetingsMissingDay';

import cron from 'node-cron';
import { checkMeetingsMissing24Hours } from './services/checkMeetingsMissing24Hours';

startWhatsApp();
iniciarMonitoramentoDeLembretes(5);
iniciarCheckMeetingsMissingDay8h();

// 24h antes, a cada 15 min
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('⏰ Executando lembretes de 24h antes...');
    await checkMeetingsMissing24Hours();
    console.log('✅ Lembretes 24h processados.');
  } catch (err) {
    console.error('❌ Erro no 24h:', err);
  }
});

const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
