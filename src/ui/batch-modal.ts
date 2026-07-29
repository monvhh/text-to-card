import {
  Modal,
  Notice,
  Setting,
  type App
} from "obsidian";
import {
  getTemplateName,
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";

export interface BatchGenerationOptions {
  folder: string;
  tag: string;
  templateIds: TemplateId[];
  updateExisting: boolean;
}

export class BatchGenerateModal extends Modal {
  private folder = "";
  private tag = "";
  private updateExisting = true;
  private readonly selected = new Set<TemplateId>();

  constructor(
    app: App,
    initialTemplate: TemplateId,
    private readonly onRun: (
      options: BatchGenerationOptions
    ) => Promise<void>
  ) {
    super(app);
    this.selected.add(initialTemplate);
  }

  onOpen(): void {
    this.modalEl.addClass("xhs-batch-modal");
    this.titleEl.setText("Make cards in batch");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName("来源文件夹")
      .setDesc("留空表示整个 Vault")
      .addText((text) => {
        text
          .setPlaceholder("例如：内容/待发布")
          .setValue(this.folder)
          .onChange((value) => {
            this.folder = value.trim().replace(/^\/+|\/+$/g, "");
          });
      });

    new Setting(this.contentEl)
      .setName("标签筛选")
      .setDesc("留空不过滤；支持填写 #小红书 或 小红书")
      .addText((text) => {
        text
          .setPlaceholder("#小红书")
          .setValue(this.tag)
          .onChange((value) => {
            this.tag = value.trim().replace(/^#/, "");
          });
      });

    new Setting(this.contentEl)
      .setName("更新已有输出")
      .setDesc("使用稳定目录覆盖图片，适合重复执行")
      .addToggle((toggle) => {
        toggle
          .setValue(this.updateExisting)
          .onChange((value) => {
            this.updateExisting = value;
          });
      });

    this.contentEl.createEl("h3", {
      text: "输出模板",
      cls: "xhs-text-card-section-title"
    });

    for (const templateId of TEMPLATE_IDS) {
      new Setting(this.contentEl)
        .setName(getTemplateName(templateId))
        .addToggle((toggle) => {
          toggle
            .setValue(this.selected.has(templateId))
            .onChange((value) => {
              if (value) {
                this.selected.add(templateId);
              } else {
                this.selected.delete(templateId);
              }
            });
        });
    }

    const actions = new Setting(this.contentEl);
    actions.settingEl.addClass("xhs-text-card-actions");
    actions
      .addButton((button) => {
        button
          .setButtonText("取消")
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setButtonText("开始批量生成")
          .setCta()
          .onClick(() => {
            if (this.selected.size === 0) {
              new Notice("请至少选择一个模板");
              return;
            }

            const options: BatchGenerationOptions = {
              folder: this.folder,
              tag: this.tag,
              templateIds: [...this.selected],
              updateExisting: this.updateExisting
            };
            this.close();
            void this.onRun(options);
          });
      });
  }
}
