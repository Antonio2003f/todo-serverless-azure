const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE || "TodoAppDB";
const containerId = process.env.COSMOS_DB_CONTAINER || "Items";

let client;
let container;

/**
 * Returneaza (si cacheaza) referinta catre container-ul Cosmos DB.
 * Clientul e initializat o singura data per instanta "warm" a Function App-ului,
 * ceea ce reduce latenta la request-urile ulterioare.
 */
function getContainer() {
  if (!container) {
    if (!endpoint || !key) {
      throw new Error(
        "Lipsesc COSMOS_DB_ENDPOINT sau COSMOS_DB_KEY din Application Settings."
      );
    }
    client = new CosmosClient({ endpoint, key });
    container = client.database(databaseId).container(containerId);
  }
  return container;
}

module.exports = { getContainer };
