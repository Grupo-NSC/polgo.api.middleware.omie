import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import initHandler from './actions/init.js';
import dataExchangeHandler from './actions/dataExchange.js';

// Load environment variables from .env file
dotenv.config();

const omieWebhookHandler = async (event) => {
  try {
    logger.info('Recebendo webhook da Omie');

    const body = JSON.parse(event.body);
    const { action, data, flowToken } = body;
    logger.info("--- data -->", data);

    if (!action || !data) {
      throw new Error('Payload inválido: action e data são obrigatórios');
    }

    switch (action) {
      case 'init':
        return await initHandler(data);
      case 'data_exchange':
        return await dataExchangeHandler({data, flowToken});
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