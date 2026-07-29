export type PageRatio = "2:3" | "3:4" | "9:16";

export interface PageDimensions {
  width: number;
  height: number;
}

export const PAGE_RATIOS: readonly PageRatio[] = [
  "2:3",
  "3:4",
  "9:16"
];

const PAGE_DIMENSIONS: Record<PageRatio, PageDimensions> = {
  "2:3": { width: 500, height: 750 },
  "3:4": { width: 500, height: 667 },
  "9:16": { width: 500, height: 889 }
};

export function getPageDimensions(
  ratio: PageRatio
): PageDimensions {
  return PAGE_DIMENSIONS[ratio];
}

export function getPageRatioLabel(ratio: PageRatio): string {
  const { width, height } = getPageDimensions(ratio);

  switch (ratio) {
    case "2:3":
      return `小红书长文 · ${ratio}（${width} × ${height}）`;
    case "9:16":
      return `短视频 · ${ratio}（${width} × ${height}）`;
    default:
      return `小红书 · ${ratio}（${width} × ${height}）`;
  }
}

export function isPageRatio(value: unknown): value is PageRatio {
  return (
    typeof value === "string" &&
    PAGE_RATIOS.includes(value as PageRatio)
  );
}
