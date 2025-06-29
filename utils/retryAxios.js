import axios from 'axios';
import { logger } from './logger.js';

const MAX_RETRIES = process.env.MAX_RETRIES || 3;
const RETRY_DELAY = process.env.RETRY_DELAY || 1000; // 1 segundo
const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 10000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryAxios = async (config, retries = MAX_RETRIES) => {
  try {
    return await axios({
      ...config,
      timeout: REQUEST_TIMEOUT
    });
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

export default retryAxios; 