const axios = require('axios');
const { logger } = require('./logger');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryAxios = async (config, retries = MAX_RETRIES) => {
  try {
    return await axios(config);
  } catch (error) {
    if (retries > 0 && error.response?.status >= 500) {
      logger.warn('Erro na requisição, tentando novamente', {
        url: config.url,
        retriesLeft: retries - 1,
        error: error.message
      });
      
      await sleep(RETRY_DELAY);
      return retryAxios(config, retries - 1);
    }
    throw error;
  }
};

module.exports = retryAxios; 