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
      .withTitle("index")
      .withLinkInfos([
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
      .withTitle("hello")
      .withHtmlName("hello.html")
      .withLinkInfos([
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
      .withTitle("index")
      .withLinkInfos([
        {
          type: "icon",
          href: "favicon.icon",
        },
      ])
      .withHotReload(),
  )
  .append_webpage(
    new WebPageUnit(
      "./src/hello.tsx",
      [{ type: "main", id: "mount" }],
      [{ src: "hello.js" }],
    )
      .withTitle("hello")
      .withLinkInfos([
        {
          type: "icon",
          href: "favicon.icon",
        },
      ])
      .withHtmlName("hello.html"),
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
