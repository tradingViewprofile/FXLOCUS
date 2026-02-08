const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("fxlocusDesktop", {
  platform: process.platform,
  isDesktop: true
});
