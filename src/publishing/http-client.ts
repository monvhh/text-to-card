import { requestUrl } from "obsidian";
import type { HttpClient } from "./types";

export const obsidianHttpClient: HttpClient = async (request) => {
  const response = await requestUrl({
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: request.body,
    throw: false
  });

  let json: unknown = null;
  try {
    json = JSON.parse(response.text);
  } catch {
    // Binary and plain-text responses intentionally have no JSON value.
  }

  return {
    status: response.status,
    headers: response.headers,
    text: response.text,
    json,
    arrayBuffer: response.arrayBuffer
  };
};
