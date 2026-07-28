interface XhsCanvasRenderer {
  render(options: {
    layouts: unknown[];
    index: number;
    totalCount: number;
    config: Record<string, unknown>;
    templateId: string;
    width: number;
    height: number;
    scale: number;
  }): Promise<HTMLCanvasElement>;
}

interface XhsTextSplitter {
  split(markdown: string): Promise<unknown[][]>;
}

interface XhsCore {
  CanvasRenderer: new () => XhsCanvasRenderer;
  TextSplitter: new (
    config: Record<string, unknown>,
    templateId: string
  ) => XhsTextSplitter;
}

declare global {
  var XHS_TEXT_CARD_CORE: XhsCore;
}

export {};
