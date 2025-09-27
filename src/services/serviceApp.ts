// src/handlers/handleMeetingCreation.ts
import { confirmarReuniaoWhatsApp } from './whatsappService';
import { createGoogleCalendarEvent } from './calendarService';

export type HandleMeetingCreationPayload = {
  clienteNome: string;
  clienteNumero: string;
  dataHora: string;         // ISO ex.: "2025-09-03T13:00:00-03:00"
  chefeNome: string;        // apenas o nome do coordenador/chefe

  // opcionais
  cidadeOpcional?: string;  // "Capelinha/MG"
  empresaNome?: string;
  endereco?: string;
  referidoPor?: string;
  funcionarios?: number;
  faturamento?: string;     // ex.: "80k–90k"
  instagram?: string;
  observacoes?: string;
};

export const handleMeetingCreation = async (data: HandleMeetingCreationPayload) => {
  const {
    clienteNome,
    clienteNumero,
    dataHora,
    chefeNome,
    cidadeOpcional,
    empresaNome,
    endereco,
    referidoPor,
    funcionarios,
    faturamento,
    instagram,
    observacoes,
  } = data;

  try {
    // 1) Agenda no Google Calendar (passa todos os opcionais)
    await createGoogleCalendarEvent(
      clienteNome,
      clienteNumero,
      dataHora,
      chefeNome,
      cidadeOpcional,
      empresaNome,
      endereco,
      referidoPor,
      funcionarios,
      faturamento,
      instagram,
      observacoes
    );

    // 2) Envia confirmação direta ao cliente no WhatsApp (com payload estendido)
    await confirmarReuniaoWhatsApp({
      clienteNome,
      clienteNumero,
      chefeNome,
      dataHoraISO: dataHora,
      cidadeOpcional
      
    });

    return {
      success: true,
      message: `✅ Reunião agendada e confirmação enviada para ${clienteNome} em ${dataHora}`,
    };
  } catch (error: any) {
    console.error('Erro no handleMeetingCreation:', error);
    return {
      success: false,
      message: error?.message ?? 'Erro desconhecido ao tentar criar/confirmar reunião.',
      error,
    };
  }
};
