import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";

/* Keep the test run light on the machine.
   - Few workers: every worker starts its own Chromium (a few hundred MB). The default is half the CPU cores,
     which is 6 on a 12 core laptop. Two is enough here. Set PW_WORKERS=1 on a slow machine, or higher on CI.
   - The servers are started and stopped by the test run itself when they are not already running, so nobody has
     to start extra copies by hand (and a server that dies mid-run no longer ruins the results).
     If a server is already running on its port it is reused, never duplicated. */
const workers = Number(process.env.PW_WORKERS || 2);

const venvPython = [path.resolve(".venv/Scripts/python.exe"), path.resolve(".venv/bin/python")].find(existsSync);
const python = venvPython ? `"${venvPython}"` : "python";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  workers,
  use: { baseURL: "http://localhost:8443", browserName: "chromium", headless: true },
  reporter: "list",
  webServer: [
    { command: "npm run dev", url: "http://localhost:8443", reuseExistingServer: true, timeout: 120000 },
    {
      command: `${python} -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`,
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
