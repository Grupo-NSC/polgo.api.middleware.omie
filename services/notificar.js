import { logger } from '../utils/logger.js';
import retryAxios from '../utils/retryAxios.js';

const notificarSistema = async (data) => {
  logger.info('Enviando notificação', { data });
  
  // TODO: Implementar lógica de notificação
  // - Enviar webhook para sistema Polgo
  // - Registrar tentativa de notificação
  // - Tratar retry em caso de falha

  return {
    success: true,
    message: 'Notificação enviada com sucesso'
  };
};

export { notificarSistema }; 