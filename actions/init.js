import { logger } from '../utils/logger.js';
import { 
  autenticarComOmie,
  obterDadosEmpresa,
  calcularCashoutMaximo,
  enviarNotificacaoToken,
  inserirFlow,
  registrarOperacaoFlow
} from '../services/index.js';

const initHandler = async ({ data, flowToken }) => {
  logger.info('Iniciando processo de inicialização');

  let authToken = null;
  let flowId = null;
  let statusCode = 400;
  let responseBody = {};
  let nome = '';
  let cashoutMaximo = 0;

  try {
    // Extract values from request data
    const valorTotal = data.ValorTotal;
    const idEmpresa = data.IdEmpresa;
    const idCaixa = data.IdCaixa;
    const flowT = flowToken || data.FlowToken;
    const telefone = data.NfeDestinatario?.Telefone?.replace(/[()\-\s]/g, '') || '';
    nome = data.NfeDestinatario?.Nome || '';

    logger.info('Valores extraídos da requisição', {
      valorTotal,
      idEmpresa,
      idCaixa,
      flowToken: flowT,
      telefone,
      nome
    });

    // Se telefone ou nome não estiverem preenchidos, inserir flow sem esses dados e retornar para ConfirmarCliente
    if (!telefone || !nome) {
      logger.info('Dados incompletos do destinatário, inserindo flow parcial e retornando para ConfirmarCliente', {
        idEmpresa,
        idCaixa,
        flowToken: flowT,
        valorTotal
      });
      // Inserir flow sem telefone, nome e cashoutMaximo
      const flowResult = await inserirFlow(idEmpresa, idCaixa, flowT, valorTotal, 0, '', '', null);
      if (!flowResult.sucesso) {
        statusCode = 400;
        responseBody = {
          screen: 'IdentificarConsumidor',
          data: {
            MensagemDeErro: 'Erro ao inserir flow: ' + flowResult.erro.mensagem
          }
        };
        return;
      }
      
      statusCode = 200;
      responseBody = {
        screen: 'IdentificarConsumidor',
        data: {}
      };
      return;
    }

    // Step 1: Authenticate with Omie
    logger.info('Step 1: Autenticando com Omie');
    const authResult = await autenticarComOmie();
    if (!authResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: 0,
          MensagemDeErro: 'Erro na autenticação: ' + authResult.erro.mensagem
        }
      };
      return;
    }
    authToken = authResult.dados.token;

    // Step 2: Get company data
    logger.info('Step 2: Obtendo dados da empresa');
    const empresaResult = await obterDadosEmpresa(idEmpresa, authToken);
    if (!empresaResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: 0,
          MensagemDeErro: 'Erro ao obter dados da empresa: ' + empresaResult.erro.mensagem
        }
      };
      return;
    }
    const { cnpj } = empresaResult.dados;

    logger.info('CNPJ extraído da empresa', { cnpj });

    // Step 3: Calculate maximum cashout value
    logger.info('Step 3: Calculando valor máximo de cashout');
    const cashoutResult = await calcularCashoutMaximo(telefone, cnpj, valorTotal, authToken);
    if (!cashoutResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: 0,
          MensagemDeErro: 'Erro ao calcular cashout: ' + cashoutResult.erro.mensagem
        }
      };
      return;
    }
    cashoutMaximo = cashoutResult.dados.valorMaximo;

    // Step 4: Send temporary authentication notification
    logger.info('Step 4: Enviando notificação de autenticação temporária');
    const notificacaoResult = await enviarNotificacaoToken(telefone, cnpj, authToken);
    if (!notificacaoResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          MensagemDeErro: 'Erro ao enviar notificação: ' + notificacaoResult.erro.mensagem
        }
      };
      return;
    }

    // Step 5: Insert flow with cashout maximum value
    logger.info('Step 5: Inserindo flow com valor máximo de cashout');
    const flowResult = await inserirFlow(idEmpresa, idCaixa, flowT, valorTotal, cashoutMaximo, telefone, nome, authToken);
    if (!flowResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          MensagemDeErro: 'Erro ao inserir flow: ' + flowResult.erro.mensagem
        }
      };
      return;
    }
    flowId = flowResult.dados?.retorno?.id || flowResult.dados?.id;

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
    logger.error('Erro durante a etapa init', {
      statusCode: error.statusCode,
      body: error.body,
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    statusCode = 400;
    responseBody = {
      screen: 'Cashback',
      data: {
        Nome: nome || 'USUÁRIO',
        Valor: 0,
        MensagemDeErro: error.message
      }
    };
    return;
  } finally {
    try {
      if (flowId && authToken) {
        await registrarOperacaoFlow(
          flowId,
          'Cashback',
          'init',
          new Date().toISOString(),
          authToken
        );
      }
    } catch (e) {
      logger.error('Erro ao registrar operação no finally', { erro: e.message });
    }

    logger.info('--- Resposta do flow', {
      statusCode,
      body: JSON.stringify(responseBody)
    });

    return {
      statusCode,
      body: JSON.stringify(responseBody)
    };
  }
};

export default initHandler; 