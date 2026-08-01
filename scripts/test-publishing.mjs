import assert from "node:assert/strict";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: [
      'export * from "../src/publishing/wechat-api.ts";',
      'export * from "../src/publishing/webhook-publisher.ts";'
    ].join("\n"),
    resolveDir: new URL("../scripts", import.meta.url).pathname,
    sourcefile: "publishing-test-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});
const source = result.outputFiles[0]?.text ?? "";
const module = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const requests = [];
const responses = [
  jsonResponse({ access_token: "token-test", expires_in: 7200 }),
  jsonResponse({ media_id: "image-1" }),
  jsonResponse({ media_id: "image-2" }),
  jsonResponse({ media_id: "draft-test" })
];
const http = async (request) => {
  requests.push(request);
  return responses.shift();
};
const api = new module.WechatApiClient(http);

const token = await api.getStableAccessToken("wx-app", "secret");
assert.equal(token.accessToken, "token-test");
assert.match(requests[0].url, /stable_token$/);
assert.deepEqual(JSON.parse(requests[0].body), {
  grant_type: "client_credential",
  appid: "wx-app",
  secret: "secret",
  force_refresh: false
});

const firstImageId = await api.uploadPermanentImage(
  token.accessToken,
  new Uint8Array([1, 2, 3]).buffer,
  "image.png",
  "image/png"
);
assert.equal(firstImageId, "image-1");
assert.match(requests[1].headers["Content-Type"], /multipart\/form-data/);
assert.match(requests[1].url, /type=image/);
assert.ok(requests[1].body.byteLength > 3);

const secondImageId = await api.uploadPermanentImage(
  token.accessToken,
  new Uint8Array([4, 5]).buffer,
  "cover.jpg",
  "image/jpeg"
);
assert.equal(secondImageId, "image-2");

const draftId = await api.addImageDraft(token.accessToken, {
  title: "标题",
  content: "图片配文",
  imageMediaIds: [firstImageId, secondImageId],
  openComments: true
});
assert.equal(draftId, "draft-test");
const draftPayload = JSON.parse(requests[3].body);
assert.equal(draftPayload.articles[0].article_type, "newspic");
assert.equal(draftPayload.articles[0].need_open_comment, 1);
assert.deepEqual(
  draftPayload.articles[0].image_info.image_list,
  [
    { image_media_id: "image-1" },
    { image_media_id: "image-2" }
  ]
);
assert.equal("thumb_media_id" in draftPayload.articles[0], false);
assert.equal("author" in draftPayload.articles[0], false);

await assert.rejects(
  () =>
    new module.WechatApiClient(async () =>
      jsonResponse({ errcode: 40013, errmsg: "invalid appid" })
    ).getStableAccessToken("bad", "bad"),
  /微信 40013/
);

let webhookRequest;
const webhookResult = await module.saveWebhookDraft(
  async (request) => {
    webhookRequest = request;
    return jsonResponse({
      ok: true,
      draftId: "webhook-draft",
      url: "https://publisher.example/drafts/1"
    });
  },
  "https://publisher.example/drafts",
  "webhook-token",
  "publisher",
  {
    platform: "webhook",
    sourcePath: "Notes/post.md",
    title: "标题",
    author: "作者",
    digest: "摘要",
    sourceUrl: "",
    openComments: false,
    cards: [{
      filename: "a.png",
      mimeType: "image/png",
      bytes: new Uint8Array([1, 2, 3]).buffer
    }]
  }
);
assert.equal(webhookResult.draftId, "webhook-draft");
assert.equal(webhookRequest.headers.Authorization, "Bearer webhook-token");
const webhookPayload = JSON.parse(webhookRequest.body);
assert.equal(webhookPayload.action, "save_image_draft");
assert.deepEqual(webhookPayload.platforms, ["publisher"]);
assert.equal(webhookPayload.document.cardCount, 1);
assert.equal(webhookPayload.cards[0].index, 1);
assert.equal(webhookPayload.cards[0].base64, "AQID");
assert.equal("markdown" in webhookPayload.document, false);
assert.equal("html" in webhookPayload.document, false);

await assert.rejects(
  () =>
    new module.WechatApiClient(async () => {
      throw new Error(
        "request failed: https://api.weixin.qq.com/?access_token=sensitive"
      );
    }).uploadPermanentImage(
      "sensitive",
      new Uint8Array([1]).buffer,
      "image.png",
      "image/png"
    ),
  (error) => {
    assert.match(error.message, /网络请求失败/);
    assert.doesNotMatch(error.message, /sensitive|access_token/);
    return true;
  }
);

console.log("Publishing adapter tests passed");

function jsonResponse(json, status = 200) {
  return {
    status,
    headers: { "content-type": "application/json" },
    text: JSON.stringify(json),
    json,
    arrayBuffer: new ArrayBuffer(0)
  };
}
