import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "hxue 技术花园",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "zh-CN",
    baseUrl: "hjhxh.site",
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
          light: "#f2f4f7",
          lightgray: "#e4e8ed",
          gray: "#808792",
          darkgray: "#3a4049",
          dark: "#1a1d26",
          secondary: "#c7861f",
          tertiary: "#1a7f6f",
          highlight: "rgba(26, 127, 111, 0.08)",
          textHighlight: "#e8b44f88",
        },
        darkMode: {
          light: "#1a1d24",
          lightgray: "#2a2e37",
          gray: "#828896",
          darkgray: "#c0c5cf",
          dark: "#e6e8ef",
          secondary: "#e8b44f",
          tertiary: "#5fc2b0",
          highlight: "rgba(95, 194, 176, 0.1)",
          textHighlight: "#e8b44f88",
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
