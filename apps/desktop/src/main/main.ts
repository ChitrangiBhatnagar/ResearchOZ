import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { createLogger } from '@research-os/shared';
import { importRoadmapFromExcel, getDatabase } from '@research-os/db';
import { readEvents } from '@research-os/application';

const logger = createLogger('ElectronMain');

let mainWindow: BrowserWindow | null = null;
let lastDomainEventId = 0;
let domainEventTimer: ReturnType<typeof setInterval> | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#09090b',
    titleBarStyle: 'hiddenInset',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../renderer/out/index.html')}`;

  logger.info('Loading desktop application window', { url });
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    logger.info('ResearchOS window displayed successfully');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle('app:ping', async () => {
    return 'pong';
  });

  ipcMain.handle('dialog:select-excel', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Study Roadmap (Excel / CSV)',
      filters: [
        { name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('roadmap:import-excel', async (_event, filePath: string) => {
    try {
      logger.info('IPC trigger: importRoadmapFromExcel', { filePath });
      const result = importRoadmapFromExcel(filePath);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Failed to import roadmap from Excel', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('system:get-metrics', async () => {
    const memory = process.memoryUsage();
    return {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
    };
  });
}

async function startDomainEventBridge() {
  const existingEvents = await readEvents(0);
  lastDomainEventId = existingEvents.at(-1)?.id ?? 0;
  domainEventTimer = setInterval(async () => {
    const events = await readEvents(lastDomainEventId);
    for (const event of events) {
      lastDomainEventId = event.id;
      mainWindow?.webContents.send('domain-event', event);
    }
  }, 1000);
}

app.whenReady().then(() => {
  // Ensure DB initialized on launch
  getDatabase();
  registerIpcHandlers();
  void startDomainEventBridge();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (domainEventTimer) clearInterval(domainEventTimer);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
