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
import './media/releasenoteseditor.css';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { escapeMarkdownSyntaxTokens } from '../../../../base/common/htmlContent.js';
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { escape } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asTextOrError, IRequestService } from '../../../../platform/request/common/request.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument, } from '../../markdown/browser/markdownDocumentRenderer.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { getTelemetryLevel, supportsTelemetry, } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SimpleSettingRenderer } from '../../markdown/browser/markdownSettingRenderer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../../base/common/network.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { dirname } from '../../../../base/common/resources.js';
import { asWebviewUri } from '../../webview/common/webview.js';
let ReleaseNotesManager = class ReleaseNotesManager {
    constructor(_environmentService, _keybindingService, _languageService, _openerService, _requestService, _configurationService, _editorService, _editorGroupService, _codeEditorService, _webviewWorkbenchService, _extensionService, _productService, _instantiationService) {
        this._environmentService = _environmentService;
        this._keybindingService = _keybindingService;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._requestService = _requestService;
        this._configurationService = _configurationService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._codeEditorService = _codeEditorService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this._extensionService = _extensionService;
        this._productService = _productService;
        this._instantiationService = _instantiationService;
        this._releaseNotesCache = new Map();
        this._currentReleaseNotes = undefined;
        this.disposables = new DisposableStore();
        TokenizationRegistry.onDidChange(() => {
            return this.updateHtml();
        });
        _configurationService.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this.disposables);
        _webviewWorkbenchService.onDidChangeActiveWebviewEditor(this.onDidChangeActiveWebviewEditor, this, this.disposables);
        this._simpleSettingRenderer = this._instantiationService.createInstance(SimpleSettingRenderer);
    }
    async updateHtml() {
        if (!this._currentReleaseNotes || !this._lastMeta) {
            return;
        }
        const html = await this.renderBody(this._lastMeta);
        if (this._currentReleaseNotes) {
            this._currentReleaseNotes.webview.setHtml(html);
        }
    }
    async getBase(useCurrentFile) {
        if (useCurrentFile) {
            const currentFileUri = this._codeEditorService.getActiveCodeEditor()?.getModel()?.uri;
            if (currentFileUri) {
                return dirname(currentFileUri);
            }
        }
        return URI.parse('https://code.visualstudio.com/raw');
    }
    async show(version, useCurrentFile) {
        const releaseNoteText = await this.loadReleaseNotes(version, useCurrentFile);
        const base = await this.getBase(useCurrentFile);
        this._lastMeta = { text: releaseNoteText, base };
        const html = await this.renderBody(this._lastMeta);
        const title = nls.localize('releaseNotesInputName', 'Release Notes: {0}', version);
        const activeEditorPane = this._editorService.activeEditorPane;
        if (this._currentReleaseNotes) {
            this._currentReleaseNotes.setName(title);
            this._currentReleaseNotes.webview.setHtml(html);
            this._webviewWorkbenchService.revealWebview(this._currentReleaseNotes, activeEditorPane ? activeEditorPane.group : this._editorGroupService.activeGroup, false);
        }
        else {
            this._currentReleaseNotes = this._webviewWorkbenchService.openWebview({
                title,
                options: {
                    tryRestoreScrollPosition: true,
                    enableFindWidget: true,
                    disableServiceWorker: useCurrentFile ? false : true,
                },
                contentOptions: {
                    localResourceRoots: useCurrentFile ? [base] : [],
                    allowScripts: true,
                },
                extension: undefined,
            }, 'releaseNotes', title, { group: ACTIVE_GROUP, preserveFocus: false });
            this._currentReleaseNotes.webview.onDidClickLink((uri) => this.onDidClickLink(URI.parse(uri)));
            const disposables = new DisposableStore();
            disposables.add(this._currentReleaseNotes.webview.onMessage((e) => {
                if (e.message.type === 'showReleaseNotes') {
                    this._configurationService.updateValue('update.showReleaseNotes', e.message.value);
                }
                else if (e.message.type === 'clickSetting') {
                    const x = this._currentReleaseNotes?.webview.container.offsetLeft + e.message.value.x;
                    const y = this._currentReleaseNotes?.webview.container.offsetTop + e.message.value.y;
                    this._simpleSettingRenderer.updateSetting(URI.parse(e.message.value.uri), x, y);
                }
            }));
            disposables.add(this._currentReleaseNotes.onWillDispose(() => {
                disposables.dispose();
                this._currentReleaseNotes = undefined;
            }));
            this._currentReleaseNotes.webview.setHtml(html);
        }
        return true;
    }
    async loadReleaseNotes(version, useCurrentFile) {
        const match = /^(\d+\.\d+)\./.exec(version);
        if (!match) {
            throw new Error('not found');
        }
        const versionLabel = match[1].replace(/\./g, '_');
        const baseUrl = 'https://code.visualstudio.com/raw';
        const url = `${baseUrl}/v${versionLabel}.md`;
        const unassigned = nls.localize('unassigned', 'unassigned');
        const escapeMdHtml = (text) => {
            return escape(text).replace(/\\/g, '\\\\');
        };
        const patchKeybindings = (text) => {
            const kb = (match, kb) => {
                const keybinding = this._keybindingService.lookupKeybinding(kb);
                if (!keybinding) {
                    return unassigned;
                }
                return keybinding.getLabel() || unassigned;
            };
            const kbstyle = (match, kb) => {
                const keybinding = KeybindingParser.parseKeybinding(kb);
                if (!keybinding) {
                    return unassigned;
                }
                const resolvedKeybindings = this._keybindingService.resolveKeybinding(keybinding);
                if (resolvedKeybindings.length === 0) {
                    return unassigned;
                }
                return resolvedKeybindings[0].getLabel() || unassigned;
            };
            const kbCode = (match, binding) => {
                const resolved = kb(match, binding);
                return resolved ? `<code title="${binding}">${escapeMdHtml(resolved)}</code>` : resolved;
            };
            const kbstyleCode = (match, binding) => {
                const resolved = kbstyle(match, binding);
                return resolved ? `<code title="${binding}">${escapeMdHtml(resolved)}</code>` : resolved;
            };
            return text
                .replace(/`kb\(([a-z.\d\-]+)\)`/gi, kbCode)
                .replace(/`kbstyle\(([^\)]+)\)`/gi, kbstyleCode)
                .replace(/kb\(([a-z.\d\-]+)\)/gi, (match, binding) => escapeMarkdownSyntaxTokens(kb(match, binding)))
                .replace(/kbstyle\(([^\)]+)\)/gi, (match, binding) => escapeMarkdownSyntaxTokens(kbstyle(match, binding)));
        };
        const fetchReleaseNotes = async () => {
            let text;
            try {
                if (useCurrentFile) {
                    const file = this._codeEditorService.getActiveCodeEditor()?.getModel()?.getValue();
                    text = file ? file.substring(file.indexOf('#')) : undefined;
                }
                else {
                    text = await asTextOrError(await this._requestService.request({ url }, CancellationToken.None));
                }
            }
            catch {
                throw new Error('Failed to fetch release notes');
            }
            if (!text || (!/^#\s/.test(text) && !useCurrentFile)) {
                // release notes always starts with `#` followed by whitespace, except when using the current file
                throw new Error('Invalid release notes');
            }
            return patchKeybindings(text);
        };
        // Don't cache the current file
        if (useCurrentFile) {
            return fetchReleaseNotes();
        }
        if (!this._releaseNotesCache.has(version)) {
            this._releaseNotesCache.set(version, (async () => {
                try {
                    return await fetchReleaseNotes();
                }
                catch (err) {
                    this._releaseNotesCache.delete(version);
                    throw err;
                }
            })());
        }
        return this._releaseNotesCache.get(version);
    }
    async onDidClickLink(uri) {
        if (uri.scheme === Schemas.codeSetting) {
            // handled in receive message
        }
        else {
            this.addGAParameters(uri, 'ReleaseNotes')
                .then((updated) => this._openerService.open(updated, { allowCommands: ['workbench.action.openSettings'] }))
                .then(undefined, onUnexpectedError);
        }
    }
    async addGAParameters(uri, origin, experiment = '1') {
        if (supportsTelemetry(this._productService, this._environmentService) &&
            getTelemetryLevel(this._configurationService) === 3 /* TelemetryLevel.USAGE */) {
            if (uri.scheme === 'https' && uri.authority === 'code.visualstudio.com') {
                return uri.with({
                    query: `${uri.query ? uri.query + '&' : ''}utm_source=VsCode&utm_medium=${encodeURIComponent(origin)}&utm_content=${encodeURIComponent(experiment)}`,
                });
            }
        }
        return uri;
    }
    async renderBody(fileContent) {
        const nonce = generateUuid();
        const content = await renderMarkdownDocument(fileContent.text, this._extensionService, this._languageService, {
            shouldSanitize: false,
            markedExtensions: [
                {
                    renderer: {
                        html: this._simpleSettingRenderer.getHtmlRenderer(),
                        codespan: this._simpleSettingRenderer.getCodeSpanRenderer(),
                    },
                },
            ],
        });
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        const showReleaseNotes = Boolean(this._configurationService.getValue('update.showReleaseNotes'));
        return `<!DOCTYPE html>
		<html>
			<head>
				<base href="${asWebviewUri(fileContent.base).toString(true)}/" >
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; style-src 'nonce-${nonce}' https://code.visualstudio.com; script-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}
					${css}

					/* codesetting */

					code:has(.codesetting) {
						background-color: var(--vscode-textPreformat-background);
						color: var(--vscode-textPreformat-foreground);
						padding-left: 1px;
						margin-right: 3px;
						padding-right: 0px;
					}

					code:has(.codesetting):focus {
						border: 1px solid var(--vscode-button-border, transparent);
					}

					.codesetting {
						color: var(--vscode-textPreformat-foreground);
						padding: 0px 1px 1px 0px;
						font-size: 0px;
						overflow: hidden;
						text-overflow: ellipsis;
						outline-offset: 2px !important;
						box-sizing: border-box;
						text-align: center;
						cursor: pointer;
						display: inline;
						margin-right: 3px;
					}
					.codesetting svg {
						font-size: 12px;
						text-align: center;
						cursor: pointer;
						border: 1px solid var(--vscode-button-secondaryBorder, transparent);
						outline: 1px solid transparent;
						line-height: 9px;
						margin-bottom: -5px;
						padding-left: 0px;
						padding-top: 2px;
						padding-bottom: 2px;
						padding-right: 2px;
						display: inline-block;
						text-decoration: none;
						text-rendering: auto;
						text-transform: none;
						-webkit-font-smoothing: antialiased;
						-moz-osx-font-smoothing: grayscale;
						user-select: none;
						-webkit-user-select: none;
					}
					.codesetting .setting-name {
						font-size: 13px;
						padding-left: 2px;
						padding-right: 3px;
						padding-top: 1px;
						padding-bottom: 1px;
						margin-top: -3px;
					}
					.codesetting:hover {
						color: var(--vscode-textPreformat-foreground) !important;
						text-decoration: none !important;
					}
					code:has(.codesetting):hover {
						filter: brightness(140%);
						text-decoration: none !important;
					}
					.codesetting:focus {
						outline: 0 !important;
						text-decoration: none !important;
						color: var(--vscode-button-hoverForeground) !important;
					}
					.codesetting .separator {
						width: 1px;
						height: 14px;
						margin-bottom: -3px;
						display: inline-block;
						background-color: var(--vscode-editor-background);
						font-size: 12px;
						margin-right: 4px;
					}

					header { display: flex; align-items: center; padding-top: 1em; }
				</style>
			</head>
			<body>
				${content}
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					const container = document.createElement('p');
					container.style.display = 'flex';
					container.style.alignItems = 'center';

					const input = document.createElement('input');
					input.type = 'checkbox';
					input.id = 'showReleaseNotes';
					input.checked = ${showReleaseNotes};
					container.appendChild(input);

					const label = document.createElement('label');
					label.htmlFor = 'showReleaseNotes';
					label.textContent = '${nls.localize('showOnUpdate', 'Show release notes after an update')}';
					container.appendChild(label);

					const beforeElement = document.querySelector("body > h1")?.nextElementSibling;
					if (beforeElement) {
						document.body.insertBefore(container, beforeElement);
					} else {
						document.body.appendChild(container);
					}

					window.addEventListener('message', event => {
						if (event.data.type === 'showReleaseNotes') {
							input.checked = event.data.value;
						}
					});

					window.addEventListener('click', event => {
						const href = event.target.href ?? event.target.parentElement?.href ?? event.target.parentElement?.parentElement?.href;
						if (href && (href.startsWith('${Schemas.codeSetting}'))) {
							vscode.postMessage({ type: 'clickSetting', value: { uri: href, x: event.clientX, y: event.clientY }});
						}
					});

					window.addEventListener('keypress', event => {
						if (event.keyCode === 13) {
							if (event.target.children.length > 0 && event.target.children[0].href) {
								const clientRect = event.target.getBoundingClientRect();
								vscode.postMessage({ type: 'clickSetting', value: { uri: event.target.children[0].href, x: clientRect.right , y: clientRect.bottom }});
							}
						}
					});

					input.addEventListener('change', event => {
						vscode.postMessage({ type: 'showReleaseNotes', value: input.checked }, '*');
					});
				</script>
			</body>
		</html>`;
    }
    onDidChangeConfiguration(e) {
        if (e.affectsConfiguration('update.showReleaseNotes')) {
            this.updateCheckboxWebview();
        }
    }
    onDidChangeActiveWebviewEditor(input) {
        if (input && input === this._currentReleaseNotes) {
            this.updateCheckboxWebview();
        }
    }
    updateCheckboxWebview() {
        if (this._currentReleaseNotes) {
            this._currentReleaseNotes.webview.postMessage({
                type: 'showReleaseNotes',
                value: this._configurationService.getValue('update.showReleaseNotes'),
            });
        }
    }
};
ReleaseNotesManager = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IKeybindingService),
    __param(2, ILanguageService),
    __param(3, IOpenerService),
    __param(4, IRequestService),
    __param(5, IConfigurationService),
    __param(6, IEditorService),
    __param(7, IEditorGroupsService),
    __param(8, ICodeEditorService),
    __param(9, IWebviewWorkbenchService),
    __param(10, IExtensionService),
    __param(11, IProductService),
    __param(12, IInstantiationService)
], ReleaseNotesManager);
export { ReleaseNotesManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVsZWFzZU5vdGVzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXBkYXRlL2Jyb3dzZXIvcmVsZWFzZU5vdGVzRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDN0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDM0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxD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