#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

// Kill any existing processes
console.log("🧹 Cleaning up existing processes...");
require("child_process").exec(
  'pkill -f "electron|vite|nodemon" || true',
  () => {
    require("child_process").exec(
      "lsof -ti:3000 | xargs kill -9 2>/dev/null || true",
      () => {
        console.log("✅ Cleanup complete");
        startDev();
      }
    );
  }
);

function startDev() {
  console.log("🚀 Starting development servers...");

  // Start Vite dev server (watches src/renderer automatically)
  const vite = spawn("npm", ["run", "dev:renderer"], {
    stdio: "inherit",
    shell: true,
  });

  // Wait 3 seconds for Vite to start, then start Electron
  setTimeout(() => {
    console.log("⚡ Starting Electron...");
    // Start nodemon (watches src/main automatically)
    const electron = spawn("npm", ["run", "dev:main"], {
      stdio: "inherit",
      shell: true,
    });

    // Handle cleanup on exit
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down development servers...");
      vite.kill();
      electron.kill();
      process.exit(0);
    });
  }, 3000);
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  process.exit(0);
});
