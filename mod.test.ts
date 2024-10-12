import { assertEquals } from "jsr:@std/assert";

import { WebPageUnit } from "./mod.ts";

Deno.test(function generate() {
  const webpage = new WebPageUnit("doc", [{ type: "main", id: "mount" }], [{
    type: "module",
    src: "main.js",
  }])
    .with_title("hello");
  assertEquals(
    webpage.genhtml(),
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>hello</title></head><body><main id="mount"></main><script type="module" src="main.js"></script></body></html>`,
  );
});
