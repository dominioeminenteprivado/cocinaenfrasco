import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensurePublicAssets } from './bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running build step...');
ensurePublicAssets(__dirname);
console.log('Build completed successfully.');
