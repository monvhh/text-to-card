import {
  FuzzySuggestModal,
  TFile,
  type App
} from "obsidian";

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp"
]);

export class ImageFileSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly onChoose: (file: TFile) => void
  ) {
    super(app);
    this.setPlaceholder("搜索 Vault 内的图片");
  }

  getItems(): TFile[] {
    return this.app.vault
      .getFiles()
      .filter((file) =>
        IMAGE_EXTENSIONS.has(file.extension.toLowerCase())
      );
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}
