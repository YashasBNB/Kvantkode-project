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
var MainThreadTextEditors_1;
import { illegalArgument } from '../../../base/common/errors.js';
import { dispose, DisposableStore } from '../../../base/common/lifecycle.js';
import { equals as objectEquals } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { EditorActivation, EditorResolution, isTextEditorDiffInformationEqual, } from '../../../platform/editor/common/editor.js';
import { ExtHostContext, } from '../common/extHost.protocol.js';
import { editorGroupToColumn, columnToEditorGroup, } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { getCodeEditor } from '../../../editor/browser/editorBrowser.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IQuickDiffModelService } from '../../contrib/scm/browser/quickDiffModel.js';
import { autorun, constObservable, derived, derivedOpts, observableFromEvent, } from '../../../base/common/observable.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { isITextModel } from '../../../editor/common/model.js';
import { equals } from '../../../base/common/arrays.js';
import { Event } from '../../../base/common/event.js';
let MainThreadTextEditors = class MainThreadTextEditors {
    static { MainThreadTextEditors_1 = this; }
    static { this.INSTANCE_COUNT = 0; }
    constructor(_editorLocator, extHostContext, _codeEditorService, _editorService, _editorGroupService, _configurationService, _quickDiffModelService, _uriIdentityService) {
        this._editorLocator = _editorLocator;
        this._codeEditorService = _codeEditorService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._configurationService = _configurationService;
        this._quickDiffModelService = _quickDiffModelService;
        this._uriIdentityService = _uriIdentityService;
        this._toDispose = new DisposableStore();
        this._instanceId = String(++MainThreadTextEditors_1.INSTANCE_COUNT);
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostEditors);
        this._textEditorsListenersMap = Object.create(null);
        this._editorPositionData = null;
        this._toDispose.add(this._editorService.onDidVisibleEditorsChange(() => this._updateActiveAndVisibleTextEditors()));
        this._toDispose.add(this._editorGroupService.onDidRemoveGroup(() => this._updateActiveAndVisibleTextEditors()));
        this._toDispose.add(this._editorGroupService.onDidMoveGroup(() => this._updateActiveAndVisibleTextEditors()));
        this._registeredDecorationTypes = Object.create(null);
    }
    dispose() {
        Object.keys(this._textEditorsListenersMap).forEach((editorId) => {
            dispose(this._textEditorsListenersMap[editorId]);
        });
        this._textEditorsListenersMap = Object.create(null);
        this._toDispose.dispose();
        for (const decorationType in this._registeredDecorationTypes) {
            this._codeEditorService.removeDecorationType(decorationType);
        }
        this._registeredDecorationTypes = Object.create(null);
    }
    handleTextEditorAdded(textEditor) {
        const id = textEditor.getId();
        const toDispose = [];
        toDispose.push(textEditor.onPropertiesChanged((data) => {
            this._proxy.$acceptEditorPropertiesChanged(id, data);
        }));
        const diffInformationObs = this._getTextEditorDiffInformation(textEditor, toDispose);
        toDispose.push(autorun((reader) => {
            const diffInformation = diffInformationObs.read(reader);
            this._proxy.$acceptEditorDiffInformation(id, diffInformation);
        }));
        this._textEditorsListenersMap[id] = toDispose;
    }
    handleTextEditorRemoved(id) {
        dispose(this._textEditorsListenersMap[id]);
        delete this._textEditorsListenersMap[id];
    }
    _updateActiveAndVisibleTextEditors() {
        // editor columns
        const editorPositionData = this._getTextEditorPositionData();
        if (!objectEquals(this._editorPositionData, editorPositionData)) {
            this._editorPositionData = editorPositionData;
            this._proxy.$acceptEditorPositionData(this._editorPositionData);
        }
    }
    _getTextEditorPositionData() {
        const result = Object.create(null);
        for (const editorPane of this._editorService.visibleEditorPanes) {
            const id = this._editorLocator.findTextEditorIdFor(editorPane);
            if (id) {
                result[id] = editorGroupToColumn(this._editorGroupService, editorPane.group);
            }
        }
        return result;
    }
    _getTextEditorDiffInformation(textEditor, toDispose) {
        const codeEditor = textEditor.getCodeEditor();
        if (!codeEditor) {
            return constObservable(undefined);
        }
        // Check if the TextModel belongs to a DiffEditor
        const [diffEditor] = this._codeEditorService
            .listDiffEditors()
            .filter((d) => d.getOriginalEditor().getId() === codeEditor.getId() ||
            d.getModifiedEditor().getId() === codeEditor.getId());
        const editorModelObs = diffEditor
            ? observableFromEvent(this, diffEditor.onDidChangeModel, () => diffEditor.getModel())
            : observableFromEvent(this, codeEditor.onDidChangeModel, () => codeEditor.getModel());
        const editorChangesObs = derived((reader) => {
            const editorModel = editorModelObs.read(reader);
            if (!editorModel) {
                return constObservable(undefined);
            }
            const editorModelUri = isITextModel(editorModel) ? editorModel.uri : editorModel.modified.uri;
            // TextEditor
            if (isITextModel(editorModel)) {
                const quickDiffModelRef = this._quickDiffModelService.createQuickDiffModelReference(editorModelUri);
                if (!quickDiffModelRef) {
                    return constObservable(undefined);
                }
                toDispose.push(quickDiffModelRef);
                return observableFromEvent(this, quickDiffModelRef.object.onDidChange, () => {
                    return quickDiffModelRef.object.getQuickDiffResults().map((result) => ({
                        original: result.original,
                        modified: result.modified,
                        changes: result.changes2,
                    }));
                });
            }
            // DirtyDiffModel - we create a dirty diff model for diff editor so that
            // we can provide multiple "original resources" to diff with the modified
            // resource.
            const diffAlgorithm = this._configurationService.getValue('diffEditor.diffAlgorithm');
            const quickDiffModelRef = this._quickDiffModelService.createQuickDiffModelReference(editorModelUri, { algorithm: diffAlgorithm });
            if (!quickDiffModelRef) {
                return constObservable(undefined);
            }
            toDispose.push(quickDiffModelRef);
            return observableFromEvent(Event.any(quickDiffModelRef.object.onDidChange, diffEditor.onDidUpdateDiff), () => {
                const quickDiffInformation = quickDiffModelRef.object
                    .getQuickDiffResults()
                    .map((result) => ({
                    original: result.original,
                    modified: result.modified,
                    changes: result.changes2,
                }));
                const diffChanges = diffEditor.getDiffComputationResult()?.changes2 ?? [];
                const diffInformation = [
                    {
                        original: editorModel.original.uri,
                        modified: editorModel.modified.uri,
                        changes: diffChanges.map((change) => change),
                    },
                ];
                return [...quickDiffInformation, ...diffInformation];
            });
        });
        return derivedOpts({
            owner: this,
            equalsFn: (diff1, diff2) => equals(diff1, diff2, (a, b) => isTextEditorDiffInformationEqual(this._uriIdentityService, a, b)),
        }, (reader) => {
            const editorModel = editorModelObs.read(reader);
            const editorChanges = editorChangesObs.read(reader).read(reader);
            if (!editorModel || !editorChanges) {
                return undefined;
            }
            const documentVersion = isITextModel(editorModel)
                ? editorModel.getVersionId()
                : editorModel.modified.getVersionId();
            return editorChanges.map((change) => {
                const changes = change.changes.map((change) => [
                    change.original.startLineNumber,
                    change.original.endLineNumberExclusive,
                    change.modified.startLineNumber,
                    change.modified.endLineNumberExclusive,
                ]);
                return {
                    documentVersion,
                    original: change.original,
                    modified: change.modified,
                    changes,
                };
            });
        });
    }
    // --- from extension host process
    async $tryShowTextDocument(resource, options) {
        const uri = URI.revive(resource);
        const editorOptions = {
            preserveFocus: options.preserveFocus,
            pinned: options.pinned,
            selection: options.selection,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: options.preserveFocus ? EditorActivation.RESTORE : undefined,
            override: EditorResolution.EXCLUSIVE_ONLY,
        };
        const input = {
            resource: uri,
            options: editorOptions,
        };
        const editor = await this._editorService.openEditor(input, columnToEditorGroup(this._editorGroupService, this._configurationService, options.position));
        if (!editor) {
            return undefined;
        }
        // Composite editors are made up of many editors so we return the active one at the time of opening
        const editorControl = editor.getControl();
        const codeEditor = getCodeEditor(editorControl);
        return codeEditor ? this._editorLocator.getIdOfCodeEditor(codeEditor) : undefined;
    }
    async $tryShowEditor(id, position) {
        const mainThreadEditor = this._editorLocator.getEditor(id);
        if (mainThreadEditor) {
            const model = mainThreadEditor.getModel();
            await this._editorService.openEditor({
                resource: model.uri,
                options: { preserveFocus: false },
            }, columnToEditorGroup(this._editorGroupService, this._configurationService, position));
            return;
        }
    }
    async $tryHideEditor(id) {
        const mainThreadEditor = this._editorLocator.getEditor(id);
        if (mainThreadEditor) {
            const editorPanes = this._editorService.visibleEditorPanes;
            for (const editorPane of editorPanes) {
                if (mainThreadEditor.matches(editorPane)) {
                    await editorPane.group.closeEditor(editorPane.input);
                    return;
                }
            }
        }
    }
    $trySetSelections(id, selections) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setSelections(selections);
        return Promise.resolve(undefined);
    }
    $trySetDecorations(id, key, ranges) {
        key = `${this._instanceId}-${key}`;
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setDecorations(key, ranges);
        return Promise.resolve(undefined);
    }
    $trySetDecorationsFast(id, key, ranges) {
        key = `${this._instanceId}-${key}`;
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setDecorationsFast(key, ranges);
        return Promise.resolve(undefined);
    }
    $tryRevealRange(id, range, revealType) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.revealRange(range, revealType);
        return Promise.resolve();
    }
    $trySetOptions(id, options) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        editor.setConfiguration(options);
        return Promise.resolve(undefined);
    }
    $tryApplyEdits(id, modelVersionId, edits, opts) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        return Promise.resolve(editor.applyEdits(modelVersionId, edits, opts));
    }
    $tryInsertSnippet(id, modelVersionId, template, ranges, opts) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(illegalArgument(`TextEditor(${id})`));
        }
        return Promise.resolve(editor.insertSnippet(modelVersionId, template, ranges, opts));
    }
    $registerTextEditorDecorationType(extensionId, key, options) {
        key = `${this._instanceId}-${key}`;
        this._registeredDecorationTypes[key] = true;
        this._codeEditorService.registerDecorationType(`exthost-api-${extensionId}`, key, options);
    }
    $removeTextEditorDecorationType(key) {
        key = `${this._instanceId}-${key}`;
        delete this._registeredDecorationTypes[key];
        this._codeEditorService.removeDecorationType(key);
    }
    $getDiffInformation(id) {
        const editor = this._editorLocator.getEditor(id);
        if (!editor) {
            return Promise.reject(new Error('No such TextEditor'));
        }
        const codeEditor = editor.getCodeEditor();
        if (!codeEditor) {
            return Promise.reject(new Error('No such CodeEditor'));
        }
        const codeEditorId = codeEditor.getId();
        const diffEditors = this._codeEditorService.listDiffEditors();
        const [diffEditor] = diffEditors.filter((d) => d.getOriginalEditor().getId() === codeEditorId ||
            d.getModifiedEditor().getId() === codeEditorId);
        if (diffEditor) {
            return Promise.resolve(diffEditor.getLineChanges() || []);
        }
        if (!codeEditor.hasModel()) {
            return Promise.resolve([]);
        }
        const quickDiffModelRef = this._quickDiffModelService.createQuickDiffModelReference(codeEditor.getModel().uri);
        if (!quickDiffModelRef) {
            return Promise.resolve([]);
        }
        try {
            const scmQuickDiff = quickDiffModelRef.object.quickDiffs.find((quickDiff) => quickDiff.isSCM);
            const scmQuickDiffChanges = quickDiffModelRef.object.changes.filter((change) => change.label === scmQuickDiff?.label);
            return Promise.resolve(scmQuickDiffChanges.map((change) => change.change) ?? []);
        }
        finally {
            quickDiffModelRef.dispose();
        }
    }
};
MainThreadTextEditors = MainThreadTextEditors_1 = __decorate([
    __param(2, ICodeEditorService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, IConfigurationService),
    __param(6, IQuickDiffModelService),
    __param(7, IUriIdentityService)
], MainThreadTextEditors);
export { MainThreadTextEditors };
// --- commands
CommandsRegistry.registerCommand('_workbench.revertAllDirty', async function (accessor) {
    const environmentService = accessor.get(IEnvironmentService);
    if (!environmentService.extensionTestsLocationURI) {
        throw new Error('Command is only available when running extension tests.');
    }
    const workingCopyService = accessor.get(IWorkingCopyService);
    for (const workingCopy of workingCopyService.dirtyWorkingCopies) {
        await workingCopy.revert({ soft: true });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBZSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUFFLE1BQU0sSUFBSSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBUTFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2hGLE9BQU8sRUFHTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBRWhCLGdDQUFnQyxHQUVoQyxNQUFNLDJDQUEyQyxDQUFBO0FBR2xELE9BQU8sRUFDTixjQUFjLEdBU2QsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixHQUVuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUs3RixPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sMENBQTBDLENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEYsT0FBTyxFQUNOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUNQLFdBQVcsRUFFWCxtQkFBbUIsR0FDbkIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQVM5QyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjs7YUFDbEIsbUJBQWMsR0FBVyxDQUFDLEFBQVosQ0FBWTtJQVN6QyxZQUNrQixjQUF3QyxFQUN6RCxjQUErQixFQUNYLGtCQUF1RCxFQUMzRCxjQUErQyxFQUN6QyxtQkFBMEQsRUFDekQscUJBQTZELEVBQzVELHNCQUErRCxFQUNsRSxtQkFBeUQ7UUFQN0QsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBRXBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDMUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3hCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDeEMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUMzQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQ2pELHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFiOUQsZUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFlbEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsRUFBRSx1QkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRXBFLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUE7UUFFL0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQ2xCLElBQUksQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQ2xELElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxDQUN6QyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxDQUFDLENBQzFGLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsQ0FBQyxDQUN4RixDQUFBO1FBRUQsSUFBSSxDQUFDLDBCQUEwQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELE9BQU87UUFDTixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQy9ELE9BQU8sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDekIsS0FBSyxNQUFNLGNBQWMsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUM5RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUNELElBQUksQ0FBQywwQkFBMEIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxVQUFnQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDN0IsTUFBTSxTQUFTLEdBQWtCLEVBQUUsQ0FBQTtRQUNuQyxTQUFTLENBQUMsSUFBSSxDQUNiLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsOEJBQThCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEYsU0FBUyxDQUFDLElBQUksQ0FDYixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQixNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDOUQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUE7SUFDOUMsQ0FBQztJQUVELHVCQUF1QixDQUFDLEVBQVU7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTyxrQ0FBa0M7UUFDekMsaUJBQWlCO1FBQ2pCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUE7UUFDNUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQ2pFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQTtZQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7SUFDRixDQUFDO0lBRU8sMEJBQTBCO1FBQ2pDLE1BQU0sTUFBTSxHQUE0QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNELEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2pFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUQsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDUixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3RSxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLDZCQUE2QixDQUNwQyxVQUFnQyxFQUNoQyxTQUF3QjtRQUV4QixNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDN0MsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFFRCxpREFBaUQ7UUFDakQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0I7YUFDMUMsZUFBZSxFQUFFO2FBQ2pCLE1BQU0sQ0FDTixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssVUFBVSxDQUFDLEtBQUssRUFBRTtZQUNwRCxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQ3JELENBQUE7UUFFRixNQUFNLGNBQWMsR0FBRyxVQUFVO1lBQ2hDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyRixDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUV0RixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FJOUIsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNaLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQixPQUFPLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQTtZQUU3RixhQUFhO1lBQ2IsSUFBSSxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxpQkFBaUIsR0FDdEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUMxRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDeEIsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7Z0JBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUNqQyxPQUFPLG1CQUFtQixDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtvQkFDM0UsT0FBTyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3RFLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTt3QkFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO3dCQUN6QixPQUFPLEVBQUUsTUFBTSxDQUFDLFFBQVE7cUJBQ3hCLENBQUMsQ0FBQyxDQUFBO2dCQUNKLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELHdFQUF3RTtZQUN4RSx5RUFBeUU7WUFDekUsWUFBWTtZQUNaLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQ3hELDBCQUEwQixDQUMxQixDQUFBO1lBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsNkJBQTZCLENBQ2xGLGNBQWMsRUFDZCxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsQ0FDNUIsQ0FBQTtZQUNELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN4QixPQUFPLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ2pDLE9BQU8sbUJBQW1CLENBQ3pCLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQzNFLEdBQUcsRUFBRTtnQkFDSixNQUFNLG9CQUFvQixHQUFHLGlCQUFpQixDQUFDLE1BQU07cUJBQ25ELG1CQUFtQixFQUFFO3FCQUNyQixHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2pCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtvQkFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO29CQUN6QixPQUFPLEVBQUUsTUFBTSxDQUFDLFFBQVE7aUJBQ3hCLENBQUMsQ0FBQyxDQUFBO2dCQUVKLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUE7Z0JBQ3pFLE1BQU0sZUFBZSxHQUFHO29CQUN2Qjt3QkFDQyxRQUFRLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHO3dCQUNsQyxRQUFRLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHO3dCQUNsQyxPQUFPLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBMEIsQ0FBQztxQkFDaEU7aUJBQ0QsQ0FBQTtnQkFFRCxPQUFPLENBQUMsR0FBRyxvQkFBb0IsRUFBRSxHQUFHLGVBQWUsQ0FBQyxDQUFBO1lBQ3JELENBQUMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLFdBQVcsQ0FDakI7WUFDQyxLQUFLLEVBQUUsSUFBSTtZQUNYLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUMxQixNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUM3QixnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNoRTtTQUNGLEVBQ0QsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDL0MsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoRSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDO2dCQUNoRCxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDNUIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7WUFFdEMsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ25DLE1BQU0sT0FBTyxHQUF3QixNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7b0JBQ25FLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZTtvQkFDL0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0I7b0JBQ3RDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZTtvQkFDL0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0I7aUJBQ3RDLENBQUMsQ0FBQTtnQkFFRixPQUFPO29CQUNOLGVBQWU7b0JBQ2YsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO29CQUN6QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7b0JBQ3pCLE9BQU87aUJBQ1AsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsa0NBQWtDO0lBRWxDLEtBQUssQ0FBQyxvQkFBb0IsQ0FDekIsUUFBdUIsRUFDdkIsT0FBaUM7UUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVoQyxNQUFNLGFBQWEsR0FBdUI7WUFDekMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhO1lBQ3BDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7WUFDNUIsZ0ZBQWdGO1lBQ2hGLDhGQUE4RjtZQUM5RixVQUFVLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3hFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxjQUFjO1NBQ3pDLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBeUI7WUFDbkMsUUFBUSxFQUFFLEdBQUc7WUFDYixPQUFPLEVBQUUsYUFBYTtTQUN0QixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FDbEQsS0FBSyxFQUNMLG1CQUFtQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUMzRixDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELG1HQUFtRztRQUNuRyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDekMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQy9DLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDbEYsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBVSxFQUFFLFFBQTRCO1FBQzVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3pDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQ25DO2dCQUNDLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDbkIsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRTthQUNqQyxFQUNELG1CQUFtQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsUUFBUSxDQUFDLENBQ25GLENBQUE7WUFDRCxPQUFNO1FBQ1AsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQVU7UUFDOUIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMxRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQTtZQUMxRCxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO29CQUMxQyxNQUFNLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDcEQsT0FBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCLENBQUMsRUFBVSxFQUFFLFVBQXdCO1FBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUNELE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxFQUFVLEVBQUUsR0FBVyxFQUFFLE1BQTRCO1FBQ3ZFLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksR0FBRyxFQUFFLENBQUE7UUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxFQUFVLEVBQUUsR0FBVyxFQUFFLE1BQWdCO1FBQy9ELEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksR0FBRyxFQUFFLENBQUE7UUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxFQUFVLEVBQUUsS0FBYSxFQUFFLFVBQWdDO1FBQzFFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3JDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxjQUFjLENBQUMsRUFBVSxFQUFFLE9BQXVDO1FBQ2pFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUNELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELGNBQWMsQ0FDYixFQUFVLEVBQ1YsY0FBc0IsRUFDdEIsS0FBNkIsRUFDN0IsSUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFRCxpQkFBaUIsQ0FDaEIsRUFBVSxFQUNWLGNBQXNCLEVBQ3RCLFFBQWdCLEVBQ2hCLE1BQXlCLEVBQ3pCLElBQXNCO1FBRXRCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVELGlDQUFpQyxDQUNoQyxXQUFnQyxFQUNoQyxHQUFXLEVBQ1gsT0FBaUM7UUFFakMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMzRixDQUFDO0lBRUQsK0JBQStCLENBQUMsR0FBVztRQUMxQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsRUFBVTtRQUM3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVoRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDekMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDN0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQ3RDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxZQUFZO1lBQzlDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLFlBQVksQ0FDL0MsQ0FBQTtRQUVELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzVCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsNkJBQTZCLENBQ2xGLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQ3pCLENBQUE7UUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0YsTUFBTSxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FDbEUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssWUFBWSxFQUFFLEtBQUssQ0FDaEQsQ0FBQTtZQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRixDQUFDO2dCQUFTLENBQUM7WUFDVixpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM1QixDQUFDO0lBQ0YsQ0FBQzs7QUEzYVcscUJBQXFCO0lBYS9CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLG1CQUFtQixDQUFBO0dBbEJULHFCQUFxQixDQTRhakM7O0FBRUQsZUFBZTtBQUVmLGdCQUFnQixDQUFDLGVBQWUsQ0FDL0IsMkJBQTJCLEVBQzNCLEtBQUssV0FBVyxRQUEwQjtJQUN6QyxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUM1RCxJQUFJLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQzVELEtBQUssTUFBTSxXQUFXLElBQUksa0JBQWtCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNqRSxNQUFNLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0FBQ0YsQ0FBQyxDQUNELENBQUEifQ==