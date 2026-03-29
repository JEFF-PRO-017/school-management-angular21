// main.js — point d'entrée Electron
// Lance une fenêtre Chromium qui charge l'app Angular buildée
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let win;

function createWindow() {
  // Récupère la taille de l'écran principal pour adapter la fenêtre
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width,
    height,
    // Autorise la rotation plein écran sur tablette/Android (via Electron)
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Charge l'app Angular buildée dans dist/
  win.loadFile(path.join(__dirname, 'dist/school-management/browser/index.html'));

  // Ouvre DevTools uniquement en développement
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});
