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
): Promise<{ success: boolean; groupId?: string; erroWhatsApp?: boolean }> => {
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
        throw new Error(`⚠️ Número sem WhatsApp: ${jid}`);
      }
    }

    const groupName = `Consultoria Empresarial - ${clienteNome}`;
    const groupResult = await client.createGroup(groupName, participantes);
    groupId = typeof groupResult === 'string'
      ? groupResult
      : groupResult?.gid?._serialized;

    if (!groupId) throw new Error("❌ Grupo não foi criado corretamente.");
    console.log(`✅ Grupo criado: ${groupName}`);

    // Aguarda o grupo estar pronto
    await new Promise(r => setTimeout(r, 3000));

    // Recupera contatos
    const clienteContato = await client.getContactById(clienteJid);
    const chefeContato = await client.getContactById(chefeJid);

    const saudacao = getSaudacao(dataHora);

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
    }

    return {
      success: true,
      groupId,
      erroWhatsApp
    };

  } catch (erroGeral) {
    console.error('❌ Erro fatal:', erroGeral);
    return {
      success: false,
      erroWhatsApp: true
    };
  }
};

// Utilitário para saudação
const getSaudacao = (dataISO: string) => {
  const hora = new Date(dataISO).getHours();
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
