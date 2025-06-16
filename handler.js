import { logger } from './utils/logger.js';
import initHandler from './actions/init.js';
import dataExchangeHandler from './actions/dataExchange.js';

const omieWebhookHandler = async (event) => {
  try {
    logger.info('Recebendo webhook da Omie', { event });

    const body = JSON.parse(event.body);
    const { action, data } = body;

    if (!action || !data) {
      throw new Error('Payload inválido: action e data são obrigatórios');
    }

    switch (action) {
      case 'init':
        return await initHandler(data);
      case 'data_exchange':
        return await dataExchangeHandler(data);
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  } catch (error) {
    logger.error('Erro ao processar webhook', { error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro interno ao processar webhook',
        error: error.message
      })
    };
  }
};

export { omieWebhookHandler }; 