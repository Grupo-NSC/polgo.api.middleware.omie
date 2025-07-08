import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const registrarOperacaoFlow = async (id, screen, action, dataHora, authToken) => {
  try {
    logger.info('Registrando operação no flow', { id, screen, action, dataHora });

    const response = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/flow/${id}/operacoes`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authToken}`
      },
      data: {
        screen,
        action,
        dataHora
      }
    });

    logger.info('Operação registrada no flow com sucesso', {
      status: response.status,
      data: response.data
    });

    return {
      sucesso: true,
      dados: response.data
    };
  } catch (error) {
    logger.error('Erro ao registrar operação no flow', {
      error: error.message,
      response: error.response?.data
    });
    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao registrar operação no flow',
        detalhes: error.message
      }
    };
  }
};

export { registrarOperacaoFlow }; 