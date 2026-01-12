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
import { ResourceMap } from '../../../../../base/common/map.js';
import { getDefaultNotebookCreationOptions, NotebookEditorWidget } from '../notebookEditorWidget.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { isCompositeNotebookEditorInput, isNotebookEditorInput, NotebookEditorInput, } from '../../common/notebookEditorInput.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { InteractiveWindowOpen, MOST_RECENT_REPL_EDITOR } from '../../common/notebookContextKeys.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { NotebookDiffEditorInput } from '../../common/notebookDiffEditorInput.js';
let NotebookEditorWidgetService = class NotebookEditorWidgetService {
    constructor(editorGroupService, editorService, contextKeyService, instantiationService) {
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this._tokenPool = 1;
        this._disposables = new DisposableStore();
        this._notebookEditors = new Map();
        this.groupListener = new Map();
        this._onNotebookEditorAdd = new Emitter();
        this._onNotebookEditorsRemove = new Emitter();
        this.onDidAddNotebookEditor = this._onNotebookEditorAdd.event;
        this.onDidRemoveNotebookEditor = this._onNotebookEditorsRemove.event;
        this._borrowableEditors = new Map();
        const onNewGroup = (group) => {
            const { id } = group;
            const listeners = [];
            listeners.push(group.onDidCloseEditor((e) => {
                const widgetMap = this._borrowableEditors.get(group.id);
                if (!widgetMap) {
                    return;
                }
                const inputs = e.editor instanceof NotebookEditorInput || e.editor instanceof NotebookDiffEditorInput
                    ? [e.editor]
                    : isCompositeNotebookEditorInput(e.editor)
                        ? e.editor.editorInputs
                        : [];
                inputs.forEach((input) => {
                    const widgets = widgetMap.get(input.resource);
                    const index = widgets?.findIndex((widget) => widget.editorType === input.typeId);
                    if (!widgets || index === undefined || index === -1) {
                        return;
                    }
                    const value = widgets.splice(index, 1)[0];
                    value.token = undefined;
                    this._disposeWidget(value.widget);
                    value.disposableStore.dispose();
                    value.widget = undefined; // unset the widget so that others that still hold a reference don't harm us
                });
            }));
            listeners.push(group.onWillMoveEditor((e) => {
                if (isNotebookEditorInput(e.editor)) {
                    this._allowWidgetMove(e.editor, e.groupId, e.target);
                }
                if (isCompositeNotebookEditorInput(e.editor)) {
                    e.editor.editorInputs.forEach((input) => {
                        this._allowWidgetMove(input, e.groupId, e.target);
                    });
                }
            }));
            this.groupListener.set(id, listeners);
        };
        this._disposables.add(editorGroupService.onDidAddGroup(onNewGroup));
        editorGroupService.whenReady.then(() => editorGroupService.groups.forEach(onNewGroup));
        // group removed -> clean up listeners, clean up widgets
        this._disposables.add(editorGroupService.onDidRemoveGroup((group) => {
            const listeners = this.groupListener.get(group.id);
            if (listeners) {
                listeners.forEach((listener) => listener.dispose());
                this.groupListener.delete(group.id);
            }
            const widgets = this._borrowableEditors.get(group.id);
            this._borrowableEditors.delete(group.id);
            if (widgets) {
                for (const values of widgets.values()) {
                    for (const value of values) {
                        value.token = undefined;
                        this._disposeWidget(value.widget);
                        value.disposableStore.dispose();
                    }
                }
            }
        }));
        this._mostRecentRepl = MOST_RECENT_REPL_EDITOR.bindTo(contextKeyService);
        const interactiveWindowOpen = InteractiveWindowOpen.bindTo(contextKeyService);
        this._disposables.add(editorService.onDidEditorsChange((e) => {
            if (e.event.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */ && !interactiveWindowOpen.get()) {
                if (editorService.editors.find((editor) => isCompositeNotebookEditorInput(editor))) {
                    interactiveWindowOpen.set(true);
                }
            }
            else if (e.event.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ &&
                interactiveWindowOpen.get()) {
                if (!editorService.editors.find((editor) => isCompositeNotebookEditorInput(editor))) {
                    interactiveWindowOpen.set(false);
                }
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._onNotebookEditorAdd.dispose();
        this._onNotebookEditorsRemove.dispose();
        this.groupListener.forEach((listeners) => {
            listeners.forEach((listener) => listener.dispose());
        });
        this.groupListener.clear();
        this._borrowableEditors.forEach((widgetMap) => {
            widgetMap.forEach((widgets) => {
                widgets.forEach((widget) => widget.disposableStore.dispose());
            });
        });
    }
    // --- group-based editor borrowing...
    _disposeWidget(widget) {
        widget.onWillHide();
        const domNode = widget.getDomNode();
        widget.dispose();
        domNode.remove();
    }
    _allowWidgetMove(input, sourceID, targetID) {
        const sourcePart = this.editorGroupService.getPart(sourceID);
        const targetPart = this.editorGroupService.getPart(targetID);
        if (sourcePart.windowId !== targetPart.windowId) {
            return;
        }
        const target = this._borrowableEditors
            .get(targetID)
            ?.get(input.resource)
            ?.findIndex((widget) => widget.editorType === input.typeId);
        if (target !== undefined && target !== -1) {
            // not needed, a separate widget is already there
            return;
        }
        const widget = this._borrowableEditors
            .get(sourceID)
            ?.get(input.resource)
            ?.find((widget) => widget.editorType === input.typeId);
        if (!widget) {
            throw new Error('no widget at source group');
        }
        // don't allow the widget to be retrieved at its previous location any more
        const sourceWidgets = this._borrowableEditors.get(sourceID)?.get(input.resource);
        if (sourceWidgets) {
            const indexToRemove = sourceWidgets.findIndex((widget) => widget.editorType === input.typeId);
            if (indexToRemove !== -1) {
                sourceWidgets.splice(indexToRemove, 1);
            }
        }
        // allow the widget to be retrieved at its new location
        let targetMap = this._borrowableEditors.get(targetID);
        if (!targetMap) {
            targetMap = new ResourceMap();
            this._borrowableEditors.set(targetID, targetMap);
        }
        const widgetsAtTarget = targetMap.get(input.resource) ?? [];
        widgetsAtTarget?.push(widget);
        targetMap.set(input.resource, widgetsAtTarget);
    }
    retrieveExistingWidgetFromURI(resource) {
        for (const widgetInfo of this._borrowableEditors.values()) {
            const widgets = widgetInfo.get(resource);
            if (widgets && widgets.length > 0) {
                return this._createBorrowValue(widgets[0].token, widgets[0]);
            }
        }
        return undefined;
    }
    retrieveAllExistingWidgets() {
        const ret = [];
        for (const widgetInfo of this._borrowableEditors.values()) {
            for (const widgets of widgetInfo.values()) {
                for (const widget of widgets) {
                    ret.push(this._createBorrowValue(widget.token, widget));
                }
            }
        }
        return ret;
    }
    retrieveWidget(accessor, groupId, input, creationOptions, initialDimension, codeWindow) {
        let value = this._borrowableEditors
            .get(groupId)
            ?.get(input.resource)
            ?.find((widget) => widget.editorType === input.typeId);
        if (!value) {
            // NEW widget
            const editorGroupContextKeyService = accessor.get(IContextKeyService);
            const editorGroupEditorProgressService = accessor.get(IEditorProgressService);
            const widgetDisposeStore = new DisposableStore();
            const widget = this.createWidget(editorGroupContextKeyService, widgetDisposeStore, editorGroupEditorProgressService, creationOptions, codeWindow, initialDimension);
            const token = this._tokenPool++;
            value = { widget, editorType: input.typeId, token, disposableStore: widgetDisposeStore };
            let map = this._borrowableEditors.get(groupId);
            if (!map) {
                map = new ResourceMap();
                this._borrowableEditors.set(groupId, map);
            }
            const values = map.get(input.resource) ?? [];
            values.push(value);
            map.set(input.resource, values);
        }
        else {
            // reuse a widget which was either free'ed before or which
            // is simply being reused...
            value.token = this._tokenPool++;
        }
        return this._createBorrowValue(value.token, value);
    }
    // protected for unit testing overrides
    createWidget(editorGroupContextKeyService, widgetDisposeStore, editorGroupEditorProgressService, creationOptions, codeWindow, initialDimension) {
        const notebookInstantiationService = widgetDisposeStore.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorGroupContextKeyService], [IEditorProgressService, editorGroupEditorProgressService])));
        const ctorOptions = creationOptions ?? getDefaultNotebookCreationOptions();
        const widget = notebookInstantiationService.createInstance(NotebookEditorWidget, {
            ...ctorOptions,
            codeWindow: codeWindow ?? ctorOptions.codeWindow,
        }, initialDimension);
        return widget;
    }
    _createBorrowValue(myToken, widget) {
        return {
            get value() {
                return widget.token === myToken ? widget.widget : undefined;
            },
        };
    }
    // --- editor management
    addNotebookEditor(editor) {
        this._notebookEditors.set(editor.getId(), editor);
        this._onNotebookEditorAdd.fire(editor);
    }
    removeNotebookEditor(editor) {
        const notebookUri = editor.getViewModel()?.notebookDocument.uri;
        if (this._notebookEditors.has(editor.getId())) {
            this._notebookEditors.delete(editor.getId());
            this._onNotebookEditorsRemove.fire(editor);
        }
        if (this._mostRecentRepl.get() === notebookUri?.toString()) {
            this._mostRecentRepl.reset();
        }
    }
    getNotebookEditor(editorId) {
        return this._notebookEditors.get(editorId);
    }
    listNotebookEditors() {
        return [...this._notebookEditors].map((e) => e[1]);
    }
    updateReplContextKey(uri) {
        this._mostRecentRepl.set(uri);
    }
};
NotebookEditorWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService)
], NotebookEditorWidgetService);
export { NotebookEditorWidgetService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0VkaXRvclNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLHFCQUFxQixFQUNyQixtQkFBbUIsR0FDbkIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUc1QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFJN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUxRSxJQUFNLDJCQUEy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