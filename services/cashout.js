import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const processarCashout = async (usuario, cashoutMaximo, cnpj, valorCompra, authToken) => {
  try {
    logger.info('Processando cashout', { 
      usuario, 
      cashoutMaximo, 
      cnpj, 
      valorCompra 
    });
    
    const cashoutResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.CASHOUT_API_URL}/cashback/v1/cashout/${usuario}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      data: {
        valor: cashoutMaximo,
        associado: cnpj,
        colaborador: '',
        nomeColaborador: null,
        codigoControle: null,
        descricao: `Origem: Middleware OMIE - Cashout: R$${cashoutMaximo}`,
        valorTotalCompra: valorCompra,
        imagemDebito: null
      }
    });
    
    logger.info('Cashout realizado com sucesso', { 
      status: cashoutResponse.status,
      data: cashoutResponse.data 
    });

    const cashoutData = cashoutResponse.data?.retorno;
    if (!cashoutData) {
      return {
        sucesso: false,
        erro: {
          mensagem: 'Dados de cashout não encontrados na resposta',
          detalhes: 'A resposta da API de cashout não contém dados válidos'
        }
      };
    }

    // Log específico do código de controle para debugging
    logger.info('Código de controle do cashout extraído', { 
      codigoControle: cashoutData.codigoControle 
    });

    return {
      sucesso: true,
      dados: cashoutData
    };
  } catch (error) {
    logger.error('Erro ao processar cashout', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao processar cashout',
        detalhes: error.message
      }
    };
  }
};

export { processarCashout }; 