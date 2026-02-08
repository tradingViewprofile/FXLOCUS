const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");

const DEFAULT_ORIGIN = "https://www.fxlocus.com";
const DEFAULT_START_PATH = "/zh/system/login";

function resolveStartUrl() {
  const envUrl = process.env.ELECTRON_START_URL;
  if (envUrl && typeof envUrl === "string") return envUrl;
  return `${DEFAULT_ORIGIN}${DEFAULT_START_PATH}`;
}

function isAllowedSystemUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== DEFAULT_ORIGIN) return false;
    return (
      parsed.pathname.startsWith("/zh/system") ||
      parsed.pathname.startsWith("/en/system") ||
      parsed.pathname.startsWith("/system")
    );
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0b1222",
    show: false,
    icon: path.join(__dirname, "..", "public", "favicon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true
    }
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url && url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url && url.startsWith("http") && !isAllowedSystemUrl(url)) {
      event.preventDefault();
      if (!url.startsWith(DEFAULT_ORIGIN)) {
        shell.openExternal(url);
      } else {
        win.loadURL(resolveStartUrl());
      }
    }
  });

  win.webContents.on("did-finish-load", () => {
    const currentUrl = win.webContents.getURL();
    if (!isAllowedSystemUrl(currentUrl)) {
      win.loadURL(resolveStartUrl());
    }
  });

  win.loadURL(resolveStartUrl());
  return win;
}

app.whenReady().then(() => {
  session.defaultSession.setUserAgent(
    `${app.getName()}/${app.getVersion()} (Fxlocus Desktop)`
  );
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
