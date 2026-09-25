/**
 * The smallest Markdown subset the OpenAPI descriptions actually use:
 * paragraphs, `-` bullet lists, fenced code blocks, `**bold**` and `` `code` ``.
 *
 * Deliberately not a general Markdown parser — a narrow renderer we fully
 * understand beats a large one whose edge cases we would have to trust.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Inline spans. Code spans are pulled out first so `**` inside them stays literal. */
export function renderInline(text: string): string {
  const codeSpans: string[] = [];
  const withPlaceholders = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(code);
    return `@@CODE${codeSpans.length - 1}@@`;
  });

  let html = escapeHtml(withPlaceholders)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  html = html.replace(/@@CODE(\d+)@@/g, (_m, i: string) => `<code>${escapeHtml(codeSpans[Number(i)])}</code>`);
  return html;
}

export function renderMarkdown(source: string | undefined): string {
  if (!source) return "";
  const lines = source.split("\n");
  const out: string[] = [];

  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;
  let fence: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${list.map((li) => `<li>${renderInline(li)}</li>`).join("")}</${tag}>`);
      list = [];
      ordered = false;
    }
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (fence === null) {
        flushParagraph();
        flushList();
        fence = [];
      } else {
        out.push(`<pre class="code"><code>${escapeHtml(fence.join("\n"))}</code></pre>`);
        fence = null;
      }
      continue;
    }
    if (fence !== null) {
      fence.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = /^[-*]\s+/.test(trimmed);
    const numbered = /^\d+[.)]\s+/.test(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      // A change of list type starts a new list rather than mixing markers.
      if (list.length && ordered !== numbered) flushList();
      ordered = numbered;
      list.push(trimmed.replace(/^([-*]|\d+[.)])\s+/, ""));
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }

  // An unterminated fence is a bug in the source text, not a reason to drop it.
  if (fence !== null) out.push(`<pre class="code"><code>${escapeHtml(fence.join("\n"))}</code></pre>`);
  flushParagraph();
  flushList();

  return out.join("\n");
}
