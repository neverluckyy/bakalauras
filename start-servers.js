const { spawn } = require('child_process');
const { verifyStartup } = require('./startup-verification');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting backend server...', 'blue');
    
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: './backend',
      stdio: 'pipe',
      shell: true
    });

    let backendReady = false;

    backend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend] ${output.trim()}`);
      
      // Check if backend is ready
      if (output.includes('Server running on port 5000') && !backendReady) {
        backendReady = true;
        log('✅ Backend server started successfully', 'green');
        resolve(backend);
      }
    });

    backend.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('DeprecationWarning')) {
        console.log(`[Backend Error] ${output.trim()}`);
      }
    });

    backend.on('error', (error) => {
      log(`❌ Failed to start backend: ${error.message}`, 'red');
      reject(error);
    });

    backend.on('close', (code) => {
      if (code !== 0) {
        log(`❌ Backend process exited with code ${code}`, 'red');
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backendReady) {
        backend.kill();
        reject(new Error('Backend server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

// Start frontend server
function startFrontend() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting frontend server...', 'blue');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: './frontend',
      stdio: 'pipe',
      shell: true
    });

    let frontendReady = false;

    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Frontend] ${output.trim()}`);
      
      // Check if frontend is ready
      if (output.includes('Local:') && output.includes('http://localhost:3000') && !frontendReady) {
        frontendReady = true;
        log('✅ Frontend server started successfully', 'green');
        resolve(frontend);
      }
    });

    frontend.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('DeprecationWarning')) {
        console.log(`[Frontend Error] ${output.trim()}`);
      }
    });

    frontend.on('error', (error) => {
      log(`❌ Failed to start frontend: ${error.message}`, 'red');
      reject(error);
    });

    frontend.on('close', (code) => {
      if (code !== 0) {
        log(`❌ Frontend process exited with code ${code}`, 'red');
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!frontendReady) {
        frontend.kill();
        reject(new Error('Frontend server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

// Main startup function
async function startServers() {
  log('🎯 Starting Social Engineering Learning Application...', 'magenta');
  log('', 'reset');
  
  let backendProcess, frontendProcess;
  
  try {
    // Start backend first
    backendProcess = await startBackend();
    
    // Wait a moment for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start frontend
    frontendProcess = await startFrontend();
    
    // Wait for frontend to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    log('', 'reset');
    log('🔍 Verifying authentication system...', 'yellow');
    
    // Verify authentication
    await verifyStartup();
    
    log('', 'reset');
    log('🎉 Application startup complete!', 'green');
    log('', 'reset');
    log('📋 Application Status:', 'bright');
    log('   ✅ Backend server: Running on port 5000', 'green');
    log('   ✅ Frontend server: Running on port 3000', 'green');
    log('   ✅ Authentication system: Verified and working', 'green');
    log('   ✅ Database: Initialized and ready', 'green');
    log('', 'reset');
    log('🌐 Access your application:', 'bright');
    log('   Frontend: http://localhost:3000', 'cyan');
    log('   Backend API: http://localhost:5000', 'cyan');
    log('', 'reset');
    log('✨ Authentication will work automatically for all users!', 'green');
    log('', 'reset');
    log('Press Ctrl+C to stop the servers', 'yellow');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down servers...', 'yellow');
      if (backendProcess) backendProcess.kill();
      if (frontendProcess) frontendProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    log(`❌ Startup failed: ${error.message}`, 'red');
    
    // Clean up processes
    if (backendProcess) backendProcess.kill();
    if (frontendProcess) frontendProcess.kill();
    
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  startServers();
}

module.exports = { startServers };
