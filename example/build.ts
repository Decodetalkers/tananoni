import { GenWebsite, Route, WebPageUnit } from "tananoni";

const route_2 = new Route("under")
  .append_assert({ path: "favicon.ico" })
  .append_webpage(
    new WebPageUnit(
      "src/main.tsx",
      [{ type: "main", id: "mount" }],
      ["main.js"],
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
      ["hello.js"],
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
const route = new Route("example")
  .append_assert({ path: "favicon.ico" })
  .append_webpage(
    new WebPageUnit(
      "src/main.tsx",
      [{ type: "main", id: "mount" }],
      ["main.js"],
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
      ["hello.js"],
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
  .append_route(route_2);
const webgen = new GenWebsite()
  .withLogLevel("info")
  .withImportSource("npm:preact");

await webgen.generate_website(route);
