#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const keepNodeModules = process.argv.includes('--keep-node-modules');

const removeTarget = (relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  fs.rmSync(absolutePath, { recursive: true, force: true });
  console.log(`removed ${relativePath}`);
};

const cleanSharedAdapterArtifacts = () => {
  const sharedDir = path.join(repoRoot, 'api', '_shared');
  if (!fs.existsSync(sharedDir)) {
    return;
  }

  for (const entry of fs.readdirSync(sharedDir)) {
    if (!/\.(?:js|js\.map|d\.ts|d\.ts\.map)$/.test(entry)) {
      continue;
    }

    removeTarget(path.join('api', '_shared', entry));
  }
};

removeTarget('dist');
removeTarget('dev-dist');

if (!keepNodeModules) {
  removeTarget('node_modules');
}

cleanSharedAdapterArtifacts();
