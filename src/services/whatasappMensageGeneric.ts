// src/services/whatsappService.ts
import axios from 'axios';

const BASE_URL = 'https://evolutionapi.tecnologiadesafio.shop';
const API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * 🔹 Envia mensagem via Evolution API para uma instância específica
 *
 * @param instancia   ID da instância (ex: "testedesafio", "clinicaA")
 * @param numeroDestino   Número do cliente (ex: "5531999999999" ou "5531999999999@c.us")
 * @param mensagem   Texto da mensagem a ser enviada
 */
export const enviarMensagemInstancia = async (
  instancia: string,
  numeroDestino: string,
  mensagem: string
) => {
  // 🔢 Normaliza número para o formato aceito pela Evolution
  const formatarWhatsAppId = (numero: string) => {
    const limpo = numero.replace(/[^\d@]/g, '');
    return limpo.endsWith('@c.us') ? limpo : `${limpo}@c.us`;
  };

  const url = `${BASE_URL}/message/sendText/${instancia}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: API_KEY,
  };

  const body = {
    number: formatarWhatsAppId(numeroDestino),
    text: mensagem,
  };

  console.log(`📤 [${instancia}] Enviando mensagem:`, JSON.stringify(body, null, 2));

  try {
    const response = await axios.post(url, body, { headers });
    console.log(`✅ [${instancia}] Mensagem enviada com sucesso:`, response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ [${instancia}] Erro ao enviar mensagem:`, {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers,
      });
    } else {
      console.error(`❌ [${instancia}] Erro inesperado:`, error);
    }
    throw error;
  }
};
