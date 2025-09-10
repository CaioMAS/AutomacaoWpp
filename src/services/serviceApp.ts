// src/handlers/handleMeetingCreation.ts
import { confirmarReuniaoWhatsApp } from './whatsappService';
import { createGoogleCalendarEvent } from './calendarService';

export const handleMeetingCreation = async (data: {
  clienteNome: string;
  clienteNumero: string;
  dataHora: string;         // ISO ex.: "2025-09-03T13:00:00-03:00"
  chefeNome: string;        // apenas o nome do coordenador/chefe
  cidadeOpcional?: string;  // opcional: "Capelinha/MG"
}) => {
  const { clienteNome, clienteNumero, chefeNome, dataHora, cidadeOpcional } = data;

  // 1) Agenda no Google Calendar
  await createGoogleCalendarEvent(clienteNome, clienteNumero, dataHora);

  // 2) Envia confirmação direta ao cliente no WhatsApp
  await confirmarReuniaoWhatsApp({
    clienteNome,
    clienteNumero,
    chefeNome,
    dataHoraISO: dataHora,
    cidadeOpcional,
  });

  return `✅ Reunião agendada e confirmação enviada para ${clienteNome} em ${dataHora}`;
};
