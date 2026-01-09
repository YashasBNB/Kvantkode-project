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
var BackLayerWebView_1;
import { getWindow } from '../../../../../../base/browser/dom.js';
import { coalesce } from '../../../../../../base/common/arrays.js';
import { DeferredPromise, runWhenGlobalIdle } from '../../../../../../base/common/async.js';
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { getExtensionForMimeType } from '../../../../../../base/common/mime.js';
import { FileAccess, Schemas, matchesScheme, matchesSomeScheme, } from '../../../../../../base/common/network.js';
import { equals } from '../../../../../../base/common/objects.js';
import * as osPath from '../../../../../../base/common/path.js';
import { isMacintosh, isWeb } from '../../../../../../base/common/platform.js';
import { dirname, extname, isEqual, joinPath } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as UUID from '../../../../../../base/common/uuid.js';
import { TokenizationRegistry } from '../../../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../../../editor/common/languages/supports/tokenization.js';
import { tokenizeToString } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import * as nls from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { editorFindMatch, editorFindMatchHighlight, } from '../../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../../platform/workspace/common/workspaceTrust.js';
import { CellEditState, } from '../../notebookBrowser.js';
import { NOTEBOOK_WEBVIEW_BOUNDARY } from '../notebookCellList.js';
import { preloadsScriptStr } from './webviewPreloads.js';
import { transformWebviewThemeVars } from './webviewThemeMapping.js';
import { MarkupCellViewModel } from '../../viewModel/markupCellViewModel.js';
import { CellUri, } from '../../../common/notebookCommon.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IWebviewService, WebviewOriginStore, } from '../../../../webview/browser/webview.js';
import { WebviewWindowDragMonitor } from '../../../../webview/browser/webviewWindowDragMonitor.js';
import { asWebviewUri, webviewGenericCspSource } from '../../../../webview/common/webview.js';
import { IEditorGroupsService, } from '../../../../../services/editor/common/editorGroupsService.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { IPathService } from '../../../../../services/path/common/pathService.js';
const LINE_COLUMN_REGEX = /:([\d]+)(?::([\d]+))?$/;
const LineQueryRegex = /line=(\d+)$/;
const FRAGMENT_REGEX = /^(.*)#([^#]*)$/;
let BackLayerWebView = class BackLayerWebView extends Themable {
    static { BackLayerWebView_1 = this; }
    static getOriginStore(storageService) {
        this._originStore ??= new WebviewOriginStore('notebook.backlayerWebview.origins', storageService);
        return this._originStore;
    }
    constructor(notebookEditor, id, notebookViewType, documentUri, options, rendererMessaging, webviewService, openerService, notebookService, contextService, environmentService, fileDialogService, fileService, contextMenuService, contextKeyService, workspaceTrustManagementService, configurationService, languageService, workspaceContextService, editorGroupService, storageService, pathService, notebookLogService, themeService, telemetryService) {
        super(themeService);
        this.notebookEditor = notebookEditor;
        this.id = id;
        this.notebookViewType = notebookViewType;
        this.documentUri = documentUri;
        this.options = options;
        this.rendererMessaging = rendererMessaging;
        this.webviewService = webviewService;
        this.openerService = openerService;
        this.notebookService = notebookService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.fileDialogService = fileDialogService;
        this.fileService = fileService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.workspaceContextService = workspaceContextService;
        this.editorGroupService = editorGroupService;
        this.storageService = storageService;
        this.pathService = pathService;
        this.notebookLogService = notebookLogService;
        this.telemetryService = telemetryService;
        this.webview = undefined;
        this.insetMapping = new Map();
        this.pendingWebviewIdleCreationRequest = new Map();
        this.pendingWebviewIdleInsetMapping = new Map();
        this.reversedPendingWebviewIdleInsetMapping = new Map();
        this.markupPreviewMapping = new Map();
        this.hiddenInsetMapping = new Set();
        this.reversedInsetMapping = new Map();
        this.localResourceRootsCache = undefined;
        this._onMessage = this._register(new Emitter());
        this._preloadsCache = new Set();
        this.onMessage = this._onMessage.event;
        this._disposed = false;
        this.firstInit = true;
        this.nonce = UUID.generateUuid();
        this._logRendererDebugMessage('Creating backlayer webview for notebook');
        this.element = document.createElement('div');
        this.element.style.height = '1400px';
        this.element.style.position = 'absolute';
        if (rendererMessaging) {
            this._register(rendererMessaging);
            rendererMessaging.receiveMessageHandler = (rendererId, message) => {
                if (!this.webview || this._disposed) {
                    return Promise.resolve(false);
                }
                this._sendMessageToWebview({
                    __vscode_notebook_message: true,
                    type: 'customRendererMessage',
                    rendererId: rendererId,
                    message: message,
                });
                return Promise.resolve(true);
            };
        }
        this._register(workspaceTrustManagementService.onDidChangeTrust((e) => {
            const baseUrl = this.asWebviewUri(this.getNotebookBaseUri(), undefined);
            const htmlContent = this.generateContent(baseUrl.toString());
            this.webview?.setHtml(htmlContent);
        }));
        this._register(TokenizationRegistry.onDidChange(() => {
            this._sendMessageToWebview({
                type: 'tokenizedStylesChanged',
                css: getTokenizationCss(),
            });
        }));
    }
    updateOptions(options) {
        this.options = options;
        this._updateStyles();
        this._updateOptions();
    }
    _logRendererDebugMessage(msg) {
        this.notebookLogService.debug('BacklayerWebview', `${this.documentUri} (${this.id}) - ${msg}`);
    }
    _updateStyles() {
        this._sendMessageToWebview({
            type: 'notebookStyles',
            styles: this._generateStyles(),
        });
    }
    _updateOptions() {
        this._sendMessageToWebview({
            type: 'notebookOptions',
            options: {
                dragAndDropEnabled: this.options.dragAndDropEnabled,
            },
            renderOptions: {
                lineLimit: this.options.outputLineLimit,
                outputScrolling: this.options.outputScrolling,
                outputWordWrap: this.options.outputWordWrap,
                linkifyFilePaths: this.options.outputLinkifyFilePaths,
                minimalError: this.options.minimalError,
            },
        });
    }
    _generateStyles() {
        return {
            'notebook-output-left-margin': `${this.options.leftMargin + this.options.runGutter}px`,
            'notebook-output-width': `calc(100% - ${this.options.leftMargin + this.options.rightMargin + this.options.runGutter}px)`,
            'notebook-output-node-padding': `${this.options.outputNodePadding}px`,
            'notebook-run-gutter': `${this.options.runGutter}px`,
            'notebook-preview-node-padding': `${this.options.previewNodePadding}px`,
            'notebook-markdown-left-margin': `${this.options.markdownLeftMargin}px`,
            'notebook-output-node-left-padding': `${this.options.outputNodeLeftPadding}px`,
            'notebook-markdown-min-height': `${this.options.previewNodePadding * 2}px`,
            'notebook-markup-font-size': typeof this.options.markupFontSize === 'number' && this.options.markupFontSize > 0
                ? `${this.options.markupFontSize}px`
                : `calc(${this.options.fontSize}px * 1.2)`,
            'notebook-markdown-line-height': typeof this.options.markdownLineHeight === 'number' && this.options.markdownLineHeight > 0
                ? `${this.options.markdownLineHeight}px`
                : `normal`,
            'notebook-cell-output-font-size': `${this.options.outputFontSize || this.options.fontSize}px`,
            'notebook-cell-output-line-height': `${this.options.outputLineHeight}px`,
            'notebook-cell-output-max-height': `${this.options.outputLineHeight * this.options.outputLineLimit + 2}px`,
            'notebook-cell-output-font-family': this.options.outputFontFamily || this.options.fontFamily,
            'notebook-cell-markup-empty-content': nls.localize('notebook.emptyMarkdownPlaceholder', 'Empty markdown cell, double-click or press enter to edit.'),
            'notebook-cell-renderer-not-found-error': nls.localize({
                key: 'notebook.error.rendererNotFound',
                comment: ['$0 is a placeholder for the mime type'],
            }, "No renderer found for '$0'"),
            'notebook-cell-renderer-fallbacks-exhausted': nls.localize({
                key: 'notebook.error.rendererFallbacksExhausted',
                comment: ['$0 is a placeholder for the mime type'],
            }, "Could not render content for '$0'"),
            'notebook-markup-font-family': this.options.markupFontFamily,
        };
    }
    generateContent(baseUrl) {
        const renderersData = this.getRendererData();
        const preloadsData = this.getStaticPreloadsData();
        const renderOptions = {
            lineLimit: this.options.outputLineLimit,
            outputScrolling: this.options.outputScrolling,
            outputWordWrap: this.options.outputWordWrap,
            linkifyFilePaths: this.options.outputLinkifyFilePaths,
            minimalError: this.options.minimalError,
        };
        const preloadScript = preloadsScriptStr({
            ...this.options,
            tokenizationCss: getTokenizationCss(),
        }, { dragAndDropEnabled: this.options.dragAndDropEnabled }, renderOptions, renderersData, preloadsData, this.workspaceTrustManagementService.isWorkspaceTrusted(), this.nonce);
        const enableCsp = this.configurationService.getValue('notebook.experimental.enableCsp');
        const currentHighlight = this.getColor(editorFindMatch);
        const findMatchHighlight = this.getColor(editorFindMatchHighlight);
        return /* html */ `
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<base href="${baseUrl}/" />
				${enableCsp
            ? `<meta http-equiv="Content-Security-Policy" content="
					default-src 'none';
					script-src ${webviewGenericCspSource} 'unsafe-inline' 'unsafe-eval';
					style-src ${webviewGenericCspSource} 'unsafe-inline';
					img-src ${webviewGenericCspSource} https: http: data:;
					font-src ${webviewGenericCspSource} https:;
					connect-src https:;
					child-src https: data:;
				">`
            : ''}
				<style nonce="${this.nonce}">
					::highlight(find-highlight) {
						background-color: var(--vscode-editor-findMatchBackground, ${findMatchHighlight});
					}

					::highlight(current-find-highlight) {
						background-color: var(--vscode-editor-findMatchHighlightBackground, ${currentHighlight});
					}

					#container .cell_container {
						width: 100%;
					}

					#container .output_container {
						width: 100%;
					}

					#container .cell_container.nb-insertHighlight div.output_container div.output {
						background-color: var(--vscode-diffEditor-insertedLineBackground, var(--vscode-diffEditor-insertedTextBackground));
					}

					#container > div > div > div.output {
						font-size: var(--notebook-cell-output-font-size);
						width: var(--notebook-output-width);
						margin-left: var(--notebook-output-left-margin);
						background-color: var(--theme-notebook-output-background);
						padding-top: var(--notebook-output-node-padding);
						padding-right: var(--notebook-output-node-padding);
						padding-bottom: var(--notebook-output-node-padding);
						padding-left: var(--notebook-output-node-left-padding);
						box-sizing: border-box;
						border-top: none;
					}

					/* markdown */
					#container div.preview {
						width: 100%;
						padding-right: var(--notebook-preview-node-padding);
						padding-left: var(--notebook-markdown-left-margin);
						padding-top: var(--notebook-preview-node-padding);
						padding-bottom: var(--notebook-preview-node-padding);

						box-sizing: border-box;
						white-space: nowrap;
						overflow: hidden;
						white-space: initial;

						font-size: var(--notebook-markup-font-size);
						line-height: var(--notebook-markdown-line-height);
						color: var(--theme-ui-foreground);
						font-family: var(--notebook-markup-font-family);
					}

					#container div.preview.draggable {
						user-select: none;
						-webkit-user-select: none;
						-ms-user-select: none;
						cursor: grab;
					}

					#container div.preview.selected {
						background: var(--theme-notebook-cell-selected-background);
					}

					#container div.preview.dragging {
						background-color: var(--theme-background);
						opacity: 0.5 !important;
					}

					.monaco-workbench.vs-dark .notebookOverlay .cell.markdown .latex img,
					.monaco-workbench.vs-dark .notebookOverlay .cell.markdown .latex-block img {
						filter: brightness(0) invert(1)
					}

					#container .markup > div.nb-symbolHighlight {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .markup > div.nb-insertHighlight {
						background-color: var(--vscode-diffEditor-insertedLineBackground, var(--vscode-diffEditor-insertedTextBackground));
					}

					#container .nb-symbolHighlight .output_container .output {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .markup > div.nb-multiCellHighlight {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .nb-multiCellHighlight .output_container .output {
						background-color: var(--theme-notebook-symbol-highlight-background);
					}

					#container .nb-chatGenerationHighlight .output_container .output {
						background-color: var(--vscode-notebook-selectedCellBackground);
					}

					#container > div.nb-cellDeleted .output_container {
						background-color: var(--theme-notebook-diff-removed-background);
					}

					#container > div.nb-cellAdded .output_container {
						background-color: var(--theme-notebook-diff-inserted-background);
					}

					#container > div > div:not(.preview) > div {
						overflow-x: auto;
					}

					#container .no-renderer-error {
						color: var(--vscode-editorError-foreground);
					}

					body {
						padding: 0px;
						height: 100%;
						width: 100%;
					}

					table, thead, tr, th, td, tbody {
						border: none;
						border-color: transparent;
						border-spacing: 0;
						border-collapse: collapse;
					}

					table, th, tr {
						vertical-align: middle;
						text-align: right;
					}

					thead {
						font-weight: bold;
						background-color: rgba(130, 130, 130, 0.16);
					}

					th, td {
						padding: 4px 8px;
					}

					tr:nth-child(even) {
						background-color: rgba(130, 130, 130, 0.08);
					}

					tbody th {
						font-weight: normal;
					}

					.find-match {
						background-color: var(--vscode-editor-findMatchHighlightBackground);
					}

					.current-find-match {
						background-color: var(--vscode-editor-findMatchBackground);
					}

					#_defaultColorPalatte {
						color: var(--vscode-editor-findMatchHighlightBackground);
						background-color: var(--vscode-editor-findMatchBackground);
					}
				</style>
			</head>
			<body style="overflow: hidden;">
				<div id='findStart' tabIndex=-1></div>
				<div id='container' class="widgetarea" style="position: absolute;width:100%;top: 0px"></div>
				<div id="_defaultColorPalatte"></div>
				<script type="module">${preloadScript}</script>
			</body>
		</html>`;
    }
    getRendererData() {
        return this.notebookService.getRenderers().map((renderer) => {
            const entrypoint = {
                extends: renderer.entrypoint.extends,
                path: this.asWebviewUri(renderer.entrypoint.path, renderer.extensionLocation).toString(),
            };
            return {
                id: renderer.id,
                entrypoint,
                mimeTypes: renderer.mimeTypes,
                messaging: renderer.messaging !== "never" /* RendererMessagingSpec.Never */ && !!this.rendererMessaging,
                isBuiltin: renderer.isBuiltin,
            };
        });
    }
    getStaticPreloadsData() {
        return Array.from(this.notebookService.getStaticPreloads(this.notebookViewType), (preload) => {
            return {
                entrypoint: this.asWebviewUri(preload.entrypoint, preload.extensionLocation)
                    .toString()
                    .toString(),
            };
        });
    }
    asWebviewUri(uri, fromExtension) {
        return asWebviewUri(uri, fromExtension?.scheme === Schemas.vscodeRemote
            ? { isRemote: true, authority: fromExtension.authority }
            : undefined);
    }
    postKernelMessage(message) {
        this._sendMessageToWebview({
            __vscode_notebook_message: true,
            type: 'customKernelMessage',
            message,
        });
    }
    resolveOutputId(id) {
        const output = this.reversedInsetMapping.get(id);
        if (!output) {
            return;
        }
        const cellInfo = this.insetMapping.get(output).cellInfo;
        return { cellInfo, output };
    }
    isResolved() {
        return !!this.webview;
    }
    createWebview(targetWindow) {
        const baseUrl = this.asWebviewUri(this.getNotebookBaseUri(), undefined);
        const htmlContent = this.generateContent(baseUrl.toString());
        return this._initialize(htmlContent, targetWindow);
    }
    getNotebookBaseUri() {
        if (this.documentUri.scheme === Schemas.untitled) {
            const folder = this.workspaceContextService.getWorkspaceFolder(this.documentUri);
            if (folder) {
                return folder.uri;
            }
            const folders = this.workspaceContextService.getWorkspace().folders;
            if (folders.length) {
                return folders[0].uri;
            }
        }
        return dirname(this.documentUri);
    }
    getBuiltinLocalResourceRoots() {
        // Python notebooks assume that requirejs is a global.
        // For all other notebooks, they need to provide their own loader.
        if (!this.documentUri.path.toLowerCase().endsWith('.ipynb')) {
            return [];
        }
        if (isWeb) {
            return []; // script is inlined
        }
        return [dirname(FileAccess.asFileUri('vs/nls.js'))];
    }
    _initialize(content, targetWindow) {
        if (!getWindow(this.element).document.body.contains(this.element)) {
            throw new Error('Element is already detached from the DOM tree');
        }
        this.webview = this._createInset(this.webviewService, content);
        this.webview.mountTo(this.element, targetWindow);
        this._register(this.webview);
        this._register(new WebviewWindowDragMonitor(targetWindow, () => this.webview));
        const initializePromise = new DeferredPromise();
        this._register(this.webview.onFatalError((e) => {
            initializePromise.error(new Error(`Could not initialize webview: ${e.message}}`));
        }));
        this._register(this.webview.onMessage(async (message) => {
            const data = message.message;
            if (this._disposed) {
                return;
            }
            if (!data.__vscode_notebook_message) {
                return;
            }
            switch (data.type) {
                case 'initialized': {
                    initializePromise.complete();
                    this.initializeWebViewState();
                    break;
                }
                case 'initializedMarkup': {
                    if (this.initializeMarkupPromise?.requestId === data.requestId) {
                        this.initializeMarkupPromise?.p.complete();
                        this.initializeMarkupPromise = undefined;
                    }
                    break;
                }
                case 'dimension': {
                    for (const update of data.updates) {
                        const height = update.height;
                        if (update.isOutput) {
                            const resolvedResult = this.resolveOutputId(update.id);
                            if (resolvedResult) {
                                const { cellInfo, output } = resolvedResult;
                                this.notebookEditor.updateOutputHeight(cellInfo, output, height, !!update.init, 'webview#dimension');
                                this.notebookEditor.scheduleOutputHeightAck(cellInfo, update.id, height);
                            }
                            else if (update.init) {
                                // might be idle render request's ack
                                const outputRequest = this.reversedPendingWebviewIdleInsetMapping.get(update.id);
                                if (outputRequest) {
                                    const inset = this.pendingWebviewIdleInsetMapping.get(outputRequest);
                                    // clear the pending mapping
                                    this.pendingWebviewIdleCreationRequest.delete(outputRequest);
                                    this.pendingWebviewIdleCreationRequest.delete(outputRequest);
                                    const cellInfo = inset.cellInfo;
                                    this.reversedInsetMapping.set(update.id, outputRequest);
                                    this.insetMapping.set(outputRequest, inset);
                                    this.notebookEditor.updateOutputHeight(cellInfo, outputRequest, height, !!update.init, 'webview#dimension');
                                    this.notebookEditor.scheduleOutputHeightAck(cellInfo, update.id, height);
                                }
                                this.reversedPendingWebviewIdleInsetMapping.delete(update.id);
                            }
                            {
                                if (!update.init) {
                                    continue;
                                }
                                const output = this.reversedInsetMapping.get(update.id);
                                if (!output) {
                                    continue;
                                }
                                const inset = this.insetMapping.get(output);
                                inset.initialized = true;
                            }
                        }
                        else {
                            this.notebookEditor.updateMarkupCellHeight(update.id, height, !!update.init);
                        }
                    }
                    break;
                }
                case 'mouseenter': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsHovered = true;
                        }
                    }
                    break;
                }
                case 'mouseleave': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsHovered = false;
                        }
                    }
                    break;
                }
                case 'outputFocus': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsFocused = true;
                            this.notebookEditor.focusNotebookCell(latestCell, 'output', {
                                outputId: resolvedResult.output.model.outputId,
                                skipReveal: true,
                                outputWebviewFocused: true,
                            });
                        }
                    }
                    break;
                }
                case 'outputBlur': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.outputIsFocused = false;
                            latestCell.inputInOutputIsFocused = false;
                        }
                    }
                    break;
                }
                case 'scroll-ack': {
                    // const date = new Date();
                    // const top = data.data.top;
                    // console.log('ack top ', top, ' version: ', data.version, ' - ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());
                    break;
                }
                case 'scroll-to-reveal': {
                    this.notebookEditor.setScrollTop(data.scrollTop - NOTEBOOK_WEBVIEW_BOUNDARY);
                    break;
                }
                case 'did-scroll-wheel': {
                    this.notebookEditor.triggerScroll({
                        ...data.payload,
                        preventDefault: () => { },
                        stopPropagation: () => { },
                    });
                    break;
                }
                case 'focus-editor': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell) {
                        if (data.focusNext) {
                            this.notebookEditor.focusNextNotebookCell(cell, 'editor');
                        }
                        else {
                            await this.notebookEditor.focusNotebookCell(cell, 'editor');
                        }
                    }
                    break;
                }
                case 'clicked-data-url': {
                    this._onDidClickDataLink(data);
                    break;
                }
                case 'clicked-link': {
                    if (matchesScheme(data.href, Schemas.command)) {
                        const uri = URI.parse(data.href);
                        if (uri.path === 'workbench.action.openLargeOutput') {
                            const outputId = uri.query;
                            const group = this.editorGroupService.activeGroup;
                            if (group) {
                                if (group.activeEditor) {
                                    group.pinEditor(group.activeEditor);
                                }
                            }
                            this.openerService.open(CellUri.generateCellOutputUriWithId(this.documentUri, outputId));
                            return;
                        }
                        if (uri.path === 'cellOutput.enableScrolling') {
                            const outputId = uri.query;
                            const cell = this.reversedInsetMapping.get(outputId);
                            if (cell) {
                                this.telemetryService.publicLog2('workbenchActionExecuted', {
                                    id: 'notebook.cell.toggleOutputScrolling',
                                    from: 'inlineLink',
                                });
                                cell.cellViewModel.outputsViewModels.forEach((vm) => {
                                    if (vm.model.metadata) {
                                        vm.model.metadata['scrollable'] = true;
                                        vm.resetRenderer();
                                    }
                                });
                            }
                            return;
                        }
                        // We allow a very limited set of commands
                        this.openerService.open(data.href, {
                            fromUserGesture: true,
                            fromWorkspace: true,
                            allowCommands: [
                                'github-issues.authNow',
                                'workbench.extensions.search',
                                'workbench.action.openSettings',
                                '_notebook.selectKernel',
                                // TODO@rebornix explore open output channel with name command
                                'jupyter.viewOutput',
                                'jupyter.createPythonEnvAndSelectController',
                            ],
                        });
                        return;
                    }
                    if (matchesSomeScheme(data.href, Schemas.http, Schemas.https, Schemas.mailto)) {
                        this.openerService.open(data.href, { fromUserGesture: true, fromWorkspace: true });
                    }
                    else if (matchesScheme(data.href, Schemas.vscodeNotebookCell)) {
                        const uri = URI.parse(data.href);
                        await this._handleNotebookCellResource(uri);
                    }
                    else if (!/^[\w\-]+:/.test(data.href)) {
                        // Uri without scheme, such as a file path
                        await this._handleResourceOpening(tryDecodeURIComponent(data.href));
                    }
                    else {
                        // uri with scheme
                        if (osPath.isAbsolute(data.href)) {
                            this._openUri(URI.file(data.href));
                        }
                        else {
                            this._openUri(URI.parse(data.href));
                        }
                    }
                    break;
                }
                case 'customKernelMessage': {
                    this._onMessage.fire({ message: data.message });
                    break;
                }
                case 'customRendererMessage': {
                    this.rendererMessaging?.postMessage(data.rendererId, data.message);
                    break;
                }
                case 'clickMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell) {
                        if (data.shiftKey || (isMacintosh ? data.metaKey : data.ctrlKey)) {
                            // Modify selection
                            this.notebookEditor.toggleNotebookCellSelection(cell, 
                            /* fromPrevious */ data.shiftKey);
                        }
                        else {
                            // Normal click
                            await this.notebookEditor.focusNotebookCell(cell, 'container', { skipReveal: true });
                        }
                    }
                    break;
                }
                case 'contextMenuMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell) {
                        // Focus the cell first
                        await this.notebookEditor.focusNotebookCell(cell, 'container', { skipReveal: true });
                        // Then show the context menu
                        const webviewRect = this.element.getBoundingClientRect();
                        this.contextMenuService.showContextMenu({
                            menuId: MenuId.NotebookCellTitle,
                            contextKeyService: this.contextKeyService,
                            getAnchor: () => ({
                                x: webviewRect.x + data.clientX,
                                y: webviewRect.y + data.clientY,
                            }),
                        });
                    }
                    break;
                }
                case 'toggleMarkupPreview': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell && !this.notebookEditor.creationOptions.isReadOnly) {
                        this.notebookEditor.setMarkupCellEditState(data.cellId, CellEditState.Editing);
                        await this.notebookEditor.focusNotebookCell(cell, 'editor', { skipReveal: true });
                    }
                    break;
                }
                case 'mouseEnterMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell instanceof MarkupCellViewModel) {
                        cell.cellIsHovered = true;
                    }
                    break;
                }
                case 'mouseLeaveMarkupCell': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell instanceof MarkupCellViewModel) {
                        cell.cellIsHovered = false;
                    }
                    break;
                }
                case 'cell-drag-start': {
                    this.notebookEditor.didStartDragMarkupCell(data.cellId, data);
                    break;
                }
                case 'cell-drag': {
                    this.notebookEditor.didDragMarkupCell(data.cellId, data);
                    break;
                }
                case 'cell-drop': {
                    this.notebookEditor.didDropMarkupCell(data.cellId, {
                        dragOffsetY: data.dragOffsetY,
                        ctrlKey: data.ctrlKey,
                        altKey: data.altKey,
                    });
                    break;
                }
                case 'cell-drag-end': {
                    this.notebookEditor.didEndDragMarkupCell(data.cellId);
                    break;
                }
                case 'renderedMarkup': {
                    const cell = this.notebookEditor.getCellById(data.cellId);
                    if (cell instanceof MarkupCellViewModel) {
                        cell.renderedHtml = data.html;
                    }
                    this._handleHighlightCodeBlock(data.codeBlocks);
                    break;
                }
                case 'renderedCellOutput': {
                    this._handleHighlightCodeBlock(data.codeBlocks);
                    break;
                }
                case 'outputResized': {
                    this.notebookEditor.didResizeOutput(data.cellId);
                    break;
                }
                case 'getOutputItem': {
                    const resolvedResult = this.resolveOutputId(data.outputId);
                    const output = resolvedResult?.output.model.outputs.find((output) => output.mime === data.mime);
                    this._sendMessageToWebview({
                        type: 'returnOutputItem',
                        requestId: data.requestId,
                        output: output ? { mime: output.mime, valueBytes: output.data.buffer } : undefined,
                    });
                    break;
                }
                case 'logRendererDebugMessage': {
                    this._logRendererDebugMessage(`${data.message}${data.data ? ' ' + JSON.stringify(data.data, null, 4) : ''}`);
                    break;
                }
                case 'notebookPerformanceMessage': {
                    this.notebookEditor.updatePerformanceMetadata(data.cellId, data.executionId, data.duration, data.rendererId);
                    if (data.outputSize && data.rendererId === 'vscode.builtin-renderer') {
                        this._sendPerformanceData(data.outputSize, data.duration);
                    }
                    break;
                }
                case 'outputInputFocus': {
                    const resolvedResult = this.resolveOutputId(data.id);
                    if (resolvedResult) {
                        const latestCell = this.notebookEditor.getCellByInfo(resolvedResult.cellInfo);
                        if (latestCell) {
                            latestCell.inputInOutputIsFocused = data.inputFocused;
                        }
                    }
                    this.notebookEditor.didFocusOutputInputChange(data.inputFocused);
                }
            }
        }));
        return initializePromise.p;
    }
    _sendPerformanceData(outputSize, renderTime) {
        const telemetryData = {
            outputSize,
            renderTime,
        };
        this.telemetryService.publicLog2('NotebookCellOutputRender', telemetryData);
    }
    _handleNotebookCellResource(uri) {
        const notebookResource = uri.path.length > 0 ? uri : this.documentUri;
        const lineMatch = /(?:^|&)line=([^&]+)/.exec(uri.query);
        let editorOptions = undefined;
        if (lineMatch) {
            const parsedLineNumber = parseInt(lineMatch[1], 10);
            if (!isNaN(parsedLineNumber)) {
                const lineNumber = parsedLineNumber;
                editorOptions = {
                    selection: { startLineNumber: lineNumber, startColumn: 1 },
                };
            }
        }
        const executionMatch = /(?:^|&)execution_count=([^&]+)/.exec(uri.query);
        if (executionMatch) {
            const executionCount = parseInt(executionMatch[1], 10);
            if (!isNaN(executionCount)) {
                const notebookModel = this.notebookService.getNotebookTextModel(notebookResource);
                // multiple cells with the same execution count can exist if the kernel is restarted
                // so look for the most recently added cell with the matching execution count.
                // Somewhat more likely to be correct in notebooks, an much more likely for the interactive window
                const cell = notebookModel?.cells
                    .slice()
                    .reverse()
                    .find((cell) => {
                    return cell.internalMetadata.executionOrder === executionCount;
                });
                if (cell?.uri) {
                    return this.openerService.open(cell.uri, {
                        fromUserGesture: true,
                        fromWorkspace: true,
                        editorOptions: editorOptions,
                    });
                }
            }
        }
        // URLs built by the jupyter extension put the line query param in the fragment
        // They also have the cell fragment pre-calculated
        const fragmentLineMatch = /\?line=(\d+)$/.exec(uri.fragment);
        if (fragmentLineMatch) {
            const parsedLineNumber = parseInt(fragmentLineMatch[1], 10);
            if (!isNaN(parsedLineNumber)) {
                const lineNumber = parsedLineNumber + 1;
                const fragment = uri.fragment.substring(0, fragmentLineMatch.index);
                // open the uri with selection
                const editorOptions = {
                    selection: {
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: 1,
                    },
                };
                return this.openerService.open(notebookResource.with({ fragment }), {
                    fromUserGesture: true,
                    fromWorkspace: true,
                    editorOptions: editorOptions,
                });
            }
        }
        return this.openerService.open(notebookResource, { fromUserGesture: true, fromWorkspace: true });
    }
    async _handleResourceOpening(href) {
        let linkToOpen = undefined;
        let fragment = undefined;
        // Separate out the fragment so that the subsequent calls
        // to URI.joinPath() don't URL encode it. This allows opening
        // links with both paths and fragments.
        const hrefWithFragment = FRAGMENT_REGEX.exec(href);
        if (hrefWithFragment) {
            href = hrefWithFragment[1];
            fragment = hrefWithFragment[2];
        }
        if (href.startsWith('/')) {
            linkToOpen = await this.pathService.fileURI(href);
            const folders = this.workspaceContextService.getWorkspace().folders;
            if (folders.length) {
                linkToOpen = linkToOpen.with({
                    scheme: folders[0].uri.scheme,
                    authority: folders[0].uri.authority,
                });
            }
        }
        else if (href.startsWith('~')) {
            const userHome = await this.pathService.userHome();
            if (userHome) {
                linkToOpen = URI.joinPath(userHome, href.substring(2));
            }
        }
        else {
            if (this.documentUri.scheme === Schemas.untitled) {
                const folders = this.workspaceContextService.getWorkspace().folders;
                if (!folders.length) {
                    return;
                }
                linkToOpen = URI.joinPath(folders[0].uri, href);
            }
            else {
                // Resolve relative to notebook document
                linkToOpen = URI.joinPath(dirname(this.documentUri), href);
            }
        }
        if (linkToOpen) {
            // Re-attach fragment now that we have the full file path.
            if (fragment) {
                linkToOpen = linkToOpen.with({ fragment });
            }
            this._openUri(linkToOpen);
        }
    }
    _openUri(uri) {
        let lineNumber = undefined;
        let column = undefined;
        const lineCol = LINE_COLUMN_REGEX.exec(uri.path);
        if (lineCol) {
            uri = uri.with({
                path: uri.path.slice(0, lineCol.index),
                fragment: `L${lineCol[0].slice(1)}`,
            });
            lineNumber = parseInt(lineCol[1], 10);
            column = parseInt(lineCol[2], 10);
        }
        //#region error renderer migration, remove once done
        const lineMatch = LineQueryRegex.exec(uri.query);
        if (lineMatch) {
            const parsedLineNumber = parseInt(lineMatch[1], 10);
            if (!isNaN(parsedLineNumber)) {
                lineNumber = parsedLineNumber + 1;
                column = 1;
                uri = uri.with({ fragment: `L${lineNumber}` });
            }
        }
        uri = uri.with({
            query: null,
        });
        //#endregion
        let match = undefined;
        for (const group of this.editorGroupService.groups) {
            const editorInput = group.editors.find((editor) => editor.resource && isEqual(editor.resource, uri, true));
            if (editorInput) {
                match = { group, editor: editorInput };
                break;
            }
        }
        if (match) {
            const selection = lineNumber !== undefined && column !== undefined
                ? { startLineNumber: lineNumber, startColumn: column }
                : undefined;
            const textEditorOptions = { selection: selection };
            match.group.openEditor(match.editor, selection ? textEditorOptions : undefined);
        }
        else {
            this.openerService.open(uri, { fromUserGesture: true, fromWorkspace: true });
        }
    }
    _handleHighlightCodeBlock(codeBlocks) {
        for (const { id, value, lang } of codeBlocks) {
            // The language id may be a language aliases (e.g.js instead of javascript)
            const languageId = this.languageService.getLanguageIdByLanguageName(lang);
            if (!languageId) {
                continue;
            }
            tokenizeToString(this.languageService, value, languageId).then((html) => {
                if (this._disposed) {
                    return;
                }
                this._sendMessageToWebview({
                    type: 'tokenizedCodeBlock',
                    html,
                    codeBlockId: id,
                });
            });
        }
    }
    async _onDidClickDataLink(event) {
        if (typeof event.data !== 'string') {
            return;
        }
        const [splitStart, splitData] = event.data.split(';base64,');
        if (!splitData || !splitStart) {
            return;
        }
        const defaultDir = extname(this.documentUri) === '.interactive'
            ? (this.workspaceContextService.getWorkspace().folders[0]?.uri ??
                (await this.fileDialogService.defaultFilePath()))
            : dirname(this.documentUri);
        let defaultName;
        if (event.downloadName) {
            defaultName = event.downloadName;
        }
        else {
            const mimeType = splitStart.replace(/^data:/, '');
            const candidateExtension = mimeType && getExtensionForMimeType(mimeType);
            defaultName = candidateExtension ? `download${candidateExtension}` : 'download';
        }
        const defaultUri = joinPath(defaultDir, defaultName);
        const newFileUri = await this.fileDialogService.showSaveDialog({
            defaultUri,
        });
        if (!newFileUri) {
            return;
        }
        const buff = decodeBase64(splitData);
        await this.fileService.writeFile(newFileUri, buff);
        await this.openerService.open(newFileUri);
    }
    _createInset(webviewService, content) {
        this.localResourceRootsCache = this._getResourceRootsCache();
        const webview = webviewService.createWebviewElement({
            origin: BackLayerWebView_1.getOriginStore(this.storageService).getOrigin(this.notebookViewType, undefined),
            title: nls.localize('webview title', 'Notebook webview content'),
            options: {
                purpose: "notebookRenderer" /* WebviewContentPurpose.NotebookRenderer */,
                enableFindWidget: false,
                transformCssVariables: transformWebviewThemeVars,
            },
            contentOptions: {
                allowMultipleAPIAcquire: true,
                allowScripts: true,
                localResourceRoots: this.localResourceRootsCache,
            },
            extension: undefined,
            providedViewType: 'notebook.output',
        });
        webview.setHtml(content);
        webview.setContextKeyService(this.contextKeyService);
        return webview;
    }
    _getResourceRootsCache() {
        const workspaceFolders = this.contextService.getWorkspace().folders.map((x) => x.uri);
        const notebookDir = this.getNotebookBaseUri();
        return [
            this.notebookService.getNotebookProviderResourceRoots(),
            this.notebookService.getRenderers().map((x) => dirname(x.entrypoint.path)),
            ...Array.from(this.notebookService.getStaticPreloads(this.notebookViewType), (x) => [
                dirname(x.entrypoint),
                ...x.localResourceRoots,
            ]),
            workspaceFolders,
            notebookDir,
            this.getBuiltinLocalResourceRoots(),
        ].flat();
    }
    initializeWebViewState() {
        this._preloadsCache.clear();
        if (this._currentKernel) {
            this._updatePreloadsFromKernel(this._currentKernel);
        }
        for (const [output, inset] of this.insetMapping.entries()) {
            this._sendMessageToWebview({
                ...inset.cachedCreation,
                initiallyHidden: this.hiddenInsetMapping.has(output),
            });
        }
        if (this.initializeMarkupPromise?.isFirstInit) {
            // On first run the contents have already been initialized so we don't need to init them again
            // no op
        }
        else {
            const mdCells = [...this.markupPreviewMapping.values()];
            this.markupPreviewMapping.clear();
            this.initializeMarkup(mdCells);
        }
        this._updateStyles();
        this._updateOptions();
    }
    shouldUpdateInset(cell, output, cellTop, outputOffset) {
        if (this._disposed) {
            return false;
        }
        if ('isOutputCollapsed' in cell && cell.isOutputCollapsed) {
            return false;
        }
        if (this.hiddenInsetMapping.has(output)) {
            return true;
        }
        const outputCache = this.insetMapping.get(output);
        if (!outputCache) {
            return false;
        }
        if (outputOffset === outputCache.cachedCreation.outputOffset &&
            cellTop === outputCache.cachedCreation.cellTop) {
            return false;
        }
        return true;
    }
    ackHeight(updates) {
        this._sendMessageToWebview({
            type: 'ack-dimension',
            updates,
        });
    }
    updateScrollTops(outputRequests, markupPreviews) {
        if (this._disposed) {
            return;
        }
        const widgets = coalesce(outputRequests.map((request) => {
            const outputCache = this.insetMapping.get(request.output);
            if (!outputCache) {
                return;
            }
            if (!request.forceDisplay &&
                !this.shouldUpdateInset(request.cell, request.output, request.cellTop, request.outputOffset)) {
                return;
            }
            const id = outputCache.outputId;
            outputCache.cachedCreation.cellTop = request.cellTop;
            outputCache.cachedCreation.outputOffset = request.outputOffset;
            this.hiddenInsetMapping.delete(request.output);
            return {
                cellId: request.cell.id,
                outputId: id,
                cellTop: request.cellTop,
                outputOffset: request.outputOffset,
                forceDisplay: request.forceDisplay,
            };
        }));
        if (!widgets.length && !markupPreviews.length) {
            return;
        }
        this._sendMessageToWebview({
            type: 'view-scroll',
            widgets: widgets,
            markupCells: markupPreviews,
        });
    }
    async createMarkupPreview(initialization) {
        if (this._disposed) {
            return;
        }
        if (this.markupPreviewMapping.has(initialization.cellId)) {
            console.error('Trying to create markup preview that already exists');
            return;
        }
        this.markupPreviewMapping.set(initialization.cellId, initialization);
        this._sendMessageToWebview({
            type: 'createMarkupCell',
            cell: initialization,
        });
    }
    async showMarkupPreview(newContent) {
        if (this._disposed) {
            return;
        }
        const entry = this.markupPreviewMapping.get(newContent.cellId);
        if (!entry) {
            return this.createMarkupPreview(newContent);
        }
        const sameContent = newContent.content === entry.content;
        const sameMetadata = equals(newContent.metadata, entry.metadata);
        if (!sameContent || !sameMetadata || !entry.visible) {
            this._sendMessageToWebview({
                type: 'showMarkupCell',
                id: newContent.cellId,
                handle: newContent.cellHandle,
                // If the content has not changed, we still want to make sure the
                // preview is visible but don't need to send anything over
                content: sameContent ? undefined : newContent.content,
                top: newContent.offset,
                metadata: sameMetadata ? undefined : newContent.metadata,
            });
        }
        entry.metadata = newContent.metadata;
        entry.content = newContent.content;
        entry.offset = newContent.offset;
        entry.visible = true;
    }
    async hideMarkupPreviews(cellIds) {
        if (this._disposed) {
            return;
        }
        const cellsToHide = [];
        for (const cellId of cellIds) {
            const entry = this.markupPreviewMapping.get(cellId);
            if (entry) {
                if (entry.visible) {
                    cellsToHide.push(cellId);
                    entry.visible = false;
                }
            }
        }
        if (cellsToHide.length) {
            this._sendMessageToWebview({
                type: 'hideMarkupCells',
                ids: cellsToHide,
            });
        }
    }
    async unhideMarkupPreviews(cellIds) {
        if (this._disposed) {
            return;
        }
        const toUnhide = [];
        for (const cellId of cellIds) {
            const entry = this.markupPreviewMapping.get(cellId);
            if (entry) {
                if (!entry.visible) {
                    entry.visible = true;
                    toUnhide.push(cellId);
                }
            }
            else {
                console.error(`Trying to unhide a preview that does not exist: ${cellId}`);
            }
        }
        this._sendMessageToWebview({
            type: 'unhideMarkupCells',
            ids: toUnhide,
        });
    }
    async deleteMarkupPreviews(cellIds) {
        if (this._disposed) {
            return;
        }
        for (const id of cellIds) {
            if (!this.markupPreviewMapping.has(id)) {
                console.error(`Trying to delete a preview that does not exist: ${id}`);
            }
            this.markupPreviewMapping.delete(id);
        }
        if (cellIds.length) {
            this._sendMessageToWebview({
                type: 'deleteMarkupCell',
                ids: cellIds,
            });
        }
    }
    async updateMarkupPreviewSelections(selectedCellsIds) {
        if (this._disposed) {
            return;
        }
        this._sendMessageToWebview({
            type: 'updateSelectedMarkupCells',
            selectedCellIds: selectedCellsIds.filter((id) => this.markupPreviewMapping.has(id)),
        });
    }
    async initializeMarkup(cells) {
        if (this._disposed) {
            return;
        }
        this.initializeMarkupPromise?.p.complete();
        const requestId = UUID.generateUuid();
        this.initializeMarkupPromise = {
            p: new DeferredPromise(),
            requestId,
            isFirstInit: this.firstInit,
        };
        this.firstInit = false;
        for (const cell of cells) {
            this.markupPreviewMapping.set(cell.cellId, cell);
        }
        this._sendMessageToWebview({
            type: 'initializeMarkup',
            cells,
            requestId,
        });
        return this.initializeMarkupPromise.p.p;
    }
    /**
     * Validate if cached inset is out of date and require a rerender
     * Note that it doesn't account for output content change.
     */
    _cachedInsetEqual(cachedInset, content) {
        if (content.type === 1 /* RenderOutputType.Extension */) {
            // Use a new renderer
            return cachedInset.renderer?.id === content.renderer.id;
        }
        else {
            // The new renderer is the default HTML renderer
            return cachedInset.cachedCreation.type === 'html';
        }
    }
    requestCreateOutputWhenWebviewIdle(cellInfo, content, cellTop, offset) {
        if (this._disposed) {
            return;
        }
        if (this.insetMapping.has(content.source)) {
            return;
        }
        if (this.pendingWebviewIdleCreationRequest.has(content.source)) {
            return;
        }
        if (this.pendingWebviewIdleInsetMapping.has(content.source)) {
            // handled in renderer process, waiting for webview to process it when idle
            return;
        }
        this.pendingWebviewIdleCreationRequest.set(content.source, runWhenGlobalIdle(() => {
            const { message, renderer, transfer: transferable, } = this._createOutputCreationMessage(cellInfo, content, cellTop, offset, true, true);
            this._sendMessageToWebview(message, transferable);
            this.pendingWebviewIdleInsetMapping.set(content.source, {
                outputId: message.outputId,
                versionId: content.source.model.versionId,
                cellInfo: cellInfo,
                renderer,
                cachedCreation: message,
            });
            this.reversedPendingWebviewIdleInsetMapping.set(message.outputId, content.source);
            this.pendingWebviewIdleCreationRequest.delete(content.source);
        }));
    }
    createOutput(cellInfo, content, cellTop, offset) {
        if (this._disposed) {
            return;
        }
        const cachedInset = this.insetMapping.get(content.source);
        // we now request to render the output immediately, so we can remove the pending request
        // dispose the pending request in renderer process if it exists
        this.pendingWebviewIdleCreationRequest.get(content.source)?.dispose();
        this.pendingWebviewIdleCreationRequest.delete(content.source);
        // if request has already been sent out, we then remove it from the pending mapping
        this.pendingWebviewIdleInsetMapping.delete(content.source);
        if (cachedInset) {
            this.reversedPendingWebviewIdleInsetMapping.delete(cachedInset.outputId);
        }
        if (cachedInset && this._cachedInsetEqual(cachedInset, content)) {
            this.hiddenInsetMapping.delete(content.source);
            this._sendMessageToWebview({
                type: 'showOutput',
                cellId: cachedInset.cellInfo.cellId,
                outputId: cachedInset.outputId,
                cellTop: cellTop,
                outputOffset: offset,
            });
            return;
        }
        // create new output
        const { message, renderer, transfer: transferable, } = this._createOutputCreationMessage(cellInfo, content, cellTop, offset, false, false);
        this._sendMessageToWebview(message, transferable);
        this.insetMapping.set(content.source, {
            outputId: message.outputId,
            versionId: content.source.model.versionId,
            cellInfo: cellInfo,
            renderer,
            cachedCreation: message,
        });
        this.hiddenInsetMapping.delete(content.source);
        this.reversedInsetMapping.set(message.outputId, content.source);
    }
    createMetadata(output, mimeType) {
        if (mimeType.startsWith('image')) {
            const buffer = output.outputs.find((out) => out.mime === 'text/plain')?.data.buffer;
            if (buffer?.length && buffer?.length > 0) {
                const altText = new TextDecoder().decode(buffer);
                return { ...output.metadata, vscode_altText: altText };
            }
        }
        return output.metadata;
    }
    _createOutputCreationMessage(cellInfo, content, cellTop, offset, createOnIdle, initiallyHidden) {
        const messageBase = {
            type: 'html',
            executionId: cellInfo.executionId,
            cellId: cellInfo.cellId,
            cellTop: cellTop,
            outputOffset: offset,
            left: 0,
            requiredPreloads: [],
            createOnIdle: createOnIdle,
        };
        const transfer = [];
        let message;
        let renderer;
        if (content.type === 1 /* RenderOutputType.Extension */) {
            const output = content.source.model;
            renderer = content.renderer;
            const first = output.outputs.find((op) => op.mime === content.mimeType);
            const metadata = this.createMetadata(output, content.mimeType);
            const valueBytes = copyBufferIfNeeded(first.data.buffer, transfer);
            message = {
                ...messageBase,
                outputId: output.outputId,
                rendererId: content.renderer.id,
                content: {
                    type: 1 /* RenderOutputType.Extension */,
                    outputId: output.outputId,
                    metadata: metadata,
                    output: {
                        mime: first.mime,
                        valueBytes,
                    },
                    allOutputs: output.outputs.map((output) => ({ mime: output.mime })),
                },
                initiallyHidden: initiallyHidden,
            };
        }
        else {
            message = {
                ...messageBase,
                outputId: UUID.generateUuid(),
                content: {
                    type: content.type,
                    htmlContent: content.htmlContent,
                },
                initiallyHidden: initiallyHidden,
            };
        }
        return {
            message,
            renderer,
            transfer,
        };
    }
    updateOutput(cellInfo, content, cellTop, offset) {
        if (this._disposed) {
            return;
        }
        if (!this.insetMapping.has(content.source)) {
            this.createOutput(cellInfo, content, cellTop, offset);
            return;
        }
        const outputCache = this.insetMapping.get(content.source);
        if (outputCache.versionId === content.source.model.versionId) {
            // already sent this output version to the renderer
            return;
        }
        this.hiddenInsetMapping.delete(content.source);
        let updatedContent = undefined;
        const transfer = [];
        if (content.type === 1 /* RenderOutputType.Extension */) {
            const output = content.source.model;
            const firstBuffer = output.outputs.find((op) => op.mime === content.mimeType);
            const appenededData = output.appendedSinceVersion(outputCache.versionId, content.mimeType);
            const appended = appenededData
                ? { valueBytes: appenededData.buffer, previousVersion: outputCache.versionId }
                : undefined;
            const valueBytes = copyBufferIfNeeded(firstBuffer.data.buffer, transfer);
            updatedContent = {
                type: 1 /* RenderOutputType.Extension */,
                outputId: outputCache.outputId,
                metadata: output.metadata,
                output: {
                    mime: content.mimeType,
                    valueBytes,
                    appended: appended,
                },
                allOutputs: output.outputs.map((output) => ({ mime: output.mime })),
            };
        }
        this._sendMessageToWebview({
            type: 'showOutput',
            cellId: outputCache.cellInfo.cellId,
            outputId: outputCache.outputId,
            cellTop: cellTop,
            outputOffset: offset,
            content: updatedContent,
        }, transfer);
        outputCache.versionId = content.source.model.versionId;
        return;
    }
    async copyImage(output) {
        this._sendMessageToWebview({
            type: 'copyImage',
            outputId: output.model.outputId,
            altOutputId: output.model.alternativeOutputId,
        });
    }
    removeInsets(outputs) {
        if (this._disposed) {
            return;
        }
        for (const output of outputs) {
            const outputCache = this.insetMapping.get(output);
            if (!outputCache) {
                continue;
            }
            const id = outputCache.outputId;
            this._sendMessageToWebview({
                type: 'clearOutput',
                rendererId: outputCache.cachedCreation.rendererId,
                cellUri: outputCache.cellInfo.cellUri.toString(),
                outputId: id,
                cellId: outputCache.cellInfo.cellId,
            });
            this.insetMapping.delete(output);
            this.pendingWebviewIdleCreationRequest.get(output)?.dispose();
            this.pendingWebviewIdleCreationRequest.delete(output);
            this.pendingWebviewIdleInsetMapping.delete(output);
            this.reversedPendingWebviewIdleInsetMapping.delete(id);
            this.reversedInsetMapping.delete(id);
        }
    }
    hideInset(output) {
        if (this._disposed) {
            return;
        }
        const outputCache = this.insetMapping.get(output);
        if (!outputCache) {
            return;
        }
        this.hiddenInsetMapping.add(output);
        this._sendMessageToWebview({
            type: 'hideOutput',
            outputId: outputCache.outputId,
            cellId: outputCache.cellInfo.cellId,
        });
    }
    focusWebview() {
        if (this._disposed) {
            return;
        }
        this.webview?.focus();
    }
    selectOutputContents(cell) {
        if (this._disposed) {
            return;
        }
        const output = cell.outputsViewModels.find((o) => o.model.outputId === cell.focusedOutputId);
        const outputId = output ? this.insetMapping.get(output)?.outputId : undefined;
        this._sendMessageToWebview({
            type: 'select-output-contents',
            cellOrOutputId: outputId || cell.id,
        });
    }
    selectInputContents(cell) {
        if (this._disposed) {
            return;
        }
        const output = cell.outputsViewModels.find((o) => o.model.outputId === cell.focusedOutputId);
        const outputId = output ? this.insetMapping.get(output)?.outputId : undefined;
        this._sendMessageToWebview({
            type: 'select-input-contents',
            cellOrOutputId: outputId || cell.id,
        });
    }
    focusOutput(cellOrOutputId, alternateId, viewFocused) {
        if (this._disposed) {
            return;
        }
        if (!viewFocused) {
            this.webview?.focus();
        }
        this._sendMessageToWebview({
            type: 'focus-output',
            cellOrOutputId: cellOrOutputId,
            alternateId: alternateId,
        });
    }
    blurOutput() {
        if (this._disposed) {
            return;
        }
        this._sendMessageToWebview({
            type: 'blur-output',
        });
    }
    async find(query, options) {
        if (query === '') {
            this._sendMessageToWebview({
                type: 'findStop',
                ownerID: options.ownerID,
            });
            return [];
        }
        const p = new Promise((resolve) => {
            const sub = this.webview?.onMessage((e) => {
                if (e.message.type === 'didFind') {
                    resolve(e.message.matches);
                    sub?.dispose();
                }
            });
        });
        this._sendMessageToWebview({
            type: 'find',
            query: query,
            options,
        });
        const ret = await p;
        return ret;
    }
    findStop(ownerID) {
        this._sendMessageToWebview({
            type: 'findStop',
            ownerID,
        });
    }
    async findHighlightCurrent(index, ownerID) {
        const p = new Promise((resolve) => {
            const sub = this.webview?.onMessage((e) => {
                if (e.message.type === 'didFindHighlightCurrent') {
                    resolve(e.message.offset);
                    sub?.dispose();
                }
            });
        });
        this._sendMessageToWebview({
            type: 'findHighlightCurrent',
            index,
            ownerID,
        });
        const ret = await p;
        return ret;
    }
    async findUnHighlightCurrent(index, ownerID) {
        this._sendMessageToWebview({
            type: 'findUnHighlightCurrent',
            index,
            ownerID,
        });
    }
    deltaCellOutputContainerClassNames(cellId, added, removed) {
        this._sendMessageToWebview({
            type: 'decorations',
            cellId,
            addedClassNames: added,
            removedClassNames: removed,
        });
    }
    deltaMarkupPreviewClassNames(cellId, added, removed) {
        if (this.markupPreviewMapping.get(cellId)) {
            this._sendMessageToWebview({
                type: 'markupDecorations',
                cellId,
                addedClassNames: added,
                removedClassNames: removed,
            });
        }
    }
    updateOutputRenderers() {
        if (!this.webview) {
            return;
        }
        const renderersData = this.getRendererData();
        this.localResourceRootsCache = this._getResourceRootsCache();
        const mixedResourceRoots = [
            ...(this.localResourceRootsCache || []),
            ...(this._currentKernel ? [this._currentKernel.localResourceRoot] : []),
        ];
        this.webview.localResourcesRoot = mixedResourceRoots;
        this._sendMessageToWebview({
            type: 'updateRenderers',
            rendererData: renderersData,
        });
    }
    async updateKernelPreloads(kernel) {
        if (this._disposed || kernel === this._currentKernel) {
            return;
        }
        const previousKernel = this._currentKernel;
        this._currentKernel = kernel;
        if (previousKernel && previousKernel.preloadUris.length > 0) {
            this.webview?.reload(); // preloads will be restored after reload
        }
        else if (kernel) {
            this._updatePreloadsFromKernel(kernel);
        }
    }
    _updatePreloadsFromKernel(kernel) {
        const resources = [];
        for (const preload of kernel.preloadUris) {
            const uri = this.environmentService.isExtensionDevelopment &&
                (preload.scheme === 'http' || preload.scheme === 'https')
                ? preload
                : this.asWebviewUri(preload, undefined);
            if (!this._preloadsCache.has(uri.toString())) {
                resources.push({ uri: uri.toString(), originalUri: preload.toString() });
                this._preloadsCache.add(uri.toString());
            }
        }
        if (!resources.length) {
            return;
        }
        this._updatePreloads(resources);
    }
    _updatePreloads(resources) {
        if (!this.webview) {
            return;
        }
        const mixedResourceRoots = [
            ...(this.localResourceRootsCache || []),
            ...(this._currentKernel ? [this._currentKernel.localResourceRoot] : []),
        ];
        this.webview.localResourcesRoot = mixedResourceRoots;
        this._sendMessageToWebview({
            type: 'preload',
            resources: resources,
        });
    }
    _sendMessageToWebview(message, transfer) {
        if (this._disposed) {
            return;
        }
        this.webview?.postMessage(message, transfer);
    }
    dispose() {
        this._disposed = true;
        this.webview?.dispose();
        this.webview = undefined;
        this.notebookEditor = null;
        this.insetMapping.clear();
        this.pendingWebviewIdleCreationRequest.clear();
        super.dispose();
    }
};
BackLayerWebView = BackLayerWebView_1 = __decorate([
    __param(6, IWebviewService),
    __param(7, IOpenerService),
    __param(8, INotebookService),
    __param(9, IWorkspaceContextService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IFileDialogService),
    __param(12, IFileService),
    __param(13, IContextMenuService),
    __param(14, IContextKeyService),
    __param(15, IWorkspaceTrustManagementService),
    __param(16, IConfigurationService),
    __param(17, ILanguageService),
    __param(18, IWorkspaceContextService),
    __param(19, IEditorGroupsService),
    __param(20, IStorageService),
    __param(21, IPathService),
    __param(22, INotebookLoggingService),
    __param(23, IThemeService),
    __param(24, ITelemetryService)
], BackLayerWebView);
export { BackLayerWebView };
function copyBufferIfNeeded(buffer, transfer) {
    if (buffer.byteLength === buffer.buffer.byteLength) {
        // No copy needed but we can't transfer either
        return buffer;
    }
    else {
        // The buffer is smaller than its backing array buffer.
        // Create a copy to avoid sending the entire array buffer.
        const valueBytes = new Uint8Array(buffer);
        transfer.push(valueBytes.buffer);
        return valueBytes;
    }
}
function getTokenizationCss() {
    const colorMap = TokenizationRegistry.getColorMap();
    const tokenizationCss = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
    return tokenizationCss;
}
function tryDecodeURIComponent(uri) {
    try {
        return decodeURIComponent(uri);
    }
    catch {
        return uri;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja0xheWVyV2ViVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L3JlbmRlcmVycy9iYWNrTGF5ZXJXZWJWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFPakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFBO0FBRXZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9FLE9BQU8sRUFDTixVQUFVLEVBQ1YsT0FBTyxFQUNQLGFBQWEsRUFDYixpQkFBaUIsR0FDakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3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