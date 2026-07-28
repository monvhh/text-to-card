export type CardLayout = Record<string, unknown>;

export interface CardLayoutSummary {
  label: string;
  text: string;
}

const TYPE_LABELS: Record<string, string> = {
  cover: "封面",
  heading: "标题",
  paragraph: "正文",
  "list-item": "列表项",
  space: "留白",
  blockquote: "引用",
  "code-block": "代码",
  divider: "分隔线",
  image: "图片",
  "math-block": "公式"
};

export function summarizeCardLayout(
  value: unknown
): CardLayoutSummary {
  const layout = asLayout(value);
  const type = String(layout.type ?? "content");
  const label = TYPE_LABELS[type] ?? "内容";

  if (type === "space") {
    return {
      label,
      text: "保留原文中的段落间距"
    };
  }

  if (type === "divider") {
    return {
      label,
      text: "分隔上下内容"
    };
  }

  if (type === "image") {
    return {
      label,
      text:
        readText(layout.alt) ||
        readText(layout.src) ||
        "笔记中的图片"
    };
  }

  const text = [
    layout.text,
    layout.title,
    readLayoutLines(layout.lines)
  ]
    .map(readText)
    .find(Boolean);

  return {
    label,
    text: text ? truncate(text, 64) : `${label}内容`
  };
}

function asLayout(value: unknown): CardLayout {
  return value && typeof value === "object"
    ? (value as CardLayout)
    : {};
}

function readText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function readLayoutLines(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((line) => {
      if (Array.isArray(line)) {
        return line
          .map((segment) =>
            typeof segment === "string"
              ? segment
              : readText(
                  (segment as Record<string, unknown>)?.text
                )
          )
          .join("");
      }

      return typeof line === "string"
        ? line
        : readText(
            (line as Record<string, unknown>)?.text
          );
    })
    .join(" ");
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}
