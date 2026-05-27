const { app, BrowserWindow, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let backendProcess = null;

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Система заявок',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Система заявок');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть',
      click: () => {
        if (mainWindow) mainWindow.show();
      },
    },
    {
      label: 'Веб-интерфейс',
      click: () => {
        require('electron').shell.openExternal(FRONTEND_URL);
      },
    },
    { type: 'separator' },
    {
      label: 'О программе',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(
            `Notification('Система заявок v1.0.0')`
          );
        }
      },
    },
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true;
        if (backendProcess) backendProcess.kill();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

function startBackend() {
  const backendDir = path.join(__dirname, '..', '..', 'backend');
  const python = process.platform === 'win32' ? 'python' : 'python3';

  backendProcess = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[backend] ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

function startFrontendWatch() {
  const frontendDir = path.join(__dirname, '..', '..', 'frontend');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  const frontendProcess = spawn(npm, ['run', 'dev', '--', '--host'], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  frontendProcess.stdout.on('data', (data) => {
    console.log(`[frontend] ${data}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`[frontend] ${data}`);
  });

  return frontendProcess;
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  if (!process.env.NO_BACKEND) {
    startBackend();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) backendProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
