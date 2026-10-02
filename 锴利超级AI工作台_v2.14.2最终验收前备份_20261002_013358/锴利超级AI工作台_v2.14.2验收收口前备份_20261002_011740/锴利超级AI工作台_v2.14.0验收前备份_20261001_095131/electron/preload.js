/**
 * electron/preload.js - 预加载脚本
 * 在渲染进程中暴露安全的API
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // 文件操作
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  // 菜单动作监听（返回取消订阅函数，防止内存泄漏）
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on('menu-action', handler);
    // 返回取消订阅函数
    return () => ipcRenderer.removeListener('menu-action', handler);
  },

  // 平台检测
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});
