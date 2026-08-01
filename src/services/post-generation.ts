import {
  App,
  TFile,
  type Editor,
  type EditorPosition
} from "obsidian";

export function buildGeneratedImageLinks(
  files: string[]
): string {
  return files
    .map((file) => `![[${file}]]`)
    .join("\n");
}

export function insertGeneratedImageLinks(
  editor: Editor,
  position: EditorPosition,
  files: string[]
): void {
  if (files.length === 0) {
    return;
  }

  const links = buildGeneratedImageLinks(files);
  const block = `\n\n${links}\n`;

  editor.replaceRange(block, position);
  editor.setCursor({
    line: position.line + files.length + 2,
    ch: 0
  });
}

export async function appendGeneratedImageLinks(
  app: App,
  file: TFile,
  files: string[]
): Promise<void> {
  const links = buildGeneratedImageLinks(files);

  if (!links) {
    return;
  }

  await app.vault.process(file, (content) =>
    `${content.trimEnd()}\n\n${links}\n`
  );
}

export async function copyVaultImageToClipboard(
  app: App,
  filePath: string
): Promise<void> {
  if (
    typeof ClipboardItem === "undefined" ||
    !navigator.clipboard?.write
  ) {
    throw new Error("当前设备不支持复制图片到剪贴板");
  }

  const data = await app.vault.adapter.readBinary(filePath);
  const mimeType = filePath.toLowerCase().endsWith(".jpg")
    ? "image/jpeg"
    : "image/png";
  const blob = new Blob([data], { type: mimeType });

  await navigator.clipboard.write([
    new ClipboardItem({
      [mimeType]: blob
    })
  ]);
}

export async function revealGeneratedFile(
  app: App,
  filePath: string
): Promise<"revealed" | "opened"> {
  const file = app.vault.getAbstractFileByPath(filePath);

  if (!(file instanceof TFile)) {
    throw new Error("找不到生成的图片文件");
  }

  const explorer = app.workspace
    .getLeavesOfType("file-explorer")
    .find((leaf) => {
      const view = leaf.view as FileExplorerView;
      return typeof view.revealInFolder === "function";
    });

  if (explorer) {
    await (
      explorer.view as FileExplorerView
    ).revealInFolder!(file);
    return "revealed";
  }

  await app.workspace.getLeaf("tab").openFile(file);
  return "opened";
}

export async function shareGeneratedFiles(
  app: App,
  filePaths: string[],
  title: string
): Promise<void> {
  if (!navigator.share) {
    throw new Error("当前设备不支持系统分享");
  }

  const files = await Promise.all(
    filePaths.map(async (path) => {
      const data = await app.vault.adapter.readBinary(path);
      const mimeType = path.toLowerCase().endsWith(".jpg")
        ? "image/jpeg"
        : "image/png";
      const name = path.split("/").pop() ?? "card.png";
      return new File([data], name, { type: mimeType });
    })
  );
  const shareData: ShareData = { title, files };

  if (navigator.canShare && !navigator.canShare(shareData)) {
    throw new Error("当前设备不支持分享这些图片文件");
  }

  await navigator.share(shareData);
}

interface FileExplorerView {
  revealInFolder?: (file: TFile) => Promise<void>;
}
