// src/services/whatsappService.ts
import axios from 'axios';

const BASE_URL = 'https://evolutionapi.tecnologiadesafio.shop';
const INSTANCE_ID = 'testedesafio';
const API_KEY = process.env.EVOLUTION_API_KEY || '';

// 🕓 Função para formatar data/hora
const formatarDataHora = (dataIso: string) => {
  const data = new Date(dataIso);
  return data.toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
};

// 🕑 Função auxiliar para aguardar um tempo
const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ Verifica se a Evolution API está online
export const startWhatsApp = async () => {
  try {
    const response = await axios.get(BASE_URL);
    console.log(`📲 Evolution API online: ${response.data.message}`);
  } catch (error) {
    console.error('❌ Falha ao conectar à Evolution API:', error);
  }
};

// ✅ Envia mensagem para grupo com estrutura correta
const enviarMensagemGrupo = async (groupId: string, mensagem: string) => {
  const url = `${BASE_URL}/message/sendText/${INSTANCE_ID}`;

  const headers = {
    'Content-Type': 'application/json',
    apikey: API_KEY,
  };

  const body = {
    number: groupId,
    text: mensagem
  };

  console.log('📤 Enviando mensagem para grupo:', JSON.stringify(body, null, 2));

  try {
    const response = await axios.post(url, body, { headers });
    console.log('✅ Mensagem enviada ao grupo:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Erro ao enviar mensagem ao grupo:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers,
      });
    } else {
      console.error('❌ Erro inesperado ao enviar mensagem ao grupo:', error);
    }
    throw error;
  }
};

// ✅ Cria grupo e envia mensagem após aguardar 5 segundos
export const criarGrupoReuniao = async (
  clienteNome: string,
  clienteNumero: string,
  chefeNome: string,
  chefeNumero: string,
  dataHora: string
) => {
  try {
    const url = `${BASE_URL}/group/create/${INSTANCE_ID}`;

    const body = {
      subject: clienteNome,
      description: '',
      participants: [
        `${clienteNumero}@c.us`,
        `${chefeNumero}@c.us`
      ],
    };

    const headers = {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    };

    const response = await axios.post(url, body, { headers });
    console.log('📦 Resposta completa da API:', response.data);

    const groupId = response.data?.id;
    console.log('🆔 Grupo criado:', groupId);

    if (groupId) {
      const mensagem = `ooooooooooooi`;

      await esperar(5000);
      await enviarMensagemGrupo(groupId, mensagem);
    } else {
      console.error('❌ groupId não retornado pela API.');
    }

  } catch (error: any) {
    console.error('❌ Erro ao criar grupo:', error.response?.data || error);
  }
};
