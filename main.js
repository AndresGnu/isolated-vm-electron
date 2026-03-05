const { app, BrowserWindow, ipcMain } = require('electron');
const ivm = require('isolated-vm');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('run-ivm', async () => {
    // Prueba simple de isolated-vm
    const isolate = new ivm.Isolate({ memoryLimit: 8 });
    const context = await isolate.createContext();
    const jail = context.global;
    await jail.set('global', jail.derefInto());
    const script = await isolate.compileScript('1 + 2');
    const result = await script.run(context);
    console.log(result);
    return result;
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
