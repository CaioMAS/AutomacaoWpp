import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let client: Client;

export const startWhatsApp = () => {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: false }
  });

  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Escaneie o QR Code acima para autenticar.');
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp Web pronto para uso!');
  });

  client.initialize();
};

export const sendMeetingConfirmation = async (
  clienteNome: string,
  clienteNumero: string,
  chefeNome: string,
  chefeNumero: string,
  dataHora: string
): Promise<{ success: boolean; groupId?: string; erroWhatsApp?: boolean; message?: string }> => {
  if (!client) throw new Error("❌ Cliente WhatsApp não foi inicializado");

  const clienteJid = `${clienteNumero}@c.us`;
  const chefeJid = `${chefeNumero}@c.us`;
  const participantes = [clienteJid, chefeJid];

  let erroWhatsApp = false;
  let groupId = '';

  try {
    // Valida se os números têm WhatsApp
    for (const jid of participantes) {
      const isValid = await client.isRegisteredUser(jid);
      if (!isValid) {
        return {
          success: false,
          erroWhatsApp: true,
          message: `⚠️ Número inválido ou sem WhatsApp: ${jid}`
        };
      }
    }

    const groupName = `Desafio Empreendedor - ${clienteNome}`;

    try {
      const groupResult = await client.createGroup(groupName, participantes);
      groupId = typeof groupResult === 'string'
        ? groupResult
        : groupResult?.gid?._serialized;

      if (!groupId) {
        return {
          success: false,
          erroWhatsApp: true,
          message: "❌ Grupo não foi criado corretamente. groupId está indefinido."
        };
      }

      console.log(`✅ Grupo criado: ${groupName}`);
    } catch (erroCriacao) {
      console.error("❌ Erro ao criar grupo:", erroCriacao);
      return {
        success: false,
        erroWhatsApp: true,
        message: "❌ Falha na criação do grupo via WhatsApp Web."
      };
    }

    // Aguarda o grupo estar pronto
    await new Promise(r => setTimeout(r, 3000));

    const clienteContato = await client.getContactById(clienteJid);
    const chefeContato = await client.getContactById(chefeJid);

    const saudacao = getSaudacao();

    const mensagem = `${saudacao}, ${clienteNome} @${clienteContato.id.user}, tudo bem?

Criei este grupo para facilitar nossa comunicação e também para te apresentar ${chefeNome} @${chefeContato.id.user}, o Coordenador da próxima turma do Desafio Empreendedor em Capelinha/MG.

Ele vai participar da reunião com você ${formatarDataHora(dataHora)} para apresentar todos os detalhes do trabalho.

📅 Reunião Online Confirmada!

Até lá!`;

    try {
      await client.sendMessage(groupId, mensagem, {
        mentions: [clienteContato.id._serialized, chefeContato.id._serialized]
      });
      console.log('✅ Mensagem enviada no grupo com sucesso');
    } catch (erroMensagem) {
      erroWhatsApp = true;
      console.warn('⚠️ Erro ao enviar mensagem no grupo:', erroMensagem);
      return {
        success: false,
        groupId,
        erroWhatsApp: true,
        message: '⚠️ Grupo criado, mas falha ao enviar mensagem.'
      };
    }

    return {
      success: true,
      groupId,
      erroWhatsApp: false,
      message: `✅ Reunião com ${clienteNome} agendada e mensagem enviada via WhatsApp.`
    };

  } catch (erroGeral) {
    console.error('❌ Erro fatal:', erroGeral);
    return {
      success: false,
      erroWhatsApp: true,
      message: '❌ Erro inesperado ao tentar criar grupo ou enviar mensagem.'
    };
  }
};

// Utilitário para saudação
const getSaudacao = () => {
  const agora = new Date();
  const hora = agora.getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

// Utilitário para formatar data/hora
const formatarDataHora = (dataISO: string) => {
  const data = new Date(dataISO);
  return `no dia ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};
