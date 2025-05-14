// src/services/serviceApp.ts
import { createGoogleCalendarEvent } from './calendarService';
import { sendMeetingConfirmation } from './whatsappService';

export const handleMeetingCreation = async (data: {
  clienteNome: string;
  clienteNumero: string;
  dataHora: string;
  chefeNome: string;
  chefeNumero: string;
}) => {
  const { clienteNome, clienteNumero, dataHora, chefeNome, chefeNumero } = data;

  // Envia mensagens pelo WhatsApp usando whatsapp-web.js
  await sendMeetingConfirmation(clienteNome, clienteNumero, chefeNome, chefeNumero, dataHora);

  // Cria evento no Google Calendar
  await createGoogleCalendarEvent(clienteNome, dataHora);

  return `✅ Reunião com ${clienteNome} agendada e mensagem enviada via WhatsApp.`;
};
