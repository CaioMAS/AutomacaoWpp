import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// Instância global do client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: false }
});

// Geração do QR Code
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('📲 Escaneie o QR Code acima para autenticar.');
});

// Após autenticação, cria o grupo de teste
client.on('ready', async () => {
  console.log('✅ WhatsApp Web pronto para uso!');
  await testGroupCreation();
});

// Função para criar grupo de teste
const testGroupCreation = async () => {
  const participantes = [
    '553888351228@c.us', // Substitua pelos números reais
    '553398504676@c.us'
  ];

  console.log("📋 Participantes:", participantes);

  const isValidList = await Promise.all(
    participantes.map(jid => client.isRegisteredUser(jid))
  );

  console.log("🔍 Validação dos números:", isValidList);

  if (isValidList.includes(false)) {
    console.log("❌ Um dos participantes não tem WhatsApp ou não está disponível.");
    return;
  }

  try {
    const result = await client.createGroup("🚀 Grupo de Teste Bot", participantes);
    console.log("✅ Grupo criado com sucesso:", result);
  } catch (err) {
    console.error("❌ Erro ao criar grupo:", err);
  }
};

// Inicializa o client
client.initialize();
