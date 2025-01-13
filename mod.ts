/**
 * @module
 * tananoni is a simple website generator with esbuild
 *
 * @example
 *
 * ```typescript
 * import { GenWebsite, Route, WebPageUnit } from "tananoni";
 *
 * const route_2 = new Route("under")
 *   .append_assert({ path: "favicon.ico" })
 *   .append_webpage(
 *     new WebPageUnit(
 *       "src/main.tsx",
 *       [{ type: "main", id: "mount" }],
 *       [{ src: "main.js" }],
 *     )
 *       .with_title("index")
 *       .with_linkInfos([
 *         {
 *           type: "icon",
 *           href: "favicon.icon",
 *         },
 *       ]),
 *   )
 *   .append_webpage(
 *     new WebPageUnit(
 *       "./src/hello.tsx",
 *       [{ type: "main", id: "mount" }],
 *       [{ src: "hello.js" }],
 *     )
 *       .with_title("hello")
 *       .with_htmlName("hello.html")
 *       .with_linkInfos([
 *         {
 *           type: "icon",
 *           href: "favicon.icon",
 *         },
 *       ]),
 *   );
 * const route = new Route("example")
 *   .append_assert({ path: "favicon.ico" })
 *   .append_webpage(
 *     new WebPageUnit(
 *       "src/main.tsx",
 *       [{ type: "main", id: "mount" }],
 *       [{ src: "main.js" }],
 *     )
 *       .with_title("index")
 *       .with_linkInfos([
 *         {
 *           type: "icon",
 *           href: "favicon.icon",
 *         },
 *       ]),
 *   )
 *   .append_webpage(
 *     new WebPageUnit(
 *       "./src/hello.tsx",
 *       [{ type: "main", id: "mount" }],
 *       [{ src: "hello.js" }],
 *     )
 *       .with_title("hello")
 *       .with_linkInfos([
 *         {
 *           type: "icon",
 *           href: "favicon.icon",
 *         },
 *       ])
 *       .with_htmlName("hello.html"),
 *   )
 *   .append_route(route_2);
 * const webgen = new GenWebsite()
 *   .withLogLevel("info")
 *   .withImportSource("npm:preact");
 *
 * await webgen.generate_website(route);
 * ```
 */

import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";
import { copySync, ensureDir, existsSync } from "@std/fs";
import { basename, join, resolve } from "@std/path";
import { assert } from "@std/assert";
import {
  hotReloadScript,
  refreshMiddleware,
  watchChanges,
  type WatchInfo,
} from "./hotreload.ts";

export { refreshMiddleware, watchChanges, type WatchInfo };

/**
 * Describe the mount point in html
 * The mount point can be "div", "main" , "header" or "footer"
 * You need to set the mount id
 */
export type MountInfo = {
  type: "div" | "main" | "header" | "footer";
  id: string;
};

/**
 * Describe the link part in html
 * You can use it to set the
 */
export type LinkInfo = {
  type: "icon" | "stylesheet";
  href: string;
};

/**
 * Describe the script part of the html
 * You can set the type to "module" to support run async
 */
export type Script = {
  type?: "normal" | "module";
  src: string;
};

/**
 * Describe the Html
 */
export class WebPageUnit {
  private title = "";
  private css: string | undefined;
  private viewport = "width=device-width, initial-scale=1.0";
  private linkInfos: LinkInfo[] = [];
  private htmlName_ = "index.html";
  private entryPoint_: string;
  private mountpoints: MountInfo[];
  private scripts: Script[];
  private withHtml: boolean = true;

  /**
   * Set the linkInfos
   */
  withLinkInfos(linkInfos: LinkInfo[]): WebPageUnit {
    this.linkInfos = linkInfos;
    return this;
  }

  /**
   * Add another script named hot_reload.js
   * This js will use websocket to do update
   */
  withHotReload(): WebPageUnit {
    this.scripts.push({ src: "hot_reload.js" });
    return this;
  }

  /**
   * This function will pass the WebPageUnit itself as param, then you can use a closure
   * to handle the WebPageUnit
   */
  then(fn: (arg: WebPageUnit) => WebPageUnit): WebPageUnit {
    return fn(this);
  }

  /**
   * Return the current html name, for example, index.html
   */
  get htmlName(): string {
    return this.htmlName_;
  }

  /**
   * The entryPoint of esbuild, like `src/main.tsx`.
   * That means the compile source
   */
  get entryPoint(): string {
    return this.entryPoint_;
  }

  /**
   * If want the comple target be a plugin not website,
   * use this function
   */
  withOutHtml() {
    this.withHtml = false;
  }

  get onlyJavaScript(): boolean {
    return !this.withHtml;
  }

  /**
   * Viewport part of html
   */
  withViewport(viewport_setting: string): WebPageUnit {
    this.viewport = viewport_setting;
    return this;
  }

  /**
   * With this function to set the target htmlName
   */
  withHtmlName(htmlName: string): WebPageUnit {
    this.htmlName_ = htmlName;
    return this;
  }

  /**
   * Set the page title
   */
  withTitle(title: string): WebPageUnit {
    this.title = title;
    return this;
  }

  /**
   * Set the part of <style/> in html
   */
  withGlobalcss(css: string): WebPageUnit {
    this.css = css;
    return this;
  }
  /**
   * entryPoint: The compile source
   * mountpoints:  Where to mount
   * scripts: The Binded scripts
   * route: default is `index.html`
   */
  constructor(
    entryPoint: string,
    mountpoints: MountInfo[],
    scripts: Script[],
    route: string | undefined = undefined,
  ) {
    this.entryPoint_ = entryPoint;
    this.htmlName_ = route || this.htmlName_;
    this.mountpoints = mountpoints;
    this.scripts = scripts;
    return this;
  }

  private genLinkInfos(): string {
    const output: string[] = [];
    for (const linkInfo of this.linkInfos) {
      switch (linkInfo.type) {
        case "icon":
          output.push(
            `<link rel="icon" type="image/x-icon" href="${linkInfo.href}" />`,
          );
          break;

        case "stylesheet":
          output.push(
            `<link rel="stylesheet" href="${linkInfo.href}" />`,
          );
          break;
      }
    }
    return output.join("\n");
  }

  private genBody(): string {
    const output: string[] = [];

    for (const mountpoint of this.mountpoints) {
      output.push(
        `<${mountpoint.type} id="${mountpoint.id}"></${mountpoint.type}>`,
      );
    }
    for (const script of this.scripts) {
      switch (script.type) {
        case "module":
          output.push(`<script type="module" src="${script.src}"></script>`);
          break;
        case "normal":
        case undefined:
          output.push(`<script src="${script.src}"></script>`);
          break;
      }
    }

    return output.join("\n");
  }

  private genCSS(): string {
    if (this.css) {
      return `<style>${this.css}</style>`;
    }
    return "";
  }

  /**
   * Return the current result of the html
   */
  genhtml(): string {
    let template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="${this.viewport}" />
<title>${this.title}</title>
${this.genLinkInfos()}
</head>
${this.genCSS()}
<body>
${this.genBody()}
</body>
</html>`;
    template = template.replaceAll("\n", "");
    return template;
  }
}

/**
 * Static assert. During building, the assert will be defaultedly
 * copy to the target place of the html path.
 */
export type Assert = {
  path: string;
  /**
   * Set the alias path.
   * For example, the route is /dist/debug/ and the path is `static`, by default,
   * the assert will be placed to /dist/debug/static, if set alias to `/static/icon`,
   * it will be placed to /dist/debug/static/icon
   */
  alias?: string;
};

/**
 * Describe the structure of the webpages.
 */
export class Route {
  subroutes: Route[] = [];
  webpages: WebPageUnit[] = [];
  base_route: string | undefined;
  asserts: Assert[] = [];
  hot_reload: boolean = false;
  /**
   * construct with default path. for the top of the route, you can set it to
   * `debug` or `release`
   * the start route can be undefined
   */
  constructor(base_route?: string) {
    this.base_route = base_route;
  }

  /**
   * Append new webpage to the route
   */
  append_webpage(webpage: WebPageUnit): Route {
    this.webpages.push(webpage);
    return this;
  }

  /**
   * Add a subroute. For example, the subroute is doc, and the parent one is `debug`,
   * then the real route of subroute will be `debug/doc`
   */
  append_route(route: Route): Route {
    assert(route.base_route);
    this.subroutes.push(route);
    return this;
  }

  /**
   * Append the assert(s) of current route. The assert(s) will copySync to the path under
   * the dir of current route.
   */
  append_assert(assert: Assert): Route {
    this.asserts.push(assert);
    return this;
  }

  /**
   * if be set to true, then under this route, there will be generate a file named hot_reload.js
   * This js is used to hot_reload
   */
  with_hotReload(hot_reload: boolean): Route {
    this.hot_reload = hot_reload;
    return this;
  }

  /**
   * This function will pass the Route itself as param, then you can use a closure
   * to handle the Route
   */
  then(fn: (arg: Route) => Route): Route {
    return fn(this);
  }
}

/**
 * GenWebsite class, directly wrap the esbuild
 */
export class GenWebsite {
  jsxImportSource?: string | undefined;
  logLevel?: esbuild.LogLevel | undefined;

  /**
   * jsxImportSource in esbuild
   */
  withImportSource(importSource: string): GenWebsite {
    this.jsxImportSource = importSource;
    return this;
  }

  /**
   * Set the logLevel of esbuild
   */
  withLogLevel(logLevel: esbuild.LogLevel): GenWebsite {
    this.logLevel = logLevel;
    return this;
  }

  /**
   * Start generate the website
   */
  async generate_website(route: Route) {
    await generate_website(
      undefined,
      route,
      this.jsxImportSource,
      this.logLevel,
    );
  }
}

const baseOutputDir = "dist";

let importMapURL: string | undefined = resolve("./import_map.json");

if (!existsSync(importMapURL)) {
  importMapURL = undefined;
}
const configUrl = resolve("./deno.json");

const esbuildPlugins = [
  ...denoPlugins(
    {
      importMapURL: importMapURL,
      configPath: configUrl,
    },
  ),
];

const copySyncOption = { overwrite: true };

async function generate_website(
  parent: string | undefined,
  route: Route,
  jsxImportSource: string | undefined,
  logLevel: esbuild.LogLevel | undefined,
) {
  let outputDir = baseOutputDir;
  if (route.base_route) {
    let subdir = route.base_route;
    if (parent) {
      subdir = join(parent, subdir);
    }
    outputDir = join(outputDir, subdir);
  }
  await ensureDir(outputDir);
  if (route.hot_reload) {
    const reloadJs = join(outputDir, "hot_reload.js");
    Deno.writeTextFile(reloadJs, hotReloadScript);
  }
  for (const unit of route.webpages) {
    if (!unit.onlyJavaScript) {
      const html = unit.htmlName;
      const text = unit.genhtml();
      const htmlPath = join(outputDir, html);
      Deno.writeTextFile(htmlPath, text);
    }
    const esBuildOptions: esbuild.BuildOptions = {
      entryPoints: [
        unit.entryPoint,
      ],
      jsxImportSource,
      jsx: "automatic",
      outdir: outputDir,
      bundle: true,
      format: "esm",
      logLevel,
      plugins: [],
    };
    esBuildOptions.plugins = esbuildPlugins;
    await esbuild.build({ ...esBuildOptions });
  }
  for (const assert of route.asserts) {
    const assertPath = assert.path;
    const targetPath = assert.alias || basename(assertPath);
    copySync(assertPath, join(outputDir, targetPath), copySyncOption);
  }
  for (const subroute of route.subroutes) {
    await generate_website(
      route.base_route,
      subroute,
      jsxImportSource,
      logLevel,
    );
  }
}
