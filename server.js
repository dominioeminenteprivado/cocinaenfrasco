import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ensurePublicAssets } from './bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure assets and index.html exist before handling any requests
ensurePublicAssets(__dirname);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());

// Shopify telemetry / tracking endpoints - mock gracefully to keep console clean
app.all(['/.well-known/shopify/monorail/*', '/.well-known/ucp', '/sf_private_access_tokens', '/api/mcp'], (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Cart JSON endpoint
app.get('/cart.js', (req, res) => {
  const cartFile = path.join(PUBLIC_DIR, 'cart.js');
  if (fs.existsSync(cartFile)) {
    res.setHeader('Content-Type', 'application/json');
    return res.sendFile(cartFile);
  }
  res.json({
    token: '392e8cc8ac638bba111d964f906adef4',
    note: null,
    attributes: {},
    original_total_price: 0,
    total_price: 0,
    total_discount: 0,
    total_weight: 0.0,
    item_count: 0,
    items: [],
    requires_shipping: false,
    currency: 'ARS',
    items_subtotal_price: 0,
    cart_level_discount_applications: [],
    discount_codes: []
  });
});

// Root endpoint serves index.html
app.get('/', (req, res) => {
  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexHtml);
  }
  ensurePublicAssets(__dirname);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(indexHtml);
});

// Route for specific product page
app.get(['/products/conservas-con-metodo', '/products/conservas-con-metodo/'], (req, res) => {
  const productHtml = path.join(PUBLIC_DIR, 'products', 'conservas-con-metodo');
  if (fs.existsSync(productHtml)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(productHtml);
  }
  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(indexHtml);
});

// Smart static asset resolver for versioned and special-character assets
app.use((req, res, next) => {
  const cleanPath = req.path.replace(/^\/+/, '');
  if (!cleanPath) return next();

  // 1. Direct path check
  const directPath = path.join(PUBLIC_DIR, cleanPath);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return next();
  }

  // 2. Handle paths with '@' normalized to '_' (e.g. web-pixels@... -> web-pixels_...)
  if (cleanPath.includes('@')) {
    const underscorePath = path.join(PUBLIC_DIR, cleanPath.replace(/@/g, '_'));
    if (fs.existsSync(underscorePath) && fs.statSync(underscorePath).isFile()) {
      return res.sendFile(underscorePath);
    }
  }

  // 3. Handle versioned assets (e.g. {base}__v_{version}.{ext})
  const dir = path.dirname(directPath);
  const ext = path.extname(cleanPath);
  const base = path.basename(cleanPath, ext);

  if (base && fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir);
      const match = files.find(f => {
        const full = path.join(dir, f);
        return fs.statSync(full).isFile() && (f.startsWith(`${base}__`) || f === `${base}${ext}`);
      });
      if (match) {
        return res.sendFile(path.join(dir, match));
      }
    } catch {
      // Ignore read errors and proceed
    }
  }

  next();
});

// Serve static assets from public directory
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html', 'htm'],
  index: ['index.html']
}));

// Fallback for unmatched GET requests:
// NEVER return HTML for script, style, json, or media requests
app.get('*', (req, res) => {
  const ext = path.extname(req.path).toLowerCase();
  if (ext === '.js' || ext === '.mjs') {
    return res.type('application/javascript').send('/* [AI Studio] Stubbed missing script */');
  }
  if (ext === '.css') {
    return res.type('text/css').send('/* [AI Studio] Stubbed missing style */');
  }
  if (['.json', '.map'].includes(ext)) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (['.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'].includes(ext)) {
    return res.status(404).end();
  }

  // Return index.html only for page navigations
  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexHtml);
  }
  res.status(404).send('Page not found');
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
