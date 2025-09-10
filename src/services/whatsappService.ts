// src/services/whatsappService.ts
import axios from 'axios';

const BASE_URL = 'https://evolutionapi.tecnologiadesafio.shop';
const INSTANCE_ID = 'testedesafio';
const API_KEY = process.env.EVOLUTION_API_KEY || '';

// 🕑 Util: aguardar
const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 🕓 Saudação dinâmica
const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

// 🗓️ Formata data/hora para pt-BR (ex: "no dia 06/08/2025 às 14:00")
const formatarDataHora = (dataISO: string) => {
  const data = new Date(dataISO);
  return `no dia ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

// 🔢 Normaliza número para o formato aceito pela Evolution
// Aceita "5599999999999" ou "5599999999999@c.us" e sempre devolve com "@c.us"
const formatarWhatsAppId = (numero: string) => {
  const limpo = numero.replace(/[^\d@]/g, '');
  return limpo.endsWith('@c.us') ? limpo : `${limpo}@c.us`;
};

// ✅ Verifica se a Evolution API está online
export const startWhatsApp = async () => {
  try {
    const response = await axios.get(BASE_URL);
    console.log(`📲 Evolution API online: ${response.data.message}`);
  } catch (error) {
    console.error('❌ Falha ao conectar à Evolution API:', error);
  }
};

// ✅ Envia mensagem de texto para um contato
export const enviarMensagemContato = async (numeroDestino: string, mensagem: string) => {
  const url = `${BASE_URL}/message/sendText/${INSTANCE_ID}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: API_KEY,
  };

  const body = {
    number: formatarWhatsAppId(numeroDestino),
    text: mensagem,
  };

  console.log('📤 Enviando mensagem para contato:', JSON.stringify(body, null, 2));

  try {
    const response = await axios.post(url, body, { headers });
    console.log('✅ Mensagem enviada ao contato:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Erro ao enviar mensagem ao contato:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers,
      });
    } else {
      console.error('❌ Erro inesperado ao enviar mensagem ao contato:', error);
    }
    throw error;
  }
};

/**
 * ✅ Confirma reunião por WhatsApp (sem criar grupo)
 * Use esta função após você "agendar" pelo seu módulo de Agenda/Google Calendar.
 *
 * @param clienteNome  Nome do cliente
 * @param clienteNumero  Número com DDI/DDD (ex: "5531988887777" ou com "@c.us")
 * @param chefeNome  Nome do coordenador/chefe (apenas texto, sem número)
 * @param dataHoraISO  Data/hora ISO da reunião (ex: "2025-09-06T14:00:00-03:00")
 * @param cidadeOpcional  (opcional) cidade/observação para complementar a mensagem
 */
export const confirmarReuniaoWhatsApp = async (params: {
  clienteNome: string;
  clienteNumero: string;
  chefeNome: string;
  dataHoraISO: string;
  cidadeOpcional?: string;
}) => {
  const { clienteNome, clienteNumero, chefeNome, dataHoraISO, cidadeOpcional } = params;

  const saudacao = getSaudacao();
  const quando = formatarDataHora(dataHoraISO);
  const cidadeTxt = cidadeOpcional ? ` em ${cidadeOpcional}` : '';

  const mensagem =
`${saudacao}, ${clienteNome}! Tudo bem?

Sua reunião sobre o *Desafio Empreendedor* com *${chefeNome}* foi *confirmada* ${quando}${cidadeTxt}.

📎 Detalhes:
• Assunto: Desafio Empreendedor
• Participante: ${chefeNome}
• Quando: ${quando}

Se precisar ajustar o horário, é só me avisar por aqui. Até lá!`;

  // (Opcional) pequena pausa para garantir a instância pronta
  await esperar(300);

  return enviarMensagemContato(clienteNumero, mensagem);
};

// ————————————————
// 🔻 Removidos do fluxo: criação de grupo e envio para grupo
// - enviarMensagemGrupo
// - criarGrupoReuniao
// ————————————————
