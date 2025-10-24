import React, { useState, useEffect, useCallback } from "react";
import { ClipboardItem } from "../shared/types";
import "./App.css";

declare global {
  interface Window {
    electronAPI: {
      getHistory: () => Promise<ClipboardItem[]>;
      pasteItem: (itemId: string) => Promise<void>;
      clearHistory: () => Promise<void>;
      removeItem: (itemId: string) => Promise<void>;
      onHistoryUpdate: (callback: (history: ClipboardItem[]) => void) => void;
    };
  }
}

const App: React.FC = () => {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    // Load initial history
    window.electronAPI.getHistory().then(setHistory);

    // Listen for updates
    window.electronAPI.onHistoryUpdate((newHistory) => {
      setHistory(newHistory);
      setSelectedIndex(0);
    });
  }, []);

  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true;
    return item.preview.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePaste = useCallback((itemId: string) => {
    window.electronAPI.pasteItem(itemId);
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm("Clear all clipboard history?")) {
      window.electronAPI.clearHistory();
      setSearchQuery("");
    }
  }, []);

  const handleRemove = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the paste action
    window.electronAPI.removeItem(itemId);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredHistory.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredHistory.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredHistory[selectedIndex]) {
            handlePaste(filteredHistory[selectedIndex].id);
          }
          break;
      }
    },
    [filteredHistory, selectedIndex, handlePaste]
  );

  useEffect(() => {
    // Reset selected index when search query changes
    setSelectedIndex(0);
  }, [searchQuery]);

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  return (
    <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="header">
        <input
          type="text"
          className="search-input"
          placeholder="Search clipboard..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {history.length > 0 && (
          <button
            className="clear-button"
            onClick={handleClear}
            title="Clear history"
          >
            ✕
          </button>
        )}
      </div>

      <div className="clipboard-list">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? "No matching items" : "No clipboard history yet"}
          </div>
        ) : (
          filteredHistory.map((item, index) => (
            <div
              key={item.id}
              className={`clipboard-item ${
                index === selectedIndex ? "selected" : ""
              }`}
              onClick={() => handlePaste(item.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="item-content">
                {item.type === "image" ? (
                  <div className="item-preview">
                    <img
                      src={item.content}
                      alt="clipboard"
                      className="image-preview"
                    />
                  </div>
                ) : (
                  <div className="item-preview">
                    <div className="item-type-icon">
                      {item.type === "text" ? "📝" : "📄"}
                    </div>
                    <div className="item-text">
                      {item.type === "text" ? (
                        <span className="preview-text">{item.preview}</span>
                      ) : (
                        <span className="preview-text">{item.preview}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="item-actions">
                <div className="item-timestamp">
                  {formatTimestamp(item.timestamp)}
                </div>
                <button
                  className="remove-button"
                  onClick={(e) => handleRemove(item.id, e)}
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="footer">
        <span className="footer-text">
          {filteredHistory.length}{" "}
          {filteredHistory.length === 1 ? "item" : "items"}
        </span>
        <span className="footer-hint">↑↓ Navigate • Enter to paste</span>
      </div>
    </div>
  );
};

export default App;
