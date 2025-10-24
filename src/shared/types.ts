export type ClipboardItemType = "text" | "image" | "file";

export interface ClipboardItem {
  id: string;
  type: ClipboardItemType;
  content: string; // For text: the text, for image: base64 data URL, for file: file path
  preview: string; // Preview text for display
  timestamp: number;
}

export interface IpcChannels {
  "clipboard:history": ClipboardItem[];
  "clipboard:paste": string;
  "clipboard:clear": void;
}
