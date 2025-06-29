import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const verificarDadosFlow = async (flowToken, authToken) => {
  try {
    logger.info('Verificando dados do flow', { flowToken });
    
    const flowCheckResponse = await retryAxios({
      method: 'GET',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/flow/${flowToken}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    logger.info('Dados do flow verificados com sucesso', { 
      status: flowCheckResponse.status,
      data: flowCheckResponse.data 
    });

    const flowCheckData = flowCheckResponse.data?.retorno;
    if (!flowCheckData) {
      return {
        sucesso: false,
        erro: {
          mensagem: 'Dados do flow não encontrados',
          detalhes: 'A resposta da API não contém dados do flow'
        }
      };
    }

    return {
      sucesso: true,
      dados: {
        idEmpresa: flowCheckData.idEmpresa,
        idCaixa: flowCheckData.idCaixa,
        cashoutMaximo: flowCheckData.venda?.cashoutMaximo || 0,
        usuario: flowCheckData.venda?.usuario,
        nome: flowCheckData.venda?.nome,
        valorCompra: flowCheckData.venda?.valor
      }
    };
  } catch (error) {
    logger.error('Erro ao verificar dados do flow', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao verificar dados do flow',
        detalhes: error.message
      }
    };
  }
};

export { verificarDadosFlow }; 