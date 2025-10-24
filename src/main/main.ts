import {
  app,
  BrowserWindow,
  Tray,
  clipboard,
  ipcMain,
  nativeImage,
  screen,
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

  // Position window near the menu bar
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
}

function createTray() {
  // Create a simple icon for the tray (you can replace with a custom icon later)
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADXSURBVFhH7ZbBDYMwDEVpR+AEXDgxAiMwAiMwQkfoCIzACRYgUqUqShPbBPWC/KQryvfzs+MkjuM4juPs4AHgDuAJ4PX3fAL4fjEaAM4ALl/MXQbgDeAMYABwb8wMV6QDWAE0AI4t0gG0AFoAxxbpAAYAI4Bji3QAPYAewLFFOoAJwAxgBnBskQ5gAbACWAEcW4SDEH8hmQEsAJa/ZzqIFcAKYAVwbJEOYADQAxgAHFukAxgBTABGAMcW6QB6AD2AHsCxRTqADcAGYANwbJEO4gLgBuAG4Ngi/3EcZ1ccvgH68yVXIL88VgAAAABJRU5ErkJggg=="
  );

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Clipboard Manager");

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
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
