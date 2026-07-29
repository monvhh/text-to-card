import {
  Modal,
  type App
} from "obsidian";
import {
  CardGenerator,
  type CardGenerationSession
} from "../services/card-generator";
import { summarizeCardLayout } from "../utils/layout-summary";

const SHOW_ADVANCED_BLOCK_EDITOR = false;
const SHOW_RESET_PAGINATION = false;

export class PageEditorModal extends Modal {
  private readonly originalPages: unknown[][];
  private readonly expandedPages = new Set<number>();
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
    private readonly onEditSettings: () => void,
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
      text: `${this.session.width} × ${this.session.height} 基准画布 · 检查生成效果，可删除不需要的卡片`
    });

    const toolbarActions = toolbar.createDiv({
      cls: "xhs-page-editor-toolbar-actions"
    });
    if (SHOW_RESET_PAGINATION) {
      const resetButton = toolbarActions.createEl("button", {
        text: "恢复智能分页"
      });
      resetButton.addEventListener("click", () => {
        this.session.pages = clonePages(this.originalPages);
        void this.render();
      });
    }

    const editButton = toolbarActions.createEl("button", {
      text: "修改设置"
    });
    editButton.addEventListener("click", () => {
      this.finished = true;
      this.close();
      this.onEditSettings();
    });

    const exportButton = toolbarActions.createEl("button", {
      text: "保存卡片",
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
        text: `当前 ${this.session.pages.length} 张，超过最大页数 ${this.maxPages}，请删除部分卡片或返回设置提高限制。`
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

      if (SHOW_ADVANCED_BLOCK_EDITOR) {
        this.renderBlocks(card, pageIndex);
      }
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
    const list = card.createEl("details", {
      cls: "xhs-page-editor-blocks"
    });
    list.open = this.expandedPages.has(pageIndex);
    list.addEventListener("toggle", () => {
      if (list.open) {
        this.expandedPages.add(pageIndex);
      } else {
        this.expandedPages.delete(pageIndex);
      }
    });

    const summary = list.createEl("summary", {
      cls: "xhs-page-editor-block-title",
      text: `调整内容（${page.length} 块）`
    });
    summary.createSpan({
      cls: "xhs-page-editor-block-hint",
      text: "高级"
    });
    const body = list.createDiv({
      cls: "xhs-page-editor-block-list"
    });

    page.forEach((rawLayout, blockIndex) => {
      const blockSummary = summarizeCardLayout(rawLayout);
      const row = body.createDiv({
        cls: "xhs-page-editor-block"
      });
      const description = row.createDiv({
        cls: "xhs-page-editor-block-description"
      });
      description.createSpan({
        cls: "xhs-page-editor-block-type",
        text: blockSummary.label
      });
      description.createSpan({
        cls: "xhs-page-editor-block-text",
        text: blockSummary.text
      });
      const actions = row.createDiv({
        cls: "xhs-page-editor-block-actions"
      });

      this.addAction(
        actions,
        "↑",
        blockIndex > 0,
        () => {
          swap(page, blockIndex, blockIndex - 1);
        },
        "在本张卡片中上移"
      );
      this.addAction(
        actions,
        "↓",
        blockIndex < page.length - 1,
        () => {
          swap(page, blockIndex, blockIndex + 1);
        },
        "在本张卡片中下移"
      );
      this.addAction(
        actions,
        "上一张",
        pageIndex > 0,
        () => {
          const [moved] = page.splice(blockIndex, 1);
          this.session.pages[pageIndex - 1]?.push(moved);
          this.removeEmptyPage(pageIndex);
        }
      );
      this.addAction(
        actions,
        "下一张",
        pageIndex < this.session.pages.length - 1,
        () => {
          const [moved] = page.splice(blockIndex, 1);
          this.session.pages[pageIndex + 1]?.unshift(moved);
          this.removeEmptyPage(pageIndex);
        }
      );
      this.addAction(
        actions,
        "从这里分页",
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
        "不导出",
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
    action: () => void,
    tooltip?: string
  ): void {
    const button = parent.createEl("button", {
      text: label
    });
    if (tooltip) {
      button.setAttribute("aria-label", tooltip);
      button.setAttribute("title", tooltip);
    }
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
