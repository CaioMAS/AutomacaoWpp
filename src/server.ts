import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { startWhatsApp } from './services/whatsappService';
import { iniciarMonitoramentoDeLembretes } from './services/reminderScheduler';

startWhatsApp(); // ⬅️ inicia o cliente assim que o servidor sobe
iniciarMonitoramentoDeLembretes();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

