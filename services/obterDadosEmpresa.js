import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const obterDadosEmpresa = async (idEmpresa, authToken) => {
  try {
    logger.info('Obtendo dados da empresa', { idEmpresa });
    
    const companyResponse = await retryAxios({
      method: 'GET',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/empresa/${idEmpresa}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${authToken}`
      }
    });
    
    logger.info('Dados da empresa obtidos com sucesso', { 
      status: companyResponse.status,
      data: companyResponse.data 
    });

    const cnpj = companyResponse.data?.retorno?.cnpj;
    const appSecret = companyResponse.data?.retorno?.credenciais?.appSecret;
    const appKey = companyResponse.data?.retorno?.credenciais?.appKey;
    
    if (!cnpj || !appSecret || !appKey) {
      return {
        sucesso: false,
        erro: {
          mensagem: 'CNPJ ou credenciais não encontrados na resposta da empresa',
          detalhes: 'A resposta da API não contém CNPJ ou credenciais necessárias'
        }
      };
    }

    logger.info('Dados da empresa extraídos', { cnpj, appSecret, appKey });

    return {
      sucesso: true,
      dados: {
        cnpj,
        appSecret,
        appKey
      }
    };
  } catch (error) {
    logger.error('Erro ao obter dados da empresa', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao obter dados da empresa',
        detalhes: error.message
      }
    };
  }
};

export { obterDadosEmpresa }; 