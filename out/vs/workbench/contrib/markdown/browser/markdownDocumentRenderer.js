/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basicMarkupHtmlTags, hookDomPurifyHrefAndSrcSanitizer, } from '../../../../base/browser/dom.js';
import dompurify from '../../../../base/browser/dompurify/dompurify.js';
import { allowedMarkdownAttr } from '../../../../base/browser/markdownRenderer.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { escape } from '../../../../base/common/strings.js';
import { tokenizeToString } from '../../../../editor/common/languages/textToHtmlTokenizer.js';
import { markedGfmHeadingIdPlugin } from './markedGfmHeadingIdPlugin.js';
export const DEFAULT_MARKDOWN_STYLES = `
body {
	padding: 10px 20px;
	line-height: 22px;
	max-width: 882px;
	margin: 0 auto;
}

body *:last-child {
	margin-bottom: 0;
}

img {
	max-width: 100%;
	max-height: 100%;
}

a {
	text-decoration: var(--text-link-decoration);
}

a:hover {
	text-decoration: underline;
}

a:focus,
input:focus,
select:focus,
textarea:focus {
	outline: 1px solid -webkit-focus-ring-color;
	outline-offset: -1px;
}

hr {
	border: 0;
	height: 2px;
	border-bottom: 2px solid;
}

h1 {
	padding-bottom: 0.3em;
	line-height: 1.2;
	border-bottom-width: 1px;
	border-bottom-style: solid;
}

h1, h2, h3 {
	font-weight: normal;
}

table {
	border-collapse: collapse;
}

th {
	text-align: left;
	border-bottom: 1px solid;
}

th,
td {
	padding: 5px 10px;
}

table > tbody > tr + tr > td {
	border-top-width: 1px;
	border-top-style: solid;
}

blockquote {
	margin: 0 7px 0 5px;
	padding: 0 16px 0 10px;
	border-left-width: 5px;
	border-left-style: solid;
}

code {
	font-family: "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace;
}

pre {
	padding: 16px;
	border-radius: 3px;
	overflow: auto;
}

pre code {
	font-family: var(--vscode-editor-font-family);
	font-weight: var(--vscode-editor-font-weight);
	font-size: var(--vscode-editor-font-size);
	line-height: 1.5;
	color: var(--vscode-editor-foreground);
	tab-size: 4;
}

.monaco-tokenized-source {
	white-space: pre;
}

/** Theming */

.pre {
	background-color: var(--vscode-textCodeBlock-background);
}

.vscode-high-contrast h1 {
	border-color: rgb(0, 0, 0);
}

.vscode-light th {
	border-color: rgba(0, 0, 0, 0.69);
}

.vscode-dark th {
	border-color: rgba(255, 255, 255, 0.69);
}

.vscode-light h1,
.vscode-light hr,
.vscode-light td {
	border-color: rgba(0, 0, 0, 0.18);
}

.vscode-dark h1,
.vscode-dark hr,
.vscode-dark td {
	border-color: rgba(255, 255, 255, 0.18);
}

@media (forced-colors: active) and (prefers-color-scheme: light){
	body {
		forced-color-adjust: none;
	}
}

@media (forced-colors: active) and (prefers-color-scheme: dark){
	body {
		forced-color-adjust: none;
	}
}
`;
const allowedProtocols = [Schemas.http, Schemas.https, Schemas.command];
function sanitize(documentContent, allowUnknownProtocols) {
    const hook = hookDomPurifyHrefAndSrcSanitizer(allowedProtocols, true);
    try {
        return dompurify.sanitize(documentContent, {
            ...{
                ALLOWED_TAGS: [...basicMarkupHtmlTags, 'checkbox', 'checklist'],
                ALLOWED_ATTR: [
                    ...allowedMarkdownAttr,
                    'data-command',
                    'name',
                    'id',
                    'role',
                    'tabindex',
                    'x-dispatch',
                    'required',
                    'checked',
                    'placeholder',
                    'when-checked',
                    'checked-on',
                ],
            },
            ...(allowUnknownProtocols ? { ALLOW_UNKNOWN_PROTOCOLS: true } : {}),
        });
    }
    finally {
        hook.dispose();
    }
}
/**
 * Renders a string of markdown as a document.
 *
 * Uses VS Code's syntax highlighting code blocks.
 */
export async function renderMarkdownDocument(text, extensionService, languageService, options) {
    const m = new marked.Marked(MarkedHighlight.markedHighlight({
        async: true,
        async highlight(code, lang) {
            if (typeof lang !== 'string') {
                return escape(code);
            }
            await extensionService.whenInstalledExtensionsRegistered();
            if (options?.token?.isCancellationRequested) {
                return '';
            }
            const languageId = languageService.getLanguageIdByLanguageName(lang) ??
                languageService.getLanguageIdByLanguageName(lang.split(/\s+|:|,|(?!^)\{|\?]/, 1)[0]);
            return tokenizeToString(languageService, code, languageId);
        },
    }), markedGfmHeadingIdPlugin(), ...(options?.markedExtensions ?? []));
    const raw = await m.parse(text, { async: true });
    if (options?.shouldSanitize ?? true) {
        return sanitize(raw, options?.allowUnknownProtocols ?? false);
    }
    else {
        return raw;
    }
}
var MarkedHighlight;
(function (MarkedHighlight) {
    // Copied from https://github.com/markedjs/marked-highlight/blob/main/src/index.js
    function markedHighlight(options) {
        if (typeof options === 'function') {
            options = {
                highlight: options,
            };
        }
        if (!options || typeof options.highlight !== 'function') {
            throw new Error('Must provide highlight function');
        }
        return {
            async: !!options.async,
            walkTokens(token) {
                if (token.type !== 'code') {
                    return;
                }
                if (options.async) {
                    return Promise.resolve(options.highlight(token.text, token.lang)).then(updateToken(token));
                }
                const code = options.highlight(token.text, token.lang);
                if (code instanceof Promise) {
                    throw new Error('markedHighlight is not set to async but the highlight function is async. Set the async option to true on markedHighlight to await the async highlight function.');
                }
                updateToken(token)(code);
            },
            renderer: {
                code({ text, lang, escaped }) {
                    const classAttr = lang ? ` class="language-${escape(lang)}"` : '';
                    text = text.replace(/\n$/, '');
                    return `<pre><code${classAttr}>${escaped ? text : escape(text, true)}\n</code></pre>`;
                },
            },
        };
    }
    MarkedHighlight.markedHighlight = markedHighlight;
    function updateToken(token) {
        return (code) => {
            if (typeof code === 'string' && code !== token.text) {
                token.escaped = true;
                token.text = code;
            }
        };
    }
    // copied from marked helpers
    const escapeTest = /[&<>"']/;
    const escapeReplace = new RegExp(escapeTest.source, 'g');
    const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
    const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
    const escapeReplacement = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        [`'`]: '&#39;',
    };
    const getEscapeReplacement = (ch) => escapeReplacement[ch];
    function escape(html, encode) {
        if (encode) {
            if (escapeTest.test(html)) {
                return html.replace(escapeReplace, getEscapeReplacement);
            }
        }
        else {
            if (escapeTestNoEncode.test(html)) {
                return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
            }
        }
        return html;
    }
})(MarkedHighlight || (MarkedHighlight = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Eb2N1bWVudFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Rvd24vYnJvd3Nlci9tYXJrZG93bkRvY3VtZW50UmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixnQ0FBZ0MsR0FDaEMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLFNBQVMsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVsRixPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNEl0QyxDQUFBO0FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDdkUsU0FBUyxRQUFRLENBQUMsZUFBdUIsRUFBRSxxQkFBOEI7SUFDeEUs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