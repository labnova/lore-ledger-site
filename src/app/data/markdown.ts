import { marked } from 'marked';

marked.use({ gfm: true, breaks: false });

/**
 * Markdown → HTML per le bibbie. L'output passa in `[innerHTML]`, dove Angular applica il proprio
 * sanitizer (niente script né handler): il testo arriva comunque dal repo privato, non da utenti.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}
