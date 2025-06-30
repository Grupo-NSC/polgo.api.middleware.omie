import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const calcularCashoutMaximo = async (telefone, cnpj, valorTotal, authToken) => {
  try {
    logger.info('Calculando valor máximo de cashout', { 
      telefone, 
      cnpj, 
      valorTotal 
    });
    
    const cashoutResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/fidelidade/v1/calculaValorMaximoCashout`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authToken}`
      },
      data: {
        usuario: telefone,
        cnpjAssociado: cnpj,
        valorCompra: valorTotal
      }
    });
    
    logger.info('Valor máximo de cashout calculado com sucesso', {
      status: cashoutResponse.status,
      data: cashoutResponse.data
    });

    const cashoutMaximo = cashoutResponse.data?.retorno?.valorMaximo || 0;
    logger.info('Valor máximo de cashout extraído', { cashoutMaximo });

    return {
      sucesso: true,
      dados: {
        valorMaximo: cashoutMaximo
      }
    };
  } catch (error) {
    logger.error('Erro ao calcular valor máximo de cashout', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao calcular valor máximo de cashout',
        detalhes: error.message
      }
    };
  }
};

export { calcularCashoutMaximo }; 