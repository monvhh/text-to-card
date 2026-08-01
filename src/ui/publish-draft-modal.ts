import {
  Modal,
  Notice,
  Setting,
  type App
} from "obsidian";
import type { XhsTextCardSettings } from "../settings";
import type { PublishDraftOptions } from "../publishing/publishing-service";

export class PublishDraftModal extends Modal {
  private values: PublishDraftOptions;

  constructor(
    app: App,
    settings: XhsTextCardSettings,
    fileTitle: string,
    private readonly onPublish: (
      options: PublishDraftOptions
    ) => Promise<void>
  ) {
    super(app);
    this.values = {
      platform:
        !settings.wechatAppId && settings.webhookEndpoint
          ? "webhook"
          : "wechat",
      title: fileTitle,
      author: settings.draftDefaultAuthor,
      digest: "",
      sourceUrl: settings.draftDefaultSourceUrl,
      openComments: settings.wechatOpenComments
    };
  }

  onOpen(): void {
    this.modalEl.addClass("xhs-publish-draft-modal");
    this.titleEl.setText("保存到平台草稿");
    this.renderContent();
  }

  private renderContent(): void {
    this.contentEl.empty();
    this.contentEl.createEl("p", {
      text: "发送的是 Text to Card 生成后的卡片图片，不发送 Markdown 原文。只有点击“保存草稿”后才会发送，且不会自动发布。",
      cls: "setting-item-description"
    });

    new Setting(this.contentEl)
      .setName("平台")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("wechat", "微信公众号")
          .addOption("webhook", "多平台 Webhook")
          .setValue(this.values.platform)
          .onChange((value) => {
            this.values.platform = value as "wechat" | "webhook";
            this.renderContent();
          });
      });

    new Setting(this.contentEl)
      .setName(this.values.platform === "wechat" ? "贴图标题" : "草稿标题")
      .addText((text) => {
        text
          .setValue(this.values.title)
          .onChange((value) => {
            this.values.title = value;
          });
      });

    if (this.values.platform === "webhook") {
      new Setting(this.contentEl)
        .setName("作者")
        .setDesc("可选，由目标平台决定是否使用")
        .addText((text) => {
          text
            .setValue(this.values.author)
            .onChange((value) => {
              this.values.author = value;
            });
        });
    }

    new Setting(this.contentEl)
      .setName(this.values.platform === "wechat" ? "贴图配文" : "摘要 / 配文")
      .setDesc("可选")
      .addTextArea((text) => {
        text
          .setValue(this.values.digest)
          .onChange((value) => {
            this.values.digest = value;
          });
        text.inputEl.rows = 3;
      });

    if (this.values.platform === "wechat") {
      this.renderWechatSettings();
    } else {
      this.renderWebhookSettings();
    }

    const actions = new Setting(this.contentEl);
    actions.settingEl.addClass("xhs-text-card-actions");
    actions
      .addButton((button) => {
        button.setButtonText("取消").onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setButtonText("保存草稿")
          .setCta()
          .onClick(() => {
            if (!this.values.title.trim()) {
              new Notice("请填写草稿标题");
              return;
            }
            const values = { ...this.values };
            this.close();
            void this.onPublish(values);
          });
      });
  }

  private renderWechatSettings(): void {
    new Setting(this.contentEl)
      .setName("开启评论")
      .addToggle((toggle) => {
        toggle
          .setValue(this.values.openComments)
          .onChange((value) => {
            this.values.openComments = value;
          });
      });
  }

  private renderWebhookSettings(): void {
    new Setting(this.contentEl)
      .setName("原文链接")
      .setDesc("可选，由目标平台决定是否使用")
      .addText((text) => {
        text
          .setValue(this.values.sourceUrl)
          .onChange((value) => {
            this.values.sourceUrl = value.trim();
          });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
