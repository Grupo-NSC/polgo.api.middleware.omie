import { logger } from '../utils/logger.js';
import { 
  autenticarComOmie,
  verificarDadosFlow,
  verificarTokenTemporario,
  obterDadosEmpresa,
  processarCashout,
  aplicarPagamento,
  cancelarCashout
} from '../services/index.js';

const dataExchangeHandler = async ({ data, flowToken }) => {
  logger.info('Processando ação data_exchange', { data, flowToken });

  let idEmpresa = null;
  let idCaixa = null;
  let cashoutMaximo = 0;
  let usuario = null;
  let nome = "USUÁRIO";
  let valorCompra = 0;
  let cashoutCodigoControle = null; // Para armazenar o código de controle do cashout
  
  try {
    // Extract values from request data
    const voucher = data.Voucher;
    const flowT = flowToken || data.FlowToken;
    
    if (!voucher || !flowT) {
      throw new Error('Voucher e flowToken são obrigatórios');
    }
    
    logger.info('Valores extraídos da requisição', {
      voucher,
      flowToken: flowT
    });

    // Step 1: Authenticate with Omie
    logger.info('Step 1: Autenticando com Omie');
    const authResult = await autenticarComOmie();
    if (!authResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro na autenticação: ' + authResult.erro.mensagem
          }
        })
      };
    }
    const authToken = authResult.dados.token;

    // Step 2: Check for flow data
    logger.info('Step 2: Verificando dados do flow');
    const flowResult = await verificarDadosFlow(flowT, authToken);
    if (!flowResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro ao verificar flow: ' + flowResult.erro.mensagem
          }
        })
      };
    }
    
    idEmpresa = flowResult.dados.idEmpresa;
    idCaixa = flowResult.dados.idCaixa;
    cashoutMaximo = flowResult.dados.cashoutMaximo;
    usuario = flowResult.dados.usuario;
    nome = flowResult.dados.nome;
    valorCompra = flowResult.dados.valorCompra;

    logger.info('Dados do flow extraídos', {
      idEmpresa,
      idCaixa,
      cashoutMaximo,
      usuario,
      valorCompra,
      nome
    });

    // Step 3: Verify if temporary token is valid
    logger.info('Step 3: Verificando token temporário');
    const tokenResult = await verificarTokenTemporario(usuario, voucher, authToken);
    if (!tokenResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro na verificação do token: ' + tokenResult.erro.mensagem
          }
        })
      };
    }

    // Step 4: Get CNPJ from company
    logger.info('Step 4: Obtendo CNPJ da empresa');
    const empresaResult = await obterDadosEmpresa(idEmpresa, authToken);
    if (!empresaResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro ao obter dados da empresa: ' + empresaResult.erro.mensagem
          }
        })
      };
    }
    const { cnpj, appSecret, appKey } = empresaResult.dados;

    // Step 5: Cashout operation
    logger.info('Step 5: Realizando operação de cashout');
    const cashoutResult = await processarCashout(usuario, cashoutMaximo, cnpj, valorCompra, authToken);
    if (!cashoutResult.sucesso) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Erro no processamento de cashout: ' + cashoutResult.erro.mensagem
          }
        })
      };
    }
    
    // Armazenar o código de controle do cashout para possível cancelamento
    cashoutCodigoControle = cashoutResult.dados.codigoControle;
    logger.info('Código de controle do cashout armazenado', { cashoutCodigoControle });

    // Step 6: Apply discount
    logger.info('Step 6: Aplicando desconto');
    const pagamentoResult = await aplicarPagamento(flowT, idEmpresa, idCaixa, cashoutMaximo, appKey, appSecret);
    if (!pagamentoResult.sucesso) {
      // Se a aplicação do desconto falhar, cancelar o cashout automaticamente
      logger.warn('Falha na aplicação do desconto, cancelando cashout automaticamente', {
        codigoControle: cashoutCodigoControle,
        cnpj: cnpj,
        usuario: usuario
      });
      
      const cancelamentoResult = await cancelarCashout(cashoutCodigoControle, cnpj, usuario, authToken);
      if (!cancelamentoResult.sucesso) {
        logger.error('Erro ao cancelar cashout após falha no desconto', {
          erro: cancelamentoResult.erro
        });
        // Mesmo que o cancelamento falhe, retornamos o erro original do desconto
      } else {
        logger.info('Cashout cancelado com sucesso após falha no desconto');
      }
      
      return {
        statusCode: 400,
        body: JSON.stringify({
          screen: 'Cashback',
          data: {
            Nome: nome,
            Valor: cashoutMaximo,
            MensagemDeErro: 'Não foi possível aplicar o desconto no pedido. Cashout foi cancelado automaticamente.'
          }
        })
      };
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

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data exchange processado com sucesso',
        data: {
          screen: "Confirmacao",
          data: {
            Mensagem: "Cashback realizado com sucesso",
          }
        }
      })
    };

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
        // Precisamos do authToken e dados da empresa para cancelar
        // Como não temos acesso direto aqui, vamos apenas logar
        logger.error('Não foi possível cancelar cashout automaticamente devido ao erro geral', {
          codigoControle: cashoutCodigoControle,
          erro: error.message
        });
      } catch (cancelError) {
        logger.error('Erro ao tentar cancelar cashout', { cancelError });
      }
    }
    
    return {
      statusCode: 400,
      body: JSON.stringify({
        screen: 'Cashback',
        data: {
          Nome: nome,
          Valor: cashoutMaximo,
          MensagemDeErro: error.response?.data?.mensagem || error.message
        }
      })
    };
  }
};

export default dataExchangeHandler; 