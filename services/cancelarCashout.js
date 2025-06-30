import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const cancelarCashout = async (codigoControle, associadoCnpj, cpfColaborador, authToken) => {
  try {
    logger.info('Cancelando cashout', { 
      codigoControle, 
      associadoCnpj, 
      cpfColaborador 
    });
    
    const cancelamentoResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/fidelidade/v1/cashout/cancelamento`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authToken}`
      },
      data: {
        codigoControle: codigoControle,
        associadoCnpj: associadoCnpj,
        cpfColaborador: cpfColaborador,
        descricao: 'Cancelamento de cashout'
      }
    });
    
    logger.info('Cashout cancelado com sucesso', { 
      status: cancelamentoResponse.status,
      data: cancelamentoResponse.data 
    });

    return {
      sucesso: true,
      dados: cancelamentoResponse.data.retorno
    };
  } catch (error) {
    logger.error('Erro ao cancelar cashout', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao cancelar cashout',
        detalhes: error.message
      }
    };
  }
};

export { cancelarCashout }; 