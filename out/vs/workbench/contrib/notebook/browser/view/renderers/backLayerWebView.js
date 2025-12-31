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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja0xheWVyV2ViVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9yZW5kZXJlcnMvYmFja0xheWVyV2ViVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBT2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sVUFBVSxFQUNWLE9BQU8sRUFDUCxhQUFhLEVBQ2IsaUJBQWlCLEdBQ2pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxJQUFJLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFF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