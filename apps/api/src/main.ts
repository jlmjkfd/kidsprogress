import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function main() {
  const config = loadConfig();
  const app = await buildApp({ config });

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info({ port: config.PORT }, 'api listening');
  } catch (err) {
    app.log.fatal({ err }, 'failed to start api');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
