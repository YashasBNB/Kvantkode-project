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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQWUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQVExRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRixPQUFPLEVBR04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUVoQixnQ0FBZ0MsR0FFaEMsTUFBTSwyQ0FBMkMsQ0FBQTtBQUdsRCxPQUFPLEVBQ04sY0FBYyxHQVNkLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFLN0YsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3JGLE9BQU8s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