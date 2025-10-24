import { contextBridge, ipcRenderer } from "electron";
import { ClipboardItem } from "../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  getHistory: (): Promise<ClipboardItem[]> =>
    ipcRenderer.invoke("clipboard:get-history"),
  pasteItem: (itemId: string): Promise<void> =>
    ipcRenderer.invoke("clipboard:paste", itemId),
  clearHistory: (): Promise<void> => ipcRenderer.invoke("clipboard:clear"),
  removeItem: (itemId: string): Promise<void> =>
    ipcRenderer.invoke("clipboard:remove", itemId),
  onHistoryUpdate: (callback: (history: ClipboardItem[]) => void) => {
    ipcRenderer.on("clipboard:update", (event, history) => callback(history));
  },
});
