import { logger } from '../utils/logger.js';
import {
  autenticarComOmie,
  verificarDadosFlow,
  atualizarFlow,
  registrarOperacaoFlow
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
    telefone = data.Telefone?.replace(/[()\-\s]/g, '') || '';
    nome = data.Nome || '';
    const flowT = flowToken || data.FlowToken;

    if (!telefone || !nome || !flowT) {
      statusCode = 400;
      responseBody = {
        screen: 'PreencherConsumidor',
        data: {
          MensagemDeErro: 'Telefone, nome e flowToken são obrigatórios.'
        }
      };
      return;
    }

    // 2. Autenticar
    logger.info('Autenticando com Omie');
    const authResult = await autenticarComOmie();
    if (!authResult.sucesso) {
      statusCode = 400;
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
      statusCode = 400;
      responseBody = {
        screen: 'PreencherConsumidor',
        data: {
          MensagemDeErro: 'Erro ao buscar flow: ' + flowResult.erro.mensagem
        }
      };
      return;
    }
    flowId = flowT;

    // 4. Atualizar flow
    logger.info('Atualizando flow', { flowId, nome, telefone });
    const updateResult = await atualizarFlow(flowId, { venda: { usuario: telefone, nome: nome } }, authToken);
    if (!updateResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          MensagemDeErro: 'Erro ao atualizar flow: ' + updateResult.erro.mensagem
        }
      };
      return;
    }

    // 5. Sucesso
    statusCode = 200;
    responseBody = {
      screen: 'Cashback',
      data: {
        Mensagem: 'Consumidor atualizado com sucesso',
        Nome: nome,
        Telefone: telefone
      }
    };
    return;
  } catch (error) {
    logger.error('Erro durante a ação preencherConsumidor', {
      error: error.message,
      response: error.response?.data
    });
    statusCode = 400;
    responseBody = {
      screen: 'Cashback',
      data: {
        MensagemDeErro: error.message
      }
    };
    return;
  } finally {
    // 6. Registrar operação
    try {
      if (flowId && authToken) {
        await registrarOperacaoFlow(
          flowId,
          'Cashback',
          'preencherConsumidor',
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