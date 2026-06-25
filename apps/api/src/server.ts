import { buildApp, closeApp } from "./app.js";
import { env } from "./config/env.js";

async function start(): Promise<void> {
  const app = await buildApp();

  process.on("SIGTERM", async () => {
    await app.close();
    await closeApp();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await app.close();
    await closeApp();
    process.exit(0);
  });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
