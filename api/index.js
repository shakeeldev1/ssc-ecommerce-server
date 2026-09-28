// Vercel serverless entry point. Reuses the compiled Nest app (dist/bootstrap.js,
// produced by `npm run build`) instead of binding a port like main.ts does —
// Vercel invokes this handler per-request instead of running a long-lived process.
const { createApp } = require('../dist/bootstrap');

let cachedHandler;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  handler(req, res);
};
