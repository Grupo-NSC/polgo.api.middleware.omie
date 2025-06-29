# Cancelamento Automático de Cashout

Este documento descreve a funcionalidade de cancelamento automático de cashout implementada no `dataExchange.js`.

## Funcionalidade

Quando a operação de cashout é realizada com sucesso na **etapa 5**, mas a **etapa 6** (aplicação de desconto) falha, o sistema automaticamente cancela o cashout para manter a consistência dos dados.

## Fluxo de Execução

### Cenário de Sucesso
1. **Etapa 5**: Cashout realizado com sucesso
2. **Etapa 6**: Desconto aplicado com sucesso
3. **Resultado**: Operação completa

### Cenário de Falha com Rollback
1. **Etapa 5**: Cashout realizado com sucesso
2. **Etapa 6**: Falha na aplicação do desconto
3. **Rollback**: Cancelamento automático do cashout
4. **Resultado**: Erro retornado + cashout cancelado

## Dados Necessários para Cancelamento

O cancelamento utiliza os seguintes dados:

- **`codigoControle`**: Retornado pela API de cashout na etapa 5
- **`associadoCnpj`**: CNPJ da empresa obtido na etapa 4
- **`cpfColaborador`**: Usuário obtido do flow na etapa 2
- **`authToken`**: Token de autenticação da etapa 1

## Estrutura da Resposta de Cashout

```json
{
  "data": {
    "contentHandling": "CONVERT_TO_TEXT",
    "mensagem": "Valor debitado com sucesso.",
    "retorno": {
      "codigoControle": "ce190611-770d-4d1f-9b3d-ea19708b60aa",
      "dataHora": "2025-06-29 15:51:43",
      "notificacaoEmitida": true,
      "usuario": "19995811172",
      "valorDebitado": 0.05,
      "valorRestante": 25.58
    }
  }
}
```

## Endpoint de Cancelamento

- **URL**: `POST /polgo/fidelidade/v1/cashout/cancelamento`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}`

### Payload de Cancelamento
```json
{
  "codigoControle": "ce190611-770d-4d1f-9b3d-ea19708b60aa",
  "associadoCnpj": "03971782000102",
  "cpfColaborador": "19995811172",
  "descricao": "Cancelamento de cashout"
}
```

### Resposta de Cancelamento
```json
{
  "status": 200,
  "mensagem": "Cashout cancelado com sucesso!",
  "retorno": {
    "codigoControle": "526fa1ad-ba20-46ed-ac03-4a6918de2f66",
    "dataHoraCancelamento": "2021-09-14 12:20:21",
    "valorDisponivel": 50
  }
}
```

## Implementação no Código

### Serviço de Cancelamento
```javascript
// services/cancelarCashout.js
const cancelarCashout = async (codigoControle, associadoCnpj, cpfColaborador, authToken) => {
  // Implementação do cancelamento
};
```

### Uso no dataExchange.js
```javascript
// Etapa 5: Cashout realizado
const cashoutResult = await processarCashout(usuario, cashoutMaximo, cnpj, valorCompra, authToken);
cashoutCodigoControle = cashoutResult.dados.codigoControle;

// Etapa 6: Aplicação do desconto
const pagamentoResult = await aplicarPagamento(flowT, idEmpresa, idCaixa, cashoutMaximo, appKey, appSecret);
if (!pagamentoResult.sucesso) {
  // Cancelamento automático
  const cancelamentoResult = await cancelarCashout(cashoutCodigoControle, cnpj, usuario, authToken);
  // Retorna erro com informação do cancelamento
}
```

## Logs de Debug

O sistema gera logs detalhados para facilitar o debugging:

```javascript
// Log do código de controle extraído
logger.info('Código de controle do cashout extraído', { 
  codigoControle: cashoutData.codigoControle 
});

// Log de início do cancelamento
logger.warn('Falha na aplicação do desconto, cancelando cashout automaticamente', {
  codigoControle: cashoutCodigoControle,
  cnpj: cnpj,
  usuario: usuario
});

// Log de sucesso do cancelamento
logger.info('Cashout cancelado com sucesso após falha no desconto');

// Log de erro no cancelamento
logger.error('Erro ao cancelar cashout após falha no desconto', {
  erro: cancelamentoResult.erro
});
```

## Mensagens de Erro

Quando o cancelamento automático é executado, a mensagem de erro inclui essa informação:

```
"Erro ao aplicar desconto: [detalhes do erro]. Cashout foi cancelado automaticamente."
```

## Tratamento de Erros

1. **Falha no Desconto**: Cancela cashout automaticamente
2. **Falha no Cancelamento**: Loga erro mas retorna erro original do desconto
3. **Erro Geral**: Tenta cancelar se possível, loga tentativa

## Benefícios

- **Consistência de Dados**: Evita cashouts "órfãos" sem desconto aplicado
- **Transparência**: Usuário é informado sobre o cancelamento automático
- **Auditoria**: Logs detalhados para rastreamento
- **Robustez**: Sistema continua funcionando mesmo com falhas parciais 