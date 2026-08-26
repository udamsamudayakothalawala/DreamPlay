const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 380,
        height: 720,
        minWidth: 380,
        minHeight: 720,
        resizable: true,
        frame: false,
        transparent: false,
        backgroundColor: '#0f0c29',
        alwaysOnTop: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');

    win.on('closed', () => {
        win = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('minimize-window', () => {
    if (win) win.minimize();
});

ipcMain.on('maximize-window', () => {
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (win) win.close();
});
