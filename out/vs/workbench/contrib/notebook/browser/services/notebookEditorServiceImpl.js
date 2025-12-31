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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tFZGl0b3JTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixxQkFBcUIsRUFDckIsbUJBQW1CLEdBQ25CLE1BQU0scUNBQXFDLENBQUE7QUFHNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBSTdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDNUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFMUUsSUFBTSwyQkFBMkIsR0FB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