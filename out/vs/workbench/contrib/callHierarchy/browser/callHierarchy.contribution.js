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
var CallHierarchyController_1;
import { localize, localize2 } from '../../../../nls.js';
import { CallHierarchyProviderRegistry, CallHierarchyModel, } from '../common/callHierarchy.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { CallHierarchyTreePeekWidget } from './callHierarchyPeek.js';
import { Event } from '../../../../base/common/event.js';
import { registerEditorContribution, EditorAction2, } from '../../../../editor/browser/editorExtensions.js';
import { IContextKeyService, RawContextKey, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { isCancellationError } from '../../../../base/common/errors.js';
const _ctxHasCallHierarchyProvider = new RawContextKey('editorHasCallHierarchyProvider', false, localize('editorHasCallHierarchyProvider', 'Whether a call hierarchy provider is available'));
const _ctxCallHierarchyVisible = new RawContextKey('callHierarchyVisible', false, localize('callHierarchyVisible', 'Whether call hierarchy peek is currently showing'));
const _ctxCallHierarchyDirection = new RawContextKey('callHierarchyDirection', undefined, {
    type: 'string',
    description: localize('callHierarchyDirection', 'Whether call hierarchy shows incoming or outgoing calls'),
});
function sanitizedDirection(candidate) {
    return candidate === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */ ||
        candidate === "incomingCalls" /* CallHierarchyDirection.CallsTo */
        ? candidate
        : "incomingCalls" /* CallHierarchyDirection.CallsTo */;
}
let CallHierarchyController = class CallHierarchyController {
    static { CallHierarchyController_1 = this; }
    static { this.Id = 'callHierarchy'; }
    static get(editor) {
        return editor.getContribution(CallHierarchyController_1.Id);
    }
    static { this._StorageDirection = 'callHierarchy/defaultDirection'; }
    constructor(_editor, _contextKeyService, _storageService, _editorService, _instantiationService) {
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._storageService = _storageService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._dispoables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._ctxIsVisible = _ctxCallHierarchyVisible.bindTo(this._contextKeyService);
        this._ctxHasProvider = _ctxHasCallHierarchyProvider.bindTo(this._contextKeyService);
        this._ctxDirection = _ctxCallHierarchyDirection.bindTo(this._contextKeyService);
        this._dispoables.add(Event.any(_editor.onDidChangeModel, _editor.onDidChangeModelLanguage, CallHierarchyProviderRegistry.onDidChange)(() => {
            this._ctxHasProvider.set(_editor.hasModel() && CallHierarchyProviderRegistry.has(_editor.getModel()));
        }));
        this._dispoables.add(this._sessionDisposables);
    }
    dispose() {
        this._ctxHasProvider.reset();
        this._ctxIsVisible.reset();
        this._dispoables.dispose();
    }
    async startCallHierarchyFromEditor() {
        this._sessionDisposables.clear();
        if (!this._editor.hasModel()) {
            return;
        }
        const document = this._editor.getModel();
        const position = this._editor.getPosition();
        if (!CallHierarchyProviderRegistry.has(document)) {
            return;
        }
        const cts = new CancellationTokenSource();
        const model = CallHierarchyModel.create(document, position, cts.token);
        const direction = sanitizedDirection(this._storageService.get(CallHierarchyController_1._StorageDirection, 0 /* StorageScope.PROFILE */, "incomingCalls" /* CallHierarchyDirection.CallsTo */));
        this._showCallHierarchyWidget(position, direction, model, cts);
    }
    async startCallHierarchyFromCallHierarchy() {
        if (!this._widget) {
            return;
        }
        const model = this._widget.getModel();
        const call = this._widget.getFocused();
        if (!call || !model) {
            return;
        }
        const newEditor = await this._editorService.openCodeEditor({ resource: call.item.uri }, this._editor);
        if (!newEditor) {
            return;
        }
        const newModel = model.fork(call.item);
        this._sessionDisposables.clear();
        CallHierarchyController_1.get(newEditor)?._showCallHierarchyWidget(Range.lift(newModel.root.selectionRange).getStartPosition(), this._widget.direction, Promise.resolve(newModel), new CancellationTokenSource());
    }
    _showCallHierarchyWidget(position, direction, model, cts) {
        this._ctxIsVisible.set(true);
        this._ctxDirection.set(direction);
        Event.any(this._editor.onDidChangeModel, this._editor.onDidChangeModelLanguage)(this.endCallHierarchy, this, this._sessionDisposables);
        this._widget = this._instantiationService.createInstance(CallHierarchyTreePeekWidget, this._editor, position, direction);
        this._widget.showLoading();
        this._sessionDisposables.add(this._widget.onDidClose(() => {
            this.endCallHierarchy();
            this._storageService.store(CallHierarchyController_1._StorageDirection, this._widget.direction, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }));
        this._sessionDisposables.add({
            dispose() {
                cts.dispose(true);
            },
        });
        this._sessionDisposables.add(this._widget);
        model
            .then((model) => {
            if (cts.token.isCancellationRequested) {
                return; // nothing
            }
            if (model) {
                this._sessionDisposables.add(model);
                this._widget.showModel(model);
            }
            else {
                this._widget.showMessage(localize('no.item', 'No results'));
            }
        })
            .catch((err) => {
            if (isCancellationError(err)) {
                this.endCallHierarchy();
                return;
            }
            this._widget.showMessage(localize('error', 'Failed to show call hierarchy'));
        });
    }
    showOutgoingCalls() {
        this._widget?.updateDirection("outgoingCalls" /* CallHierarchyDirection.CallsFrom */);
        this._ctxDirection.set("outgoingCalls" /* CallHierarchyDirection.CallsFrom */);
    }
    showIncomingCalls() {
        this._widget?.updateDirection("incomingCalls" /* CallHierarchyDirection.CallsTo */);
        this._ctxDirection.set("incomingCalls" /* CallHierarchyDirection.CallsTo */);
    }
    endCallHierarchy() {
        this._sessionDisposables.clear();
        this._ctxIsVisible.set(false);
        this._editor.focus();
    }
};
CallHierarchyController = CallHierarchyController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, ICodeEditorService),
    __param(4, IInstantiationService)
], CallHierarchyController);
registerEditorContribution(CallHierarchyController.Id, CallHierarchyController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
registerAction2(class PeekCallHierarchyAction extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showCallHierarchy',
            title: localize2('title', 'Peek Call Hierarchy'),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'navigation',
                order: 1000,
                when: ContextKeyExpr.and(_ctxHasCallHierarchyProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            },
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            precondition: ContextKeyExpr.and(_ctxHasCallHierarchyProvider, PeekContext.notInPeekEditor),
            f1: true,
        });
    }
    async runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.startCallHierarchyFromEditor();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showIncomingCalls',
            title: localize2('title.incoming', 'Show Incoming Calls'),
            icon: registerIcon('callhierarchy-incoming', Codicon.callIncoming, localize('showIncomingCallsIcons', 'Icon for incoming calls in the call hierarchy view.')),
            precondition: ContextKeyExpr.and(_ctxCallHierarchyVisible, _ctxCallHierarchyDirection.isEqualTo("outgoingCalls" /* CallHierarchyDirection.CallsFrom */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: CallHierarchyTreePeekWidget.TitleMenu,
                when: _ctxCallHierarchyDirection.isEqualTo("outgoingCalls" /* CallHierarchyDirection.CallsFrom */),
                order: 1,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.showIncomingCalls();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showOutgoingCalls',
            title: localize2('title.outgoing', 'Show Outgoing Calls'),
            icon: registerIcon('callhierarchy-outgoing', Codicon.callOutgoing, localize('showOutgoingCallsIcon', 'Icon for outgoing calls in the call hierarchy view.')),
            precondition: ContextKeyExpr.and(_ctxCallHierarchyVisible, _ctxCallHierarchyDirection.isEqualTo("incomingCalls" /* CallHierarchyDirection.CallsTo */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: CallHierarchyTreePeekWidget.TitleMenu,
                when: _ctxCallHierarchyDirection.isEqualTo("incomingCalls" /* CallHierarchyDirection.CallsTo */),
                order: 1,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.showOutgoingCalls();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.refocusCallHierarchy',
            title: localize2('title.refocus', 'Refocus Call Hierarchy'),
            precondition: _ctxCallHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 3 /* KeyCode.Enter */,
            },
        });
    }
    async runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.startCallHierarchyFromCallHierarchy();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.closeCallHierarchy',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: _ctxCallHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.not('config.editor.stablePeek'),
            },
            menu: {
                id: CallHierarchyTreePeekWidget.TitleMenu,
                order: 1000,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.endCallHierarchy();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NhbGxIaWVyYXJjaHkvYnJvd3Nlci9jYWxsSGllcmFyY2h5LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sNkJBQTZCLEVBRTdCLGtCQUFrQixHQUNsQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLDBCQUEwQixFQUMxQixhQUFhLEdBRWIsTUFBTSxnREFBZ0QsQ0FBQTtBQUd2RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGFBQWEsRUFFYixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUs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