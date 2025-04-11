const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const rootDir = path.resolve(__dirname, '..', '..');
const conductorDir = path.join(rootDir, 'src', 'conductor-mcp');
const dashboardDir = path.join(rootDir, 'src', 'dashboard');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}Starting Email Automation Platform...${colors.reset}`);

// Check if conductor-mcp exists
if (!fs.existsSync(conductorDir)) {
  console.error(`${colors.red}Conductor MCP directory not found at: ${conductorDir}${colors.reset}`);
  process.exit(1);
}

// Start Conductor MCP (Backend API)
console.log(`${colors.yellow}Starting Conductor MCP (Backend API)...${colors.reset}`);
const backendProcess = spawn('npm', ['start'], { 
  cwd: conductorDir,
  stdio: 'pipe',
  shell: true
});

backendProcess.stdout.on('data', (data) => {
  console.log(`${colors.green}[Backend] ${data.toString().trim()}${colors.reset}`);
});

backendProcess.stderr.on('data', (data) => {
  console.error(`${colors.red}[Backend Error] ${data.toString().trim()}${colors.reset}`);
});

// Give the backend a moment to start
setTimeout(() => {
  // Start Dashboard Server
  console.log(`${colors.yellow}Starting Dashboard Server...${colors.reset}`);
  const dashboardProcess = spawn('node', ['simple-server.js'], { 
    cwd: dashboardDir,
    stdio: 'pipe',
    shell: true
  });

  dashboardProcess.stdout.on('data', (data) => {
    console.log(`${colors.blue}[Dashboard] ${data.toString().trim()}${colors.reset}`);
  });

  dashboardProcess.stderr.on('data', (data) => {
    console.error(`${colors.magenta}[Dashboard Error] ${data.toString().trim()}${colors.reset}`);
  });

  // Handle dashboard process exit
  dashboardProcess.on('close', (code) => {
    console.log(`${colors.magenta}Dashboard process exited with code ${code}${colors.reset}`);
    backendProcess.kill();
    process.exit(code);
  });
}, 5000); // Wait 5 seconds before starting the dashboard

// Handle backend process exit
backendProcess.on('close', (code) => {
  console.log(`${colors.red}Backend process exited with code ${code}${colors.reset}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log(`${colors.cyan}Shutting down all processes...${colors.reset}`);
  backendProcess.kill();
  process.exit(0);
});

console.log(`${colors.cyan}Startup script running. Press Ctrl+C to stop all services.${colors.reset}`); 