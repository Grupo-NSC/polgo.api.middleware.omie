const { logger } = require('../utils/logger');
const retryAxios = require('../utils/retryAxios');

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

module.exports = {
  notificarSistema
}; 