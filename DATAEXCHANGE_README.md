# Omie Integration - DataExchange Handler

Este documento descreve a funcionalidade de troca de dados (`dataExchange.js`) que realiza uma sequência de operações para processar vouchers e aplicar descontos.

## Funcionalidades

O handler `dataExchange.js` executa as seguintes operações em sequência:

### 1. Autenticação
- **Endpoint**: `POST /login/v1/autenticacao`
- **Payload**:
```json
{
  "usuario": "omie",
  "senha": "omiepolgo"
}
```

### 2. Verificação de Dados do Flow
- **Endpoint**: `GET /integracao/v1/omie/flow/{flowToken}`
- **Headers**: Inclui token de autenticação obtido no passo anterior
- **Resposta**:
```json
{
  "status": 200,
  "mensagem": "Flow Omie encontrado.",
  "retorno": {
    "idEmpresa": "2ae82b03-2597-4067-baf4-1faf32bc67d9",
    "idCaixa": "caixa_4a87b1b5-1db2-4d95-b869-faa825f547b1",
    "flowToken": "c70ea863-f09e-48a0-9509-0ce47276c82d",
    "venda": {
      "cashoutMaximo": 3.85,
      "usuario": "19995811172"
    },
    "dataCriacao": "2025-06-22T17:07:31.659Z",
    "dataAtualizacao": "2025-06-22T17:07:31.659Z"
  }
}
```

### 3. Verificação de Token Temporário
- **Endpoint**: `POST /login/v1/autenticacaoTemporaria/verificar`
- **Headers**: Inclui token de autenticação obtido no passo anterior
- **Payload**:
```json
{
  "usuario": "19995811172",
  "codigo": "776289"
}
```
- **Resposta**:
```json
{
  "status": 200,
  "mensagem": "Código temporário é válido!",
  "retorno": {
    "codigoValido": true
  }
}
```

### 4. Busca do Flow
- **Endpoint**: `GET /integracao/v1/omie/flow/{flowToken}`
- **Headers**: Inclui token de autenticação
- **Resposta**:
```json
{
  "status": 200,
  "mensagem": "Flow Omie encontrado.",
  "retorno": {
    "idEmpresa": "2ae82b03-2597-4067-baf4-1faf32bc67d9",
    "idCaixa": "caixa_74de1fac-a162-411c-b568-58395ae44903",
    "flowToken": "35a3c800-ad16-4ffb-896f-6812c5cb73e9",
    "venda": {
      "cashoutMaximo": 3.55
    },
    "dataCriacao": "2025-06-22T14:29:28.117Z",
    "dataAtualizacao": "2025-06-22T14:29:28.117Z"
  }
}
```

### 5. Obtenção do CNPJ da Empresa
- **Endpoint**: `GET /integracao/v1/omie/empresa/{idEmpresa}`
- **Headers**: Inclui token de autenticação
- **Resposta**:
```json
{
  "status": 200,
  "mensagem": "Empresa Omie encontrada.",
  "retorno": {
    "idEmpresa": "2ae82b03-2597-4067-baf4-1faf32bc67d9",
    "cnpj": "02765150000111",
    "dataCriacao": "2025-06-22T14:28:28.857Z",
    "dataAtualizacao": "2025-06-22T14:28:28.857Z"
  }
}
```

### 6. Operação de Cashout
- **Endpoint**: `POST https://testewscashout.qrsorteios.com.br/6ef8c1ab-9064-4e38-82ee-5c9218ed8c13/cashback/v1/cashout/{usuario}`
- **Payload**:
```json
{
  "valor": 3.55,
  "associado": "02765150000111",
  "colaborador": "",
  "nomeColaborador": null,
  "codigoControle": null,
  "descricao": "Cashout de R$ 3.55 cashback",
  "valorTotalCompra": 15,
  "imagemDebito": null
}
```
- **Resposta**:
```json
{
  "contentHandling": "CONVERT_TO_TEXT",
  "mensagem": "Valor debitado com sucesso.",
  "retorno": {
    "codigoControle": "b782d10e-60c6-4ec3-9c05-d8bb38a07920",
    "notificacaoEmitida": true,
    "dataHora": "2025-06-22 11:37:14",
    "usuario": "19995811172",
    "valorDebitado": 3.55,
    "valorRestante": 2.85
  }
}
```

### 7. Aplicação de Desconto
- **Endpoint**: `POST https://appdevi-api.trafficmanager.net/api/CupomVenda/AplicarPagamento`
- **Headers**:
  - `AppKey`: `5d90522b-eceb-4353-a176-fbcef8a728d5`
  - `AppSecret`: `LF5GMDtCVm021kH7BBsP7Uzx5ZO0X2kktkF7rvEPeWc+miiYJZJE6Y8EuwcPjECesBzlhdsWteBsZpAqX6ufGjDt/+nu9Ev75Cx8qEbnF640xlGkRDGUel8UfUUd/FHx91vKIGCFfaDQ4Jg5g7YcGcYKnofcC/YHfdLskTqiXxo=`
  - `Content-Type`: `application/json`
- **Payload**:
```json
{
  "Id": "35a3c800-ad16-4ffb-896f-6812c5cb73e9",
  "EmpresaId": "2ae82b03-2597-4067-baf4-1faf32bc67d9",
  "CaixaId": "caixa_74de1fac-a162-411c-b568-58395ae44903",
  "Valor": 10.00
}
```

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Configurações do Ambiente (já existentes)
NODE_ENV=development
LOG_LEVEL=debug

# URLs dos Serviços Polgo (já existentes)
POLGO_API_URL=https://integracaoomie.hapi.polgo.online/

# Configurações para DataExchange
CASHOUT_API_URL=https://testewscashout.qrsorteios.com.br/6ef8c1ab-9064-4e38-82ee-5c9218ed8c13
CASHOUT_VALOR=0.15
CASHOUT_VALOR_TOTAL_COMPRA=15
DISCOUNT_API_URL=https://appdevi-api.trafficmanager.net
DISCOUNT_APP_KEY=5d90522b-eceb-4353-a176-fbcef8a728d5
DISCOUNT_APP_SECRET=LF5GMDtCVm021kH7BBsP7Uzx5ZO0X2kktkF7rvEPeWc+miiYJZJE6Y8EuwcPjECesBzlhdsWteBsZpAqX6ufGjDt/+nu9Ev75Cx8qEbnF640xlGkRDGUel8UfUUd/FHx91vKIGCFfaDQ4Jg5g7YcGcYKnofcC/YHfdLskTqiXxo=
DISCOUNT_VALOR=10.00
NOTIFICATION_USUARIO=19995811172
OMIE_USUARIO=omie
OMIE_SENHA=omiepolgo
```

### Valores Padrão

Se as variáveis de ambiente não forem definidas, os seguintes valores padrão serão utilizados:

- `CASHOUT_API_URL`: `https://testewscashout.qrsorteios.com.br/6ef8c1ab-9064-4e38-82ee-5c9218ed8c13`
- `CASHOUT_VALOR`: `0.15`
- `CASHOUT_VALOR_TOTAL_COMPRA`: `15`
- `DISCOUNT_API_URL`: `https://appdevi-api.trafficmanager.net`
- `DISCOUNT_APP_KEY`: `5d90522b-eceb-4353-a176-fbcef8a728d5`
- `DISCOUNT_APP_SECRET`: `LF5GMDtCVm021kH7BBsP7Uzx5ZO0X2kktkF7rvEPeWc+miiYJZJE6Y8EuwcPjECesBzlhdsWteBsZpAqX6ufGjDt/+nu9Ev75Cx8qEbnF640xlGkRDGUel8UfUUd/FHx91vKIGCFfaDQ4Jg5g7YcGcYKnofcC/YHfdLskTqiXxo=`
- `DISCOUNT_VALOR`: `10.00`
- `OMIE_USUARIO`: `omie`
- `OMIE_SENHA`: `omiepolgo`

## Uso

### Via Webhook

Para executar a troca de dados via webhook, envie uma requisição POST para o endpoint configurado:

```json
{
  "screen": "Cashback",
  "action": "data_exchange",
  "data": {
    "Voucher": 776289
  },
  "flowToken": "35a3c800-ad16-4ffb-896f-6812c5cb73e9"
}
```

### Mapeamento de Dados

O handler extrai os seguintes valores da requisição:

| Campo da Requisição | Uso | Obrigatório |
|-------------------|-----|-------------|
| `data.Voucher` | Código para verificação de token temporário | Sim |
| `data.flowToken` | Token do flow para busca e aplicação de desconto | Sim |

### Resposta de Sucesso

```json
{
  "statusCode": 200,
  "body": {
    "message": "Data exchange processado com sucesso",
    "data": {
      "screen": "Confirmacao",
      "data": {
        "Mensagem": "Cashback realizado com sucesso"
      }
    }
  }
}
```

### Resposta de Erro

```json
{
  "statusCode": 500,
  "body": {
    "message": "Erro durante a etapa data_exchange",
    "error": "Descrição do erro",
    "details": { /* detalhes adicionais do erro */ }
  }
}
```

## Logs

O handler utiliza o Winston para logging. Todos os passos são registrados com informações detalhadas:

- Início do processo
- Valores extraídos da requisição
- Cada etapa da sequência
- Sucesso ou falha de cada operação
- Detalhes das respostas da API
- Erros com stack trace

## Tratamento de Erros

- **Retry Automático**: Utiliza `retryAxios` para tentativas automáticas em caso de erros 5xx
- **Logging Detalhado**: Todos os erros são registrados com contexto completo
- **Resposta Estruturada**: Erros são retornados em formato JSON padronizado
- **Validação de Dados**: Verifica se voucher e flowToken estão presentes
- **Validação de Autenticação**: Verifica se a autenticação foi bem-sucedida
- **Validação de Token**: Verifica se o código temporário é válido antes de prosseguir
- **Validação de Flow**: Verifica se o flow foi encontrado
- **Validação de CNPJ**: Verifica se o CNPJ foi extraído corretamente

## Fluxo de Validação

1. **Validação de Entrada**: Verifica se `Voucher` e `flowToken` estão presentes
2. **Autenticação**: Autentica com as credenciais Omie
3. **Validação de Token**: Verifica se o código temporário é válido
4. **Busca do Flow**: Obtém dados do flow usando o flowToken
5. **Obtenção do CNPJ**: Busca o CNPJ da empresa usando o idEmpresa do flow
6. **Validação de Cashout**: Verifica se a operação de cashout foi bem-sucedida
7. **Aplicação de Desconto**: Aplica o desconto usando dados do flow

## Dependências

- `axios`: Para requisições HTTP
- `winston`: Para logging
- `dotenv`: Para carregamento de variáveis de ambiente

## Desenvolvimento

Para testar localmente:

```bash
npm run dev
```

Para fazer deploy:

```bash
npm run deploy
``` 