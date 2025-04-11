const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Paths
const rootDir = path.resolve(__dirname, '..');
const conductorDir = path.join(rootDir, 'src', 'conductor-mcp');
const dashboardDir = path.join(rootDir, 'src', 'dashboard');
const envFile = path.join(conductorDir, '.env');

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

console.log(`${colors.cyan}=== Email Automation Platform Launcher ===${colors.reset}`);

// Check if the API key is set
async function checkAndSetApiKey() {
  if (!fs.existsSync(envFile)) {
    console.error(`${colors.red}Error: .env file not found at ${envFile}${colors.reset}`);
    return false;
  }

  let envContent = fs.readFileSync(envFile, 'utf8');
  const openaiKeyMatch = envContent.match(/OPENAI_API_KEY=([^\n]+)/);
  
  if (openaiKeyMatch && openaiKeyMatch[1] && !openaiKeyMatch[1].includes('your-openai-api-key')) {
    console.log(`${colors.green}OpenAI API key already configured.${colors.reset}`);
    return true;
  }
  
  console.log(`${colors.yellow}OpenAI API key not set or has default value.${colors.reset}`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Do you want to:
1. Enter an OpenAI API key
2. Run in standalone mode with mock data
3. Quit

Enter choice (1-3): ${colors.reset}`, (answer) => {
      if (answer === '1') {
        rl.question(`${colors.yellow}Enter your OpenAI API key: ${colors.reset}`, (apiKey) => {
          apiKey = apiKey.trim();
          if (apiKey && apiKey.startsWith('sk-')) {
            envContent = envContent.replace(/OPENAI_API_KEY=([^\n]+)/, `OPENAI_API_KEY=${apiKey}`);
            fs.writeFileSync(envFile, envContent);
            console.log(`${colors.green}API key has been saved to ${envFile}${colors.reset}`);
            rl.close();
            resolve(true);
          } else {
            console.log(`${colors.red}Invalid API key format. Keys should start with "sk-"${colors.reset}`);
            rl.close();
            resolve(false);
          }
        });
      } else if (answer === '2') {
        console.log(`${colors.blue}Running in standalone mode with mock data.${colors.reset}`);
        rl.close();
        resolve('standalone');
      } else {
        console.log(`${colors.red}Exiting.${colors.reset}`);
        rl.close();
        resolve(false);
      }
    });
  });
}

// Start API server
function startApiServer() {
  console.log(`${colors.yellow}Starting Conductor MCP (Backend API)...${colors.reset}`);
  const backendProcess = spawn('npm', ['start'], { 
    cwd: conductorDir,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`${colors.green}[Backend] ${data.toString().trim()}${colors.reset}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`${colors.red}[Backend Error] ${data.toString().trim()}${colors.reset}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`${colors.red}Backend process exited with code ${code}${colors.reset}`);
    process.exit(code);
  });

  return backendProcess;
}

// Start Dashboard server
function startDashboard(standalone = false) {
  console.log(`${colors.yellow}Starting Dashboard Server...${colors.reset}`);
  
  const env = { 
    ...process.env,
    PORT: '5000',
    FORCE_STANDALONE: standalone ? 'true' : 'false'
  };
  
  const dashboardProcess = spawn('node', ['simple-server.js'], { 
    cwd: dashboardDir,
    stdio: 'pipe',
    shell: true,
    env
  });

  dashboardProcess.stdout.on('data', (data) => {
    console.log(`${colors.blue}[Dashboard] ${data.toString().trim()}${colors.reset}`);
  });

  dashboardProcess.stderr.on('data', (data) => {
    console.error(`${colors.magenta}[Dashboard Error] ${data.toString().trim()}${colors.reset}`);
  });

  dashboardProcess.on('close', (code) => {
    console.log(`${colors.magenta}Dashboard process exited with code ${code}${colors.reset}`);
    process.exit(code);
  });

  return dashboardProcess;
}

// Main function
async function main() {
  const apiKeyResult = await checkAndSetApiKey();
  
  if (apiKeyResult === false) {
    console.log(`${colors.red}Exiting due to API key configuration issues.${colors.reset}`);
    process.exit(1);
  }
  
  let backendProcess = null;
  
  if (apiKeyResult === true) {
    // Start both servers
    backendProcess = startApiServer();
    
    // Wait a bit before starting the dashboard
    setTimeout(() => {
      startDashboard(false);
    }, 5000);
  } else {
    // Start only dashboard in standalone mode but set standalone flag to false to use real API
    startDashboard(false);
  }
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`${colors.cyan}Shutting down all processes...${colors.reset}`);
    if (backendProcess) backendProcess.kill();
    process.exit(0);
  });
}

// Run the main function
main(); 