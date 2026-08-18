# To-Do Serverless — Azure Static Web Apps + Functions + Cosmos DB

Aplicație de tip to-do, 100% serverless: frontend static, backend pe Azure Functions
(consumption plan), date în Cosmos DB (tier Serverless). Costă practic 0 lei cât timp
nu e folosită — plătești doar per request/RU consumat.

```
todo-serverless-azure/
├── frontend/                  # HTML/CSS/JS static, fara build step
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── staticwebapp.config.json
├── api/                       # Azure Functions (Node.js, v4 programming model)
│   ├── src/
│   │   ├── cosmosClient.js
│   │   └── functions/todos.js
│   ├── host.json
│   ├── package.json
│   └── local.settings.json.example
└── .github/workflows/         # generat automat la Pasul 6
```

---

## Pasul 0 — Instrumente necesare (o singură dată)

1. **Cont Azure Free Tier** — îl ai deja.
2. **Node.js 18+** — verifică cu `node -v`.
3. **Azure CLI**:
   ```bash
   winget install Microsoft.AzureCLI
   az login
   ```
4. **Azure Functions Core Tools** (pentru testare locală):
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```
5. **Static Web Apps CLI** (opțional, pentru emulare locală frontend+api împreună):
   ```bash
   npm install -g @azure/static-web-apps-cli
   ```
6. Extensii VS Code utile: *Azure Functions*, *Azure Static Web Apps*, *Azure Databases*.
7. Cont **GitHub** — ai nevoie de un repo (public sau privat, ambele merg cu SWA free tier).

---

## Pasul 1 — Pune proiectul pe GitHub

Structura de fișiere din acest folder e deja pregătită (frontend + api + configs).
Din folderul `todo-serverless-azure`:

```bash
git init                     # daca nu e deja initializat
git add .
git commit -m "Initial commit: skeleton frontend + api serverless"
```

Creează un repo nou pe GitHub (fără README, fără .gitignore — le ai deja local),
apoi:

```bash
git remote add origin https://github.com/<user-ul-tau>/todo-serverless-azure.git
git branch -M main
git push -u origin main
```

> Ține minte: `api/local.settings.json` e în `.gitignore` — niciodată nu urcă pe
> GitHub, pentru că acolo o să pui cheia Cosmos DB. Folosește
> `local.settings.json.example` ca șablon local.

---

## Pasul 2 — Creează Cosmos DB (tier Serverless)

### Din portal (recomandat prima dată, ca să vezi opțiunile)

1. **Create a resource → Azure Cosmos DB → Azure Cosmos DB for NoSQL**.
2. La *Capacity mode* alege **Serverless** (nu "Provisioned throughput" — asta e
   cheia pentru cost ≈ 0 când nu e folosit).
3. Completează:
   - **Subscription**: Free Tier
   - **Resource Group**: creează unul nou, ex. `rg-todo-serverless`
   - **Account Name**: unic global, ex. `todoapp-cosmos-<username>`
   - **Location**: alege o regiune apropiată (ex. West Europe)
4. Review + Create. Durează 3-5 minute.
5. După creare, intră în resursă → **Data Explorer** → **New Container**:
   - **Database id**: `TodoAppDB` (New database)
   - **Container id**: `Items`
   - **Partition key**: `/id` (pentru un proiect mic, `/id` ca partition key e ok —
     fiecare item e propria lui partiție logică; la scară mare ai alege ceva cu
     cardinalitate mai mare, dar aici simplifică mult codul CRUD)
6. Din meniul din stânga → **Keys** → copiază **URI** și **PRIMARY KEY**. O să le
   pui în `local.settings.json` local și în Application Settings pe SWA mai
   târziu.

### Alternativ, din CLI (mai rapid, dacă vrei să exersezi pentru AZ-104)

```bash
az group create --name rg-todo-serverless --location westeurope

az cosmosdb create \
  --name todoapp-cosmos-<username> \
  --resource-group rg-todo-serverless \
  --locations regionName=westeurope \
  --capabilities EnableServerless

az cosmosdb sql database create \
  --account-name todoapp-cosmos-<username> \
  --resource-group rg-todo-serverless \
  --name TodoAppDB

az cosmosdb sql container create \
  --account-name todoapp-cosmos-<username> \
  --resource-group rg-todo-serverless \
  --database-name TodoAppDB \
  --name Items \
  --partition-key-path "/id"

# scoate cheile pentru pasul urmator
az cosmosdb keys list \
  --name todoapp-cosmos-<username> \
  --resource-group rg-todo-serverless \
  --type keys
```

---

## Pasul 3 — Backend-ul (Azure Functions)

Codul e deja scris în `api/` (model de programare v4, cel mai simplu — toate rutele
sunt înregistrate direct în `src/functions/todos.js`, fără fișiere `function.json`
separate):

- `GET /api/todos` — listează toate item-urile
- `POST /api/todos` — creează un item (`{ "title": "..." }`)
- `PUT /api/todos/{id}` — actualizează (`{ "completed": true }` sau `title`)
- `DELETE /api/todos/{id}` — șterge

Instalează dependențele și pregătește configul local:

```bash
cd api
npm install
cp local.settings.json.example local.settings.json
```

Editează `local.settings.json` și pune `COSMOS_DB_ENDPOINT` / `COSMOS_DB_KEY`
copiate la Pasul 2. Lasă `AzureWebJobsStorage` gol pentru rulare locală (Functions
Core Tools folosește storage emulator automat) — dacă apar erori, instalează
[Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) și
pornește-l separat.

### Testare locală

```bash
func start
```

Testează cu `curl` sau Postman:

```bash
curl http://localhost:7071/api/todos
curl -X POST http://localhost:7071/api/todos -H "Content-Type: application/json" -d '{"title":"Invata Azure"}'
```

---

## Pasul 4 — Frontend-ul

E deja în `frontend/`, vanilla JS, fără build step (perfect pentru Static Web Apps
free tier — nu ai nevoie de React/Vite decât dacă vrei ulterior). `app.js` apelează
`/api/todos`, cale relativă — asta e important: **pe Static Web Apps, frontend-ul
și API-ul managed stau pe același domeniu**, deci nu ai probleme de CORS și nu
hardcodezi un URL de backend.

### Testare locală integrată (frontend + api împreună, ca în producție)

Din rădăcina proiectului:

```bash
swa start frontend --api-location api
```

Deschide `http://localhost:4280` — SWA CLI face proxy către API automat.

---

## Pasul 5 — Creează resursa Azure Static Web Apps

1. **Create a resource → Static Web App**.
2. Completează:
   - **Resource Group**: `rg-todo-serverless` (același ca la Cosmos)
   - **Name**: `todo-serverless-app`
   - **Plan type**: **Free**
   - **Region for API**: aceeași regiune ca la Cosmos, dacă e disponibilă
   - **Source**: **GitHub** — autorizează și alege repo-ul + branch-ul `main`
   - **Build Presets**: *Custom*
     - **App location**: `/frontend`
     - **Api location**: `/api`
     - **Output location**: *(gol — nu ai build step)*
3. **Review + Create**.

La creare, Azure face automat două lucruri:
- provizionează resursa SWA cu un URL public (`https://<nume-random>.azurestaticapps.net`)
- **inserează un fișier de workflow GitHub Actions** în repo-ul tău, la
  `.github/workflows/azure-static-web-apps-<nume>.yml`, și declanșează primul deploy

---

## Pasul 6 — CI/CD e deja automat

Workflow-ul generat de Azure face build + deploy la fiecare `git push` pe `main`
(și preview deployments pe fiecare Pull Request — foarte util dacă vrei să exersezi
și fluxul de PR review). Nu trebuie să scrii tu YAML — dar merită să te uiți peste
fișierul generat, ca să înțelegi ce face:

```bash
git pull   # aduce workflow-ul generat de Azure
```

Deschide `.github/workflows/azure-static-web-apps-*.yml` — o să vezi acțiunea
`Azure/static-web-apps-deploy@v1` cu `app_location`, `api_location`,
`output_location` setate exact cum le-ai completat în portal.

Din acest punct, orice `git push origin main` redeployează automat.

---

## Pasul 7 — Conectează Cosmos DB la Function App-ul din SWA

API-ul deployat pe SWA rulează ca un Function App "managed" în spate — configurarea
lui se face din **Application Settings**, nu din `local.settings.json` (acela e
doar local).

1. În portal → resursa **Static Web App** → meniul din stânga → **Environment variables** (sau *Configuration*, în funcție de versiunea de portal).
2. Adaugă:
   - `COSMOS_DB_ENDPOINT` = URI-ul de la Pasul 2
   - `COSMOS_DB_KEY` = primary key de la Pasul 2
   - `COSMOS_DB_DATABASE` = `TodoAppDB`
   - `COSMOS_DB_CONTAINER` = `Items`
3. Salvează — SWA repornește automat funcțiile cu noile setări (nu e nevoie de
   redeploy).

> Pentru un proiect real ai muta cheia în **Azure Key Vault** + Managed Identity,
> ca să nu stea deloc în variabile de mediu în clar. Pentru studiu/portofoliu,
> Application Settings e suficient și e exact fluxul standard.

---

## Pasul 8 — Testează end-to-end

Deschide URL-ul public al SWA (`https://<nume>.azurestaticapps.net`), adaugă câteva
task-uri, bifează-le, șterge-le. Verifică în **Cosmos DB → Data Explorer** că
documentele apar în container-ul `Items`.

Dacă ceva nu merge:
- **Portal → Static Web App → Functions** — vezi lista de funcții detectate și
  logs.
- **Application Insights** (dacă l-ai activat) — logs detaliate per request.
- Erori 500 de obicei = env vars greșite/lipsă pentru Cosmos.

---

## Costuri — de ce rămâi aproape de 0 lei

| Serviciu | Tier | Cost când nu e folosit | Cost la trafic mic |
|---|---|---|---|
| Static Web Apps | Free | 0 | 0 (100GB bandwidth/lună incluse) |
| Azure Functions | Consumption (parte din SWA) | 0 | primele 1M execuții/lună gratuite |
| Cosmos DB | Serverless | 0 (nu plătești RU/s provizionat) | plătești per RU consumat, tipic fracțiuni de cent pentru un proiect demo |

Singurul lucru la care să fii atent pe Free Tier: Cosmos DB Serverless **nu** intră
în free tier-ul permanent de 1000 RU/s (acela e doar pentru Provisioned throughput).
La volum de test/demo, costul e neglijabil (de obicei sub prag de facturare), dar
uită-te din când în când în **Cost Management + Billing** din portal.

---

## Pași următori (dacă vrei să extinzi proiectul)

- Autentificare utilizatori cu **Static Web Apps built-in auth** (GitHub/Microsoft
  Entra ID) — fiecare user își vede doar propriile task-uri (partition key devine
  `/userId` în loc de `/id`).
- Migrare frontend la un framework (React/Vue) — schimbi doar `output_location` în
  workflow.
- Adaugi teste automate pentru funcțiile HTTP cu Jest, rulate în pipeline înainte
  de deploy.
- Monitorizare cu Application Insights + alerting pe erori 5xx.
