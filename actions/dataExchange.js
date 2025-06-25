import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const dataExchangeHandler = async ({data, flowToken}) => {
  logger.info('Processando ação data_exchange', { data });
  
  try {
    // Extract values from request data
    const voucher = data.Voucher;
    const flowT = data.flowToken || flowToken;
    
    if (!voucher || !flowT) {
      throw new Error('Voucher e flowToken são obrigatórios');
    }
    
    logger.info('Valores extraídos da requisição', {
      voucher,
      flowToken: flowT
    });

    // Step 1: Authenticate with Omie
    logger.info('Step 1: Autenticando com Omie');
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

    // Step 2: Check for flow data
    logger.info('Step 2: Verificando dados do flow');
    const flowCheckResponse = await retryAxios({
      method: 'GET',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/flow/${flowT}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.data.retorno.token}`
      }
    });
    
    logger.info('Dados do flow verificados com sucesso', { 
      status: flowCheckResponse.status,
      data: flowCheckResponse.data 
    });

    // Verify flow data exists
    const flowCheckData = flowCheckResponse.data?.retorno;
    if (!flowCheckData) {
      throw new Error('Dados do flow não encontrados');
    }
    
    const idEmpresa = flowCheckData.idEmpresa;
    const idCaixa = flowCheckData.idCaixa;
    const cashoutMaximo =
      flowCheckData.venda?.cashoutMaximo ||
      parseFloat(process.env.CASHOUT_VALOR) ||
      0;
    const usuario = flowCheckData.venda?.usuario;
    const valorCompra = flowCheckData.venda?.valor;

    logger.info('Dados do flow extraídos', {
      idEmpresa,
      idCaixa,
      cashoutMaximo,
      usuario,
      valorCompra
    });

    // Step 3: Verify if temporary token is valid
    logger.info('Step 3: Verificando token temporário');
    const verifyResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/login/v1/autenticacaoTemporaria/verificar`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authResponse.data.retorno.token}`
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

    // Check if code is valid
    const codigoValido = verifyResponse.data?.retorno?.codigoValido;
    if (!codigoValido) {
      throw new Error('Código temporário inválido');
    }

    // Step 4: Get CNPJ from company
    logger.info('Step 4: Obtendo CNPJ da empresa');
    const companyResponse = await retryAxios({
      method: 'GET',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/empresa/${idEmpresa}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.data.retorno.token}`
      }
    });
    
    logger.info('CNPJ da empresa obtido com sucesso', { 
      status: companyResponse.status,
      data: companyResponse.data 
    });

    // Extract CNPJ from company response
    const cnpj = companyResponse.data?.retorno?.cnpj;
    if (!cnpj) {
      throw new Error('CNPJ não encontrado na resposta da empresa');
    }
    
    logger.info('CNPJ extraído da empresa', { cnpj });

    // Step 5: Cashout operation
    logger.info('Step 5: Realizando operação de cashout');
    const cashoutResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.CASHOUT_API_URL}/cashback/v1/cashout/${usuario}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authResponse.data.retorno.token}`
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

    // Extract cashout data
    const cashoutData = cashoutResponse.data?.retorno;
    if (!cashoutData) {
      throw new Error('Dados de cashout não encontrados na resposta');
    }

    // Step 6: Apply discount
    logger.info('Step 6: Aplicando desconto');
    const discountResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.DISCOUNT_API_URL}/api/CupomVenda/AplicarPagamento`,
      headers: {
        'AppKey': '5d90522b-eceb-4353-a176-fbcef8a728d5',
        'AppSecret': 'LF5GMDtCVm021kH7BBsP7Uzx5ZO0X2kktkF7rvEPeWc+miiYJZJE6Y8EuwcPjECesBzlhdsWteBsZpAqX6ufGjDt/+nu9Ev75Cx8qEbnF640xlGkRDGUel8UfUUd/FHx91vKIGCFfaDQ4Jg5g7YcGcYKnofcC/YHfdLskTqiXxo=',
        'Content-Type': 'application/json'
      },
      data: {
        Id: flowToken,
        EmpresaId: idEmpresa, // Use idEmpresa from flow response
        CaixaId: idCaixa, // Use idCaixa from flow response
        Valor: 10.00
      }
    });
    
    logger.info('Desconto aplicado com sucesso', { 
      status: discountResponse.status,
      data: discountResponse.data 
    });

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data exchange processado com sucesso',
        data: {
          screen: "Confirmacao",
          data: {
            Mensagem: "Cashback realizado com sucesso",
          }
        }
      })
    };

  } catch (error) {
    logger.error('Erro durante a etapa data_exchange', { 
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro durante a etapa data_exchange',
        error: error.message,
        details: error.response?.data || null
      })
    };
  }
};

export default dataExchangeHandler; 