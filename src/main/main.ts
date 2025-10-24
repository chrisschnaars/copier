import {
  app,
  BrowserWindow,
  Tray,
  clipboard,
  ipcMain,
  nativeImage,
  screen,
  Menu,
} from "electron";
import * as path from "path";
import Store from "electron-store";
import { ClipboardItem, ClipboardItemType } from "../shared/types";

const store = new Store<{ history: ClipboardItem[] }>({
  defaults: {
    history: [],
  },
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let clipboardHistory: ClipboardItem[] = [];
const MAX_HISTORY = 100;

let previousText = "";
let previousImageHash = "";

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Position window below the tray icon
  const windowBounds = mainWindow.getBounds();
  const x = Math.floor(width - windowBounds.width - 10);
  const y = 30;
  mainWindow.setPosition(x, y);

  // Load the app
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Hide window when it loses focus
  mainWindow.on("blur", () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });

  // Hide window when app loses focus
  app.on("browser-window-blur", () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Make it a template image for light/dark mode adaptation
  const iconPath = path.join(
    __dirname,
    "../assets/icons/clipboard-logo@1x.png"
  );

  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Copier");

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  // Left click toggles window, right click shows context menu
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        // Position window below the tray icon
        const trayBounds = tray!.getBounds();
        const windowBounds = mainWindow.getBounds();
        const x = Math.floor(
          trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
        );
        const y = Math.floor(trayBounds.y + trayBounds.height);
        mainWindow.setPosition(x, y);

        mainWindow.show();
      }
    }
  });

  tray.on("right-click", () => {
    contextMenu.popup();
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getImageHash(image: Electron.NativeImage): string {
  return image.toDataURL().substring(0, 100); // Simple hash based on first 100 chars
}

function addToHistory(item: ClipboardItem) {
  // Add to beginning of array
  clipboardHistory.unshift(item);

  // Keep only MAX_HISTORY items
  if (clipboardHistory.length > MAX_HISTORY) {
    clipboardHistory = clipboardHistory.slice(0, MAX_HISTORY);
  }

  // Save to persistent storage
  store.set("history", clipboardHistory);

  // Send update to renderer
  if (mainWindow) {
    mainWindow.webContents.send("clipboard:update", clipboardHistory);
  }
}

function startClipboardMonitoring() {
  setInterval(() => {
    // Check for text
    const text = clipboard.readText();
    if (text && text.trim() && text !== previousText) {
      previousText = text;

      const item: ClipboardItem = {
        id: generateId(),
        type: "text",
        content: text,
        preview: text.substring(0, 100),
        timestamp: Date.now(),
      };

      addToHistory(item);
      return;
    }

    // Check for image
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const imageHash = getImageHash(image);
      if (imageHash !== previousImageHash) {
        previousImageHash = imageHash;

        const dataUrl = image.toDataURL();
        const item: ClipboardItem = {
          id: generateId(),
          type: "image",
          content: dataUrl,
          preview: "Image",
          timestamp: Date.now(),
        };

        addToHistory(item);
        return;
      }
    }

    // Check for files (macOS specific)
    const html = clipboard.readHTML();
    if (html.includes("file://")) {
      const fileMatch = html.match(/file:\/\/([^"]+)/);
      if (fileMatch && fileMatch[1] !== previousText) {
        const filePath = decodeURIComponent(fileMatch[1]);
        previousText = filePath;

        const fileName = path.basename(filePath);
        const item: ClipboardItem = {
          id: generateId(),
          type: "file",
          content: filePath,
          preview: fileName,
          timestamp: Date.now(),
        };

        addToHistory(item);
      }
    }
  }, 500);
}

// IPC Handlers
ipcMain.handle("clipboard:get-history", () => {
  return clipboardHistory;
});

ipcMain.handle("clipboard:paste", (event, itemId: string) => {
  const item = clipboardHistory.find((i) => i.id === itemId);
  if (!item) return;

  if (item.type === "text" || item.type === "file") {
    clipboard.writeText(item.content);
  } else if (item.type === "image") {
    const image = nativeImage.createFromDataURL(item.content);
    clipboard.writeImage(image);
  }

  // Hide window after paste
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle("clipboard:clear", () => {
  clipboardHistory = [];
  store.set("history", []);

  if (mainWindow) {
    mainWindow.webContents.send("clipboard:update", []);
  }
});

ipcMain.handle("clipboard:remove", (event, itemId: string) => {
  const initialLength = clipboardHistory.length;
  clipboardHistory = clipboardHistory.filter((item) => item.id !== itemId);

  // Only update if something was actually removed
  if (clipboardHistory.length < initialLength) {
    store.set("history", clipboardHistory);

    if (mainWindow) {
      mainWindow.webContents.send("clipboard:update", clipboardHistory);
    }
  }
});

// App lifecycle
app.whenReady().then(() => {
  // Load history from storage
  clipboardHistory = store.get("history", []);

  createWindow();
  createTray();
  startClipboardMonitoring();
});

app.on("window-all-closed", (e: Event) => {
  e.preventDefault(); // Prevent app from quitting
});

app.on("before-quit", () => {
  // Save history before quitting
  store.set("history", clipboardHistory);
});

app.dock?.hide(); // Hide from dock on macOS
