import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import initHandler from './actions/init.js';
import cashbackHandler from './actions/cashback.js';
import identificarConsumidorHandler from './actions/identificarConsumidor.js';

// Load environment variables from .env file
dotenv.config();

const omieWebhookHandler = async (event) => {
  try {
    logger.info('Recebendo webhook da Omie');

    const body = JSON.parse(event.body);
    const { Action, Screen, Data, FlowToken } = body;
    logger.info('--- body -->', body);

    if (!Action || !Data) {
      throw new Error('Payload inválido: action e data são obrigatórios');
    }

    switch (Action) {
      case 'init':
        return await initHandler({ data: Data, flowToken: FlowToken });
      
      case 'data_exchange':
        if (Screen == "Cashback")
          return await cashbackHandler({ data: Data, flowToken: FlowToken });
        
        if (Screen == 'IdentificarConsumidor')
          return await identificarConsumidorHandler({
            data: Data,
            flowToken: FlowToken
          });
        
        throw new Error(`Ação não suportada: ${Action}/${Screen}`);
      default:
        throw new Error(`Ação não suportada: ${Action}/${Screen}`);
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