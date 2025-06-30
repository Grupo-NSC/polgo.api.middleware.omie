import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const enviarNotificacaoToken = async (telefone, cnpj, authToken) => {
  try {
    logger.info('Enviando notificação de autenticação temporária', { 
      telefone, 
      cnpj 
    });
    
    const notificationResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/login/v1/autenticacaoTemporaria/enviarNotificacaoToken`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authToken}`
      },
      data: {
        usuario: telefone,
        associadoCnpj: cnpj
      }
    });
    
    logger.info('Notificação enviada com sucesso', {
      status: notificationResponse.status,
      data: notificationResponse.data
    });

    return {
      sucesso: true,
      dados: notificationResponse.data
    };
  } catch (error) {
    logger.error('Erro ao enviar notificação de token', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao enviar notificação de token',
        detalhes: error.message
      }
    };
  }
};

export { enviarNotificacaoToken }; 