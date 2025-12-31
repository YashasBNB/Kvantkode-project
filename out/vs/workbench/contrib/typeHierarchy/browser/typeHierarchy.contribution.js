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
var TypeHierarchyController_1;
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction2, registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { TypeHierarchyTreePeekWidget } from './typeHierarchyPeek.js';
import { TypeHierarchyModel, TypeHierarchyProviderRegistry, } from '../common/typeHierarchy.js';
const _ctxHasTypeHierarchyProvider = new RawContextKey('editorHasTypeHierarchyProvider', false, localize('editorHasTypeHierarchyProvider', 'Whether a type hierarchy provider is available'));
const _ctxTypeHierarchyVisible = new RawContextKey('typeHierarchyVisible', false, localize('typeHierarchyVisible', 'Whether type hierarchy peek is currently showing'));
const _ctxTypeHierarchyDirection = new RawContextKey('typeHierarchyDirection', undefined, {
    type: 'string',
    description: localize('typeHierarchyDirection', 'whether type hierarchy shows super types or subtypes'),
});
function sanitizedDirection(candidate) {
    return candidate === "subtypes" /* TypeHierarchyDirection.Subtypes */ ||
        candidate === "supertypes" /* TypeHierarchyDirection.Supertypes */
        ? candidate
        : "subtypes" /* TypeHierarchyDirection.Subtypes */;
}
let TypeHierarchyController = class TypeHierarchyController {
    static { TypeHierarchyController_1 = this; }
    static { this.Id = 'typeHierarchy'; }
    static get(editor) {
        return editor.getContribution(TypeHierarchyController_1.Id);
    }
    static { this._storageDirectionKey = 'typeHierarchy/defaultDirection'; }
    constructor(_editor, _contextKeyService, _storageService, _editorService, _instantiationService) {
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._storageService = _storageService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._ctxHasProvider = _ctxHasTypeHierarchyProvider.bindTo(this._contextKeyService);
        this._ctxIsVisible = _ctxTypeHierarchyVisible.bindTo(this._contextKeyService);
        this._ctxDirection = _ctxTypeHierarchyDirection.bindTo(this._contextKeyService);
        this._disposables.add(Event.any(_editor.onDidChangeModel, _editor.onDidChangeModelLanguage, TypeHierarchyProviderRegistry.onDidChange)(() => {
            this._ctxHasProvider.set(_editor.hasModel() && TypeHierarchyProviderRegistry.has(_editor.getModel()));
        }));
        this._disposables.add(this._sessionDisposables);
    }
    dispose() {
        this._disposables.dispose();
    }
    // Peek
    async startTypeHierarchyFromEditor() {
        this._sessionDisposables.clear();
        if (!this._editor.hasModel()) {
            return;
        }
        const document = this._editor.getModel();
        const position = this._editor.getPosition();
        if (!TypeHierarchyProviderRegistry.has(document)) {
            return;
        }
        const cts = new CancellationTokenSource();
        const model = TypeHierarchyModel.create(document, position, cts.token);
        const direction = sanitizedDirection(this._storageService.get(TypeHierarchyController_1._storageDirectionKey, 0 /* StorageScope.PROFILE */, "subtypes" /* TypeHierarchyDirection.Subtypes */));
        this._showTypeHierarchyWidget(position, direction, model, cts);
    }
    _showTypeHierarchyWidget(position, direction, model, cts) {
        this._ctxIsVisible.set(true);
        this._ctxDirection.set(direction);
        Event.any(this._editor.onDidChangeModel, this._editor.onDidChangeModelLanguage)(this.endTypeHierarchy, this, this._sessionDisposables);
        this._widget = this._instantiationService.createInstance(TypeHierarchyTreePeekWidget, this._editor, position, direction);
        this._widget.showLoading();
        this._sessionDisposables.add(this._widget.onDidClose(() => {
            this.endTypeHierarchy();
            this._storageService.store(TypeHierarchyController_1._storageDirectionKey, this._widget.direction, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
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
                this.endTypeHierarchy();
                return;
            }
            this._widget.showMessage(localize('error', 'Failed to show type hierarchy'));
        });
    }
    async startTypeHierarchyFromTypeHierarchy() {
        if (!this._widget) {
            return;
        }
        const model = this._widget.getModel();
        const typeItem = this._widget.getFocused();
        if (!typeItem || !model) {
            return;
        }
        const newEditor = await this._editorService.openCodeEditor({ resource: typeItem.item.uri }, this._editor);
        if (!newEditor) {
            return;
        }
        const newModel = model.fork(typeItem.item);
        this._sessionDisposables.clear();
        TypeHierarchyController_1.get(newEditor)?._showTypeHierarchyWidget(Range.lift(newModel.root.selectionRange).getStartPosition(), this._widget.direction, Promise.resolve(newModel), new CancellationTokenSource());
    }
    showSupertypes() {
        this._widget?.updateDirection("supertypes" /* TypeHierarchyDirection.Supertypes */);
        this._ctxDirection.set("supertypes" /* TypeHierarchyDirection.Supertypes */);
    }
    showSubtypes() {
        this._widget?.updateDirection("subtypes" /* TypeHierarchyDirection.Subtypes */);
        this._ctxDirection.set("subtypes" /* TypeHierarchyDirection.Subtypes */);
    }
    endTypeHierarchy() {
        this._sessionDisposables.clear();
        this._ctxIsVisible.set(false);
        this._editor.focus();
    }
};
TypeHierarchyController = TypeHierarchyController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, ICodeEditorService),
    __param(4, IInstantiationService)
], TypeHierarchyController);
registerEditorContribution(TypeHierarchyController.Id, TypeHierarchyController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
// Peek
registerAction2(class PeekTypeHierarchyAction extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showTypeHierarchy',
            title: localize2('title', 'Peek Type Hierarchy'),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'navigation',
                order: 1000,
                when: ContextKeyExpr.and(_ctxHasTypeHierarchyProvider, PeekContext.notInPeekEditor),
            },
            precondition: ContextKeyExpr.and(_ctxHasTypeHierarchyProvider, PeekContext.notInPeekEditor),
            f1: true,
        });
    }
    async runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.startTypeHierarchyFromEditor();
    }
});
// actions for peek widget
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showSupertypes',
            title: localize2('title.supertypes', 'Show Supertypes'),
            icon: Codicon.typeHierarchySuper,
            precondition: ContextKeyExpr.and(_ctxTypeHierarchyVisible, _ctxTypeHierarchyDirection.isEqualTo("subtypes" /* TypeHierarchyDirection.Subtypes */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: TypeHierarchyTreePeekWidget.TitleMenu,
                when: _ctxTypeHierarchyDirection.isEqualTo("subtypes" /* TypeHierarchyDirection.Subtypes */),
                order: 1,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.showSupertypes();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showSubtypes',
            title: localize2('title.subtypes', 'Show Subtypes'),
            icon: Codicon.typeHierarchySub,
            precondition: ContextKeyExpr.and(_ctxTypeHierarchyVisible, _ctxTypeHierarchyDirection.isEqualTo("supertypes" /* TypeHierarchyDirection.Supertypes */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: TypeHierarchyTreePeekWidget.TitleMenu,
                when: _ctxTypeHierarchyDirection.isEqualTo("supertypes" /* TypeHierarchyDirection.Supertypes */),
                order: 1,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.showSubtypes();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.refocusTypeHierarchy',
            title: localize2('title.refocusTypeHierarchy', 'Refocus Type Hierarchy'),
            precondition: _ctxTypeHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 3 /* KeyCode.Enter */,
            },
        });
    }
    async runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.startTypeHierarchyFromTypeHierarchy();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.closeTypeHierarchy',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: _ctxTypeHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.not('config.editor.stablePeek'),
            },
            menu: {
                id: TypeHierarchyTreePeekWidget.TitleMenu,
                order: 1000,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.endTypeHierarchy();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90eXBlSGllcmFyY2h5L2Jyb3dzZXIvdHlwZUhpZXJhcmNoeS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFDTixhQUFhLEVBRWIsMEJBQTBCLEdBRTFCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFN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