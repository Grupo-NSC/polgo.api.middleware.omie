# Polgo API Middleware - Omie

Middleware de integração entre o ecossistema Polgo e o OmiePDV via webhook.

## Requisitos

- Node.js 22.x
- npm 10.x
- Serverless Framework CLI
- Conta AWS com credenciais configuradas

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Grupo-NSC/polgo.api.middleware.omie.git
cd polgo.api.middleware.omie
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

## Desenvolvimento Local

Para executar o projeto localmente:

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

## Deploy

### Deploy Manual

Para fazer deploy manual na AWS:

```bash
npm run deploy
```

### Deploy Automático

O deploy automático é realizado via GitHub Actions sempre que houver um push na branch `main`. Certifique-se de configurar os seguintes secrets no repositório:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Estrutura do Projeto

```
.
├── actions/              # Handlers específicos para cada ação
├── services/            # Serviços internos da Polgo
├── utils/              # Utilitários e helpers
├── handler.js          # Ponto de entrada da Lambda
├── serverless.yml      # Configuração do Serverless Framework
└── package.json        # Dependências e scripts
```

## Endpoints

### POST /polgo/integracao/webhook/omie

Recebe webhooks da Omie com as seguintes ações:

- `init`: Inicialização da integração
- `data_exchange`: Troca de dados entre sistemas

## Licença

ISC 