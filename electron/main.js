/**
 * electron/main.js - 锴利超级AI工作台 Electron 主进程
 * 支持 Windows 和 macOS 双平台
 */
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

let mainWindow = null;

// 安全：允许写入的文件路径白名单
// 只有用户通过 dialog 选择的路径才允许写入，防止渲染进程任意写文件
const allowedWritePaths = new Set();

// 应用配置目录
function getUserDataPath() {
  return app.getPath('userData');
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '锴利超级AI工作台',
    backgroundColor: '#0f0f23',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: process.platform === 'darwin'
      ? path.join(__dirname, 'build/icon.icns')
      : path.join(__dirname, 'build/icon.ico')
  });

  // 加载本地HTML
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // 页面加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 导航拦截：仅允许 file:// 协议，外部URL交系统浏览器打开
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
    }
  });

  // 开发工具（生产环境自动禁用）
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 创建菜单
function createMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于锴利超级AI工作台' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建工作流',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'new-workflow')
        },
        {
          label: '打开...',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'open-workflow')
        },
        {
          label: '保存',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'save-workflow')
        },
        { type: 'separator' },
        {
          label: '导出 JSON',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'export-json')
        },
        {
          label: '导出 PNG',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'export-png')
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭' } : { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '运行',
      submenu: [
        {
          label: '运行工作流',
          accelerator: isMac ? 'Cmd+R' : 'Ctrl+R',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'run-workflow')
        },
        {
          label: '停止运行',
          accelerator: isMac ? 'Cmd+.' : 'Ctrl+.',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'stop-workflow')
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用说明书',
          accelerator: 'F1',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'open-manual')
        },
        {
          label: '快捷键',
          accelerator: '?',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'open-shortcuts')
        },
        { type: 'separator' },
        {
          label: '官方网站',
          click: () => shell.openExternal('https://kailioncrafts.com/')
        },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于锴利超级AI工作台',
              message: '锴利超级AI工作台 v' + app.getVersion(),
              detail: '阳江市锴利国际贸易有限公司\n\n跨平台AI创作工作台\n支持 Windows 和 macOS'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC：获取应用信息
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: getUserDataPath(),
    appPath: app.getAppPath()
  };
});

// IPC：选择文件（安全：主进程硬编码对话框属性，仅接受渲染进程传入的 filters）
ipcMain.handle('select-file', async (_event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    allowedWritePaths.add(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  }
  return null;
});

// IPC：保存文件（安全：将用户选择的路径加入写入白名单）
ipcMain.handle('save-file', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options || {
    defaultPath: 'workflow.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!result.canceled && result.filePath) {
    allowedWritePaths.add(result.filePath);
    return { filePath: result.filePath };
  }
  return null;
});

// IPC：写入文件（安全：仅允许写入白名单中的路径，防止任意文件覆盖）
ipcMain.handle('write-file', async (_event, filePath, content) => {
  const normalizedPath = path.resolve(filePath);
  if (!allowedWritePaths.has(normalizedPath) && !allowedWritePaths.has(filePath)) {
    return { success: false, error: '安全限制：此文件路径未通过用户选择，禁止写入。请先通过"另存为"选择文件位置。' };
  }
  try {
    fs.writeFileSync(normalizedPath, content);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 应用就绪
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全：禁止创建新窗口
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
