import { logger } from '../utils/logger.js';
import { 
  autenticarComOmie,
  verificarDadosFlow,
  verificarTokenTemporario,
  obterDadosEmpresa,
  processarCashout,
  aplicarPagamento,
  cancelarCashout,
  registrarOperacaoFlow
} from '../services/index.js';

const cashbackHandler = async ({ data, flowToken }) => {
  logger.info('Processando ação data_exchange/cashback', { data, flowToken });

  let flowId = null;
  let authToken = null;
  let idEmpresa = null;
  let idCaixa = null;
  let cashoutMaximo = 0;
  let usuario = null;
  let nome = "USUÁRIO";
  let valorCompra = 0;
  let cashoutCodigoControle = null; // Para armazenar o código de controle do cashout
  let statusCode = 400;
  let responseBody = {};
  
  try {
    const flowT = flowToken || data.FlowToken;

    if (!flowT) {
      statusCode = 400;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger: `POLGO: Não foi possível seguir operação de Cashback - Flow não enviado`
        }
      };
      return;
    }

    // Step 1: Authenticate with Omie
    logger.info('Step 1: Autenticando com Omie');
    const authResult = await autenticarComOmie();
    if (!authResult.sucesso) {
      statusCode = 401;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          MensagemDeErro: 'POLGO: Não foi possível autenticar'
        }
      };
      return;
    }
    authToken = authResult.dados.token;

    // Step 2: Check for flow data
    logger.info('Step 2: Verificando dados do flow');
    const flowResult = await verificarDadosFlow(flowT, authToken);
    if (!flowResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger:
            'POLGO: Flow não encontrado'
        }
      };
      return;
    }

    idEmpresa = flowResult.dados.idEmpresa;
    idCaixa = flowResult.dados.idCaixa;
    cashoutMaximo = flowResult.dados.cashoutMaximo;
    usuario = flowResult.dados.usuario;
    nome = flowResult.dados.nome;
    valorCompra = flowResult.dados.valorCompra;
    flowId = flowResult.dados.id;

    logger.info('Dados do flow extraídos', {
      idEmpresa,
      idCaixa,
      cashoutMaximo,
      usuario,
      valorCompra,
      nome
    });

    // Extract values from request data
    const voucher = data.Vouncher_input;

    if (!voucher) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          errorVouncher_input: 'Voucher é obrigatório'
        }
      };
      return;
    }

    logger.info('Valores extraídos da requisição', {
      voucher,
      flowToken: flowT
    });

    // Step 3: Verify if temporary token is valid
    logger.info('Step 3: Verificando token temporário');
    const tokenResult = await verificarTokenTemporario(
      usuario,
      voucher,
      authToken
    );
    if (!tokenResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          errorVouncher_input: 'Token de 6 dígitos inválido ou expirado'
        }
      };
      return;
    }

    // Step 4: Get CNPJ from company
    logger.info('Step 4: Obtendo CNPJ da empresa');
    const empresaResult = await obterDadosEmpresa(idEmpresa, authToken);
    if (!empresaResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger: `POLGO: Verificar cadastro de empresa {idEmpresa, cnpj}`
        }
      };
      return;
    }
    const { cnpj, appSecret, appKey } = empresaResult.dados;

    // Step 5: Cashout operation
    logger.info('Step 5: Realizando operação de cashout');
    const cashoutResult = await processarCashout(
      usuario,
      cashoutMaximo,
      cnpj,
      valorCompra,
      authToken
    );
    if (!cashoutResult.sucesso) {
      statusCode = 400;
      responseBody = {
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          errorVouncher_input:
            'POLGO: Não foi possível realizar o cashout: ' +
            cashoutResult.erro.mensagem
        }
      };
      return;
    }

    // Armazenar o código de controle do cashout para possível cancelamento
    cashoutCodigoControle = cashoutResult.dados.codigoControle;
    logger.info('Código de controle do cashout armazenado', {
      cashoutCodigoControle
    });

    // Step 6: Apply discount
    logger.info('Step 6: Aplicando desconto');
    const pagamentoResult = await aplicarPagamento(
      flowT,
      idEmpresa,
      idCaixa,
      cashoutMaximo,
      appKey,
      appSecret
    );
    if (!pagamentoResult.sucesso) {
      // Se a aplicação do desconto falhar, cancelar o cashout automaticamente
      logger.warn(
        'Falha na aplicação do desconto, cancelando cashout automaticamente',
        {
          codigoControle: cashoutCodigoControle,
          cnpj: cnpj,
          usuario: usuario
        }
      );

      const cancelamentoResult = await cancelarCashout(
        cashoutCodigoControle,
        cnpj,
        usuario,
        authToken
      );
      if (!cancelamentoResult.sucesso) {
        logger.error('Erro ao cancelar cashout após falha no desconto', {
          erro: cancelamentoResult.erro
        });
        // Mesmo que o cancelamento falhe, retornamos o erro original do desconto
      } else {
        logger.info('Cashout cancelado com sucesso após falha no desconto');
      }

      statusCode = 400;
      responseBody = {
        screen: 'ErroGenerico',
        data: {
          ErrorMessenger:
            'POLGO: Não foi possível aplicar o desconto no pedido. Cashout foi cancelado automaticamente'
        }
      };
      return;
    }

    logger.info('--- Resposta do desconto', {
      statusCode: 200,
      body: JSON.stringify({
        screen: 'Confirmacao',
        data: {
          Mensagem: 'Cashback realizado com sucesso'
        }
      })
    });

    statusCode = 200;
    responseBody = {
      message: 'Data exchange processado com sucesso',
      data: {
        screen: 'Confirmacao',
        data: {
          Mensagem: 'Cashback realizado com sucesso'
        }
      }
    };
    return;
  } catch (error) {
    logger.error('Erro durante a etapa data_exchange', { 
      error: error.message,
      response: error.response?.data
    });
    
    // Se houve erro geral e temos um cashout realizado, tentar cancelar
    if (cashoutCodigoControle) {
      logger.warn('Erro geral detectado, tentando cancelar cashout', {
        codigoControle: cashoutCodigoControle
      });
      
      try {
        logger.error('Não foi possível cancelar cashout automaticamente devido ao erro geral', {
          codigoControle: cashoutCodigoControle,
          erro: error.message
        });
      } catch (cancelError) {
        logger.error('Erro ao tentar cancelar cashout', { cancelError });
      }
    }
    
    statusCode = 400;
    responseBody = {
      screen: 'Cashback',
      data: {
        Nome: nome,
        Valor: cashoutMaximo,
        MensagemDeErro: error.response?.data?.mensagem || error.message
      }
    };
    return;
  } finally {
    if (flowId && authToken) {
      try {
        await registrarOperacaoFlow(
          flowId,
          'Cashback',
          'data_exchange',
          new Date().toISOString(),
          authToken
        );
      } catch (e) {
        logger.error('Erro ao registrar operação no finally', { erro: e.message });
      }
    }

    logger.info('--- Resposta do flow', {
      statusCode,
      body: JSON.stringify(responseBody)
    });

    if (statusCode !== undefined && responseBody) {
      return {
        statusCode,
        body: JSON.stringify(responseBody)
      };
    }
  }
};

export default cashbackHandler; 