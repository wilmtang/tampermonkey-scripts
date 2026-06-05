// ==UserScript==
// @name         AI Copy Cleaner for Obsidian
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      0.1.2
// @description  Copy Gemini/ChatGPT answers as tight Markdown/HTML so Obsidian does not add blank lines inside lists.
// @author       wilmtang
// @license      MIT
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/AICopyCleaner
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/AICopyCleaner/AI%20Copy%20Cleaner%20for%20Obsidian.user.js
// @downloadURL  https://raw.githubusercontent.com/wilmtang/tampermonkey-scripts/main/AICopyCleaner/AI%20Copy%20Cleaner%20for%20Obsidian.user.js
// @match        https://gemini.google.com/*
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const INLINE_TAGS = new Set([
    '#text',
    'A',
    'ABBR',
    'B',
    'BDI',
    'BDO',
    'CITE',
    'CODE',
    'DATA',
    'DEL',
    'DFN',
    'EM',
    'I',
    'INS',
    'KBD',
    'MARK',
    'Q',
    'S',
    'SAMP',
    'SMALL',
    'SPAN',
    'STRONG',
    'SUB',
    'SUP',
    'TIME',
    'U',
    'VAR',
    'WBR',
  ]);

  const SKIP_TAGS = new Set([
    'BUTTON',
    'CANVAS',
    'INPUT',
    'MAT-ICON',
    'MENU',
    'NOSCRIPT',
    'SCRIPT',
    'SELECT',
    'STYLE',
    'SVG',
    'TEXTAREA',
  ]);

  const MATH_SELECTOR = [
    '.katex',
    '.katex-display',
    '.katex-html',
    '.MathJax',
    '.MathJax_Display',
    'mjx-container',
    'math',
    'annotation',
    'script[type^="math/tex"]',
    '[data-latex]',
    '[data-tex]',
    '[data-math]',
    '[data-original-tex]',
  ].join(',');

  const TEX_DATA_ATTRIBUTES = ['data-latex', 'data-tex', 'data-math', 'data-original-tex'];

  const MATH_SYMBOLS = new Map([
    ['≤', '\\le'],
    ['≥', '\\ge'],
    ['≠', '\\ne'],
    ['≈', '\\approx'],
    ['≡', '\\equiv'],
    ['×', '\\times'],
    ['÷', '\\div'],
    ['±', '\\pm'],
    ['∓', '\\mp'],
    ['·', '\\cdot'],
    ['−', '-'],
    ['∞', '\\infty'],
    ['∈', '\\in'],
    ['∉', '\\notin'],
    ['⊂', '\\subset'],
    ['⊆', '\\subseteq'],
    ['⊃', '\\supset'],
    ['⊇', '\\supseteq'],
    ['∪', '\\cup'],
    ['∩', '\\cap'],
    ['∑', '\\sum'],
    ['∏', '\\prod'],
    ['∫', '\\int'],
    ['√', '\\sqrt'],
    ['∂', '\\partial'],
    ['∇', '\\nabla'],
    ['∀', '\\forall'],
    ['∃', '\\exists'],
    ['¬', '\\neg'],
    ['∧', '\\land'],
    ['∨', '\\lor'],
    ['→', '\\to'],
    ['←', '\\leftarrow'],
    ['↔', '\\leftrightarrow'],
    ['⇒', '\\Rightarrow'],
    ['⇐', '\\Leftarrow'],
    ['⇔', '\\Leftrightarrow'],
    ['α', '\\alpha'],
    ['β', '\\beta'],
    ['γ', '\\gamma'],
    ['δ', '\\delta'],
    ['ε', '\\epsilon'],
    ['θ', '\\theta'],
    ['λ', '\\lambda'],
    ['μ', '\\mu'],
    ['π', '\\pi'],
    ['ρ', '\\rho'],
    ['σ', '\\sigma'],
    ['τ', '\\tau'],
    ['φ', '\\phi'],
    ['ω', '\\omega'],
    ['Γ', '\\Gamma'],
    ['Δ', '\\Delta'],
    ['Θ', '\\Theta'],
    ['Λ', '\\Lambda'],
    ['Π', '\\Pi'],
    ['Σ', '\\Sigma'],
    ['Φ', '\\Phi'],
    ['Ω', '\\Omega'],
  ]);

  const KATEX_OPERATOR_NAMES = new Set([
    'arccos',
    'arcsin',
    'arctan',
    'arg',
    'cos',
    'cosh',
    'cot',
    'coth',
    'csc',
    'deg',
    'det',
    'dim',
    'exp',
    'gcd',
    'hom',
    'inf',
    'ker',
    'lg',
    'lim',
    'liminf',
    'limsup',
    'ln',
    'log',
    'max',
    'min',
    'Pr',
    'sec',
    'sin',
    'sinh',
    'sup',
    'tan',
    'tanh',
  ]);

  document.addEventListener('copy', cleanCopy, true);
  document.addEventListener('keydown', copyShortcut, true);

  function copyShortcut(event) {
    if (!(event.altKey && event.shiftKey && event.code === 'KeyC')) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || isEditableSelection(selection)) return;

    const payload = buildClipboardPayload(selection);
    if (!payload) return;

    event.preventDefault();
    if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) {
      fallbackCopy(payload.markdown);
      return;
    }

    navigator.clipboard
      .write([
        new ClipboardItem({
          'text/plain': new Blob([payload.markdown], { type: 'text/plain' }),
          'text/html': new Blob([payload.html], { type: 'text/html' }),
        }),
      ])
      .then(() => showToast('Copied clean Markdown'))
      .catch(() => fallbackCopy(payload.markdown));
  }

  function cleanCopy(event) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || isEditableSelection(selection)) return;

    const payload = buildClipboardPayload(selection);
    if (!payload) return;
    if (!event.clipboardData) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    event.clipboardData.setData('text/plain', payload.markdown);
    event.clipboardData.setData('text/markdown', payload.markdown);
    event.clipboardData.setData('text/html', payload.html);
    showToast('Copied clean Markdown');
  }

  function buildClipboardPayload(selection) {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < selection.rangeCount; index += 1) {
      fragment.appendChild(selection.getRangeAt(index).cloneContents());
    }

    const markdown = cleanupMarkdown(nodesToMarkdown(Array.from(fragment.childNodes), { tight: false }));
    if (!markdown) return null;

    return {
      markdown,
      html: normalizeHtml(nodesToHtml(Array.from(fragment.childNodes), { inListItem: false })),
    };
  }

  function isEditableSelection(selection) {
    const nodes = [selection.anchorNode, selection.focusNode];
    return nodes.some((node) => {
      const element = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
      return Boolean(
        element &&
          element.closest(
            'textarea,input,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]',
          ),
      );
    });
  }

  function nodesToMarkdown(nodes, context) {
    const visibleNodes = nodes.filter((node) => !isEmptyCopyNode(node));
    const allInline = visibleNodes.length > 0 && visibleNodes.every(isInlineCopyNode);
    const separator = context.tight || allInline ? '' : '\n\n';

    return visibleNodes
      .map((node) => nodeToMarkdown(node, { ...context, tight: context.tight || allInline }))
      .filter(Boolean)
      .join(separator);
  }

  function nodeToMarkdown(node, context) {
    if (!node) return '';

    if (isMathElement(node)) {
      return renderMathMarkdown(node, context);
    }

    if (shouldSkip(node)) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      const normalized = normalizeInlineText(node.textContent || '');
      return context.tight ? normalized : normalized.trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName;

    if (tag === 'BR') return '\n';
    if (tag === 'HR') return '---';

    if (tag === 'PRE') {
      return renderCodeBlock(node);
    }

    if (tag === 'CODE') {
      return renderInlineCode(node.textContent || '');
    }

    if (tag === 'STRONG' || tag === 'B') {
      return wrapInline('**', childrenToInlineMarkdown(node, context));
    }

    if (tag === 'EM' || tag === 'I') {
      return wrapInline('*', childrenToInlineMarkdown(node, context));
    }

    if (tag === 'A') {
      return renderLink(node, context);
    }

    if (/^H[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      return `${'#'.repeat(level)} ${childrenToInlineMarkdown(node, context).trim()}`;
    }

    if (tag === 'UL' || tag === 'OL') {
      return renderList(node, tag === 'OL', context);
    }

    if (tag === 'LI') {
      return renderListItem(node, context, '-', 1);
    }

    if (tag === 'BLOCKQUOTE') {
      return prefixLines(nodesToMarkdown(Array.from(node.childNodes), { ...context, tight: false }), '> ');
    }

    if (tag === 'TABLE') {
      return renderTable(node);
    }

    if (tag === 'P') {
      return childrenToInlineMarkdown(node, context).trim();
    }

    if (isInlineElement(node)) {
      return childrenToInlineMarkdown(node, context);
    }

    return nodesToMarkdown(Array.from(node.childNodes), { ...context, tight: false });
  }

  function childrenToInlineMarkdown(node, context) {
    return Array.from(node.childNodes)
      .map((child) => nodeToMarkdown(child, { ...context, tight: true }))
      .join('')
      .replace(/[ \t]*\n[ \t]*/g, ' ')
      .replace(/[ \t]{2,}/g, ' ');
  }

  function renderList(listNode, ordered, context) {
    const items = Array.from(listNode.children).filter((child) => child.tagName === 'LI');
    return items
      .map((item, index) => {
        const marker = ordered ? `${index + 1}.` : '-';
        return renderListItem(item, context, marker, index + 1);
      })
      .join('\n');
  }

  function renderListItem(itemNode, context, marker) {
    const inlineParts = [];
    const nestedBlocks = [];

    Array.from(itemNode.childNodes).forEach((child) => {
      if (shouldSkip(child) && !isMathElement(child)) return;

      if (child.nodeType === Node.ELEMENT_NODE && (child.tagName === 'UL' || child.tagName === 'OL')) {
        nestedBlocks.push(renderList(child, child.tagName === 'OL', { ...context, tight: true }));
        return;
      }

      const markdown = nodeToMarkdown(child, { ...context, tight: true }).trim();
      if (markdown) inlineParts.push(markdown);
    });

    const firstLine = `${marker} ${inlineParts.join(' ').replace(/[ \t]{2,}/g, ' ').trim()}`.trimEnd();
    const nested = nestedBlocks
      .filter(Boolean)
      .map((block) => prefixLines(block, '  '))
      .join('\n');

    return [firstLine, nested].filter(Boolean).join('\n');
  }

  function renderLink(node, context) {
    const label = childrenToInlineMarkdown(node, context).trim() || node.href;
    const href = node.getAttribute('href') || '';
    if (!href || href === label) return label;
    return `[${label.replace(/]/g, '\\]')}](${href.replace(/\)/g, '%29')})`;
  }

  function renderInlineCode(text) {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const fence = clean.includes('`') ? '``' : '`';
    const padding = clean.startsWith('`') || clean.endsWith('`') ? ' ' : '';
    return `${fence}${padding}${clean}${padding}${fence}`;
  }

  function renderCodeBlock(node) {
    const code = node.textContent || '';
    const fence = code.includes('```') ? '````' : '```';
    return `${fence}\n${code.replace(/\n+$/, '')}\n${fence}`;
  }

  function renderTable(table) {
    const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.children).map((cell) => cleanupMarkdown(childrenToInlineMarkdown(cell, { tight: true }))),
    );

    if (!rows.length) return '';

    const columnCount = Math.max(...rows.map((row) => row.length));
    const normalizedRows = rows.map((row) => {
      const copy = row.slice();
      while (copy.length < columnCount) copy.push('');
      return copy;
    });

    const header = normalizedRows[0];
    const divider = header.map(() => '---');
    const body = normalizedRows.slice(1);
    return [header, divider, ...body]
      .map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`)
      .join('\n');
  }

  function nodesToHtml(nodes, context) {
    return nodes.map((node) => nodeToHtml(node, context)).join('');
  }

  function nodeToHtml(node, context) {
    if (!node) return '';

    if (isMathElement(node)) {
      return escapeHtml(renderMathMarkdown(node, context));
    }

    if (shouldSkip(node)) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const upperTag = node.tagName;

    if (upperTag === 'BR') return '<br>';
    if (upperTag === 'HR') return '<hr>';
    if (upperTag === 'B') return `<strong>${nodesToHtml(Array.from(node.childNodes), context)}</strong>`;
    if (upperTag === 'I') return `<em>${nodesToHtml(Array.from(node.childNodes), context)}</em>`;
    if (upperTag === 'SPAN' || upperTag === 'DIV') {
      return nodesToHtml(Array.from(node.childNodes), context);
    }

    if (upperTag === 'P' && context.inListItem) {
      return nodesToHtml(Array.from(node.childNodes), context);
    }

    if (upperTag === 'A') {
      const href = node.getAttribute('href');
      const safeHref = href ? ` href="${escapeAttribute(href)}"` : '';
      return `<a${safeHref}>${nodesToHtml(Array.from(node.childNodes), context)}</a>`;
    }

    if (upperTag === 'LI') {
      return `<li>${nodesToHtml(Array.from(node.childNodes), { ...context, inListItem: true })}</li>`;
    }

    if (
      [
        'blockquote',
        'code',
        'del',
        'em',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'kbd',
        'mark',
        'ol',
        'p',
        'pre',
        's',
        'strong',
        'sub',
        'sup',
        'table',
        'tbody',
        'td',
        'th',
        'thead',
        'tr',
        'ul',
      ].includes(tag)
    ) {
      return `<${tag}>${nodesToHtml(Array.from(node.childNodes), {
        ...context,
        inListItem: context.inListItem || upperTag === 'LI',
      })}</${tag}>`;
    }

    return nodesToHtml(Array.from(node.childNodes), context);
  }

  function renderMathMarkdown(node, context) {
    const math = extractMath(node);
    if (!math || !math.tex) return '';

    return wrapMathMarkdown(math.tex, math.display, context);
  }

  function extractMath(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    const display = isDisplayMath(node);
    const directSource = getDirectTexSource(node);
    if (directSource) return { tex: directSource, display };

    const annotation = findTexAnnotation(node);
    if (annotation) return { tex: annotation, display };

    const mathMl = findMathMlTex(node);
    if (mathMl) return { tex: mathMl, display };

    const katex = findKatexTex(node);
    if (katex) return { tex: katex, display };

    const ariaTex = findAriaMathTex(node);
    if (ariaTex) return { tex: ariaTex, display };

    return null;
  }

  function getDirectTexSource(node) {
    if (node.tagName.toUpperCase() === 'SCRIPT' && /^math\/tex/i.test(node.getAttribute('type') || '')) {
      return normalizeTexSource(node.textContent || '');
    }

    for (const attribute of TEX_DATA_ATTRIBUTES) {
      const value = node.getAttribute(attribute);
      if (value) return normalizeTexSource(value);
    }

    return '';
  }

  function findTexAnnotation(node) {
    const annotations = [];

    if (node.tagName.toUpperCase() === 'ANNOTATION') {
      annotations.push(node);
    }

    annotations.push(...Array.from(node.querySelectorAll('annotation')));

    const texAnnotation = annotations.find((annotation) => {
      const encoding = (annotation.getAttribute('encoding') || '').toLowerCase();
      return encoding === 'application/x-tex' || encoding === 'application/x-latex';
    });

    return texAnnotation ? normalizeTexSource(texAnnotation.textContent || '') : '';
  }

  function findMathMlTex(node) {
    const mathNode = node.tagName.toUpperCase() === 'MATH' ? node : node.querySelector('math');
    if (!mathNode) return '';

    const altText = mathNode.getAttribute('alttext') || mathNode.getAttribute('alt');
    if (altText) return normalizeTexSource(altText);

    return cleanupTex(renderMathMlNode(mathNode));
  }

  function findKatexTex(node) {
    const katexNode = node.classList.contains('katex') ? node : node.querySelector('.katex');
    const katexHtml =
      (node.classList.contains('katex-html') && node) ||
      (katexNode && katexNode.querySelector('.katex-html')) ||
      node.querySelector('.katex-html');

    if (!katexNode && !katexHtml) return '';

    return cleanupTex(renderKatexChildren(katexHtml || katexNode));
  }

  function findAriaMathTex(node) {
    if (!isKnownMathShell(node)) return '';

    const ariaLabel = node.getAttribute('aria-label');
    return ariaLabel ? normalizeTexSource(ariaLabel) : '';
  }

  function renderMathMlNode(node) {
    if (!node) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return mapMathText(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes);
    const childTex = () => cleanupTex(children.map(renderMathMlNode).join(''));

    if (tag === 'annotation') return '';
    if (tag === 'mfrac') return `\\frac{${renderMathMlNode(children[0])}}{${renderMathMlNode(children[1])}}`;
    if (tag === 'msqrt') return `\\sqrt{${childTex()}}`;
    if (tag === 'mroot') return `\\sqrt[${renderMathMlNode(children[1])}]{${renderMathMlNode(children[0])}}`;
    if (tag === 'msup') return `${renderMathMlNode(children[0])}^{${renderMathMlNode(children[1])}}`;
    if (tag === 'msub') return `${renderMathMlNode(children[0])}_{${renderMathMlNode(children[1])}}`;
    if (tag === 'msubsup') {
      return `${renderMathMlNode(children[0])}_{${renderMathMlNode(children[1])}}^{${renderMathMlNode(children[2])}}`;
    }
    if (tag === 'mover') return `${renderMathMlNode(children[0])}^{${renderMathMlNode(children[1])}}`;
    if (tag === 'munder') return `${renderMathMlNode(children[0])}_{${renderMathMlNode(children[1])}}`;
    if (tag === 'munderover') {
      return `${renderMathMlNode(children[0])}_{${renderMathMlNode(children[1])}}^{${renderMathMlNode(children[2])}}`;
    }

    return childTex();
  }

  function renderKatexNode(node) {
    if (!node) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return mapMathText(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const classList = node.classList;

    if (
      classList.contains('katex-mathml') ||
      classList.contains('strut') ||
      classList.contains('pstrut') ||
      classList.contains('vlist-s') ||
      classList.contains('frac-line') ||
      classList.contains('sqrt-line')
    ) {
      return '';
    }

    if (classList.contains('mspace')) return ' ';
    if (classList.contains('mfrac')) return renderKatexFraction(node);
    if (classList.contains('sqrt')) return renderKatexSqrt(node);
    if (classList.contains('msupsub')) return renderKatexScripts(node);

    if (hasDirectKatexScript(node)) {
      return Array.from(node.childNodes)
        .map((child) => renderKatexNode(child))
        .join('');
    }

    const rendered = renderKatexChildren(node);
    return normalizeKatexElementText(rendered, node);
  }

  function renderKatexChildren(node) {
    return Array.from(node.childNodes).map(renderKatexNode).join('');
  }

  function renderKatexFraction(node) {
    const pieces = collectKatexVlistPieces(node).sort(sortByTopPosition);
    if (pieces.length < 2) return cleanupTex(renderKatexChildren(node));

    return `\\frac{${pieces[0].tex}}{${pieces[pieces.length - 1].tex}}`;
  }

  function renderKatexSqrt(node) {
    const pieces = collectKatexVlistPieces(node).sort(sortByTopPosition);
    const radicand = pieces.length ? pieces[pieces.length - 1].tex : cleanupTex(renderKatexChildren(node));
    return radicand ? `\\sqrt{${radicand}}` : '';
  }

  function renderKatexScripts(node) {
    const pieces = collectKatexVlistPieces(node).sort(sortByTopPosition);
    if (!pieces.length) return '';

    const scripts = { sub: '', sup: '' };

    if (pieces.length === 1) {
      if (pieces[0].top <= -2.7) {
        scripts.sup = pieces[0].tex;
      } else {
        scripts.sub = pieces[0].tex;
      }
    } else {
      scripts.sup = pieces[0].tex;
      scripts.sub = pieces[pieces.length - 1].tex;
    }

    return `${scripts.sub ? `_{${scripts.sub}}` : ''}${scripts.sup ? `^{${scripts.sup}}` : ''}`;
  }

  function collectKatexVlistPieces(node) {
    return Array.from(node.querySelectorAll('.vlist > span'))
      .map((span) => ({
        tex: cleanupTex(renderKatexChildren(span)),
        top: getKatexTopPosition(span),
      }))
      .filter((piece) => piece.tex);
  }

  function hasDirectKatexScript(node) {
    return Array.from(node.children).some((child) => child.classList.contains('msupsub'));
  }

  function normalizeKatexElementText(text, node) {
    const mapped = mapMathText(text);
    if (!mapped) return '';

    if (node.classList.contains('mrel') || node.classList.contains('mbin')) {
      return ` ${mapped} `;
    }

    if (node.classList.contains('mop') && KATEX_OPERATOR_NAMES.has(mapped)) {
      return `\\${mapped}`;
    }

    return mapped;
  }

  function mapMathText(text) {
    return Array.from(text || '')
      .map((character) => MATH_SYMBOLS.get(character) || character)
      .join('');
  }

  function getKatexTopPosition(node) {
    const match = (node.getAttribute('style') || '').match(/top:\s*(-?\d+(?:\.\d+)?)em/);
    return match ? Number(match[1]) : 0;
  }

  function sortByTopPosition(left, right) {
    return left.top - right.top;
  }

  function isMathElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    if (matchesMathSelector(node)) return true;
    return isKnownMathShell(node) && Boolean(findTexAnnotation(node) || findKatexTex(node) || findMathMlTex(node));
  }

  function matchesMathSelector(node) {
    try {
      return node.matches(MATH_SELECTOR);
    } catch (_error) {
      return false;
    }
  }

  function isKnownMathShell(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(
      node.closest(
        '.katex,.katex-display,.math-inline,.math-display,.MathJax,.MathJax_Display,mjx-container',
      ) ||
        node.classList.contains('math-inline') ||
        node.classList.contains('math-display'),
    );
  }

  function isDisplayMath(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;

    const scriptType = node.tagName.toUpperCase() === 'SCRIPT' ? node.getAttribute('type') || '' : '';
    return Boolean(
      /mode=display/i.test(scriptType) ||
        node.getAttribute('display') === 'block' ||
        node.getAttribute('display') === 'true' ||
        node.classList.contains('katex-display') ||
        node.classList.contains('math-display') ||
        node.classList.contains('MathJax_Display') ||
        node.closest('.katex-display,.math-display,.MathJax_Display,mjx-container[display="true"]'),
    );
  }

  function wrapMathMarkdown(tex, display, context) {
    const clean = normalizeTexSource(tex);
    if (!clean) return '';

    if (display) {
      return context.tight ? `$$${clean}$$` : `$$\n${clean}\n$$`;
    }

    return `$${clean.replace(/\$/g, '\\$')}$`;
  }

  function normalizeTexSource(tex) {
    return stripMathDelimiters((tex || '').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim())
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .trim();
  }

  function stripMathDelimiters(tex) {
    const clean = tex.trim();

    if (clean.startsWith('$$') && clean.endsWith('$$')) return clean.slice(2, -2).trim();
    if (clean.startsWith('\\[') && clean.endsWith('\\]')) return clean.slice(2, -2).trim();
    if (clean.startsWith('\\(') && clean.endsWith('\\)')) return clean.slice(2, -2).trim();
    if (clean.startsWith('$') && clean.endsWith('$')) return clean.slice(1, -1).trim();

    return clean;
  }

  function cleanupTex(tex) {
    return (tex || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t\r\n]+/g, ' ')
      .replace(/\s+([,.;:!?)\]}])/g, '$1')
      .replace(/([([{])\s+/g, '$1')
      .replace(/\s*(\\(?:approx|cdot|cup|cap|div|equiv|ge|in|land|le|lor|mp|ne|notin|pm|subset|subseteq|supset|supseteq|times)|[=<>+\-])\s*/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeHtml(html) {
    return html
      .replace(/<li>\s*<p>/g, '<li>')
      .replace(/<\/p>\s*(<(?:ul|ol)>)/g, '$1')
      .replace(/\s*<\/p>\s*<\/li>/g, '</li>')
      .trim();
  }

  function cleanupMarkdown(markdown) {
    const lines = markdown
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n');

    let fence = '';
    const cleaned = [];

    lines.forEach((line) => {
      const withoutTrailingSpace = line.replace(/[ \t]+$/g, '');
      const trimmed = withoutTrailingSpace.trim();
      const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

      if (fenceMatch) {
        if (!fence) {
          fence = fenceMatch[1];
        } else if (trimmed.startsWith(fence)) {
          fence = '';
        }
        cleaned.push(withoutTrailingSpace);
        return;
      }

      if (fence) {
        cleaned.push(withoutTrailingSpace);
        return;
      }

      const indent = withoutTrailingSpace.match(/^[ \t]*/)[0].replace(/\t/g, '    ');
      const body = withoutTrailingSpace.slice(indent.length).replace(/[ \t]{2,}/g, ' ');
      cleaned.push(`${indent}${body}`);
    });

    return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function normalizeInlineText(text) {
    return text.replace(/\u00a0/g, ' ').replace(/[ \t\r\n]+/g, ' ');
  }

  function prefixLines(text, prefix) {
    return text
      .split('\n')
      .map((line) => (line ? `${prefix}${line}` : line))
      .join('\n');
  }

  function wrapInline(wrapper, text) {
    const clean = text.trim();
    return clean ? `${wrapper}${clean}${wrapper}` : '';
  }

  function isInlineElement(node) {
    return INLINE_TAGS.has(node.nodeType === Node.TEXT_NODE ? '#text' : node.tagName);
  }

  function isInlineCopyNode(node) {
    if (!node) return true;
    if (isMathElement(node)) return !isDisplayMath(node);
    if (shouldSkip(node)) return true;
    if (node.nodeType === Node.TEXT_NODE) return true;
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    return isInlineElement(node) || node.tagName === 'BR';
  }

  function isEmptyCopyNode(node) {
    if (!node) return true;
    if (isMathElement(node)) return !extractMath(node);
    if (shouldSkip(node)) return true;
    if (node.nodeType === Node.TEXT_NODE) return !(node.textContent || '').trim();
    return false;
  }

  function shouldSkip(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    if (SKIP_TAGS.has(node.tagName)) return true;
    if (node.getAttribute('aria-hidden') === 'true') return true;
    if (node.hidden) return true;
    return false;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttribute(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
    showToast('Copied clean Markdown');
  }

  function showToast(message) {
    const oldToast = document.querySelector('[data-ai-copy-cleaner-toast]');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.dataset.aiCopyCleanerToast = 'true';
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed',
      'right:24px',
      'bottom:24px',
      'z-index:2147483647',
      'padding:8px 12px',
      'border-radius:8px',
      'background:rgba(32,33,36,.94)',
      'color:white',
      'font:13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.24)',
      'pointer-events:none',
    ].join(';');

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1200);
  }
})();
