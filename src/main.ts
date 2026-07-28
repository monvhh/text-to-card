import {
  type Editor,
  type EditorPosition,
  getAllTags,
  MarkdownView,
  Notice,
  Plugin,
  TFile
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  type XhsTextCardSettings
} from "./settings";
import {
  CardGenerator,
  type CardGenerationOptions,
  type CardGenerationSession
} from "./services/card-generator";
import {
  appendGeneratedImageLinks,
  copyVaultImageToClipboard,
  insertGeneratedImageLinks,
  revealGeneratedFile
} from "./services/post-generation";
import { GenerateCardsModal } from "./ui/generate-modal";
import {
  BatchGenerateModal,
  type BatchGenerationOptions
} from "./ui/batch-modal";
import { PageEditorModal } from "./ui/page-editor-modal";
import { XhsTextCardSettingTab } from "./ui/settings-tab";
import { applyFrontmatterSettings } from "./utils/frontmatter-settings";
import {
  TEMPLATE_IDS,
  type TemplateId
} from "./templates";
import {
  isPathInFolder,
  matchesNormalizedTag,
  parseTemplateIds
} from "./utils/batch";

export default class XhsTextCardPlugin extends Plugin {
  settings: XhsTextCardSettings = { ...DEFAULT_SETTINGS };
  private generator!: CardGenerator;
  private isGenerating = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.generator = new CardGenerator(this.app);

    this.addRibbonIcon(
      "images",
      "生成小红书卡片",
      () => this.openForActiveNote()
    );

    this.addCommand({
      id: "generate-xhs-text-cards",
      name: "生成小红书卡片",
      editorCallback: (editor, view) => {
        if (!view.file) {
          new Notice("请先打开一个 Markdown 文件");
          return;
        }

        this.openFromEditor(editor, view.file);
      }
    });

    this.addCommand({
      id: "batch-generate-xhs-text-cards",
      name: "批量生成小红书卡片",
      callback: () => this.openBatchGenerator()
    });

    this.registerObsidianProtocolHandler(
      "xhs-text-card",
      (params) => {
        void this.handleProtocol(params);
      }
    );

    this.registerEvent(
      this.app.workspace.on(
        "editor-menu",
        (menu, editor, info) => {
          if (!info.file) {
            return;
          }

          menu.addItem((item) => {
            item
              .setTitle("生成小红书卡片")
              .setIcon("images")
              .onClick(() => {
                this.openFromEditor(editor, info.file!);
              });
          });
        }
      )
    );

    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (menu, file) => {
          if (
            !(file instanceof TFile) ||
            file.extension !== "md"
          ) {
            return;
          }

          menu.addItem((item) => {
            item
              .setTitle("生成小红书卡片")
              .setIcon("images")
              .onClick(() => {
                void this.openFromFile(file);
              });
          });
        }
      )
    );

    this.addSettingTab(
      new XhsTextCardSettingTab(this.app, this)
    );
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as
      | Partial<XhsTextCardSettings>
      | null;
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      saved
    );

    if (!saved?.templateSelection) {
      this.settings.templateSelection = this.settings.templateId;
    }

    for (const key of [
      "brandPresets",
      "customTemplates",
      "favoriteTemplateIds",
      "recentTemplateIds"
    ] as const) {
      if (!Array.isArray(this.settings[key])) {
        this.settings[key] = [];
      }
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private openForActiveNote(): void {
    const view =
      this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!view?.file) {
      new Notice("请先打开一个 Markdown 文件");
      return;
    }

    this.openFromEditor(view.editor, view.file);
  }

  private openFromEditor(editor: Editor, file: TFile): void {
    const selection = editor.getSelection();
    const insertionPosition = selection
      ? editor.getCursor("to")
      : getDocumentEnd(editor);

    this.openGenerator(
      selection || editor.getValue(),
      file,
      { editor, insertionPosition }
    );
  }

  private async openFromFile(file: TFile): Promise<void> {
    const markdown = await this.app.vault.cachedRead(file);

    this.openGenerator(markdown, file, {});
  }

  private openBatchGenerator(): void {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    new BatchGenerateModal(
      this.app,
      this.settings.templateId,
      async (options) => {
        await this.runBatch(options);
      }
    ).open();
  }

  private async runBatch(
    options: BatchGenerationOptions,
    exactFiles?: TFile[]
  ): Promise<void> {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    const files =
      exactFiles ??
      this.app.vault
        .getMarkdownFiles()
        .filter((file) =>
          isPathInFolder(file.path, options.folder)
        )
        .filter((file) => this.matchesTag(file, options.tag));

    if (files.length === 0) {
      new Notice("没有找到符合条件的 Markdown 文件");
      return;
    }

    this.isGenerating = true;
    const notice = new Notice(
      `准备批量生成 ${files.length} 篇笔记……`,
      0
    );
    let succeeded = 0;
    const failures: string[] = [];

    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex]!;
        const markdown = await this.app.vault.cachedRead(file);
        const frontmatter =
          this.app.metadataCache.getFileCache(file)?.frontmatter;
        const resolved = applyFrontmatterSettings(
          this.settings,
          frontmatter
        );

        for (const templateId of options.templateIds) {
          notice.setMessage(
            `正在处理 ${fileIndex + 1}/${files.length}：${file.basename} · ${templateId}`
          );

          const generationOptions: CardGenerationOptions = {
            ...resolved.settings,
            templateId,
            templateSelection: templateId,
            coverTitle:
              resolved.coverTitle ?? file.basename,
            updateExisting: options.updateExisting,
            outputNameSuffix: templateId,
            insertLinksAfterGenerate: false,
            copyFirstImageAfterGenerate: false,
            revealOutputAfterGenerate: false
          };

          try {
            await this.generator.generate(
              markdown,
              file,
              generationOptions
            );
            succeeded += 1;
          } catch (error) {
            failures.push(
              `${file.path} (${templateId})：${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`
            );
          }
        }
      }
    } finally {
      notice.hide();
      this.isGenerating = false;
    }

    const total = files.length * options.templateIds.length;
    new Notice(
      failures.length
        ? `批量完成：${succeeded}/${total} 成功，${failures.length} 失败\n${failures
            .slice(0, 3)
            .join("\n")}`
        : `批量完成：${succeeded}/${total} 个输出全部成功`,
      failures.length ? 12000 : 8000
    );
  }

  private matchesTag(file: TFile, tag: string): boolean {
    if (!tag) {
      return true;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const tags = cache ? getAllTags(cache) ?? [] : [];
    return matchesNormalizedTag(tags, tag);
  }

  private async handleProtocol(
    params: Record<string, string>
  ): Promise<void> {
    if (params.folder !== undefined) {
      const templateIds = parseTemplateIds(
        params.templates || params.template || ""
      );
      await this.runBatch({
        folder: params.folder,
        tag: (params.tag || "").replace(/^#/, ""),
        templateIds:
          templateIds.length > 0
            ? templateIds
            : [this.settings.templateId],
        updateExisting: params.update !== "false"
      });
      return;
    }

    const path = params.file;
    const file = path
      ? this.app.vault.getAbstractFileByPath(path)
      : null;

    if (file instanceof TFile && file.extension === "md") {
      if (params.run === "true") {
        const templateId = isTemplateId(params.template)
          ? params.template
          : this.settings.templateId;
        await this.runFilesDirectly(
          [file],
          [templateId],
          params.update === "true"
        );
      } else {
        await this.openFromFile(file);
      }
      return;
    }

    this.openForActiveNote();
  }

  private async runFilesDirectly(
    files: TFile[],
    templateIds: TemplateId[],
    updateExisting: boolean
  ): Promise<void> {
    await this.runBatch(
      {
        folder: "",
        tag: "",
        templateIds,
        updateExisting
      },
      files
    );
  }

  private openGenerator(
    markdown: string,
    file: TFile,
    context: GenerationContext
  ): void {
    if (this.isGenerating) {
      new Notice("已有生成任务正在进行");
      return;
    }

    const frontmatter =
      this.app.metadataCache.getFileCache(file)?.frontmatter;
    const resolved = applyFrontmatterSettings(
      this.settings,
      frontmatter
    );

    new GenerateCardsModal(
      this.app,
      resolved.settings,
      resolved.coverTitle ?? file.basename,
      async (options) => {
        await this.generate(
          markdown,
          file,
          options,
          context,
          !resolved.hasOverrides
        );
      }
    ).open();
  }

  private async generate(
    markdown: string,
    file: TFile,
    options: CardGenerationOptions,
    context: GenerationContext,
    persistSettings: boolean
  ): Promise<void> {
    this.isGenerating = true;

    if (persistSettings) {
      this.settings = {
        ...this.settings,
        templateId: options.templateId,
        templateSelection: options.templateSelection,
        exportFormat: options.exportFormat,
        outputFolder: options.outputFolder,
        includeCover: options.includeCover,
        coverImagePath: options.coverImagePath,
        signatureText: options.signatureText,
        useFileNameAsTitle: options.useFileNameAsTitle,
        stripFrontmatter: options.stripFrontmatter,
        fontSize: options.fontSize,
        lineHeight: options.lineHeight,
        letterSpacing: options.letterSpacing,
        textPadding: options.textPadding,
        bgColor: options.bgColor,
        textColor: options.textColor,
        accentColor: options.accentColor,
        watermarkText: options.watermarkText,
        showPageNumber: options.showPageNumber,
        insertLinksAfterGenerate:
          options.insertLinksAfterGenerate,
        copyFirstImageAfterGenerate:
          options.copyFirstImageAfterGenerate,
        revealOutputAfterGenerate:
          options.revealOutputAfterGenerate,
        maxPages: options.maxPages,
        fontFamily: options.fontFamily,
        logoPath: options.logoPath,
        brandPresetId: options.brandPresetId,
        updateExisting: options.updateExisting,
        outputNameSuffix: options.outputNameSuffix,
        recentTemplateIds: updateRecentTemplates(
          this.settings.recentTemplateIds,
          options.templateSelection
        )
      };
    }

    const notice = new Notice(
      "正在准备卡片预览……",
      0
    );

    try {
      if (persistSettings) {
        await this.saveSettings();
      }
      const session = await this.generator.prepare(
        markdown,
        file,
        options
      );
      notice.hide();

      new PageEditorModal(
        this.app,
        this.generator,
        session,
        options.maxPages,
        async (editedSession) => {
          await this.exportSession(
            editedSession,
            file,
            options,
            context
          );
        },
        () => {
          this.isGenerating = false;
        }
      ).open();
    } catch (error) {
      console.error(
        "[Text to Card] Preview preparation failed",
        error
      );
      notice.hide();
      new Notice(
        `预览失败：${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
        10000
      );
      this.isGenerating = false;
    }
  }

  private async exportSession(
    session: CardGenerationSession,
    file: TFile,
    options: CardGenerationOptions,
    context: GenerationContext
  ): Promise<void> {
    const notice = new Notice(
      "正在导出小红书卡片……",
      0
    );

    try {
      const result = await this.generator.save(
        session,
        file,
        options
      );
      const completedActions: string[] = [];

      if (options.insertLinksAfterGenerate) {
        if (context.editor && context.insertionPosition) {
          insertGeneratedImageLinks(
            context.editor,
            context.insertionPosition,
            result.files
          );
        } else {
          await appendGeneratedImageLinks(
            this.app,
            file,
            result.files
          );
        }
        completedActions.push("已插入图片链接");
      }

      if (
        options.copyFirstImageAfterGenerate &&
        result.files[0]
      ) {
        try {
          await copyVaultImageToClipboard(
            this.app,
            result.files[0]
          );
          completedActions.push("首图已复制");
        } catch (error) {
          console.warn(
            "[Text to Card] Copy image failed",
            error
          );
          new Notice(
            `图片已生成，但复制首图失败：${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
            8000
          );
        }
      }

      if (
        options.revealOutputAfterGenerate &&
        result.files[0]
      ) {
        try {
          const revealResult = await revealGeneratedFile(
            this.app,
            result.files[0]
          );
          completedActions.push(
            revealResult === "revealed"
              ? "已定位生成结果"
              : "已打开首图"
          );
        } catch (error) {
          console.warn(
            "[Text to Card] Reveal output failed",
            error
          );
        }
      }

      new Notice(
        [
          `生成完成：${result.files.length} 张图片`,
          result.outputFolder,
          completedActions.join("，")
        ]
          .filter(Boolean)
          .join("\n"),
        8000
      );
    } catch (error) {
      console.error("[Text to Card] Generation failed", error);
      notice.hide();
      new Notice(
        `生成失败：${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
        10000
      );
    } finally {
      notice.hide();
      this.isGenerating = false;
    }
  }
}

interface GenerationContext {
  editor?: Editor;
  insertionPosition?: EditorPosition;
}

function getDocumentEnd(editor: Editor): EditorPosition {
  const line = editor.lastLine();

  return {
    line,
    ch: editor.getLine(line).length
  };
}

function updateRecentTemplates(
  recent: string[],
  templateId: string
): string[] {
  return [
    templateId,
    ...recent.filter((id) => id !== templateId)
  ].slice(0, 5);
}

function isTemplateId(
  value: unknown
): value is TemplateId {
  return typeof value === "string" &&
    TEMPLATE_IDS.includes(value as TemplateId);
}
