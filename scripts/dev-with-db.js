#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const execAsync = promisify(exec);

// Detect which Docker Compose command is available
async function detectDockerCompose() {
  try {
    await execAsync('command -v docker-compose');
    return 'docker-compose';
  } catch {
    try {
      await execAsync('docker compose version');
      return 'docker compose';
    } catch {
      throw new Error('❌ Neither "docker-compose" nor "docker compose" is available!');
    }
  }
}

let dockerComposeCmd = null;

async function getDockerComposeCommand() {
  if (!dockerComposeCmd) {
    dockerComposeCmd = await detectDockerCompose();
    console.log(`📦 Using Docker Compose command: ${dockerComposeCmd}`);
  }
  return dockerComposeCmd;
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function waitForDatabase() {
  console.log('⏳ Waiting for database to be ready...');
  const dockerCompose = await getDockerComposeCommand();

  while (true) {
    try {
      await execAsync(`${dockerCompose} -f docker-compose.db.yml exec -T postgres pg_isready -U liblab -d liblab`);
      console.log('✅ Database is ready!');
      break;
    } catch (error) {
      console.log('   Database not ready yet, waiting...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function updateEnvFile() {
  const envPath = '.env';
  const databaseUrl = 'DATABASE_URL=postgresql://liblab:liblab_password@localhost:5432/liblab';

  let envContent = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }

  // Check if DATABASE_URL already exists in the file
  const lines = envContent.split('\n');
  const databaseUrlIndex = lines.findIndex((line) => line.startsWith('DATABASE_URL='));

  if (databaseUrlIndex !== -1) {
    // Update existing DATABASE_URL
    lines[databaseUrlIndex] = databaseUrl;
  } else {
    // Add new DATABASE_URL
    lines.push(databaseUrl);
  }

  // Write back to .env file
  writeFileSync(envPath, lines.join('\n'));
  console.log('📝 Updated .env file with DATABASE_URL');
}

async function main() {
  try {
    console.log('🚀 Starting PostgreSQL database in Docker...');
    const dockerCompose = await getDockerComposeCommand();

    // Split the command in case it contains spaces (e.g., "docker compose")
    const cmdParts = dockerCompose.split(' ');
    const command = cmdParts[0];
    const args = [...cmdParts.slice(1), '-f', 'docker-compose.db.yml', 'up', '-d'];

    await runCommand(command, args);

    await waitForDatabase();

    // Update .env file with DATABASE_URL
    await updateEnvFile();

    console.log('🔧 Starting Next.js development server...');
    console.log('   Database URL: postgresql://liblab:liblab_password@localhost:5432/liblab');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
