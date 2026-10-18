import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TARGET_CHECKOUT_URL = 'https://checkout.pagou.ai/checkout/chk_01M56BEC4JXYVVSQWQ49CH750N';
const OLD_CHECKOUT_URL = 'https://cocina-en-frasco.impultienda.ar/checkout';

function patchCheckoutLinks(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(OLD_CHECKOUT_URL)) {
      content = content.replaceAll(OLD_CHECKOUT_URL, TARGET_CHECKOUT_URL);
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
}

export function ensurePublicAssets(rootDir = process.cwd()) {
  const publicDir = path.join(rootDir, 'public');
  const indexHtml = path.join(publicDir, 'index.html');

  if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).size > 1000) {
    patchCheckoutLinks(indexHtml);
    patchCheckoutLinks(path.join(publicDir, 'products', 'conservas-con-metodo'));
    return;
  }

  console.log('[Bootstrap] Initializing public assets...');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const possibleZipPaths = [
    path.join(rootDir, 'cocinaenfrasco.digital-espelho.zip'),
    path.resolve('cocinaenfrasco.digital-espelho.zip'),
    '/app/applet/cocinaenfrasco.digital-espelho.zip',
    '/cocinaenfrasco.digital-espelho.zip'
  ];

  const zipPath = possibleZipPaths.find(p => fs.existsSync(p));

  if (zipPath) {
    try {
      execSync(`rm -rf /tmp/app_bootstrap && mkdir -p /tmp/app_bootstrap && unzip -o -q "${zipPath}" -d /tmp/app_bootstrap`, { stdio: 'inherit' });
      const extracted = '/tmp/app_bootstrap/cocinaenfrasco.digital';
      if (fs.existsSync(extracted)) {
        execSync(`cp -rf "${extracted}"/* "${publicDir}"/`, { stdio: 'inherit' });
      }
    } catch (e) {
      console.error('[Bootstrap] Failed to extract zip:', e);
    }
  }

  // Ensure index.html exists from product page if not present
  const productHtml = path.join(publicDir, 'products', 'conservas-con-metodo');
  if (fs.existsSync(productHtml) && (!fs.existsSync(indexHtml) || fs.statSync(indexHtml).size < 1000)) {
    fs.copyFileSync(productHtml, indexHtml);
  }

  // Patch checkout links in both files
  patchCheckoutLinks(indexHtml);
  patchCheckoutLinks(productHtml);

  // Create unversioned aliases
  const assetDir = path.join(publicDir, 'cdn', 'shop', 't', '2', 'assets');
  if (fs.existsSync(assetDir)) {
    const files = fs.readdirSync(assetDir);
    for (const f of files) {
      if (f.includes('__v_')) {
        const clean = f.replace(/__v_[0-9]+/, '');
        const target = path.join(assetDir, clean);
        if (!fs.existsSync(target)) {
          fs.copyFileSync(path.join(assetDir, f), target);
        }
      }
    }
  }

  const checkoutsDir = path.join(publicDir, 'checkouts', 'internal');
  if (fs.existsSync(checkoutsDir)) {
    const p1 = path.join(checkoutsDir, 'preloads__locale_es_AR.js');
    const p2 = path.join(checkoutsDir, 'preloads.js');
    if (fs.existsSync(p1) && !fs.existsSync(p2)) {
      fs.copyFileSync(p1, p2);
    }
  }

  console.log('[Bootstrap] Public assets initialized successfully.');
}
