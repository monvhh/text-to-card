# Changelog

## 1.4.0

- Generate card images from the current note or selection and save them as a WeChat `newspic` image-message draft
- Save the last generated card set to a platform draft without regenerating
- Upload generated cards as permanent WeChat image assets; the first card becomes the cover automatically
- Store AppSecret and Webhook tokens through Obsidian SecretStorage references
- Send only generated card images and draft metadata to a user-configured multi-platform Webhook
- Keep publishing explicit and draft-only; no automatic posting is performed

## 1.3.0

- Remember the last successful generation and provide open/share commands
- Import and export brand/custom preset bundles as versioned JSON
- Share generated image files through the operating system share sheet
- Keep smart-cover and AI features out of the plugin

## 1.2.0

- Render Markdown tables with row-aware pagination
- Render Mermaid blocks through Obsidian and embed the resulting SVG
- Improve local paths with spaces and inline remote images before Canvas export
- Check output dimensions, empty files and failed image loads

## 1.1.0

- Add versioned, validated settings migrations for existing installations
- Show prepare, render, save and quality-check progress
- Add actionable error codes and recovery hints
- Add CI and tag-driven GitHub release automation

## 1.0.0

- Initial public release
- Generate multi-page image cards from the current note or selection
- Add templates, Canvas preview, page editing, batch generation, presets, and
  local browser preview
- Support Obsidian links, embeds, callouts, tasks, footnotes, properties, and
  `obsidian://xhs-text-card` actions
