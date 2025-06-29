import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const aplicarPagamento = async (flowToken, idEmpresa, idCaixa, cashoutMaximo, appKey, appSecret) => {
  try {
    logger.info('Aplicando desconto', { 
      flowToken, 
      idEmpresa, 
      idCaixa, 
      cashoutMaximo 
    });
    
    const discountResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.OMIE_API_URL}/api/CupomVenda/AplicarPagamento`,
      headers: {
        AppKey: appKey,
        AppSecret: appSecret,
        'Content-Type': 'application/json'
      },
      data: {
        Id: flowToken,
        EmpresaId: idEmpresa,
        CaixaId: idCaixa,
        Valor: cashoutMaximo
      }
    });
    
    logger.info('Desconto aplicado com sucesso', { 
      status: discountResponse.status,
      data: discountResponse.data 
    });

    return {
      sucesso: true,
      dados: discountResponse.data
    };
  } catch (error) {
    logger.error('Erro ao aplicar desconto', { 
      error: error.message,
      response: error.response?.data 
    });

    return {
      sucesso: false,
      erro: {
        mensagem: error.response?.data?.mensagem || 'Erro ao aplicar desconto',
        detalhes: error.message
      }
    };
  }
};

export { aplicarPagamento }; 