import {
  Notice,
  PluginSettingTab,
  Setting,
  type App
} from "obsidian";
import type XhsTextCardPlugin from "../main";
import type {
  ExportFormat
} from "../settings";
import {
  getTemplateName,
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";
import {
  applyCustomTemplate,
  createCustomTemplate,
  mergeCustomTemplates,
  parseCustomTemplates
} from "../utils/custom-templates";

export class XhsTextCardSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: XhsTextCardPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("默认生成设置")
      .setHeading();

    new Setting(containerEl)
      .setName("默认模板")
      .addDropdown((dropdown) => {
        for (const templateId of TEMPLATE_IDS) {
          dropdown.addOption(
            templateId,
            getTemplateName(templateId)
          );
        }

        for (const custom of this.plugin.settings.customTemplates) {
          dropdown.addOption(
            `custom:${custom.id}`,
            `自定义 · ${custom.name}`
          );
        }

        dropdown
          .setValue(this.plugin.settings.templateSelection)
          .onChange(async (value) => {
            this.plugin.settings.templateSelection = value;
            const custom =
              this.plugin.settings.customTemplates.find(
                (item) => `custom:${item.id}` === value
              );
            this.plugin.settings.templateId = custom
              ? custom.baseTemplateId
              : (value as TemplateId);

            if (custom) {
              applyCustomTemplate(
                this.plugin.settings,
                custom
              );
            }
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认图片格式")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("png", "PNG")
          .addOption("jpeg", "JPEG")
          .setValue(this.plugin.settings.exportFormat)
          .onChange(async (value) => {
            this.plugin.settings.exportFormat =
              value as ExportFormat;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认输出目录")
      .addText((text) => {
        text
          .setPlaceholder("XHS-Cards")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认更新固定输出")
      .setDesc("覆盖同名图片并移除多余旧页")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.updateExisting)
          .onChange(async (value) => {
            this.plugin.settings.updateExisting = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认生成封面")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeCover)
          .onChange(async (value) => {
            this.plugin.settings.includeCover = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认封面图片路径")
      .setDesc("Vault 内图片路径，留空使用模板封面")
      .addText((text) => {
        text
          .setPlaceholder("Assets/cover.jpg")
          .setValue(this.plugin.settings.coverImagePath)
          .onChange(async (value) => {
            this.plugin.settings.coverImagePath = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认签名")
      .setDesc("留空则不显示")
      .addText((text) => {
        text
          .setPlaceholder("@你的账号")
          .setValue(this.plugin.settings.signatureText)
          .onChange(async (value) => {
            this.plugin.settings.signatureText = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认水印文字")
      .setDesc("留空则不显示水印")
      .addText((text) => {
        text
          .setPlaceholder("请勿搬运")
          .setValue(this.plugin.settings.watermarkText)
          .onChange(async (value) => {
            this.plugin.settings.watermarkText = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认字体")
      .setDesc("使用系统字体族名称，inherit 表示跟随模板")
      .addText((text) => {
        text
          .setPlaceholder("inherit")
          .setValue(this.plugin.settings.fontFamily)
          .onChange(async (value) => {
            this.plugin.settings.fontFamily =
              value.trim() || "inherit";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认 Logo 路径")
      .setDesc("填写 Vault 内的图片路径")
      .addText((text) => {
        text
          .setPlaceholder("Assets/logo.png")
          .setValue(this.plugin.settings.logoPath)
          .onChange(async (value) => {
            this.plugin.settings.logoPath = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认显示页码")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showPageNumber)
          .onChange(async (value) => {
            this.plugin.settings.showPageNumber = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认最大页数")
      .setDesc("0 表示不限制，最大可设为 50")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "50";
        text.inputEl.step = "1";
        text
          .setValue(String(this.plugin.settings.maxPages))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.maxPages = Number.isFinite(
              parsed
            )
              ? Math.min(50, Math.max(0, parsed))
              : 0;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后默认插入图片链接")
      .setDesc("把生成结果嵌入到原笔记的选区末尾或笔记末尾")
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.insertLinksAfterGenerate
          )
          .onChange(async (value) => {
            this.plugin.settings.insertLinksAfterGenerate =
              value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后默认复制首图")
      .setDesc("需要系统允许 Obsidian 访问剪贴板")
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.copyFirstImageAfterGenerate
          )
          .onChange(async (value) => {
            this.plugin.settings.copyFirstImageAfterGenerate =
              value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("生成后默认定位结果")
      .setDesc("优先在文件管理器中定位首图")
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.revealOutputAfterGenerate
          )
          .onChange(async (value) => {
            this.plugin.settings.revealOutputAfterGenerate =
              value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("移除 YAML 属性")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.stripFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.stripFrontmatter = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认使用文件名作为文章标题")
      .setDesc("生成时在正文最前添加一级标题，不修改原笔记")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useFileNameAsTitle)
          .onChange(async (value) => {
            this.plugin.settings.useFileNameAsTitle = value;
            await this.plugin.saveSettings();
          });
      });

    this.renderBrandPresets(containerEl);
    this.renderCustomTemplates(containerEl);
    this.renderFavorites(containerEl);
  }

  private renderBrandPresets(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("品牌预设")
      .setHeading();
    let presetName = "";

    new Setting(containerEl)
      .setName("保存当前品牌设置")
      .setDesc("保存颜色、签名、水印、字体和 Logo")
      .addText((text) => {
        text
          .setPlaceholder("例如：Alice 的知识花园")
          .onChange((value) => {
            presetName = value.trim();
          });
      })
      .addButton((button) => {
        button.setButtonText("保存预设").onClick(async () => {
          if (!presetName) {
            new Notice("请填写品牌预设名称");
            return;
          }

          const id = createId("brand");
          this.plugin.settings.brandPresets.push({
            id,
            name: presetName,
            signatureText:
              this.plugin.settings.signatureText,
            watermarkText:
              this.plugin.settings.watermarkText,
            bgColor: this.plugin.settings.bgColor,
            textColor: this.plugin.settings.textColor,
            accentColor: this.plugin.settings.accentColor,
            fontFamily: this.plugin.settings.fontFamily,
            logoPath: this.plugin.settings.logoPath
          });
          this.plugin.settings.brandPresetId = id;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    for (const preset of this.plugin.settings.brandPresets) {
      new Setting(containerEl)
        .setName(preset.name)
        .setDesc(
          `${preset.signatureText || "无签名"} · ${preset.accentColor}`
        )
        .addButton((button) => {
          button.setButtonText("应用").onClick(async () => {
            Object.assign(this.plugin.settings, {
              brandPresetId: preset.id,
              signatureText: preset.signatureText,
              watermarkText: preset.watermarkText,
              bgColor: preset.bgColor,
              textColor: preset.textColor,
              accentColor: preset.accentColor,
              fontFamily: preset.fontFamily,
              logoPath: preset.logoPath
            });
            await this.plugin.saveSettings();
            this.display();
          });
        })
        .addExtraButton((button) => {
          button
            .setIcon("trash")
            .setTooltip("删除预设")
            .onClick(async () => {
              this.plugin.settings.brandPresets =
                this.plugin.settings.brandPresets.filter(
                  (item) => item.id !== preset.id
                );
              if (
                this.plugin.settings.brandPresetId === preset.id
              ) {
                this.plugin.settings.brandPresetId = "";
              }
              await this.plugin.saveSettings();
              this.display();
            });
        });
    }
  }

  private renderCustomTemplates(
    containerEl: HTMLElement
  ): void {
    new Setting(containerEl)
      .setName("自定义模板")
      .setHeading();
    let templateName = "";

    new Setting(containerEl)
      .setName("复制当前模板")
      .setDesc("以当前模板和样式创建可复用模板")
      .addText((text) => {
        text
          .setPlaceholder("模板名称")
          .onChange((value) => {
            templateName = value.trim();
          });
      })
      .addButton((button) => {
        button.setButtonText("创建").onClick(async () => {
          if (!templateName) {
            new Notice("请填写自定义模板名称");
            return;
          }

          const custom = createCustomTemplate(
            this.plugin.settings,
            templateName
          );
          this.plugin.settings.customTemplates.push(custom);
          this.plugin.settings.templateSelection =
            `custom:${custom.id}`;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    let importJson = "";
    new Setting(containerEl)
      .setName("导入 / 导出 JSON")
      .setDesc("粘贴模板 JSON 后导入，或复制全部模板")
      .addTextArea((text) => {
        text
          .setPlaceholder('{"name":"我的模板", ...}')
          .onChange((value) => {
            importJson = value;
          });
        text.inputEl.rows = 4;
      })
      .addButton((button) => {
        button.setButtonText("导入").onClick(async () => {
          try {
            const templates = parseCustomTemplates(importJson);
            this.plugin.settings.customTemplates = mergeCustomTemplates(
              this.plugin.settings.customTemplates,
              templates
            );
            await this.plugin.saveSettings();
            new Notice(`已导入 ${templates.length} 个模板`);
            this.display();
          } catch (error) {
            new Notice(
              `导入失败：${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`
            );
          }
        });
      })
      .addButton((button) => {
        button.setButtonText("复制 JSON").onClick(async () => {
          try {
            await navigator.clipboard.writeText(
              JSON.stringify(
                this.plugin.settings.customTemplates,
                null,
                2
              )
            );
            new Notice("自定义模板 JSON 已复制");
          } catch {
            new Notice("复制失败，请检查剪贴板权限");
          }
        });
      });

    for (const template of this.plugin.settings.customTemplates) {
      new Setting(containerEl)
        .setName(template.name)
        .setDesc(
          `基于 ${getTemplateName(template.baseTemplateId)}`
        )
        .addExtraButton((button) => {
          button
            .setIcon("trash")
            .setTooltip("删除模板")
            .onClick(async () => {
              this.plugin.settings.customTemplates =
                this.plugin.settings.customTemplates.filter(
                  (item) => item.id !== template.id
                );
              await this.plugin.saveSettings();
              this.display();
            });
        });
    }
  }

  private renderFavorites(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("模板收藏与最近使用")
      .setHeading();
    let selected: TemplateId = this.plugin.settings.templateId;

    new Setting(containerEl)
      .setName("收藏模板")
      .setDesc(
        this.plugin.settings.favoriteTemplateIds.length
          ? `已收藏：${this.plugin.settings.favoriteTemplateIds
              .map((id) => getTemplateName(id as TemplateId))
              .join("、")}`
          : "尚未收藏模板"
      )
      .addDropdown((dropdown) => {
        for (const id of TEMPLATE_IDS) {
          dropdown.addOption(id, getTemplateName(id));
        }
        dropdown.setValue(selected).onChange((value) => {
          selected = value as TemplateId;
        });
      })
      .addButton((button) => {
        button.setButtonText("切换收藏").onClick(async () => {
          const favorites =
            this.plugin.settings.favoriteTemplateIds;
          this.plugin.settings.favoriteTemplateIds =
            favorites.includes(selected)
              ? favorites.filter((id) => id !== selected)
              : [...favorites, selected];
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
