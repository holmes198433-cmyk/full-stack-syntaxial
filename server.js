/*
  All rights reserved 2026 © Syntaxial - Pro Modernis
  Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited.
*/

// --- OmniGraph DSI Engine Backend Blueprint (Hardened & Env-driven) ---
// Runtime: Node.js

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const { syncSchema } = require('./app/services.schema.server'); // commonjs require for server entrypoint
const shopify = require('./app/shopify.server').default; // for webhooks maybe used later

const app = express();
const PORT = process.env.PORT || 3000;

// Helper to save raw body for webhook verification
function rawBodySaver(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

app.use(helmet());
app.use(cors({ origin: true }));
app.use(bodyParser.json({ verify: rawBodySaver }));

// Rate limiter (basic)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300 // limit each IP to 300 requests per windowMs
});
app.use(limiter);

// Health
app.get('/api/v1/dsi/pulse', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Expose sync endpoint for admin (expects authenticated request via shopify.authenticate.admin in full Remix run)
// For plain Express usage we'll protect via DSI_MASTER_KEY header 'Authorization: Bearer <KEY>'
app.post('/admin/sync-schema', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const master = process.env.DSI_MASTER_KEY || null;
    if (!master || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== master) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Build a Fetch API Request to satisfy shopify.authenticate.admin requirements.
    const remixRequest = new Request(`${process.env.SHOPIFY_APP_URL || 'http://localhost:3000'}${req.originalUrl}`, {
      method: req.method,
      headers: new Headers(req.headers),
    });

    const result = await syncSchema(remixRequest);
    return res.json({ status: 'ok', ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'sync failed' });
  }
});

// Webhook endpoint (Shopify product/metafield webhooks or admin notifications)
app.post('/webhook/rules_update', (req, res) => {
  const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = req.rawBody || '';

  const generatedHash = crypto.createHmac('sha256', SHOPIFY_WEBHOOK_SECRET).update(body).digest('base64');

  if (generatedHash !== hmac) {
    console.warn('Webhook received with invalid HMAC signature.');
    return res.status(401).send('Invalid signature.');
  }

  console.log(`Webhook validated for shop: ${req.headers['x-shopify-shop-domain']}`);
  // TODO: trigger cache invalidation, or re-sync, or push notifications to admin UI
  res.status(200).send('Webhook processed');
});

app.listen(PORT, () => {
  console.log(`Syntaxial DSI Engine listening on ${PORT}`);
});