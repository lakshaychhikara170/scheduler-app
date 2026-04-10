const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const backendPath = path.join(__dirname, 'scheduler-backend/src/app.js');
  const dbPath = path.join(app.getPath('userData'), 'scheduler-database.sqlite');
  
  backendProcess = spawn('node', [backendPath], {
    env: { 
      ...process.env, 
      PORT: 3000, 
      NODE_ENV: isDev ? 'development' : 'production',
      DB_PATH: dbPath
    },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width * 0.9),
    height: Math.min(900, height * 0.9),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Frameless options for glassmorphism vibes
    frame: true, 
    transparent: false,
    titleBarStyle: 'hiddenInset', // Better macOS feel, ignored on Windows
    backgroundColor: '#030303',
    icon: path.join(__dirname, 'scheduler-frontend/public/bot-icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'scheduler-frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
