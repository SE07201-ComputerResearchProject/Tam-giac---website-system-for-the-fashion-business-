const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'Backend');
const port = 3002;
const healthUrl = `http://127.0.0.1:${port}/health`;
const stdoutPath = path.join(backendDir, 'web-server.out.log');
const stderrPath = path.join(backendDir, 'web-server.err.log');

function checkHealth() {
  return new Promise((resolve) => {
    const request = http.get(healthUrl, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(attempts) {
  for (let index = 0; index < attempts; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    const healthy = await checkHealth();
    if (healthy) {
      return true;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

async function main() {
  if (await checkHealth()) {
    console.log(`Tam Giac server is already running at http://127.0.0.1:${port}`);
    return;
  }

  const stdoutFd = fs.openSync(stdoutPath, 'a');
  const stderrFd = fs.openSync(stderrPath, 'a');

  const child = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    windowsHide: true
  });

  child.unref();

  const healthy = await waitForHealth(20);
  if (!healthy) {
    console.error('Tam Giac server did not start successfully.');
    console.error(`Check logs: ${stdoutPath}`);
    console.error(`Check logs: ${stderrPath}`);
    process.exit(1);
  }

  console.log(`Tam Giac server is running at http://127.0.0.1:${port}`);
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
