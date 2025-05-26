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
) => {
  if (!client) throw new Error("❌ Cliente WhatsApp não foi inicializado");

  const clienteJid = `${clienteNumero}@c.us`;
  const chefeJid = `${chefeNumero}@c.us`;
  const participantes = [clienteJid, chefeJid];

  try {
    // Valida se todos os participantes têm WhatsApp
    for (const jid of participantes) {
      const isValid = await client.isRegisteredUser(jid);
      if (!isValid) {
        throw new Error(`⚠️ Número sem WhatsApp: ${jid}`);
      }
    }

    // Obtém os contatos reais
    const clienteContato = await client.getContactById(clienteJid);
    const chefeContato = await client.getContactById(chefeJid);

    const groupName = `Desafio Empreendedor - ${clienteNome}`;

    // Cria o grupo
    const groupResult = await client.createGroup(groupName, participantes);
    const groupId = typeof groupResult === 'string' ? groupResult : groupResult.gid._serialized;

    console.log(`✅ Grupo criado com o nome: ${groupName}`);

    // Obtém a saudação adequada com base no horário
    const saudacao = getSaudacao(dataHora);

    // Mensagem formatada com menções reais
    const mensagem = `${saudacao}, ${clienteNome} @${clienteContato.id.user}, tudo bem?

Criei este grupo para facilitar nossa comunicação e também para te apresentar ${chefeNome} @${chefeContato.id.user}, o Coordenador da próxima turma do Desafio Empreendedor em Capelinha/MG.

Ele vai participar da reunião com você ${formatarDataHora(dataHora)} para apresentar todos os detalhes do trabalho.

📅 Reunião Online Confirmada!

Até lá!`;

    await new Promise((r) => setTimeout(r, 1500)); // Pequeno delay
    await client.sendMessage(groupId, mensagem, {
      mentions: [clienteContato.id._serialized, chefeContato.id._serialized]
    });

    console.log('✅ Mensagem enviada no grupo com sucesso');

  } catch (err) {
    console.error('❌ Erro ao criar grupo ou enviar mensagem:', err);
    throw err;
  }
};

// Utilitário para retornar a saudação correta
const getSaudacao = (dataISO: string) => {
  const data = new Date(dataISO);
  const hora = data.getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

// Utilitário para formatar data/hora no padrão BR
const formatarDataHora = (dataISO: string) => {
  const data = new Date(dataISO);
  return `no dia ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};