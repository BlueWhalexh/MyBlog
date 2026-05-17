import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "xuehang 技术博客",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "zh-CN",
    baseUrl: "xuehang.tech",
    ignorePatterns: [
      "private",
      "Private",
      "templates",
      "Template",
      ".obsidian",
      ".trash",
      "draft",
      "Draft",
      "secret",
      "Secret",
      "daily",
      "Daily",
      "todo",
      "Todo",
      "claude",
      "Claude",
      "intern",
      "Intern",
    ],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Sans SC",
        body: "Noto Sans SC",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#eef2f7",
          lightgray: "#dfe7f0",
          gray: "#667385",
          darkgray: "#3a4452",
          dark: "#18202a",
          secondary: "#b7791f",
          tertiary: "#2b7a78",
          highlight: "rgba(43, 122, 120, 0.12)",
          textHighlight: "#f4b44d88",
        },
        darkMode: {
          light: "#121721",
          lightgray: "#1e2533",
          gray: "#a7b1c2",
          darkgray: "#d4d8e0",
          dark: "#eef3fb",
          secondary: "#f2bd72",
          tertiary: "#71d2c9",
          highlight: "rgba(113, 210, 201, 0.14)",
          textHighlight: "#f2bd7288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
