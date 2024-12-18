import { chmod } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const indexJsPath = join(__dirname, '..', 'build', 'index.js');

try {
  await chmod(indexJsPath, 0o755);
  console.log('Successfully set permissions for build/index.js');
} catch (error) {
  console.error('Error setting permissions:', error);
  process.exit(1);
}