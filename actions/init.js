import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';
import { v4 as uuidv4 } from 'uuid';

const initHandler = async (data) => {
  logger.info('Iniciando processo de inicialização');
  
  // Debug environment variables
  logger.info('Environment variables debug', {
    POLGO_API_URL: process.env.POLGO_API_URL,
    OMIE_USUARIO: process.env.OMIE_USUARIO,
    OMIE_SENHA: process.env.OMIE_SENHA,
    OMIE_EMPRESA_ID: process.env.OMIE_EMPRESA_ID,
    CASHBACK_VALOR: process.env.CASHBACK_VALOR,
    NOTIFICATION_USUARIO: process.env.NOTIFICATION_USUARIO,
    FLOW_CAIXA_ID: process.env.FLOW_CAIXA_ID
  });
  
  try {
    // Extract values from request data
    const valorTotal = data.ValorTotal || parseFloat(process.env.CASHBACK_VALOR) || 49.99;
    const idEmpresa = data.IdEmpresa || process.env.OMIE_EMPRESA_ID || 'cca39332-72c7-4f8c-b5f4-82d4944089e2';
    const idCaixa = data.IdCaixa || process.env.FLOW_CAIXA_ID || 'cx01';
    const flowToken = data.flowToken || uuidv4();
    const telefone = data.NfeDestinatario?.Telefone || process.env.NOTIFICATION_USUARIO || '19995811172';
    const nome = data.NfeDestinatario?.Nome || 'Cliente';
    
    logger.info('Valores extraídos da requisição', {
      valorTotal,
      idEmpresa,
      idCaixa,
      flowToken,
      telefone,
      nome
    });

    // Step 1: Authenticate with Omie
    logger.info(
      'Step 1: Autenticando com Omie'
    );

    console.log(`${process.env.POLGO_API_URL}/login/v1/autenticacao`);   

    const authResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/login/v1/autenticacao`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        usuario: process.env.OMIE_USUARIO || "omie",
        senha: process.env.OMIE_SENHA || "omiepolgo"
      }
    });
    
    logger.info('Autenticação realizada com sucesso', { 
      status: authResponse.status,
      data: authResponse.data 
    });

    // Step 2: Get company data
    logger.info('Step 2: Obtendo dados da empresa');
    const companyResponse = await retryAxios({
      method: 'GET',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/empresa/${idEmpresa}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.data.retorno.token}`
      }
    });
    
    logger.info('Dados da empresa obtidos com sucesso', { 
      status: companyResponse.status,
      data: companyResponse.data 
    });

    // Extract CNPJ from company response
    const cnpj = companyResponse.data?.retorno?.cnpj;
    if (!cnpj) {
      throw new Error('CNPJ não encontrado na resposta da empresa');
    }
    
    logger.info('CNPJ extraído da empresa', { cnpj });

    // Step 3: Calculate cashback
    logger.info('Step 3: Calculando cashback');
    const cashbackResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/fidelidade/v1/calcularCashbackCompra`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.data.retorno.token}`
      },
      data: {
        cnpjAssociado: cnpj,
        valorCompra: valorTotal
      }
    });
    
    logger.info('Cashback calculado com sucesso', { 
      status: cashbackResponse.status,
      data: cashbackResponse.data 
    });

    // Extract cashback value from response
    const cashbackGerado = cashbackResponse.data?.retorno?.cashbackGerado || 0;
    logger.info('Valor do cashback extraído', { cashbackGerado });

    // Step 4: Send temporary authentication notification
    logger.info('Step 4: Enviando notificação de autenticação temporária');
    const notificationResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/login/v1/autenticacaoTemporaria/enviarNotificacaoToken`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.data.retorno.token}`
      },
      data: {
        usuario: telefone,
        associadoCnpj: cnpj
      }
    });
    
    logger.info('Notificação enviada com sucesso', { 
      status: notificationResponse.status,
      data: notificationResponse.data 
    });

    // Step 5: Insert flow
    logger.info('Step 5: Inserindo flow');
    const flowResponse = await retryAxios({
      method: 'POST',
      url: `${process.env.POLGO_API_URL}/integracao/v1/omie/flow`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResponse.data.retorno.token}`
      },
      data: {
        idEmpresa: idEmpresa,
        idCaixa: idCaixa,
        flowToken: flowToken
      }
    });
    
    logger.info('Flow inserido com sucesso', { 
      status: flowResponse.status,
      data: flowResponse.data,
      flowToken: flowToken
    });

    // Return success response in the expected format
    return {
      statusCode: 200,
      body: JSON.stringify({
        screen: "Cashback",
        data: {
          Nome: nome,
          Valor: cashbackGerado
        }
      })
    };

  } catch (error) {
    logger.error('Erro durante a etapa init', { 
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro durante a etapa init',
        error: error.message,
        details: error.response?.data || null
      })
    };
  }
};

export default initHandler; 