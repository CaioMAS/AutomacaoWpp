import axios from 'axios';

const BASE_URL = 'https://evolutionapi.tecnologiadesafio.shop';
const INSTANCE_ID = 'testedesafio';
const API_KEY = 'YnuOZsP8Rc4GVo2pFVZ2648veH1ZgyfO'; 

const url = `${BASE_URL}/message/sendText/${INSTANCE_ID}`;

const body = {
  number: '120363403740194551@g.us',
  textMessage: {
    text: 'Mensagem direta e fixa para teste ✅'
  }
};

const headers = {
  'Content-Type': 'application/json',
  apikey: API_KEY
};

(async () => {
  try {
    const response = await axios.post(url, body, { headers });
    console.log('✅ Mensagem enviada com sucesso!');
    console.log(response.data);
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem:', JSON.stringify(error.response?.data, null, 2));
  }
})();
