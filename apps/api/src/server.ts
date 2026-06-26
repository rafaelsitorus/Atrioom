// Server bootstrap — memanggil buildApp lalu listen.
import { buildApp } from "./app";
import { env } from "./config/env";

async function main() {
  const app = await buildApp();

  try {
    const address = await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`🚀 Atrioom API listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();