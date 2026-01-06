#!/usr/bin/env node

const fs = require('fs');

const packageFiles = [
  '/workspaces/jak-zdac-inz/package.json',
  '/workspaces/jak-zdac-inz/demo/agents-demo-ui/package.json',
  '/workspaces/jak-zdac-inz/docs/package.json',
  '/workspaces/jak-zdac-inz/libs/agents-demos/package.json',
  '/workspaces/jak-zdac-inz/libs/blockchain-bridge/package.json',
  '/workspaces/jak-zdac-inz/libs/core/package.json',
  '/workspaces/jak-zdac-inz/libs/langchain/package.json',
  '/workspaces/jak-zdac-inz/platform/blockchain-api/package.json',
  '/workspaces/jak-zdac-inz/platform/ui/package.json'
];

const isMajor = process.argv.includes('--major');
const isMinor = process.argv.includes('--minor');
const isPatch = process.argv.includes('--patch');
const isSnapshot = !isMajor && !isMinor && !isPatch;

packageFiles.forEach(file => {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const version = pkg.version;
  
  if (isSnapshot) {
    const snapshotMatch = version.match(/^(.+)-SNAPSHOT\.(\d+)$/);
    if (snapshotMatch) {
      pkg.version = `${snapshotMatch[1]}-SNAPSHOT.${parseInt(snapshotMatch[2]) + 1}`;
    } else {
      pkg.version = `${version.replace(/-SNAPSHOT.*$/, '')}-SNAPSHOT.0`;
    }
  } else {
    const baseVersion = version.replace(/-SNAPSHOT.*$/, '');
    const [major, minor, patch] = baseVersion.split('.');
    
    if (isMajor) {
      pkg.version = `${parseInt(major) + 1}.0.0`;
    } else if (isMinor) {
      pkg.version = `${major}.${parseInt(minor) + 1}.0`;
    } else {
      pkg.version = `${major}.${minor}.${parseInt(patch) + 1}`;
    }
  }
  
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`${file}: ${pkg.version}`);
});
