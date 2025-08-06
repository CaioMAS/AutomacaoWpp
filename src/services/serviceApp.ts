import { criarGrupoReuniao } from './whatsappService';
import { createGoogleCalendarEvent } from './calendarService';

export const handleMeetingCreation = async (data: {
  clienteNome: string;
  clienteNumero: string;
  dataHora: string;
  chefeNome: string;
  chefeNumero: string;
}) => {
  const { clienteNome, clienteNumero, chefeNome, chefeNumero, dataHora } = data;

  // 🔹 Cria grupo no WhatsApp e envia mensagem
  await criarGrupoReuniao(clienteNome, clienteNumero, chefeNome, chefeNumero, dataHora);

  // 🔹 Registra a reunião no Google Calendar
 await createGoogleCalendarEvent(clienteNome, clienteNumero, dataHora);

  return `✅ Grupo criado no WhatsApp e reunião agendada com ${clienteNome} às ${dataHora}`;
};
