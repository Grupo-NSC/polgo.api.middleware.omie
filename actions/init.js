import { logger } from '../utils/logger.js';
import { 
  autenticarComOmie,
  obterDadosEmpresa,
  calcularCashoutMaximo,
  enviarNotificacaoToken,
  inserirFlow
} from '../services/index.js';

const initHandler = async ({ data, flowToken }) => {
  logger.info('Iniciando processo de inicialização');

  try {
    // Extract values from request data
    const valorTotal =
      data.ValorTotal;
    const idEmpresa = data.IdEmpresa;
    const idCaixa = data.IdCaixa;
    const flowT = flowToken || data.FlowToken;
    const telefone =
      data.NfeDestinatario?.Telefone?.replace(/[()\-\s]/g, '') || '';
    const nome = data.NfeDestinatario?.Nome || 'SEM_NOME';

    logger.info('Valores extraídos da requisição', {
      valorTotal,
      idEmpresa,
      idCaixa,
      flowToken: flowT,
      telefone,
      nome
    });

    // Step 1: Authenticate with Omie
    logger.info('Step 1: Autenticando com Omie');
    const authResult = await autenticarComOmie();
    if (!authResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: 0,
            MensagemDeErro: 'Erro na autenticação: ' + authResult.erro.mensagem
          }
        })
      };
    }
    const authToken = authResult.dados.token;

    // Step 2: Get company data
    logger.info('Step 2: Obtendo dados da empresa');
    const empresaResult = await obterDadosEmpresa(idEmpresa, authToken);
    if (!empresaResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: 0,
            MensagemDeErro: 'Erro ao obter dados da empresa: ' + empresaResult.erro.mensagem
          }
        })
      };
    }
    const { cnpj } = empresaResult.dados;

    logger.info('CNPJ extraído da empresa', { cnpj });

    // Step 3: Calculate maximum cashout value
    logger.info('Step 3: Calculando valor máximo de cashout');
    const cashoutResult = await calcularCashoutMaximo(telefone, cnpj, valorTotal, authToken);
    if (!cashoutResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: 0,
            MensagemDeErro: 'Erro ao calcular cashout: ' + cashoutResult.erro.mensagem
          }
        })
      };
    }
    const cashoutMaximo = cashoutResult.dados.valorMaximo;

    // Step 4: Send temporary authentication notification
    logger.info('Step 4: Enviando notificação de autenticação temporária');
    const notificacaoResult = await enviarNotificacaoToken(telefone, cnpj, authToken);
    if (!notificacaoResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro ao enviar notificação: ' + notificacaoResult.erro.mensagem
          }
        })
      };
    }

    // Step 5: Insert flow with cashout maximum value
    logger.info('Step 5: Inserindo flow com valor máximo de cashout');
    const flowResult = await inserirFlow(idEmpresa, idCaixa, flowT, valorTotal, cashoutMaximo, telefone, nome, authToken);
    if (!flowResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro ao inserir flow: ' + flowResult.erro.mensagem
          }
        })
      };
    }

    logger.info('--- Resposta do flow', {
      statusCode: 200,
      body: JSON.stringify({
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo
        }
      })
    });

    // Return success response in the expected format
    return {
      statusCode: 200,
      body: JSON.stringify({
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo
        }
      })
    };
  } catch (error) {
    logger.error('Erro durante a etapa init', {
      statusCode: error.statusCode,
      body: error.body,
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    return {
      statusCode: 400,
      body: JSON.stringify({
        screen: 'Cashback',
        data: {
          Nome: "USUÁRIO",
          Valor: 0,
          MensagemDeErro: error.message
        }
      })
    };
  }
};

export default initHandler; 