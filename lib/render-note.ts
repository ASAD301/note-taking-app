import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import type { RootContent } from "hast";
import { editorExtensions, lowlight } from "@/lib/editor-extensions";

// SEC-07: HTML is produced only by the allowed extensions' renderers, and code text is re-escaped.

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function hastToHtml(nodes: RootContent[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return escapeHtml(n.value);
      if (n.type === "element") {
        const cls = n.properties?.className;
        const classes = Array.isArray(cls)
          ? cls
              .map(String)
              .filter((c) => /^[\w-]+$/.test(c))
              .join(" ")
          : "";
        return `<span${classes ? ` class="${classes}"` : ""}>${hastToHtml(n.children as RootContent[])}</span>`;
      }
      return "";
    })
    .join("");
}

/** Server-side syntax highlighting for <pre><code class="language-x"> blocks. */
function highlightCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code(?: class="language-([\w+#-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_m, lang: string | undefined, body: string) => {
      const code = unescapeHtml(body);
      const useLang = lang && lang !== "plaintext" && lowlight.registered(lang) ? lang : null;
      const inner = useLang ? hastToHtml(lowlight.highlight(useLang, code).children) : escapeHtml(code);
      const cls = useLang ? ` class="hljs language-${useLang}"` : ' class="hljs"';
      return `<pre><code${cls}>${inner}</code></pre>`;
    },
  );
}

export function renderNoteHtml(content: JSONContent): string {
  return highlightCodeBlocks(generateHTML(content, editorExtensions));
}
