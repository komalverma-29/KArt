import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "@/lib/sanitize";

describe("sanitizeRichText (stored XSS protection — design.md §13.3)", () => {
  it("strips <script> payloads entirely", () => {
    const input = '<p>Hello</p><script>alert("stolen")</script>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert(");
  });

  it("strips event-handler attributes like onerror/onclick", () => {
    const input = '<img src="x.jpg" onerror="alert(1)"><p onclick="stealCookies()">Click me</p>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("onclick");
  });

  it("strips javascript: URLs in links", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("javascript:");
  });

  it("strips disallowed tags like <iframe> and <object>", () => {
    const input = '<iframe src="evil.com"></iframe><object data="evil.swf"></object>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("<iframe");
    expect(output).not.toContain("<object");
  });

  it("preserves legitimate formatting tags", () => {
    const input = "<p>An <strong>artist's</strong> <em>journey</em>.</p>";
    const output = sanitizeRichText(input);
    expect(output).toContain("<strong>");
    expect(output).toContain("<em>");
  });

  it("preserves safe links but forces rel=noopener and target=_blank", () => {
    const input = '<a href="https://example.com">my site</a>';
    const output = sanitizeRichText(input);
    expect(output).toContain('href="https://example.com"');
    expect(output).toContain("noopener");
  });

  it("removes an image with a data: URI payload disguised as src (unsupported scheme)", () => {
    const input = '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" alt="x">';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("data:text/html");
  });
});