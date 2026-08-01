export type QualityIssueCode =
  | "EMPTY_FILE"
  | "DIMENSION_MISMATCH"
  | "IMAGE_LOAD_FAILED";

export interface QualityIssue {
  code: QualityIssueCode;
  page?: number;
  message: string;
}

export interface QualityReport {
  passed: boolean;
  checkedPages: number;
  issues: QualityIssue[];
}

export function createQualityReport(): QualityReport {
  return { passed: true, checkedPages: 0, issues: [] };
}

export function checkRenderedPage(
  report: QualityReport,
  input: {
    page: number;
    canvasWidth: number;
    canvasHeight: number;
    expectedWidth: number;
    expectedHeight: number;
    byteLength: number;
  }
): void {
  report.checkedPages += 1;

  if (
    input.canvasWidth !== input.expectedWidth ||
    input.canvasHeight !== input.expectedHeight
  ) {
    report.issues.push({
      code: "DIMENSION_MISMATCH",
      page: input.page,
      message: `第 ${input.page} 页尺寸为 ${input.canvasWidth}×${input.canvasHeight}，预期为 ${input.expectedWidth}×${input.expectedHeight}`
    });
  }

  if (input.byteLength === 0) {
    report.issues.push({
      code: "EMPTY_FILE",
      page: input.page,
      message: `第 ${input.page} 页导出文件为空`
    });
  }

  report.passed = report.issues.length === 0;
}

export function addFailedImages(
  report: QualityReport,
  sources: string[]
): void {
  for (const source of [...new Set(sources)]) {
    report.issues.push({
      code: "IMAGE_LOAD_FAILED",
      message: `图片加载失败：${shortenSource(source)}`
    });
  }
  report.passed = report.issues.length === 0;
}

function shortenSource(source: string): string {
  return source.length > 100 ? `${source.slice(0, 97)}…` : source;
}
