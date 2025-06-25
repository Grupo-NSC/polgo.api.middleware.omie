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
    const { Action, Data, FlowToken } = body;
    logger.info('--- body -->', body);

    if (!Action || !Data) {
      throw new Error('Payload inválido: action e data são obrigatórios');
    }

    switch (Action) {
      case 'init':
        return await initHandler({ data: Data, flowToken: FlowToken });
      case 'data_exchange':
        return await dataExchangeHandler({ data: Data, flowToken: FlowToken });
      default:
        throw new Error(`Ação não suportada: ${Action}`);
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