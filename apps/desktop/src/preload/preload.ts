import { contextBridge, ipcRenderer } from 'electron';

const api = {
  platform: process.platform,
  ping: () => ipcRenderer.invoke('app:ping'),
  selectExcelFile: () => ipcRenderer.invoke('dialog:select-excel'),
  importRoadmap: (filePath: string) => ipcRenderer.invoke('roadmap:import-excel', filePath),
  getSystemMetrics: () => ipcRenderer.invoke('system:get-metrics'),
  onDomainEvent: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on('domain-event', listener);
    return () => ipcRenderer.removeListener('domain-event', listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
