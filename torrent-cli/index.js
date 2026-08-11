#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const https = require('https');

const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0];

const CONFIG_DIR = path.join(os.homedir(), '.torrent');
const COMPOSE_FILE = path.join(CONFIG_DIR, 'docker-compose.yml');
const GITHUB_COMPOSE_URL = 'https://raw.githubusercontent.com/developer4949-code/Torrent/main/docker-compose.yml';

// Create ~/.torrent if it doesn't exist
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function cloneOrPullRepo() {
  if (!fs.existsSync(CONFIG_DIR)) {
    console.log('⬇️  Cloning Torrent repository from GitHub...');
    execSync('git clone https://github.com/developer4949-code/Torrent.git .torrent', { cwd: os.homedir(), stdio: 'inherit' });
  } else {
    console.log('🔄 Pulling latest updates from GitHub...');
    try {
      execSync('git pull', { cwd: CONFIG_DIR, stdio: 'ignore' });
    } catch (e) {
      // ignore pull errors
    }
  }
}

async function startEngine() {
  console.log('🚀 Starting Torrent Distributed Engine...');
  
  try {
    cloneOrPullRepo();
  } catch (e) {
    console.error('❌ Failed to pull repository. Do you have git installed?');
    process.exit(1);
  }

  console.log('🐳 Spinning up Docker containers. This may take a few moments...');
  try {
    execSync('docker-compose up -d --build', { cwd: CONFIG_DIR, stdio: 'inherit' });
    console.log('\n✅ Torrent Engine successfully started!\n');
    console.log('📍 Access your dashboards here:');
    console.log('   - 🖥️  Admin Console:  http://localhost:8081');
    console.log('   - 🎨 Demo UI:        http://localhost:5174');
    console.log('   - ⚙️  API Endpoint:   http://localhost:8080/api/v1/jobs\n');
    console.log('💡 To stop the engine, run: torrent stop');
  } catch (err) {
    console.error('❌ Failed to start Docker containers. Make sure Docker Desktop is running.');
  }
}

function stopEngine() {
  console.log('🛑 Stopping Torrent Distributed Engine...');
  try {
    execSync('docker-compose down', { cwd: CONFIG_DIR, stdio: 'inherit' });
    console.log('✅ Engine stopped successfully.');
  } catch (err) {
    console.error('❌ Failed to stop containers. Make sure Docker Desktop is running.');
  }
}

function statusEngine() {
  try {
    execSync('docker-compose ps', { cwd: CONFIG_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Failed to get status. Make sure Docker Desktop is running.');
  }
}

// Main CLI logic
switch (COMMAND) {
  case 'start':
  case 'up':
    startEngine();
    break;
  case 'stop':
  case 'down':
    stopEngine();
    break;
  case 'status':
  case 'ps':
    statusEngine();
    break;
  default:
    console.log(`
🌪️  Torrent Distributed Job Engine

Usage:
  torrent start     - Start the entire engine (Backend, DB, Kafka, Console, UI)
  torrent stop      - Stop the engine
  torrent status    - Check the status of running containers
    `);
    break;
}
