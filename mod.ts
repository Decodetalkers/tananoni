import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";
import { copySync, ensureDir, existsSync } from "@std/fs";
import { basename, join, resolve } from "@std/path";

export type MountInfo = {
  type: "div" | "main" | "header";
  id: string;
};

export type LinkInfo = {
  type: "icon" | "stylesheet";
  href: string;
};

export class WebPageUnit {
  private title = "";
  private css = "";
  private viewport = "width=device-width, initial-scale=1.0";
  private linkInfos: LinkInfo[] = [];
  private htmlName_ = "index.html";
  private entryPoint_: string;
  private mountpoints: MountInfo[];
  private scripts: string[];
  with_linkInfos(linkInfos: LinkInfo[]): WebPageUnit {
    this.linkInfos = linkInfos;
    return this;
  }

  get htmlName(): string {
    return this.htmlName_;
  }

  get entryPoint(): string {
    return this.entryPoint_;
  }

  with_viewport(viewport_setting: string): WebPageUnit {
    this.viewport = viewport_setting;
    return this;
  }
  with_htmlName(htmlName: string): WebPageUnit {
    this.htmlName_ = htmlName;
    return this;
  }
  with_title(title: string): WebPageUnit {
    this.title = title;
    return this;
  }
  with_globalcss(css: string): WebPageUnit {
    this.css = css;
    return this;
  }

  constructor(
    entryPoint: string,
    mountpoints: MountInfo[],
    scripts: string[],
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
      switch (mountpoint.type) {
        case "main":
          output.push(`<main id="${mountpoint.id}"></main>`);
          break;
        case "header":
          output.push(`<header id="${mountpoint.id}"></head>`);
          break;
        case "div":
          output.push(`<div id="${mountpoint.id}"></div>`);
          break;
      }
    }
    for (const script of this.scripts) {
      output.push(`<script src="${script}"></script>`);
    }

    return output.join("\n");
  }
  genhtml(): string {
    let template = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="${this.viewport}" />
    <title>${this.title}</title>
    ${this.genLinkInfos()}
  </head>
  <style>${this.css}</style>
  <body>
    ${this.genBody()}
  </body>
</html>`;
    template = template.replaceAll("\n", "");
    return template;
  }
}

export type Assert = {
  path: string;
  alias?: string;
};

export class Route {
  subroutes: Route[] = [];
  webpages: WebPageUnit[] = [];
  base_route: string;
  asserts: Assert[] = [];
  constructor(base_route: string) {
    this.base_route = base_route;
  }
  append_webpage(webpage: WebPageUnit): Route {
    this.webpages.push(webpage);
    return this;
  }
  append_route(route: Route): Route {
    this.subroutes.push(route);
    return this;
  }
  append_assert(assert: Assert): Route {
    this.asserts.push(assert);
    return this;
  }
}

export class GenWebsite {
  jsrImportSource?: string | undefined;
  logLevel?: esbuild.LogLevel | undefined;

  withImportSource(importSource: string): GenWebsite {
    this.jsrImportSource = importSource;
    return this;
  }

  withLogLevel(logLevel: esbuild.LogLevel): GenWebsite {
    this.logLevel = logLevel;
    return this;
  }

  async generate_website(route: Route) {
    await generate_website(
      undefined,
      route,
      this.jsrImportSource,
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
  let subdir = route.base_route;
  if (parent) {
    subdir = join(parent, subdir);
  }
  outputDir = join(outputDir, subdir);
  await ensureDir(outputDir);
  for (const unit of route.webpages) {
    const html = unit.htmlName;
    const text = unit.genhtml();
    const htmlPath = join(outputDir, html);
    Deno.writeTextFile(htmlPath, text);
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
