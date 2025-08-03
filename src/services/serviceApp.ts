import { criarGrupoReuniao } from './whatsappService';

export const handleMeetingCreation = async (data: {
  clienteNome: string;
  clienteNumero: string;
  dataHora: string;
  chefeNome: string;
  chefeNumero: string;
}) => {
  const { clienteNome, clienteNumero, chefeNome, chefeNumero, dataHora } = data;

  // 🔹 Cria grupo e envia mensagem
  await criarGrupoReuniao(clienteNome, clienteNumero, chefeNome, chefeNumero, dataHora);

  return `✅ Grupo criado e reunião confirmada com ${clienteNome} às ${dataHora}`;
};
