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
import * as dom from '../../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, RefCountedDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { assertType } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { DefaultModelSHA1Computer } from '../../../../../editor/common/services/modelService.js';
import { ITextModelService, } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { registerSingleton, } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ResourcePool } from './chatCollections.js';
import { CodeCompareBlockPart, } from '../codeBlockPart.js';
import { IChatService } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
const $ = dom.$;
const ICodeCompareModelService = createDecorator('ICodeCompareModelService');
let ChatTextEditContentPart = class ChatTextEditContentPart extends Disposable {
    constructor(chatTextEdit, context, rendererOptions, diffEditorPool, currentWidth, codeCompareModelService) {
        super();
        this.codeCompareModelService = codeCompareModelService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const element = context.element;
        assertType(isResponseVM(element));
        // TODO@jrieken move this into the CompareCodeBlock and properly say what kind of changes happen
        if (rendererOptions.renderTextEditsAsSummary?.(chatTextEdit.uri)) {
            if (element.response.value.every((item) => item.kind === 'textEditGroup')) {
                this.domNode = $('.interactive-edits-summary', undefined, !element.isComplete
                    ? ''
                    : element.isCanceled
                        ? localize('edits0', 'Making changes was aborted.')
                        : localize('editsSummary', 'Made changes.'));
            }
            else {
                this.domNode = $('div');
            }
            // TODO@roblourens this case is now handled outside this Part in ChatListRenderer, but can it be cleaned up?
            // return;
        }
        else {
            const cts = new CancellationTokenSource();
            let isDisposed = false;
            this._register(toDisposable(() => {
                isDisposed = true;
                cts.dispose(true);
            }));
            this.comparePart = this._register(diffEditorPool.get());
            // Attach this after updating text/layout of the editor, so it should only be fired when the size updates later (horizontal scrollbar, wrapping)
            // not during a renderElement OR a progressive render (when we will be firing this event anyway at the end of the render)
            this._register(this.comparePart.object.onDidChangeContentHeight(() => {
                this._onDidChangeHeight.fire();
            }));
            const data = {
                element,
                edit: chatTextEdit,
                diffData: (async () => {
                    const ref = await this.codeCompareModelService.createModel(element, chatTextEdit);
                    if (isDisposed) {
                        ref.dispose();
                        return;
                    }
                    this._register(ref);
                    return {
                        modified: ref.object.modified.textEditorModel,
                        original: ref.object.original.textEditorModel,
                        originalSha1: ref.object.originalSha1,
                    };
                })(),
            };
            this.comparePart.object.render(data, currentWidth, cts.token);
            this.domNode = this.comparePart.object.element;
        }
    }
    layout(width) {
        this.comparePart?.object.layout(width);
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'textEditGroup';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatTextEditContentPart = __decorate([
    __param(5, ICodeCompareModelService)
], ChatTextEditContentPart);
export { ChatTextEditContentPart };
let DiffEditorPool = class DiffEditorPool extends Disposable {
    inUse() {
        return this._pool.inUse;
    }
    constructor(options, delegate, overflowWidgetsDomNode, instantiationService) {
        super();
        this._pool = this._register(new ResourcePool(() => {
            return instantiationService.createInstance(CodeCompareBlockPart, options, MenuId.ChatCompareBlock, delegate, overflowWidgetsDomNode);
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
DiffEditorPool = __decorate([
    __param(3, IInstantiationService)
], DiffEditorPool);
export { DiffEditorPool };
let CodeCompareModelService = class CodeCompareModelService {
    constructor(textModelService, modelService, chatService) {
        this.textModelService = textModelService;
        this.modelService = modelService;
        this.chatService = chatService;
    }
    async createModel(element, chatTextEdit) {
        const original = await this.textModelService.createModelReference(chatTextEdit.uri);
        const modified = await this.textModelService.createModelReference(this.modelService.createModel(createTextBufferFactoryFromSnapshot(original.object.textEditorModel.createSnapshot()), { languageId: original.object.textEditorModel.getLanguageId(), onDidChange: Event.None }, URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            path: chatTextEdit.uri.path,
            query: generateUuid(),
        }), false).uri);
        const d = new RefCountedDisposable(toDisposable(() => {
            original.dispose();
            modified.dispose();
        }));
        // compute the sha1 of the original model
        let originalSha1 = '';
        if (chatTextEdit.state) {
            originalSha1 = chatTextEdit.state.sha1;
        }
        else {
            const sha1 = new DefaultModelSHA1Computer();
            if (sha1.canComputeSHA1(original.object.textEditorModel)) {
                originalSha1 = sha1.computeSHA1(original.object.textEditorModel);
                chatTextEdit.state = { sha1: originalSha1, applied: 0 };
            }
        }
        // apply edits to the "modified" model
        const chatModel = this.chatService.getSession(element.sessionId);
        const editGroups = [];
        for (const request of chatModel.getRequests()) {
            if (!request.response) {
                continue;
            }
            for (const item of request.response.response.value) {
                if (item.kind !== 'textEditGroup' ||
                    item.state?.applied ||
                    !isEqual(item.uri, chatTextEdit.uri)) {
                    continue;
                }
                for (const group of item.edits) {
                    const edits = group.map(TextEdit.asEditOperation);
                    editGroups.push(edits);
                }
            }
            if (request.response === element.model) {
                break;
            }
        }
        for (const edits of editGroups) {
            modified.object.textEditorModel.pushEditOperations(null, edits, () => null);
        }
        // self-acquire a reference to diff models for a short while
        // because streaming usually means we will be using the original-model
        // repeatedly and thereby also should reuse the modified-model and just
        // update it with more edits
        d.acquire();
        setTimeout(() => d.release(), 5000);
        return {
            object: {
                originalSha1,
                original: original.object,
                modified: modified.object,
            },
            dispose() {
                d.release();
            },
        };
    }
};
CodeCompareModelService = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, IChatService)
], CodeCompareModelService);
registerSingleton(ICodeCompareModelService, CodeCompareModelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRleHRFZGl0Q29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0VGV4dEVkaXRDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsRUFHVixvQkFBb0IsRUFDcEIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVB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