# 图片草稿发布

Text to Card 发布的是本地生成后的 PNG/JPEG 卡片，不是 Markdown 原文或普通文章
HTML。微信公众号使用 `newspic` 图片消息，也就是贴图草稿，而不是图文草稿。
插件只保存平台草稿，不调用正式发布接口。

## 两种入口

- **Make cards and save to platform draft**：使用当前默认设置生成卡片、保存到
  Vault，再将全部图片保存到平台草稿。
- **Save last generated cards to platform draft**：直接使用上次成功生成的全部图片，
  不重新分页或渲染。

两种入口都必须在弹框中点击 **保存草稿** 才会产生发布网络请求。

## 微信公众号

### 前置条件

- 用户自己的微信公众号 `AppID` 和 `AppSecret`
- 账号具备草稿箱、素材管理等所需 API 权限
- 微信公众平台 IP 白名单允许当前设备的网络出口 IP

在插件设置中填写 AppID，通过 Obsidian SecretStorage 创建并选择 AppSecret。
`data.json` 只保存 SecretStorage 中的密钥名称，不保存 AppSecret 本身。

### 保存流程

1. 读取已经保存到 Vault 的卡片图片
2. 按页码顺序把每张卡片上传为公众号永久图片素材
3. 使用素材 `media_id` 构造 `image_info.image_list`
4. 以 `article_type: "newspic"` 调用草稿箱接口

官方接口最多接受 20 张图片，第一张图片自动作为封面。因为接口要求
`image_media_id` 必须是永久素材，每次保存一组新图片都会增加公众号素材库占用。

## 多平台 Webhook

Webhook 用于连接用户自建或信任的发布服务。地址必须使用 HTTPS，本机
`localhost` 调试例外。Bearer Token 同样使用 Obsidian SecretStorage。

设置中的目标平台用逗号分隔，例如：

```text
微信公众号, 知乎, 企业内容中心
```

请求格式：

```json
{
  "version": 1,
  "action": "save_image_draft",
  "platform": "知乎, 企业内容中心",
  "platforms": ["知乎", "企业内容中心"],
  "document": {
    "sourcePath": "Posts/example.md",
    "title": "文章标题",
    "author": "作者",
    "digest": "摘要",
    "sourceUrl": "https://example.com/article",
    "cardCount": 2
  },
  "cards": [
    {
      "index": 1,
      "filename": "01.png",
      "mimeType": "image/png",
      "base64": "..."
    }
  ]
}
```

Webhook 服务负责把 `cards` 按顺序上传到目标平台并保存为图片草稿。成功响应：

```json
{
  "ok": true,
  "draftId": "draft-123",
  "url": "https://publisher.example.com/drafts/123",
  "message": "草稿已保存"
}
```

失败时返回非 2xx 状态，或返回 `{ "ok": false, "message": "原因" }`。

## 隐私与安全

- 卡片生成、分页和图片保存完全在本地完成
- 只在用户确认保存草稿后发送生成图片和必要的草稿元数据
- 不向微信或 Webhook 发送 Markdown 原文、文章 HTML 或其他 Vault 文件
- 微信凭据只发送给微信 API；Webhook Token 只发送给配置的 Webhook
- 插件不记录凭据、不收集遥测，也不自动发布正式内容
- 使用第三方 Webhook 前，应确认其隐私政策、数据保存周期与平台授权方式
