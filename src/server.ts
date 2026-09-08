import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp();

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info({ host: config.host, port: config.port, model: config.aiModel }, "agent-chat.server_started");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
