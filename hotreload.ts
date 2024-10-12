import { delay } from "@std/async";
import { extname, resolve, SEPARATOR } from "@std/path";

const sockets: Set<WebSocket> = new Set();

/**
 * Upgrade a request connection to a WebSocket if
 * the url ends with "/refresh"
 */
export function refreshMiddleware(req: Request): Response | null {
  if (req.url.endsWith("/refresh")) {
    const { response, socket } = Deno.upgradeWebSocket(req);

    // Add the new socket to our in-memory store
    // of WebSockets.
    sockets.add(socket);

    // Remove the socket from our in-memory store
    // when the socket closes.
    socket.onclose = () => {
      sockets.delete(socket);
    };

    return response;
  }

  return null;
}

/**
 * watchedDir: the dir be watched,
 * excludes: dir or file not needed
 * watchedFileTypes: like .ts, .tsx
 * fallback: async function, when refresh, regenerate the target
 */
export type WatchInfo = {
  watchedDir: string;
  excludes: string[];
  watchedFileTypes: string[];
  fallback: () => Promise<void>;
};

/**
 * Watch the file changes and when file be changed, do something
 */
export async function watchChanges(
  { watchedDir, excludes, watchedFileTypes, fallback }: WatchInfo,
) {
  let during_wait = false;

  const watcher = Deno.watchFs(watchedDir);

  for await (const event of watcher) {
    if (during_wait) {
      continue;
    }
    if (!["modified", "remove", "create", "rename"].includes(event.kind)) {
      continue;
    }

    let should_fresh = false;
    for (const pa of event.paths) {
      const absolutePath = resolve(pa);
      const pathParts = absolutePath.split(SEPARATOR); // Use the platform-specific separator
      const paExt = extname(pa);
      if (
        excludes.find((pa) => {
          pathParts.includes(pa);
        })
      ) {
        continue;
      }
      if (!watchedFileTypes.includes(paExt)) {
        continue;
      }
      should_fresh = true;
    }
    if (!should_fresh) {
      continue;
    }

    // Make sure the file is already be modified
    await delay(10);
    await fallback();
    sockets.forEach((socket) => {
      socket.send("refresh");
    });
    during_wait = true;
    delay(1000).then(() => during_wait = false);
  }
}

const hotReloadScript = `(() => {
  let socket, reconnectionTimerId;

  // Construct the WebSocket url from the current
  // page origin.
  const requestUrl = \`\${window.location.origin.replace("http", "ws")\}/refresh\`;

  // Kick off the connection code on load.
  connect();

  /**
   * Info message logger.
   */
  function log(message) {
    console.info("[refresh] ", message);
  }

  /**
   * Refresh the browser.
   */
  function refresh() {
    window.location.reload();
  }

  /**
   * Create WebSocket, connect to the server and
   * listen for refresh events.
   */
  function connect(callback) {
    // Close any existing sockets.
    if (socket) {
      socket.close();
    }

    // Create a new WebSocket pointing to the server.
    socket = new WebSocket(requestUrl);

    // When the connection opens, execute the callback.
    socket.addEventListener("open", callback);

    // Add a listener for messages from the server.
    socket.addEventListener("message", (event) => {
      // Check whether we should refresh the browser.
      if (event.data === "refresh") {
        log("refreshing...");
        refresh();
      }
    });

    // Handle when the WebSocket closes. We log
    // the loss of connection and set a timer to
    // start the connection again after a second.
    socket.addEventListener("close", () => {
      log("connection lost - reconnecting...");

      clearTimeout(reconnectionTimerId);

      reconnectionTimerId = setTimeout(() => {
        // Try to connect again, and if successful
        // trigger a browser refresh.
        connect(refresh);
      }, 1000);
    });
  }
})();
`;

export { hotReloadScript };
