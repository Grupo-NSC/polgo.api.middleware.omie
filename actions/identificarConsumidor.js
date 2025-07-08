import { logger } from '../utils/logger.js';
import {
  autenticarComOmie,
  verificarDadosFlow,
  atualizarFlow,
  registrarOperacaoFlow,
  obterDadosEmpresa,
  calcularCashoutMaximo,
  enviarNotificacaoToken
} from '../services/index.js';

const identificarConsumidorHandler = async ({ data, flowToken }) => {
  logger.info('Iniciando ação preencherConsumidor', { data, flowToken });

  let authToken = null;
  let flowId = null;
  let statusCode = 400;
  let responseBody = {};
  let nome = '';
  let telefone = '';

  try {
    // 1. Extrair dados
    telefone = data.Telefone_input?.replace(/[()\-\s]/g, '') || '';
    nome = data.Nome_input || '';
    const flowT = flowToken || data.FlowToken;

    if (!flowT) {
      statusCode = 200;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger:
            'Flow toten não encontrado'
        }
      };
      return;
    }

    if (!telefone || !nome || !flowT) {
      statusCode = 200;
      responseBody = {
        screen: 'PreencherConsumidor',
        data: {
          MensagemDeErro: 'Telefone, nome e flowToken são obrigatórios.',
          errorNome_input: 'Nome obrigatório',
          errorTelefone_input: "Telefone obrigatório"
        }
      };
      return;
    }

    // 2. Autenticar
    logger.info('Autenticando com Omie');
    const authResult = await autenticarComOmie();
    if (!authResult.sucesso) {
      statusCode = 200;
      responseBody = {
        screen: 'PreencherConsumidor',
        data: {
          MensagemDeErro: 'Erro na autenticação: ' + authResult.erro.mensagem
        }
      };
      return;
    }
    authToken = authResult.dados.token;

    // 3. Buscar flow
    logger.info('Buscando dados do flow');
    const flowResult = await verificarDadosFlow(flowT, authToken);
    if (!flowResult.sucesso) {
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger: 'Flow não encontrado'
        }
      };
      return;
    }

    const flowData = flowResult.dados || {};

    const idEmpresa = flowData.idEmpresa;
    const idCaixa = flowData.idCaixa;
    const valorTotal = flowData.valorCompra;
    let cashoutMaximo = flowData.cashoutMaximo;
    flowId = flowData.id;
    // Consulta CNPJ da empresa
    const empresaResult = await obterDadosEmpresa(idEmpresa, authToken);
    
    if (!empresaResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger: 'Erro ao obter dados da empresa: ' + empresaResult.erro.mensagem
        }
      };
      return;
    }
    const cnpj = empresaResult.dados.cnpj;

    // Consulta saldo do consumidor
    const cashoutResult = await calcularCashoutMaximo(telefone, cnpj, valorTotal, authToken);
    if (!cashoutResult.sucesso || !cashoutResult.dados || cashoutResult.dados.valorMaximo === 0) {
      statusCode = 200;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger: 'Saldo do consumidor não encontrado ou igual a zero.'
        }
      };
      return;
    }

    cashoutMaximo = cashoutResult.dados.valorMaximo;

    // Enviar notificação de autenticação temporária
    const notificacaoResult = await enviarNotificacaoToken(telefone, cnpj, authToken);
    if (!notificacaoResult.sucesso) {
      statusCode = 200;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger: 'Erro ao enviar notificação: ' + notificacaoResult.erro.mensagem
        }
      };
      return;
    }

    // 4. Atualizar flow
    logger.info('Atualizando flow', { flowId, nome, telefone });
    const updateResult = await atualizarFlow(
      flowId,
      idEmpresa,
      idCaixa,
      flowT,
      valorTotal,
      cashoutMaximo,
      telefone,
      nome,
      authToken
    );
    if (!updateResult.sucesso) {
      statusCode = 200;
      responseBody = {
        screen: 'Cashback',
        data: {
          MensagemDeErro: 'Erro ao atualizar flow: ' + updateResult.erro.mensagem
        }
      };
      return;
    }

    // Criar etapa para validar o valor de cashout

    // 5. Sucesso
    statusCode = 200;
    responseBody = {
      screen: 'Cashback',
      data: {
        Nome: nome,
        Valor: cashoutMaximo
      }
    };
    return;
  } catch (error) {
    logger.error('Erro durante a ação preencherConsumidor', {
      error: error.message,
      response: error.response?.data
    });
    statusCode = 200;
    responseBody = {
      screen: 'ErroGenerico',
      data: {
        ErrorMessenger: error.message
      }
    };
    return;
  } finally {
    // 6. Registrar operação
    try {
      if (flowId && authToken) {
        await registrarOperacaoFlow(
          flowId,
          'IdentificarConsumidor',
          'data_exchange',
          new Date().toISOString(),
          authToken
        );
      }
    } catch (e) {
      logger.error('Erro ao registrar operação no finally', { erro: e.message });
    }

    logger.info('--- Resposta do preencherConsumidor', {
      statusCode,
      body: JSON.stringify(responseBody)
    });
    
    return {
      statusCode,
      body: JSON.stringify(responseBody)
    };
  }
};

export default identificarConsumidorHandler; 