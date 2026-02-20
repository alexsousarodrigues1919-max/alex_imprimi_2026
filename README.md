# OfficePro - Auto Deploy + UI

## Deploy no Render (erro ENOENT resolvido)
Este repositorio agora possui `package.json` na raiz para o Render conseguir rodar `npm install` e `npm start` sem erro.

### Configuracao recomendada no Render
1. `Environment`: Node
2. `Build Command`: `npm install`
3. `Start Command`: `npm start`
4. `Root Directory`: deixar vazio (raiz do repo)

Opcional:
- Se preferir usar apenas a pasta `server`, configure:
  - `Root Directory`: `server`
  - `Build Command`: `npm install`
  - `Start Command`: `npm start`

## GitHub Actions + Deploy Hook
1. Suba o codigo no GitHub.
2. Em `Settings > Secrets and variables > Actions`, adicione:
   - `RENDER_DEPLOY_HOOK_URL` (Render)
   - ou `RAILWAY_DEPLOY_HOOK_URL` (Railway)
3. Push na `main` dispara CI e deploy automatico.

## Observacao
GitHub Actions automatiza o deploy, mas nao hospeda servidor 24h.
Hospedagem fica no Render/Railway.

## Frontend e estilo
- CSS centralizado em `client/css/style.css`
- Layout responsivo (desktop, tablet, mobile)
- Feedback visual com toast, loading e modal

## Persistencia de dados (sem perda em manutencao/deploy)
Para nao perder dados em deploy/manutencao, use banco em disco persistente.

### Render
1. Crie um Persistent Disk no servico.
2. Mount Path: `/var/data`
3. Variavel de ambiente: `DB_PATH=/var/data/office.db`
4. Mantenha o mesmo servico e mesmo disco em todos os deploys.

### Railway
1. Use um volume/disco persistente.
2. Configure `DB_PATH` apontando para esse volume.

### Observacoes
- Sem disco persistente, SQLite pode ser recriado e dados podem sumir.
- Recomendado para escala: migrar para PostgreSQL gerenciado.
