import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const atualizarFlow = async (id, flowData, authToken) => {
  try {
    logger.info('Atualizando flow', { id, flowData });

    const response = await retryAxios({
      method: 'PUT',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/flow/${id}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authToken}`
      },
      data: flowData
    });

    logger.info('Flow atualizado com sucesso', {
      status: response.status,
      data: response.data
    });

    return {
      sucesso: true,
      dados: response.data
    };
  } catch (error) {
    logger.error('Erro ao atualizar flow', {
      error: error.message,
      response: error.response?.data
    });
    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao atualizar flow',
        detalhes: error.message
      }
    };
  }
};

export { atualizarFlow }; 