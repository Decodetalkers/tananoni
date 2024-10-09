import { GenWebsite, MountType, Route, WebPageUnit } from "tananoni";

const route_2 = new Route("under")
  .append_webpage(
    new WebPageUnit(
      "src/main.tsx",
      [{ type: MountType.Main, id: "mount" }],
      ["main.js"],
    )
      .with_title("index"),
  )
  .append_webpage(
    new WebPageUnit(
      "./src/hello.tsx",
      [{ type: MountType.Main, id: "mount" }],
      ["hello.js"],
    )
      .with_title("hello")
      .with_htmlName("hello.html"),
  );
const route = new Route("example")
  .append_webpage(
    new WebPageUnit(
      "src/main.tsx",
      [{ type: MountType.Main, id: "mount" }],
      ["main.js"],
    )
      .with_title("index"),
  )
  .append_webpage(
    new WebPageUnit(
      "./src/hello.tsx",
      [{ type: MountType.Main, id: "mount" }],
      ["hello.js"],
    )
      .with_title("hello")
      .with_htmlName("hello.html"),
  )
  .append_routine(route_2);
const webgen = new GenWebsite()
  .withLogLevel("info")
  .withImportSource("npm:preact");

await webgen.generate_website(route);
