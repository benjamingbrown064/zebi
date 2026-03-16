// Document export utilities

/**
 * Convert TipTap JSON to Markdown
 */
export function tiptapToMarkdown(content: any): string {
  if (!content || !content.content) return '';

  let markdown = '';

  function processNode(node: any): string {
    let text = '';

    switch (node.type) {
      case 'doc':
        return node.content ? node.content.map(processNode).join('\n\n') : '';

      case 'heading':
        const level = node.attrs?.level || 1;
        const headingText = node.content ? node.content.map(processNode).join('') : '';
        return '#'.repeat(level) + ' ' + headingText;

      case 'paragraph':
        return node.content ? node.content.map(processNode).join('') : '';

      case 'text':
        let textContent = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                textContent = `**${textContent}**`;
                break;
              case 'italic':
                textContent = `*${textContent}*`;
                break;
              case 'underline':
                textContent = `<u>${textContent}</u>`;
                break;
              case 'link':
                textContent = `[${textContent}](${mark.attrs.href})`;
                break;
            }
          });
        }
        return textContent;

      case 'bulletList':
        return node.content ? node.content.map((item: any) => '- ' + processNode(item)).join('\n') : '';

      case 'orderedList':
        return node.content
          ? node.content.map((item: any, index: number) => `${index + 1}. ` + processNode(item)).join('\n')
          : '';

      case 'listItem':
        return node.content ? node.content.map(processNode).join(' ') : '';

      case 'blockquote':
        const quoteText = node.content ? node.content.map(processNode).join('\n') : '';
        return quoteText
          .split('\n')
          .map((line: string) => '> ' + line)
          .join('\n');

      case 'image':
        return `![Image](${node.attrs?.src || ''})`;

      case 'hardBreak':
        return '\n';

      default:
        return node.content ? node.content.map(processNode).join('') : '';
    }
  }

  return processNode(content);
}

/**
 * Convert TipTap JSON to HTML
 */
export function tiptapToHTML(content: any): string {
  if (!content || !content.content) return '';

  function processNode(node: any): string {
    switch (node.type) {
      case 'doc':
        return node.content ? node.content.map(processNode).join('') : '';

      case 'heading':
        const level = node.attrs?.level || 1;
        const headingText = node.content ? node.content.map(processNode).join('') : '';
        return `<h${level}>${headingText}</h${level}>`;

      case 'paragraph':
        const pText = node.content ? node.content.map(processNode).join('') : '';
        return `<p>${pText}</p>`;

      case 'text':
        let textContent = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                textContent = `<strong>${textContent}</strong>`;
                break;
              case 'italic':
                textContent = `<em>${textContent}</em>`;
                break;
              case 'underline':
                textContent = `<u>${textContent}</u>`;
                break;
              case 'link':
                textContent = `<a href="${mark.attrs.href}">${textContent}</a>`;
                break;
            }
          });
        }
        return textContent;

      case 'bulletList':
        const ulItems = node.content ? node.content.map(processNode).join('') : '';
        return `<ul>${ulItems}</ul>`;

      case 'orderedList':
        const olItems = node.content ? node.content.map(processNode).join('') : '';
        return `<ol>${olItems}</ol>`;

      case 'listItem':
        const liText = node.content ? node.content.map(processNode).join('') : '';
        return `<li>${liText}</li>`;

      case 'blockquote':
        const quoteText = node.content ? node.content.map(processNode).join('') : '';
        return `<blockquote>${quoteText}</blockquote>`;

      case 'image':
        return `<img src="${node.attrs?.src || ''}" alt="Image" />`;

      case 'hardBreak':
        return '<br />';

      default:
        return node.content ? node.content.map(processNode).join('') : '';
    }
  }

  return processNode(content);
}

/**
 * Create a full HTML document with styling
 */
export function createHTMLDocument(title: string, content: any): string {
  const bodyContent = tiptapToHTML(content);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 { font-size: 2em; margin-top: 0.67em; margin-bottom: 0.67em; }
    h2 { font-size: 1.5em; margin-top: 0.75em; margin-bottom: 0.75em; }
    h3 { font-size: 1.17em; margin-top: 0.83em; margin-bottom: 0.83em; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; }
    blockquote {
      border-left: 4px solid #e2e8f0;
      padding-left: 1em;
      color: #64748b;
      font-style: italic;
      margin: 1em 0;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
    }
    a {
      color: #2563eb;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyContent}
</body>
</html>`;
}

/**
 * Download a file with given content
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
