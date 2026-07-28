import type {
  CustomTemplate,
  XhsTextCardSettings
} from "../settings";
import {
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";

export function createCustomTemplate(
  settings: XhsTextCardSettings,
  name: string,
  id = createTemplateId()
): CustomTemplate {
  return {
    id,
    name: name.trim(),
    baseTemplateId: settings.templateId,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing,
    textPadding: settings.textPadding,
    bgColor: settings.bgColor,
    textColor: settings.textColor,
    accentColor: settings.accentColor,
    fontFamily: settings.fontFamily
  };
}

export function applyCustomTemplate(
  settings: XhsTextCardSettings,
  template: CustomTemplate
): void {
  Object.assign(settings, {
    templateId: template.baseTemplateId,
    fontSize: template.fontSize,
    lineHeight: template.lineHeight,
    letterSpacing: template.letterSpacing,
    textPadding: template.textPadding,
    bgColor: template.bgColor,
    textColor: template.textColor,
    accentColor: template.accentColor,
    fontFamily: template.fontFamily
  });
}

export function parseCustomTemplates(
  value: string
): CustomTemplate[] {
  const parsed = JSON.parse(value) as unknown;
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const templates = values.filter(isCustomTemplate);

  if (templates.length !== values.length || templates.length === 0) {
    throw new Error("JSON 中包含无效模板");
  }

  return templates;
}

export function isCustomTemplate(
  value: unknown
): value is CustomTemplate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    TEMPLATE_IDS.includes(item.baseTemplateId as TemplateId) &&
    [
      "fontSize",
      "lineHeight",
      "letterSpacing",
      "textPadding"
    ].every(
      (key) =>
        typeof item[key] === "number" &&
        Number.isFinite(item[key])
    ) &&
    ["bgColor", "textColor", "accentColor"].every(
      (key) =>
        typeof item[key] === "string" &&
        /^#[0-9a-f]{6}$/i.test(item[key] as string)
    ) &&
    typeof item.fontFamily === "string"
  );
}

export function mergeCustomTemplates(
  current: CustomTemplate[],
  imported: CustomTemplate[]
): CustomTemplate[] {
  const byId = new Map(
    current.map((template) => [template.id, template])
  );

  for (const template of imported) {
    byId.set(template.id, template);
  }

  return [...byId.values()];
}

function createTemplateId(): string {
  return `template-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
