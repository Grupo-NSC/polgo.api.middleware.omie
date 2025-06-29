import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const verificarTokenTemporario = async (usuario, voucher, authToken) => {
  try {
    logger.info('Verificando token temporário', { usuario, voucher });
    
    const verifyResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/login/v1/autenticacaoTemporaria/verificar`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      data: {
        usuario: usuario,
        codigo: voucher.toString()
      }
    });
    
    logger.info('Verificação de token realizada com sucesso', { 
      status: verifyResponse.status,
      data: verifyResponse.data 
    });

    const codigoValido = verifyResponse.data?.retorno?.codigoValido;
    if (!codigoValido) {
      return {
        sucesso: false,
        erro: {
          mensagem: 'Código temporário inválido',
          detalhes: 'O código fornecido não é válido ou expirou'
        }
      };
    }

    return {
      sucesso: true,
      dados: {
        valido: true
      }
    };
  } catch (error) {
    logger.error('Erro ao verificar token temporário', { 
      error: error.message,
      response: error.response?.data 
    });

    if (error.response?.data.mensagem.includes('inválido/expirado')) {
      return {
        sucesso: false,
        erro: {
          mensagem: 'Código temporário inválido',
          detalhes: 'O código fornecido não é válido ou expirou'
        }
      };
    }
      
    return {
      sucesso: false,
      erro: {
        mensagem:
          error.response?.data?.mensagem ||
          'Erro ao verificar token temporário',
        detalhes: error.message
      }
    };
  }
};

export { verificarTokenTemporario }; 