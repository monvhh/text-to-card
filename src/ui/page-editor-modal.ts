import {
  Modal,
  Notice,
  type App
} from "obsidian";
import {
  CardGenerator,
  type CardGenerationSession
} from "../services/card-generator";

type Layout = Record<string, unknown>;

export class PageEditorModal extends Modal {
  private readonly originalPages: unknown[][];
  private renderVersion = 0;
  private finished = false;

  constructor(
    app: App,
    private readonly generator: CardGenerator,
    private readonly session: CardGenerationSession,
    private readonly maxPages: number,
    private readonly onExport: (
      session: CardGenerationSession
    ) => Promise<void>,
    private readonly onCancel: () => void
  ) {
    super(app);
    this.originalPages = clonePages(session.pages);
  }

  onOpen(): void {
    this.modalEl.addClass("xhs-page-editor-modal");
    this.titleEl.setText("预览并调整分页");
    void this.render();
  }

  onClose(): void {
    this.renderVersion += 1;
    this.contentEl.empty();

    if (!this.finished) {
      this.onCancel();
    }
  }

  private async render(): Promise<void> {
    const version = ++this.renderVersion;
    this.contentEl.empty();

    const toolbar = this.contentEl.createDiv({
      cls: "xhs-page-editor-toolbar"
    });
    const summary = toolbar.createDiv({
      cls: "xhs-page-editor-summary"
    });
    summary.createEl("strong", {
      text: `${this.session.pages.length} 张卡片`
    });
    summary.createSpan({
      text: "可移动页面、合并、按内容块拆分或隐藏内容"
    });

    const toolbarActions = toolbar.createDiv({
      cls: "xhs-page-editor-toolbar-actions"
    });
    const resetButton = toolbarActions.createEl("button", {
      text: "恢复智能分页"
    });
    resetButton.addEventListener("click", () => {
      this.session.pages = clonePages(this.originalPages);
      void this.render();
    });

    const cancelButton = toolbarActions.createEl("button", {
      text: "取消"
    });
    cancelButton.addEventListener("click", () => this.close());

    const exportButton = toolbarActions.createEl("button", {
      text: "确认并导出",
      cls: "mod-cta"
    });
    const exceedsLimit =
      this.maxPages > 0 &&
      this.session.pages.length > this.maxPages;
    exportButton.disabled = exceedsLimit;
    exportButton.addEventListener("click", () => {
      this.finished = true;
      const editedSession = {
        ...this.session,
        pages: clonePages(this.session.pages)
      };
      this.close();
      void this.onExport(editedSession);
    });

    if (exceedsLimit) {
      this.contentEl.createDiv({
        cls: "xhs-page-editor-warning",
        text: `当前 ${this.session.pages.length} 张，超过最大页数 ${this.maxPages}，请合并或隐藏部分内容后导出。`
      });
    }

    const grid = this.contentEl.createDiv({
      cls: "xhs-page-editor-grid"
    });

    for (
      let pageIndex = 0;
      pageIndex < this.session.pages.length;
      pageIndex += 1
    ) {
      if (version !== this.renderVersion) {
        return;
      }

      const card = grid.createEl("article", {
        cls: "xhs-page-editor-card"
      });
      this.renderPageHeader(card, pageIndex);

      const canvasHost = card.createDiv({
        cls: "xhs-page-editor-canvas"
      });
      canvasHost.setText("正在渲染…");

      try {
        const canvas = await this.generator.renderPreviewPage(
          this.session,
          pageIndex,
          0.72
        );

        if (version !== this.renderVersion) {
          canvas.width = 1;
          canvas.height = 1;
          return;
        }

        canvasHost.empty();
        canvasHost.appendChild(canvas);
      } catch (error) {
        canvasHost.setText(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }

      this.renderBlocks(card, pageIndex);
    }
  }

  private renderPageHeader(
    card: HTMLElement,
    pageIndex: number
  ): void {
    const header = card.createDiv({
      cls: "xhs-page-editor-card-header"
    });
    header.createEl("strong", {
      text: `第 ${pageIndex + 1} 张`
    });
    const actions = header.createDiv({
      cls: "xhs-page-editor-card-actions"
    });

    this.addAction(actions, "←", pageIndex > 0, () => {
      swap(this.session.pages, pageIndex, pageIndex - 1);
    });
    this.addAction(
      actions,
      "→",
      pageIndex < this.session.pages.length - 1,
      () => {
        swap(this.session.pages, pageIndex, pageIndex + 1);
      }
    );
    this.addAction(
      actions,
      "合并下一张",
      pageIndex < this.session.pages.length - 1,
      () => {
        const next = this.session.pages[pageIndex + 1] ?? [];
        this.session.pages[pageIndex]?.push(...next);
        this.session.pages.splice(pageIndex + 1, 1);
      }
    );
    this.addAction(
      actions,
      "删除",
      this.session.pages.length > 1,
      () => {
        this.session.pages.splice(pageIndex, 1);
      }
    );
  }

  private renderBlocks(
    card: HTMLElement,
    pageIndex: number
  ): void {
    const page = this.session.pages[pageIndex] ?? [];
    const list = card.createDiv({
      cls: "xhs-page-editor-blocks"
    });
    list.createDiv({
      cls: "xhs-page-editor-block-title",
      text: `内容块 ${page.length}`
    });

    page.forEach((rawLayout, blockIndex) => {
      const layout = asLayout(rawLayout);
      const row = list.createDiv({
        cls: "xhs-page-editor-block"
      });
      row.createSpan({
        cls: "xhs-page-editor-block-text",
        text: summarizeLayout(layout, blockIndex)
      });
      const actions = row.createDiv({
        cls: "xhs-page-editor-block-actions"
      });

      this.addAction(actions, "↑", blockIndex > 0, () => {
        swap(page, blockIndex, blockIndex - 1);
      });
      this.addAction(
        actions,
        "↓",
        blockIndex < page.length - 1,
        () => {
          swap(page, blockIndex, blockIndex + 1);
        }
      );
      this.addAction(
        actions,
        "前页",
        pageIndex > 0,
        () => {
          const [moved] = page.splice(blockIndex, 1);
          this.session.pages[pageIndex - 1]?.push(moved);
          this.removeEmptyPage(pageIndex);
        }
      );
      this.addAction(
        actions,
        "后页",
        pageIndex < this.session.pages.length - 1,
        () => {
          const [moved] = page.splice(blockIndex, 1);
          this.session.pages[pageIndex + 1]?.unshift(moved);
          this.removeEmptyPage(pageIndex);
        }
      );
      this.addAction(
        actions,
        "从此拆分",
        blockIndex > 0,
        () => {
          const nextPage = page.splice(blockIndex);
          this.session.pages.splice(
            pageIndex + 1,
            0,
            nextPage
          );
        }
      );
      this.addAction(
        actions,
        "隐藏",
        page.length > 1 || this.session.pages.length > 1,
        () => {
          page.splice(blockIndex, 1);
          this.removeEmptyPage(pageIndex);
        }
      );
    });
  }

  private addAction(
    parent: HTMLElement,
    label: string,
    enabled: boolean,
    action: () => void
  ): void {
    const button = parent.createEl("button", {
      text: label
    });
    button.disabled = !enabled;
    button.addEventListener("click", () => {
      action();
      void this.render();
    });
  }

  private removeEmptyPage(pageIndex: number): void {
    if (
      this.session.pages[pageIndex]?.length === 0 &&
      this.session.pages.length > 1
    ) {
      this.session.pages.splice(pageIndex, 1);
    }
  }
}

function clonePages(pages: unknown[][]): unknown[][] {
  return pages.map((page) => [...page]);
}

function swap<T>(items: T[], a: number, b: number): void {
  const value = items[a];
  const other = items[b];

  if (value === undefined || other === undefined) {
    return;
  }

  items[a] = other;
  items[b] = value;
}

function asLayout(value: unknown): Layout {
  return value && typeof value === "object"
    ? (value as Layout)
    : {};
}

function summarizeLayout(
  layout: Layout,
  index: number
): string {
  if (layout.type === "cover") {
    return `封面：${String(layout.title ?? "")}`;
  }

  const candidates = [
    layout.text,
    layout.title,
    Array.isArray(layout.lines)
      ? layout.lines
          .map((line) =>
            typeof line === "string"
              ? line
              : String(
                  (line as Record<string, unknown>)?.text ?? ""
                )
          )
          .join(" ")
      : ""
  ];
  const text = candidates
    .find((candidate) => typeof candidate === "string")
    ?.trim();

  return text
    ? text.slice(0, 48)
    : `${String(layout.type ?? "内容")} ${index + 1}`;
}
