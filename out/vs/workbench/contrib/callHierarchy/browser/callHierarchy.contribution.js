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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jYWxsSGllcmFyY2h5L2Jyb3dzZXIvY2FsbEhpZXJhcmNoeS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLDZCQUE2QixFQUU3QixrQkFBa0IsR0FDbEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsYUFBYSxHQUViLE1BQU0sZ0RBQWdELENBQUE7QUFHdkQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixhQUFhLEVBRWIsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNyRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLEtBQUss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