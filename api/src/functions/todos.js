const { app } = require("@azure/functions");
const { randomUUID } = require("crypto");
const { getContainer } = require("../cosmosClient");

// GET /api/todos  -> lista toate item-urile
app.http("getTodos", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "todos",
  handler: async (request, context) => {
    try {
      const container = getContainer();
      const { resources } = await container.items
        .query("SELECT * FROM c ORDER BY c.createdAt DESC")
        .fetchAll();
      return { jsonBody: resources };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// POST /api/todos  -> creeaza un item nou
app.http("createTodo", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "todos",
  handler: async (request, context) => {
    try {
      const body = await request.json();
      if (!body || !body.title || !body.title.trim()) {
        return { status: 400, jsonBody: { error: "Campul 'title' este obligatoriu." } };
      }

      const newItem = {
        id: randomUUID(),
        title: body.title.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };

      const container = getContainer();
      const { resource } = await container.items.create(newItem);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// PUT /api/todos/{id}  -> actualizeaza (ex: marcheaza completed)
app.http("updateTodo", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "todos/{id}",
  handler: async (request, context) => {
    try {
      const id = request.params.id;
      const body = await request.json();
      const container = getContainer();

      // Cosmos DB are nevoie de partition key la citire directa (aici id == partition key)
      const { resource: existing } = await container.item(id, id).read();
      if (!existing) {
        return { status: 404, jsonBody: { error: "Item negasit." } };
      }

      const updated = {
        ...existing,
        title: body.title !== undefined ? body.title : existing.title,
        completed: body.completed !== undefined ? body.completed : existing.completed,
      };

      const { resource } = await container.item(id, id).replace(updated);
      return { jsonBody: resource };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// DELETE /api/todos/{id}
app.http("deleteTodo", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "todos/{id}",
  handler: async (request, context) => {
    try {
      const id = request.params.id;
      const container = getContainer();
      await container.item(id, id).delete();
      return { status: 204 };
    } catch (err) {
      if (err.code === 404) {
        return { status: 404, jsonBody: { error: "Item negasit." } };
      }
      context.error(err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
