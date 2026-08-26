import { spawn } from "node:child_process";

export function runBoundedProcess({
  command,
  args,
  cwd,
  env,
  input,
  timeoutMs,
  maximumBytes,
  terminationGraceMs = 250,
}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      detached: true,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let error = null;
    let closed = null;
    let terminationStarted = false;
    let terminationComplete = false;
    let timeout;
    let killTimer;

    const finish = () => {
      if (!closed || (terminationStarted && !terminationComplete)) return;
      clearTimeout(timeout);
      clearTimeout(killTimer);
      resolve({
        ...closed,
        error,
        stdout: stdout.toString("utf8"),
        stderr: stderr.toString("utf8"),
        process_group_reaped: !groupExists(child.pid),
      });
    };
    const terminate = (reason) => {
      if (terminationStarted) return;
      terminationStarted = true;
      error = reason;
      signalGroup(child.pid, "SIGTERM");
      killTimer = setTimeout(() => {
        signalGroup(child.pid, "SIGKILL");
        terminationComplete = true;
        finish();
      }, terminationGraceMs);
    };
    const append = (current, chunk) => {
      const next = Buffer.concat([current, chunk]);
      if (next.length > maximumBytes) {
        terminate(`subprocess output exceeded ${maximumBytes} bytes`);
        return next.subarray(0, maximumBytes);
      }
      return next;
    };

    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
    child.on("error", (cause) => { error = cause.message; });
    child.on("close", (exitCode, signal) => {
      closed = { exitCode, signal };
      if (!terminationStarted && groupExists(child.pid)) {
        terminate("subprocess exited while descendant processes remained");
      } else {
        finish();
      }
    });
    if (input !== undefined) child.stdin.end(input);
    timeout = setTimeout(() => terminate(`subprocess exceeded ${timeoutMs} ms`), timeoutMs);
  });
}

function signalGroup(pid, signal) {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function groupExists(pid) {
  if (!pid) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}
