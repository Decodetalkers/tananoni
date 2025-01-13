# TaNaNoNi

tananoni is a simple website generator with esbuild.

It can just be used with (p)react, and gen simple website.

Because there is too few static website generator with deno. So I create a
simple one

## example

```typescript
import { GenWebsite, Route, WebPageUnit } from "tananoni";

const route_2 = new Route("under")
  .appendAssert({ path: "favicon.ico" })
  .appendWebpage(
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
  .appendWebpage(
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
const route = new Route("example")
  .appendAssert({ path: "favicon.ico" })
  .appendWebpage(
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
  .appendWebpage(
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
  .appendRoute(route_2);
const webgen = new GenWebsite()
  .withLogLevel("info")
  .withImportSource("npm:preact");

await webgen.generateWebsite(route);
```
