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
var ChatMarkdownContentPart_1;
import * as dom from '../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatMarkdownDecorationsRenderer } from '../chatMarkdownDecorationsRenderer.js';
import { CodeBlockPart, localFileLanguageId, parseLocalFileData, } from '../codeBlockPart.js';
import '../media/chatCodeBlockPill.css';
import { ResourcePool } from './chatCollections.js';
const $ = dom.$;
let ChatMarkdownContentPart = class ChatMarkdownContentPart extends Disposable {
    static { ChatMarkdownContentPart_1 = this; }
    static { this.idPool = 0; }
    constructor(markdown, context, editorPool, fillInIncompleteTokens = false, codeBlockStartIndex = 0, renderer, currentWidth, codeBlockModelCollection, rendererOptions, contextKeyService, textModelService, instantiationService) {
        super();
        this.markdown = markdown;
        this.editorPool = editorPool;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.rendererOptions = rendererOptions;
        this.textModelService = textModelService;
        this.instantiationService = instantiationService;
        this.codeblocksPartId = String(++ChatMarkdownContentPart_1.idPool);
        this.allRefs = [];
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.codeblocks = [];
        const element = context.element;
        const inUndoStop = findLast(context.content, (e) => e.kind === 'undoStop', context.contentIndex)?.id;
        // We release editors in order so that it's more likely that the same editor will be assigned if this element is re-rendered right away, like it often is during progressive rendering
        const orderedDisposablesList = [];
        // Need to track the index of the codeblock within the response so it can have a unique ID,
        // and within this part to find it within the codeblocks array
        let globalCodeBlockIndexStart = codeBlockStartIndex;
        let thisPartCodeBlockIndexStart = 0;
        // Don't set to 'false' for responses, respect defaults
        const markedOpts = isRequestVM(element)
            ? {
                gfm: true,
                breaks: true,
            }
            : undefined;
        const result = this._register(renderer.render(markdown.content, {
            fillInIncompleteTokens,
            codeBlockRendererSync: (languageId, text, raw) => {
                const isCodeBlockComplete = !isResponseVM(context.element) ||
                    context.element.isComplete ||
                    !raw ||
                    codeblockHasClosingBackticks(raw);
                if ((!text || (text.startsWith('<vscode_codeblock_uri') && !text.includes('\n'))) &&
                    !isCodeBlockComplete) {
                    const hideEmptyCodeblock = $('div');
                    hideEmptyCodeblock.style.display = 'none';
                    return hideEmptyCodeblock;
                }
                const globalIndex = globalCodeBlockIndexStart++;
                const thisPartIndex = thisPartCodeBlockIndexStart++;
                let textModel;
                let range;
                let vulns;
                let codeblockEntry;
                if (equalsIgnoreCase(languageId, localFileLanguageId)) {
                    try {
                        const parsedBody = parseLocalFileData(text);
                        range = parsedBody.range && Range.lift(parsedBody.range);
                        textModel = this.textModelService
                            .createModelReference(parsedBody.uri)
                            .then((ref) => ref.object.textEditorModel);
                    }
                    catch (e) {
                        return $('div');
                    }
                }
                else {
                    const sessionId = isResponseVM(element) || isRequestVM(element) ? element.sessionId : '';
                    const modelEntry = this.codeBlockModelCollection.getOrCreate(sessionId, element, globalIndex);
                    const fastUpdateModelEntry = this.codeBlockModelCollection.updateSync(sessionId, element, globalIndex, { text, languageId, isComplete: isCodeBlockComplete });
                    vulns = modelEntry.vulns;
                    codeblockEntry = fastUpdateModelEntry;
                    textModel = modelEntry.model;
                }
                const hideToolbar = isResponseVM(element) && element.errorDetails?.responseIsFiltered;
                const renderOptions = {
                    ...this.rendererOptions.codeBlockRenderOptions,
                };
                if (hideToolbar !== undefined) {
                    renderOptions.hideToolbar = hideToolbar;
                }
                const codeBlockInfo = {
                    languageId,
                    textModel,
                    codeBlockIndex: globalIndex,
                    codeBlockPartIndex: thisPartIndex,
                    element,
                    range,
                    parentContextKeyService: contextKeyService,
                    vulns,
                    codemapperUri: codeblockEntry?.codemapperUri,
                    renderOptions,
                };
                if (element.isCompleteAddedRequest ||
                    !codeblockEntry?.codemapperUri ||
                    !codeblockEntry.isEdit) {
                    const ref = this.renderCodeBlock(codeBlockInfo, text, isCodeBlockComplete, currentWidth);
                    this.allRefs.push(ref);
                    // Attach this after updating text/layout of the editor, so it should only be fired when the size updates later (horizontal scrollbar, wrapping)
                    // not during a renderElement OR a progressive render (when we will be firing this event anyway at the end of the render)
                    this._register(ref.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
                    const ownerMarkdownPartId = this.codeblocksPartId;
                    const info = new (class {
                        constructor() {
                            this.ownerMarkdownPartId = ownerMarkdownPartId;
                            this.codeBlockIndex = globalIndex;
                            this.elementId = element.id;
                            this.isStreaming = false;
                            this.codemapperUri = undefined; // will be set async
                            this.uriPromise = textModel.then((model) => model.uri);
                        }
                        get uri() {
                            // here we must do a getter because the ref.object is rendered
                            // async and the uri might be undefined when it's read immediately
                            return ref.object.uri;
                        }
                        focus() {
                            ref.object.focus();
                        }
                    })();
                    this.codeblocks.push(info);
                    orderedDisposablesList.push(ref);
                    return ref.object.element;
                }
                else {
                    const requestId = isRequestVM(element) ? element.id : element.requestId;
                    const ref = this.renderCodeBlockPill(element.sessionId, requestId, inUndoStop, codeBlockInfo.codemapperUri, !isCodeBlockComplete);
                    if (isResponseVM(codeBlockInfo.element)) {
                        // TODO@joyceerhl: remove this code when we change the codeblockUri API to make the URI available synchronously
                        this.codeBlockModelCollection
                            .update(codeBlockInfo.element.sessionId, codeBlockInfo.element, codeBlockInfo.codeBlockIndex, { text, languageId: codeBlockInfo.languageId, isComplete: isCodeBlockComplete })
                            .then((e) => {
                            // Update the existing object's codemapperUri
                            this.codeblocks[codeBlockInfo.codeBlockPartIndex].codemapperUri =
                                e.codemapperUri;
                            this._onDidChangeHeight.fire();
                        });
                    }
                    this.allRefs.push(ref);
                    const ownerMarkdownPartId = this.codeblocksPartId;
                    const info = new (class {
                        constructor() {
                            this.ownerMarkdownPartId = ownerMarkdownPartId;
                            this.codeBlockIndex = globalIndex;
                            this.elementId = element.id;
                            this.isStreaming = !isCodeBlockComplete;
                            this.codemapperUri = codeblockEntry?.codemapperUri;
                            this.uriPromise = Promise.resolve(undefined);
                        }
                        get uri() {
                            return undefined;
                        }
                        focus() {
                            return ref.object.element.focus();
                        }
                    })();
                    this.codeblocks.push(info);
                    orderedDisposablesList.push(ref);
                    return ref.object.element;
                }
            },
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        }, markedOpts));
        const markdownDecorationsRenderer = instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
        this._register(markdownDecorationsRenderer.walkTreeAndAnnotateReferenceLinks(markdown, result.element));
        orderedDisposablesList.reverse().forEach((d) => this._register(d));
        this.domNode = result.element;
    }
    renderCodeBlockPill(sessionId, requestId, inUndoStop, codemapperUri, isStreaming) {
        const codeBlock = this.instantiationService.createInstance(CollapsedCodeBlock, sessionId, requestId, inUndoStop);
        if (codemapperUri) {
            codeBlock.render(codemapperUri, isStreaming);
        }
        return {
            object: codeBlock,
            isStale: () => false,
            dispose: () => codeBlock.dispose(),
        };
    }
    renderCodeBlock(data, text, isComplete, currentWidth) {
        const ref = this.editorPool.get();
        const editorInfo = ref.object;
        if (isResponseVM(data.element)) {
            this.codeBlockModelCollection
                .update(data.element.sessionId, data.element, data.codeBlockIndex, {
                text,
                languageId: data.languageId,
                isComplete,
            })
                .then((e) => {
                // Update the existing object's codemapperUri
                this.codeblocks[data.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                this._onDidChangeHeight.fire();
            });
        }
        editorInfo.render(data, currentWidth);
        return ref;
    }
    hasSameContent(other) {
        return (other.kind === 'markdownContent' &&
            !!(other.content.value === this.markdown.content.value ||
                (this.codeblocks.at(-1)?.isStreaming &&
                    this.codeblocks.at(-1)?.codemapperUri !== undefined &&
                    other.content.value.lastIndexOf('```') === this.markdown.content.value.lastIndexOf('```'))));
    }
    layout(width) {
        this.allRefs.forEach((ref, index) => {
            if (ref.object instanceof CodeBlockPart) {
                ref.object.layout(width);
            }
            else if (ref.object instanceof CollapsedCodeBlock) {
                const codeblockModel = this.codeblocks[index];
                if (codeblockModel.codemapperUri &&
                    ref.object.uri?.toString() !== codeblockModel.codemapperUri.toString()) {
                    ref.object.render(codeblockModel.codemapperUri, codeblockModel.isStreaming);
                }
            }
        });
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMarkdownContentPart = ChatMarkdownContentPart_1 = __decorate([
    __param(9, IContextKeyService),
    __param(10, ITextModelService),
    __param(11, IInstantiationService)
], ChatMarkdownContentPart);
export { ChatMarkdownContentPart };
let EditorPool = class EditorPool extends Disposable {
    inUse() {
        return this._pool.inUse;
    }
    constructor(options, delegate, overflowWidgetsDomNode, instantiationService) {
        super();
        this._pool = this._register(new ResourcePool(() => {
            return instantiationService.createInstance(CodeBlockPart, options, MenuId.ChatCodeBlock, delegate, overflowWidgetsDomNode);
        }));
    }
    get() {
        const codeBlock = this._pool.get();
        let stale = false;
        return {
            object: codeBlock,
            isStale: () => stale,
            dispose: () => {
                codeBlock.reset();
                stale = true;
                this._pool.release(codeBlock);
            },
        };
    }
};
EditorPool = __decorate([
    __param(3, IInstantiationService)
], EditorPool);
export { EditorPool };
function codeblockHasClosingBackticks(str) {
    str = str.trim();
    return !!str.match(/\n```+$/);
}
let CollapsedCodeBlock = class CollapsedCodeBlock extends Disposable {
    get uri() {
        return this._uri;
    }
    constructor(sessionId, requestId, inUndoStop, labelService, editorService, modelService, languageService, contextMenuService, contextKeyService, menuService, hoverService, chatService) {
        super();
        this.sessionId = sessionId;
        this.requestId = requestId;
        this.inUndoStop = inUndoStop;
        this.labelService = labelService;
        this.editorService = editorService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.hover = this._register(new MutableDisposable());
        this._progressStore = this._store.add(new DisposableStore());
        this.element = $('.chat-codeblock-pill-widget');
        this.element.classList.add('show-file-icons');
        this._register(dom.addDisposableListener(this.element, 'click', async () => {
            if (this._currentDiff) {
                this.editorService.openEditor({
                    original: { resource: this._currentDiff.originalURI },
                    modified: { resource: this._currentDiff.modifiedURI },
                    options: { transient: true },
                });
            }
            else if (this.uri) {
                this.editorService.openEditor({ resource: this.uri });
            }
        }));
        this._register(dom.addDisposableListener(this.element, dom.EventType.CONTEXT_MENU, (domEvent) => {
            const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
            dom.EventHelper.stop(domEvent, true);
            this.contextMenuService.showContextMenu({
                contextKeyService: this.contextKeyService,
                getAnchor: () => event,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatEditingCodeBlockContext, this.contextKeyService, { arg: { sessionId, requestId, uri: this.uri, stopId: inUndoStop } });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
    }
    render(uri, isStreaming) {
        this._progressStore.clear();
        this._uri = uri;
        const session = this.chatService.getSession(this.sessionId);
        const iconText = this.labelService.getUriBasenameLabel(uri);
        let editSession = session?.editingSessionObs?.promiseResult.get()?.data;
        let modifiedEntry = editSession?.getEntry(uri);
        let modifiedByResponse = modifiedEntry?.isCurrentlyBeingModifiedBy.get();
        const isComplete = !modifiedByResponse || modifiedByResponse.requestId !== this.requestId;
        let iconClasses = [];
        if (isStreaming || !isComplete) {
            const codicon = ThemeIcon.modify(Codicon.loading, 'spin');
            iconClasses = ThemeIcon.asClassNameArray(codicon);
        }
        else {
            const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
            iconClasses = getIconClasses(this.modelService, this.languageService, uri, fileKind);
        }
        const iconEl = dom.$('span.icon');
        iconEl.classList.add(...iconClasses);
        const children = [dom.$('span.icon-label', {}, iconText)];
        const labelDetail = dom.$('span.label-detail', {}, '');
        children.push(labelDetail);
        if (isStreaming) {
            labelDetail.textContent = localize('chat.codeblock.generating', 'Generating edits...');
        }
        this.element.replaceChildren(iconEl, ...children);
        this.updateTooltip(this.labelService.getUriLabel(uri, { relative: false }));
        const renderDiff = (changes) => {
            const labelAdded = this.element.querySelector('.label-added') ??
                this.element.appendChild(dom.$('span.label-added'));
            const labelRemoved = this.element.querySelector('.label-removed') ??
                this.element.appendChild(dom.$('span.label-removed'));
            if (changes && !changes?.identical && !changes?.quitEarly) {
                this._currentDiff = changes;
                labelAdded.textContent = `+${changes.added}`;
                labelRemoved.textContent = `-${changes.removed}`;
                const insertionsFragment = changes.added === 1
                    ? localize('chat.codeblock.insertions.one', '1 insertion')
                    : localize('chat.codeblock.insertions', '{0} insertions', changes.added);
                const deletionsFragment = changes.removed === 1
                    ? localize('chat.codeblock.deletions.one', '1 deletion')
                    : localize('chat.codeblock.deletions', '{0} deletions', changes.removed);
                const summary = localize('summary', 'Edited {0}, {1}, {2}', iconText, insertionsFragment, deletionsFragment);
                this.element.ariaLabel = summary;
                this.updateTooltip(summary);
            }
        };
        let diffBetweenStops;
        // Show a percentage progress that is driven by the rewrite
        this._progressStore.add(autorun((r) => {
            if (!editSession) {
                editSession = session?.editingSessionObs?.promiseResult.read(r)?.data;
                modifiedEntry = editSession?.getEntry(uri);
            }
            modifiedByResponse = modifiedEntry?.isCurrentlyBeingModifiedBy.read(r);
            const isComplete = !modifiedByResponse || modifiedByResponse.requestId !== this.requestId;
            const rewriteRatio = modifiedEntry?.rewriteRatio.read(r);
            if (!isStreaming && !isComplete) {
                const value = rewriteRatio;
                labelDetail.textContent =
                    value === 0 || !value
                        ? localize('chat.codeblock.generating', 'Generating edits...')
                        : localize('chat.codeblock.applyingPercentage', 'Applying edits ({0}%)...', Math.round(value * 100));
            }
            else if (!isStreaming && isComplete) {
                iconEl.classList.remove(...iconClasses);
                const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
                iconEl.classList.add(...getIconClasses(this.modelService, this.languageService, uri, fileKind));
                labelDetail.textContent = '';
            }
            if (!diffBetweenStops) {
                diffBetweenStops =
                    modifiedEntry && editSession
                        ? editSession.getEntryDiffBetweenStops(modifiedEntry.modifiedURI, this.requestId, this.inUndoStop)
                        : undefined;
            }
            if (!isStreaming && isComplete && diffBetweenStops) {
                renderDiff(diffBetweenStops.read(r));
            }
        }));
    }
    updateTooltip(tooltip) {
        this.tooltip = tooltip;
        if (!this.hover.value) {
            this.hover.value = this.hoverService.setupDelayedHover(this.element, () => ({
                content: this.tooltip,
                appearance: { compact: true, showPointer: true },
                position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                persistence: { hideOnKeyDown: true },
            }));
        }
    }
};
CollapsedCodeBlock = __decorate([
    __param(3, ILabelService),
    __param(4, IEditorService),
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, IContextMenuService),
    __param(8, IContextKeyService),
    __param(9, IMenuService),
    __param(10, IHoverService),
    __param(11, IChatService)
], CollapsedCodeBlock);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRNYXJrZG93bkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLFFB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