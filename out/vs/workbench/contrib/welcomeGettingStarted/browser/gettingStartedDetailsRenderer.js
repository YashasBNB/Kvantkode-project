/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { generateUuid } from '../../../../base/common/uuid.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument, } from '../../markdown/browser/markdownDocumentRenderer.js';
import { language } from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { gettingStartedContentRegistry } from '../common/gettingStartedContent.js';
let GettingStartedDetailsRenderer = class GettingStartedDetailsRenderer {
    constructor(fileService, notificationService, extensionService, languageService) {
        this.fileService = fileService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.languageService = languageService;
        this.mdCache = new ResourceMap();
        this.svgCache = new ResourceMap();
    }
    async renderMarkdown(path, base) {
        const content = await this.readAndCacheStepMarkdown(path, base);
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        const inDev = document.location.protocol === 'http:';
        const imgSrcCsp = inDev ? 'img-src https: data: http:' : 'img-src https: data:';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${imgSrcCsp}; media-src https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}
					${css}
					body > img {
						align-self: flex-start;
					}
					body > img[centered] {
						align-self: center;
					}
					body {
						display: flex;
						flex-direction: column;
						padding: 0;
						height: inherit;
					}
					.theme-picker-row {
						display: flex;
						justify-content: center;
						gap: 32px;
					}
					checklist {
						display: flex;
						gap: 32px;
						flex-direction: column;
					}
					checkbox {
						display: flex;
						flex-direction: column;
						align-items: center;
						margin: 5px;
						cursor: pointer;
					}
					checkbox > img {
						margin-bottom: 8px !important;
					}
					checkbox.checked > img {
						box-sizing: border-box;
					}
					checkbox.checked > img {
						outline: 2px solid var(--vscode-focusBorder);
						outline-offset: 4px;
						border-radius: 4px;
					}
					.theme-picker-link {
						margin-top: 16px;
						color: var(--vscode-textLink-foreground);
					}
					blockquote > p:first-child {
						margin-top: 0;
					}
					body > * {
						margin-block-end: 0.25em;
						margin-block-start: 0.25em;
					}
					vertically-centered {
						padding-top: 5px;
						padding-bottom: 5px;
						display: flex;
						justify-content: center;
						flex-direction: column;
					}
					html {
						height: 100%;
						padding-right: 32px;
					}
					h1 {
						font-size: 19.5px;
					}
					h2 {
						font-size: 18.5px;
					}
				</style>
			</head>
			<body>
				<vertically-centered>
					${content}
				</vertically-centered>
			</body>
			<script nonce="${nonce}">
				const vscode = acquireVsCodeApi();

				document.querySelectorAll('[when-checked]').forEach(el => {
					el.addEventListener('click', () => {
						vscode.postMessage(el.getAttribute('when-checked'));
					});
				});

				let ongoingLayout = undefined;
				const doLayout = () => {
					document.querySelectorAll('vertically-centered').forEach(element => {
						element.style.marginTop = Math.max((document.body.clientHeight - element.scrollHeight) * 3/10, 0) + 'px';
					});
					ongoingLayout = undefined;
				};

				const layout = () => {
					if (ongoingLayout) {
						clearTimeout(ongoingLayout);
					}
					ongoingLayout = setTimeout(doLayout, 0);
				};

				layout();

				document.querySelectorAll('img').forEach(element => {
					element.onload = layout;
				})

				window.addEventListener('message', event => {
					if (event.data.layoutMeNow) {
						layout();
					}
					if (event.data.enabledContextKeys) {
						document.querySelectorAll('.checked').forEach(element => element.classList.remove('checked'))
						for (const key of event.data.enabledContextKeys) {
							document.querySelectorAll('[checked-on="' + key + '"]').forEach(element => element.classList.add('checked'))
						}
					}
				});
		</script>
		</html>`;
    }
    async renderSVG(path) {
        const content = await this.readAndCacheSVGFile(path);
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}
					${css}
					svg {
						position: fixed;
						height: 100%;
						width: 80%;
						left: 50%;
						top: 50%;
						max-width: 530px;
						min-width: 350px;
						transform: translate(-50%,-50%);
					}
				</style>
			</head>
			<body>
				${content}
			</body>
		</html>`;
    }
    async renderVideo(path, poster, description) {
        const nonce = generateUuid();
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; media-src https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					video {
						max-width: 100%;
						max-height: 100%;
						object-fit: cover;
					}
				</style>
			</head>
			<body>
				<video controls autoplay ${poster ? `poster="${poster.toString(true)}"` : ''} muted ${description ? `aria-label="${description}"` : ''}>
					<source src="${path.toString(true)}" type="video/mp4">
				</video>
			</body>
		</html>`;
    }
    async readAndCacheSVGFile(path) {
        if (!this.svgCache.has(path)) {
            const contents = await this.readContentsOfPath(path, false);
            this.svgCache.set(path, contents);
        }
        return assertIsDefined(this.svgCache.get(path));
    }
    async readAndCacheStepMarkdown(path, base) {
        if (!this.mdCache.has(path)) {
            const contents = await this.readContentsOfPath(path);
            const markdownContents = await renderMarkdownDocument(transformUris(contents, base), this.extensionService, this.languageService, { allowUnknownProtocols: true });
            this.mdCache.set(path, markdownContents);
        }
        return assertIsDefined(this.mdCache.get(path));
    }
    async readContentsOfPath(path, useModuleId = true) {
        try {
            const moduleId = JSON.parse(path.query).moduleId;
            if (useModuleId && moduleId) {
                const contents = await new Promise((resolve, reject) => {
                    const provider = gettingStartedContentRegistry.getProvider(moduleId);
                    if (!provider) {
                        reject(`Getting started: no provider registered for ${moduleId}`);
                    }
                    else {
                        resolve(provider());
                    }
                });
                return contents;
            }
        }
        catch { }
        try {
            const localizedPath = path.with({ path: path.path.replace(/\.md$/, `.nls.${language}.md`) });
            const generalizedLocale = language?.replace(/-.*$/, '');
            const generalizedLocalizedPath = path.with({
                path: path.path.replace(/\.md$/, `.nls.${generalizedLocale}.md`),
            });
            const fileExists = (file) => this.fileService
                .stat(file)
                .then((stat) => !!stat.size) // Double check the file actually has content for fileSystemProviders that fake `stat`. #131809
                .catch(() => false);
            const [localizedFileExists, generalizedLocalizedFileExists] = await Promise.all([
                fileExists(localizedPath),
                fileExists(generalizedLocalizedPath),
            ]);
            const bytes = await this.fileService.readFile(localizedFileExists
                ? localizedPath
                : generalizedLocalizedFileExists
                    ? generalizedLocalizedPath
                    : path);
            return bytes.value.toString();
        }
        catch (e) {
            this.notificationService.error('Error reading markdown document at `' + path + '`: ' + e);
            return '';
        }
    }
};
GettingStartedDetailsRenderer = __decorate([
    __param(0, IFileService),
    __param(1, INotificationService),
    __param(2, IExtensionService),
    __param(3, ILanguageService)
], GettingStartedDetailsRenderer);
export { GettingStartedDetailsRenderer };
const transformUri = (src, base) => {
    const path = joinPath(base, src);
    return asWebviewUri(path).toString(true);
};
const transformUris = (content, base) => content
    .replace(/src="([^"]*)"/g, (_, src) => {
    if (src.startsWith('https://')) {
        return `src="${src}"`;
    }
    return `src="${transformUri(src, base)}"`;
})
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_, title, src) => {
    if (src.startsWith('https://')) {
        return `![${title}](${src})`;
    }
    return `![${title}](${transformUri(src, base)})`;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWREZXRhaWxzUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZERldGFpbHNSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDM0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDN0UsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixzQkFBc0IsR0FDdEIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRSxJQUFN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