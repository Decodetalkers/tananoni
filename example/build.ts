import {
  GenWebsite,
  refreshMiddleware,
  Route,
  watchChanges,
  WebPageUnit,
} from "tananoni";
import { serveDir } from "@std/http";

const route_2 = new Route("under")
  .append_assert({ path: "favicon.ico" })
  .append_webpage(
    new WebPageUnit(
      "src/main.tsx",
      [{ type: "main", id: "mount" }],
      [{ src: "main.js" }],
    )
      .with_title("index")
      .with_linkInfos([
        {
          type: "icon",
          href: "favicon.icon",
        },
      ]),
  )
  .append_webpage(
    new WebPageUnit(
      "./src/hello.tsx",
      [{ type: "main", id: "mount" }],
      [{ src: "hello.js" }],
    )
      .with_title("hello")
      .with_htmlName("hello.html")
      .with_linkInfos([
        {
          type: "icon",
          href: "favicon.icon",
        },
      ]),
  );
const route = new Route()
  .append_assert({ path: "favicon.ico" })
  .append_webpage(
    new WebPageUnit(
      "src/main.tsx",
      [{ type: "main", id: "mount" }],
      [{ src: "main.js" }],
    )
      .with_title("index")
      .with_linkInfos([
        {
          type: "icon",
          href: "favicon.icon",
        },
      ])
      .with_hotReload(),
  )
  .append_webpage(
    new WebPageUnit(
      "./src/hello.tsx",
      [{ type: "main", id: "mount" }],
      [{ src: "hello.js" }],
    )
      .with_title("hello")
      .with_linkInfos([
        {
          type: "icon",
          href: "favicon.icon",
        },
      ])
      .with_htmlName("hello.html"),
  )
  .with_hotReload(true)
  .append_route(route_2);
const webgen = new GenWebsite()
  .withLogLevel("info")
  .withImportSource("npm:preact");

await webgen.generate_website(route);

const fsRoot = `${Deno.cwd()}/dist/`;
Deno.serve({ hostname: "localhost", port: 8000 }, async (req) => {
  const res = refreshMiddleware(req);

  if (res) {
    return res;
  }

  return await serveDir(req, { fsRoot });
});

async function fsWatch() {
  await webgen.generate_website(route);
}

await watchChanges({
  watchedDir: "./",
  watchedFileTypes: [".ts", ".tsx", ".css"],
  excludes: ["dist", "build.ts"],
  fallback: fsWatch,
});
