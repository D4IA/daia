#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Hardcoded list of all package.json files in the workspace
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

/**
 * Bumps the minor version of a semver version string
 * Example: 1.2.3 -> 1.3.0
 */
function bumpMinorVersion(version) {
  const parts = version.split('.');
  if (parts.length < 2) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  
  return `${major}.${minor + 1}.0`;
}

/**
 * Process a single package.json file
 */
function processPackageFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);
    
    if (!pkg.version) {
      console.log(`⚠️  No version field in: ${filePath}`);
      return false;
    }

    const oldVersion = pkg.version;
    const newVersion = bumpMinorVersion(oldVersion);
    pkg.version = newVersion;

    // Write back with proper formatting (2 spaces indent)
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    
    console.log(`✅ ${filePath}`);
    console.log(`   ${oldVersion} -> ${newVersion}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting minor version bump...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  packageFiles.forEach(filePath => {
    if (processPackageFile(filePath)) {
      successCount++;
    } else {
      failCount++;
    }
    console.log(''); // Empty line for readability
  });
  
  console.log('─────────────────────────────────────');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total files: ${packageFiles.length}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run the script
main();
