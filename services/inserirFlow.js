import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const inserirFlow = async (idEmpresa, idCaixa, flowToken, valorTotal, cashoutMaximo, telefone, nome, authToken) => {
  try {
    logger.info('Inserindo flow', { 
      idEmpresa, 
      idCaixa, 
      flowToken, 
      valorTotal, 
      cashoutMaximo, 
      telefone, 
      nome 
    });
    
    const flowResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/flow`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authToken}`
      },
      data: {
        idEmpresa: idEmpresa,
        idCaixa: idCaixa,
        flowToken: flowToken,
        venda: {
          valor: valorTotal,
          cashoutMaximo: cashoutMaximo,
          usuario: telefone,
          nome: nome
        }
      }
    });
    
    logger.info('Flow inserido com sucesso');

    return {
      sucesso: true,
      dados: flowResponse.data
    };
  } catch (error) {
    logger.error('Erro ao inserir flow', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao inserir flow',
        detalhes: error.message
      }
    };
  }
};

export { inserirFlow }; 