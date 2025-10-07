import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { startWhatsApp } from './services/whatsappService';
import { iniciarMonitoramentoDeLembretes } from './services/reminderScheduler';
import { iniciarCheckMeetingsMissingDay8h } from './services/checkMeetingsMissingDay';


startWhatsApp(); // ⬅️ inicia o cliente assim que o servidor sobe
iniciarMonitoramentoDeLembretes(5);
iniciarCheckMeetingsMissingDay8h(); 

const PORT = process.env.PORT ;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

