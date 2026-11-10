/** route-html.mjs 의 타입 (src/content/seo.test.ts 가 가져다 쓴다) */
export interface SeoRoute {
  path: string
  place?: string
  title: string
  description: string
  ogDescription?: string
}

export declare function routeFile(path: string): string
export declare function routeUrl(origin: string, path: string): string
export declare function routeHtml(html: string, route: SeoRoute, origin: string, routes?: readonly SeoRoute[]): string
