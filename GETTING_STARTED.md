# Getting Started with Clipboard Manager

Welcome to your new clipboard manager! Here's everything you need to know to get started.

## Quick Start

### Development Mode

To run the app in development mode with hot reloading:

```bash
cd /Users/chrisschnaars/clipboard-manager
npm run dev
```

**Note:** You'll need to run this in two terminals or use the concurrently command (already set up in package.json):

- Terminal 1 will run Vite dev server (React UI)
- Terminal 2 will compile and run Electron

### Running in Production

1. Build the app:

```bash
npm run build
```

2. Start the app:

```bash
npm start
```

### Package for Distribution

To create a distributable macOS app:

```bash
npm run package
```

This will create a `.dmg` and `.zip` file in the `release/` folder.

## Features Implemented

✅ **Menu Bar Integration** - App lives in your menu bar, click to open
✅ **Clipboard Monitoring** - Automatically captures everything you copy (text, images, files)
✅ **Visual History** - See previews of all copied items
✅ **Search** - Filter clipboard history instantly
✅ **Keyboard Navigation** - Use ↑↓ arrows and Enter to navigate and paste
✅ **Auto-hide** - Window disappears when you click away
✅ **Persistent Storage** - History saved between app restarts
✅ **100 Item Limit** - Keeps latest 100 items
✅ **Clear History** - Red X button to clear all items

## How It Works

### Architecture

- **Main Process** (`src/main/main.ts`): Electron process that handles:

  - Menu bar tray icon and window management
  - Clipboard monitoring (every 500ms)
  - Data persistence with electron-store
  - IPC communication with renderer

- **Renderer Process** (`src/renderer/`): React app that provides:

  - Visual interface for clipboard history
  - Search functionality
  - Keyboard navigation
  - Item selection and paste

- **Preload Script** (`src/main/preload.ts`): Bridge between main and renderer with security

### Clipboard Monitoring

The app checks the clipboard every 500ms for:

1. **Text** - Any text content
2. **Images** - Screenshots or copied images (stored as base64 data URLs)
3. **Files** - File paths from Finder

### Data Storage

Clipboard history is stored locally using `electron-store` in:

```
~/Library/Application Support/clipboard-manager/config.json
```

## Usage Tips

1. **Paste an Item**: Click any item or use keyboard (↑↓ then Enter)
2. **Search**: Type in the search box to filter items
3. **Clear History**: Click the red X button
4. **Quick Access**: The window auto-hides when you click away

## Keyboard Shortcuts

- `↑` / `↓` - Navigate through items
- `Enter` - Paste selected item
- `Escape` - (Future: Close window)

## Customization Ideas

Here are some easy improvements you can make:

1. **Custom Tray Icon**: Replace the base64 icon in `main.ts` with a custom PNG
2. **Global Shortcut**: Add a keyboard shortcut to show/hide (e.g., Cmd+Shift+V)
3. **Theme**: Modify `src/renderer/App.css` for different colors
4. **History Limit**: Change `MAX_HISTORY` in `main.ts`
5. **Monitoring Interval**: Adjust the 500ms interval in `startClipboardMonitoring()`

## Troubleshooting

### App doesn't start in dev mode

- Make sure both Vite (port 3000) and Electron are running
- Check if port 3000 is already in use

### Clipboard not monitoring

- macOS might require accessibility permissions
- Check System Preferences → Security & Privacy → Privacy → Accessibility

### Can't see app in menu bar

- Look for the clipboard icon in the top-right menu bar
- If hidden, the app might have crashed - check terminal for errors

## Next Steps

1. **Test the app**: Copy some text, images, and files to see them appear
2. **Customize**: Add your own icon or adjust the styling
3. **Add features**: Consider adding categories, favorites, or export functionality
4. **Package**: Create a distributable app with `npm run package`

Enjoy your new clipboard manager! 🎉
