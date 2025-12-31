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
import { Emitter } from '../../../../base/common/event.js';
import { combinedDisposable, DisposableStore, dispose, } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { EditorCommand, registerEditorCommand } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Range } from '../../../common/core/range.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const ctxHasSymbols = new RawContextKey('hasSymbols', false, localize('hasSymbols', 'Whether there are symbol locations that can be navigated via keyboard-only.'));
export const ISymbolNavigationService = createDecorator('ISymbolNavigationService');
let SymbolNavigationService = class SymbolNavigationService {
    constructor(contextKeyService, _editorService, _notificationService, _keybindingService) {
        this._editorService = _editorService;
        this._notificationService = _notificationService;
        this._keybindingService = _keybindingService;
        this._currentModel = undefined;
        this._currentIdx = -1;
        this._ignoreEditorChange = false;
        this._ctxHasSymbols = ctxHasSymbols.bindTo(contextKeyService);
    }
    reset() {
        this._ctxHasSymbols.reset();
        this._currentState?.dispose();
        this._currentMessage?.dispose();
        this._currentModel = undefined;
        this._currentIdx = -1;
    }
    put(anchor) {
        const refModel = anchor.parent.parent;
        if (refModel.references.length <= 1) {
            this.reset();
            return;
        }
        this._currentModel = refModel;
        this._currentIdx = refModel.references.indexOf(anchor);
        this._ctxHasSymbols.set(true);
        this._showMessage();
        const editorState = new EditorState(this._editorService);
        const listener = editorState.onDidChange((_) => {
            if (this._ignoreEditorChange) {
                return;
            }
            const editor = this._editorService.getActiveCodeEditor();
            if (!editor) {
                return;
            }
            const model = editor.getModel();
            const position = editor.getPosition();
            if (!model || !position) {
                return;
            }
            let seenUri = false;
            let seenPosition = false;
            for (const reference of refModel.references) {
                if (isEqual(reference.uri, model.uri)) {
                    seenUri = true;
                    seenPosition = seenPosition || Range.containsPosition(reference.range, position);
                }
                else if (seenUri) {
                    break;
                }
            }
            if (!seenUri || !seenPosition) {
                this.reset();
            }
        });
        this._currentState = combinedDisposable(editorState, listener);
    }
    revealNext(source) {
        if (!this._currentModel) {
            return Promise.resolve();
        }
        // get next result and advance
        this._currentIdx += 1;
        this._currentIdx %= this._currentModel.references.length;
        const reference = this._currentModel.references[this._currentIdx];
        // status
        this._showMessage();
        // open editor, ignore events while that happens
        this._ignoreEditorChange = true;
        return this._editorService
            .openCodeEditor({
            resource: reference.uri,
            options: {
                selection: Range.collapseToStart(reference.range),
                selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
            },
        }, source)
            .finally(() => {
            this._ignoreEditorChange = false;
        });
    }
    _showMessage() {
        this._currentMessage?.dispose();
        const kb = this._keybindingService.lookupKeybinding('editor.gotoNextSymbolFromResult');
        const message = kb
            ? localize('location.kb', 'Symbol {0} of {1}, {2} for next', this._currentIdx + 1, this._currentModel.references.length, kb.getLabel())
            : localize('location', 'Symbol {0} of {1}', this._currentIdx + 1, this._currentModel.references.length);
        this._currentMessage = this._notificationService.status(message);
    }
};
SymbolNavigationService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICodeEditorService),
    __param(2, INotificationService),
    __param(3, IKeybindingService)
], SymbolNavigationService);
registerSingleton(ISymbolNavigationService, SymbolNavigationService, 1 /* InstantiationType.Delayed */);
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.gotoNextSymbolFromResult',
            precondition: ctxHasSymbols,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 70 /* KeyCode.F12 */,
            },
        });
    }
    runEditorCommand(accessor, editor) {
        return accessor.get(ISymbolNavigationService).revealNext(editor);
    }
})());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'editor.gotoNextSymbolFromResult.cancel',
    weight: 100 /* KeybindingWeight.EditorContrib */,
    when: ctxHasSymbols,
    primary: 9 /* KeyCode.Escape */,
    handler(accessor) {
        accessor.get(ISymbolNavigationService).reset();
    },
});
//
let EditorState = class EditorState {
    constructor(editorService) {
        this._listener = new Map();
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._disposables.add(editorService.onCodeEditorRemove(this._onDidRemoveEditor, this));
        this._disposables.add(editorService.onCodeEditorAdd(this._onDidAddEditor, this));
        editorService.listCodeEditors().forEach(this._onDidAddEditor, this);
    }
    dispose() {
        this._disposables.dispose();
        this._onDidChange.dispose();
        dispose(this._listener.values());
    }
    _onDidAddEditor(editor) {
        this._listener.set(editor, combinedDisposable(editor.onDidChangeCursorPosition((_) => this._onDidChange.fire({ editor })), editor.onDidChangeModelContent((_) => this._onDidChange.fire({ editor }))));
    }
    _onDidRemoveEditor(editor) {
        this._listener.get(editor)?.dispose();
        this._listener.delete(editor);
    }
};
EditorState = __decorate([
    __param(0, ICodeEditorService)
], EditorState);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sTmF2aWdhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9zeW1ib2xOYXZpZ2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUUvRixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQzdDLFlBQVksRUFDWixLQUFL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