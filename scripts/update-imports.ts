#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { spinner, log, intro, outro } from '@clack/prompts';

/**
 * Recursively find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);

  return files;
}

/**
 * Update import paths in a file
 */
function updateImportsInFile(filePath: string, replacements: Array<{ from: string; to: string }>) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const { from, to } of replacements) {
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

      if (content.includes(from)) {
        content = content.replace(regex, to);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      log.success(`Updated imports in: ${filePath}`);
    }
  } catch (error) {
    log.error(`Error updating file ${filePath}: ${error}`);
  }
}

/**
 * Main function to update imports
 */
async function updateImports() {
  intro('🔄 Import Path Updater');

  const appDir = path.join(process.cwd(), 'app');

  if (!fs.existsSync(appDir)) {
    log.error('❌ App directory not found');
    process.exit(1);
  }

  const setupSpinner = spinner();
  setupSpinner.start('🔍 Finding TypeScript files in app directory');

  const typeScriptFiles = findTypeScriptFiles(appDir);

  if (typeScriptFiles.length === 0) {
    setupSpinner.stop('⚠️ No TypeScript files found');
    outro('No files to update');

    return;
  }

  setupSpinner.stop(`✅ Found ${typeScriptFiles.length} TypeScript files`);

  // Define the import path replacements
  const replacements = [
    {
      from: '~/components/settings/settings.types',
      to: '~/components/@settings/core/types',
    },
    {
      from: '~/components/settings/',
      to: '~/components/@settings/tabs/',
    },
  ];

  const updateSpinner = spinner();
  updateSpinner.start('🔄 Updating import paths');

  let updatedCount = 0;

  for (const file of typeScriptFiles) {
    const originalContent = fs.readFileSync(file, 'utf8');
    updateImportsInFile(file, replacements);

    const newContent = fs.readFileSync(file, 'utf8');

    if (originalContent !== newContent) {
      updatedCount++;
    }
  }

  updateSpinner.stop(`✅ Updated imports in ${updatedCount} files`);

  outro(`🎉 Import update complete! Updated ${updatedCount} files.`);
}

// Run the script
if (require.main === module) {
  updateImports().catch((error) => {
    log.error(`❌ Update failed: ${error}`);
    process.exit(1);
  });
}

export { updateImports, findTypeScriptFiles, updateImportsInFile };
