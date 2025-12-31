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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0TWFya2Rvd25Db250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVB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