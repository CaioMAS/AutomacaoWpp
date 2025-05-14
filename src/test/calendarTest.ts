import dotenv from 'dotenv';
dotenv.config();

import { createGoogleCalendarEvent } from '../services/calendarService';

const runTest = async () => {
  try {
    await createGoogleCalendarEvent(
      'Teste Unitário',
      '2025-05-15T16:00:00' // pode ser a hora que quiser
    );
    console.log('✅ Teste finalizado: evento criado com sucesso.');
  } catch (err) {
    console.error('❌ Erro no teste de evento:', err);
  }
};

runTest();
