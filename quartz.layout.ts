import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const giscusRepoId = process.env.GISCUS_REPO_ID
const giscusCategoryId = process.env.GISCUS_CATEGORY_ID
const giscusEnabled = Boolean(giscusRepoId && giscusCategoryId)

const giscusComponents = giscusEnabled
  ? [
      Component.Comments({
        provider: "giscus",
        options: {
          repo: (process.env.GISCUS_REPO ?? "BlueWhalexh/MyBlog") as `${string}/${string}`,
          repoId: giscusRepoId!,
          category: process.env.GISCUS_CATEGORY ?? "Comments",
          categoryId: giscusCategoryId!,
          mapping: "pathname",
          strict: true,
          reactionsEnabled: true,
          inputPosition: "bottom",
          lang: "zh-CN",
        },
      }),
    ]
  : []

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: giscusComponents,
  footer: Component.Footer({
    links: {
      "RSS": "/index.xml",
      "Sitemap": "/sitemap.xml",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
