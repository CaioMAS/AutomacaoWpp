import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { startWhatsApp } from './services/whatsappService';
import { iniciarMonitoramentoDeLembretes } from './services/reminderScheduler';


startWhatsApp(); // ⬅️ inicia o cliente assim que o servidor sobe
iniciarMonitoramentoDeLembretes(5);

const PORT = process.env.PORT || 5555;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

