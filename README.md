# Clipboard Manager

A beautiful and simple macOS clipboard manager built with Electron and React.

## Features

- 📋 **Visual Clipboard History** - See everything you've copied with previews
- 🖼️ **Multiple Content Types** - Supports text, images, and files
- 🔍 **Search** - Quickly find items in your history
- ⌨️ **Keyboard Navigation** - Use arrow keys and Enter to navigate and paste
- 💾 **Persistent Storage** - History is saved between app restarts
- 🎯 **Menu Bar App** - Quick access from your menu bar
- 📊 **100 Item Limit** - Keeps your history clean and performant

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package the app
npm run package
```

## Usage

1. The app runs in your menu bar with a clipboard icon
2. Click the icon to open the clipboard history
3. Search for items using the search bar
4. Click any item or use keyboard navigation (↑↓) and press Enter to paste it
5. The window auto-hides when it loses focus

## Development

The project is structured as follows:

- `src/main/` - Electron main process (clipboard monitoring, tray management)
- `src/renderer/` - React UI
- `src/shared/` - Shared TypeScript types

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run package` - Create distributable package

## Tech Stack

- **Electron** - Desktop app framework
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **electron-store** - Persistent data storage

## License

MIT
