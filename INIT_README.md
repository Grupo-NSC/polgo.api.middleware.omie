# Omie Integration - Init Handler

Este documento descreve a funcionalidade de inicialização (`init.js`) que realiza uma sequência de chamadas à API do Omie para configurar a integração.

## Funcionalidades

O handler `init.js` executa as seguintes operações em sequência:

### 1. Autenticação
- **Endpoint**: `POST /login/v1/autenticacao`
- **Payload**:
```json
{
  "usuario": "omie",
  "senha": "omiepolgo"
}
```

### 2. Obtenção de Dados da Empresa
- **Endpoint**: `GET /integracao/v1/omie/empresa/{idEmpresa}`
- **Headers**: Inclui token de autenticação obtido no passo anterior
- **Resposta**: Extrai o CNPJ da empresa para uso nos próximos passos

### 3. Cálculo de Cashback
- **Endpoint**: `POST /fidelidade/v1/calcularCashbackCompra`
- **Payload**:
```json
{
  "cnpjAssociado": "CNPJ_DA_EMPRESA",
  "valorCompra": 93.2
}
```

### 4. Envio de Notificação de Autenticação Temporária
- **Endpoint**: `POST /login/v1/autenticacaoTemporaria/enviarNotificacaoToken`
- **Payload**:
```json
{
  "usuario": "19988887777",
  "associadoCnpj": "CNPJ_DA_EMPRESA"
}
```

### 5. Inserção de Flow
- **Endpoint**: `POST /integracao/v1/omie/flow`
- **Payload**:
```json
{
  "idEmpresa": "abc",
  "idCaixa": "cx01_abc123",
  "flowToken": "token123xyz"
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
POLGO_API_URL=https://integracaoomie.hapi.polgo.online/polgo

# Credenciais Omie (já existentes)
OMIE_API_KEY=sua_chave_api_aqui
OMIE_API_SECRET=seu_segredo_api_aqui
OMIE_APP_KEY=sua_app_key_aqui

# Novas configurações para o Init Handler
OMIE_USUARIO=omie
OMIE_SENHA=omiepolgo
OMIE_EMPRESA_ID=cca39332-72c7-4f8c-b5f4-82d4944089e2
CASHBACK_VALOR=49.99
NOTIFICATION_USUARIO=19995811172
FLOW_CAIXA_ID=cx01
```

### Valores Padrão

Se as variáveis de ambiente não forem definidas, os seguintes valores padrão serão utilizados:

- `OMIE_USUARIO`: `omie`
- `OMIE_SENHA`: `omiepolgo`
- `OMIE_EMPRESA_ID`: `cca39332-72c7-4f8c-b5f4-82d4944089e2`
- `CASHBACK_VALOR`: `49.99`
- `NOTIFICATION_USUARIO`: `19995811172`
- `FLOW_CAIXA_ID`: `cx01`

## Uso

### Via Webhook

Para executar a inicialização via webhook, envie uma requisição POST para o endpoint configurado:

```json
{
  "action": "init",
  "data": {
    "ValorTotal": 93.2,
    "IdEmpresa": "abc",
    "IdCaixa": "cx01_abc123",
    "NfeDestinatario": {
      "Telefone": "19988887777",
      "Nome": "João Polgo"
    },
    "flowToken": "token123xyz"
  }
}
```

### Mapeamento de Dados

O handler extrai os seguintes valores da requisição:

| Campo da Requisição | Uso | Fallback |
|-------------------|-----|----------|
| `data.ValorTotal` | Valor para cálculo de cashback | `CASHBACK_VALOR` env var |
| `data.IdEmpresa` | ID da empresa para consulta | `OMIE_EMPRESA_ID` env var |
| `data.IdCaixa` | ID do caixa para o flow | `FLOW_CAIXA_ID` env var |
| `data.flowToken` | Token do flow | Gera novo UUID |
| `data.NfeDestinatario.Telefone` | Telefone para notificação | `NOTIFICATION_USUARIO` env var |

### Resposta de Sucesso

```json
{
  "statusCode": 200,
  "body": {
    "message": "Inicialização processada com sucesso",
    "data": {
      "requestData": {
        "valorTotal": 93.2,
        "idEmpresa": "abc",
        "idCaixa": "cx01_abc123",
        "flowToken": "token123xyz",
        "telefone": "19988887777",
        "cnpj": "94908459443041"
      },
      "authentication": { /* dados da autenticação */ },
      "company": { /* dados da empresa */ },
      "cashback": { /* dados do cashback */ },
      "notification": { /* dados da notificação */ },
      "flow": { /* dados do flow */ }
    }
  }
}
```

### Resposta de Erro

```json
{
  "statusCode": 500,
  "body": {
    "message": "Erro durante a inicialização",
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
- **Validação de CNPJ**: Verifica se o CNPJ foi extraído corretamente da resposta da empresa

## Dependências

- `axios`: Para requisições HTTP
- `uuid`: Para geração de tokens únicos
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