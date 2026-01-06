#!/usr/bin/env node
import { config as dotenvConfig } from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenvConfig({ path: join(__dirname, '..', '.env') });

const config = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
};

const publicDir = join(__dirname, '..', 'public', 'api');
const configPath = join(publicDir, 'config');

// Create directory if it doesn't exist
mkdirSync(publicDir, { recursive: true });

// Write config file
writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log(`✓ Generated config file at ${configPath}`);
console.log(`  OPENAI_API_KEY: ${config.OPENAI_API_KEY ? '***' + config.OPENAI_API_KEY.slice(-4) : '(empty)'}`);
