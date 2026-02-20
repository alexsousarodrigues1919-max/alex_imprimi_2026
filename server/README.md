# OfficePro - Plataforma para Escritorio

Sistema web full stack com login protegido, cadastro, agenda, financeiro, profissionais, projetos, atendimento, notificacoes e relatorios.

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Banco: SQLite
- Auth: JWT + bcrypt

## Regras implementadas
- Bloqueio de cadastro para menor de 18 anos
- Campos obrigatorios validados
- E-mail/CPF/CNPJ validados
- Senha minima de 8 caracteres
- Controle de acesso por perfil
- Logs de atividade

## Rodar local
1. `cd server`
2. `npm install`
3. Copie `.env.example` para `.env`
4. `npm start`
5. Abra `http://localhost:3000`

## GitHub e deploy automatico
- Workflow em `.github/workflows/deploy.yml`
- CI roda verificacao de sintaxe no backend
- Push na branch `main` dispara deploy automatico em:
  - Render: secret `RENDER_DEPLOY_HOOK_URL`
  - Railway: secret `RAILWAY_DEPLOY_HOOK_URL`

Observacao:
- GitHub Actions nao hospeda servidor web 24h diretamente.
- O fluxo correto e: GitHub (CI/CD) -> Render/Railway (hospedagem do server).

## Estrutura principal
- API: `server/src`
- Frontend: `client/`
- Workflow: `.github/workflows/deploy.yml`

## Persistencia do banco em producao
Para manter os dados durante manutencao e deploy, configure `DB_PATH` em um disco persistente.

Exemplo Render:
- Persistent Disk mount: `/var/data`
- Variavel: `DB_PATH=/var/data/office.db`

Com isso, reinicios e novos deploys mantem os dados do SQLite.
