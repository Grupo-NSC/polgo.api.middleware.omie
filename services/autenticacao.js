import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const autenticarComOmie = async () => {
  try {
    logger.info('Autenticando com Omie');
    
    const authResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/login/v1/autenticacao`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        usuario: process.env.OMIE_USUARIO,
        senha: process.env.OMIE_SENHA
      }
    });
    
    logger.info('Autenticação realizada com sucesso', { 
      status: authResponse.status,
      data: authResponse.data 
    });

    return {
      sucesso: true,
      dados: {
        token: authResponse.data.retorno.token
      }
    };
  } catch (error) {
    logger.error('Erro na autenticação com Omie', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro na autenticação com Omie',
        detalhes: error.message
      }
    };
  }
};

export { autenticarComOmie }; 