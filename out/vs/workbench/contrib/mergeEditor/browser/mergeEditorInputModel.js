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
var WorkspaceMergeEditorModeFactory_1;
import { assertFn } from '../../../../base/common/assert.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { derived, observableFromEvent, observableValue, } from '../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { conflictMarkers } from './mergeMarkers/mergeMarkersController.js';
import { MergeDiffComputer } from './model/diffComputer.js';
import { MergeEditorModel } from './model/mergeEditorModel.js';
import { StorageCloseWithConflicts } from '../common/mergeEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
/* ================ Temp File ================ */
let TempFileMergeEditorModeFactory = class TempFileMergeEditorModeFactory {
    constructor(_mergeEditorTelemetry, _instantiationService, _textModelService, _modelService) {
        this._mergeEditorTelemetry = _mergeEditorTelemetry;
        this._instantiationService = _instantiationService;
        this._textModelService = _textModelService;
        this._modelService = _modelService;
    }
    async createInputModel(args) {
        const store = new DisposableStore();
        const [base, result, input1Data, input2Data] = await Promise.all([
            this._textModelService.createModelReference(args.base),
            this._textModelService.createModelReference(args.result),
            toInputData(args.input1, this._textModelService, store),
            toInputData(args.input2, this._textModelService, store),
        ]);
        store.add(base);
        store.add(result);
        const tempResultUri = result.object.textEditorModel.uri.with({ scheme: 'merge-result' });
        const temporaryResultModel = this._modelService.createModel('', {
            languageId: result.object.textEditorModel.getLanguageId(),
            onDidChange: Event.None,
        }, tempResultUri);
        store.add(temporaryResultModel);
        const mergeDiffComputer = this._instantiationService.createInstance(MergeDiffComputer);
        const model = this._instantiationService.createInstance(MergeEditorModel, base.object.textEditorModel, input1Data, input2Data, temporaryResultModel, mergeDiffComputer, {
            resetResult: true,
        }, this._mergeEditorTelemetry);
        store.add(model);
        await model.onInitialized;
        return this._instantiationService.createInstance(TempFileMergeEditorInputModel, model, store, result.object, args.result);
    }
};
TempFileMergeEditorModeFactory = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITextModelService),
    __param(3, IModelService)
], TempFileMergeEditorModeFactory);
export { TempFileMergeEditorModeFactory };
let TempFileMergeEditorInputModel = class TempFileMergeEditorInputModel extends EditorModel {
    constructor(model, disposable, result, resultUri, textFileService, dialogService, editorService) {
        super();
        this.model = model;
        this.disposable = disposable;
        this.result = result;
        this.resultUri = resultUri;
        this.textFileService = textFileService;
        this.dialogService = dialogService;
        this.editorService = editorService;
        this.savedAltVersionId = observableValue(this, this.model.resultTextModel.getAlternativeVersionId());
        this.altVersionId = observableFromEvent(this, (e) => this.model.resultTextModel.onDidChangeContent(e), () => 
        /** @description getAlternativeVersionId */ this.model.resultTextModel.getAlternativeVersionId());
        this.isDirty = derived(this, (reader) => this.altVersionId.read(reader) !== this.savedAltVersionId.read(reader));
        this.finished = false;
    }
    dispose() {
        this.disposable.dispose();
        super.dispose();
    }
    async accept() {
        const value = await this.model.resultTextModel.getValue();
        this.result.textEditorModel.setValue(value);
        this.savedAltVersionId.set(this.model.resultTextModel.getAlternativeVersionId(), undefined);
        await this.textFileService.save(this.result.textEditorModel.uri);
        this.finished = true;
    }
    async _discard() {
        await this.textFileService.revert(this.model.resultTextModel.uri);
        this.savedAltVersionId.set(this.model.resultTextModel.getAlternativeVersionId(), undefined);
        this.finished = true;
    }
    shouldConfirmClose() {
        return true;
    }
    async confirmClose(inputModels) {
        assertFn(() => inputModels.some((m) => m === this));
        const someDirty = inputModels.some((m) => m.isDirty.get());
        let choice;
        if (someDirty) {
            const isMany = inputModels.length > 1;
            const message = isMany
                ? localize('messageN', 'Do you want keep the merge result of {0} files?', inputModels.length)
                : localize('message1', 'Do you want keep the merge result of {0}?', basename(inputModels[0].model.resultTextModel.uri));
            const hasUnhandledConflicts = inputModels.some((m) => m.model.hasUnhandledConflicts.get());
            const buttons = [
                {
                    label: hasUnhandledConflicts
                        ? localize({ key: 'saveWithConflict', comment: ['&& denotes a mnemonic'] }, '&&Save With Conflicts')
                        : localize({ key: 'save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                    run: () => 0 /* ConfirmResult.SAVE */,
                },
                {
                    label: localize({ key: 'discard', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
                    run: () => 1 /* ConfirmResult.DONT_SAVE */,
                },
            ];
            choice = (await this.dialogService.prompt({
                type: Severity.Info,
                message,
                detail: hasUnhandledConflicts
                    ? isMany
                        ? localize('detailNConflicts', "The files contain unhandled conflicts. The merge results will be lost if you don't save them.")
                        : localize('detail1Conflicts', "The file contains unhandled conflicts. The merge result will be lost if you don't save it.")
                    : isMany
                        ? localize('detailN', "The merge results will be lost if you don't save them.")
                        : localize('detail1', "The merge result will be lost if you don't save it."),
                buttons,
                cancelButton: {
                    run: () => 2 /* ConfirmResult.CANCEL */,
                },
            })).result;
        }
        else {
            choice = 1 /* ConfirmResult.DONT_SAVE */;
        }
        if (choice === 0 /* ConfirmResult.SAVE */) {
            // save with conflicts
            await Promise.all(inputModels.map((m) => m.accept()));
        }
        else if (choice === 1 /* ConfirmResult.DONT_SAVE */) {
            // discard changes
            await Promise.all(inputModels.map((m) => m._discard()));
        }
        else {
            // cancel: stay in editor
        }
        return choice;
    }
    async save(options) {
        if (this.finished) {
            return;
        }
        // It does not make sense to save anything in the temp file mode.
        // The file stays dirty from the first edit on.
        ;
        (async () => {
            const { confirmed } = await this.dialogService.confirm({
                message: localize('saveTempFile.message', 'Do you want to accept the merge result?'),
                detail: localize('saveTempFile.detail', 'This will write the merge result to the original file and close the merge editor.'),
                primaryButton: localize({ key: 'acceptMerge', comment: ['&& denotes a mnemonic'] }, '&&Accept Merge'),
            });
            if (confirmed) {
                await this.accept();
                const editors = this.editorService
                    .findEditors(this.resultUri)
                    .filter((e) => e.editor.typeId === 'mergeEditor.Input');
                await this.editorService.closeEditors(editors);
            }
        })();
    }
    async revert(options) {
        // no op
    }
};
TempFileMergeEditorInputModel = __decorate([
    __param(4, ITextFileService),
    __param(5, IDialogService),
    __param(6, IEditorService)
], TempFileMergeEditorInputModel);
/* ================ Workspace ================ */
let WorkspaceMergeEditorModeFactory = class WorkspaceMergeEditorModeFactory {
    static { WorkspaceMergeEditorModeFactory_1 = this; }
    constructor(_mergeEditorTelemetry, _instantiationService, _textModelService, textFileService, _modelService, _languageService) {
        this._mergeEditorTelemetry = _mergeEditorTelemetry;
        this._instantiationService = _instantiationService;
        this._textModelService = _textModelService;
        this.textFileService = textFileService;
        this._modelService = _modelService;
        this._languageService = _languageService;
    }
    static { this.FILE_SAVED_SOURCE = SaveSourceRegistry.registerSource('merge-editor.source', localize('merge-editor.source', 'Before Resolving Conflicts In Merge Editor')); }
    async createInputModel(args) {
        const store = new DisposableStore();
        let resultTextFileModel = undefined;
        const modelListener = store.add(new DisposableStore());
        const handleDidCreate = (model) => {
            if (isEqual(args.result, model.resource)) {
                modelListener.clear();
                resultTextFileModel = model;
            }
        };
        modelListener.add(this.textFileService.files.onDidCreate(handleDidCreate));
        this.textFileService.files.models.forEach(handleDidCreate);
        let [base, result, input1Data, input2Data] = await Promise.all([
            this._textModelService
                .createModelReference(args.base)
                .then((v) => ({
                object: v.object.textEditorModel,
                dispose: () => v.dispose(),
            }))
                .catch((e) => {
                onUnexpectedError(e);
                console.error(e); // Only file not found error should be handled ideally
                return undefined;
            }),
            this._textModelService.createModelReference(args.result),
            toInputData(args.input1, this._textModelService, store),
            toInputData(args.input2, this._textModelService, store),
        ]);
        if (base === undefined) {
            const tm = this._modelService.createModel('', this._languageService.createById(result.object.getLanguageId()));
            base = {
                dispose: () => {
                    tm.dispose();
                },
                object: tm,
            };
        }
        store.add(base);
        store.add(result);
        if (!resultTextFileModel) {
            throw new BugIndicatingError();
        }
        // So that "Don't save" does revert the file
        await resultTextFileModel.save({ source: WorkspaceMergeEditorModeFactory_1.FILE_SAVED_SOURCE });
        const lines = resultTextFileModel.textEditorModel.getLinesContent();
        const hasConflictMarkers = lines.some((l) => l.startsWith(conflictMarkers.start));
        const resetResult = hasConflictMarkers;
        const mergeDiffComputer = this._instantiationService.createInstance(MergeDiffComputer);
        const model = this._instantiationService.createInstance(MergeEditorModel, base.object, input1Data, input2Data, result.object.textEditorModel, mergeDiffComputer, {
            resetResult,
        }, this._mergeEditorTelemetry);
        store.add(model);
        await model.onInitialized;
        return this._instantiationService.createInstance(WorkspaceMergeEditorInputModel, model, store, resultTextFileModel, this._mergeEditorTelemetry);
    }
};
WorkspaceMergeEditorModeFactory = WorkspaceMergeEditorModeFactory_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITextModelService),
    __param(3, ITextFileService),
    __param(4, IModelService),
    __param(5, ILanguageService)
], WorkspaceMergeEditorModeFactory);
export { WorkspaceMergeEditorModeFactory };
let WorkspaceMergeEditorInputModel = class WorkspaceMergeEditorInputModel extends EditorModel {
    constructor(model, disposableStore, resultTextFileModel, telemetry, _dialogService, _storageService) {
        super();
        this.model = model;
        this.disposableStore = disposableStore;
        this.resultTextFileModel = resultTextFileModel;
        this.telemetry = telemetry;
        this._dialogService = _dialogService;
        this._storageService = _storageService;
        this.isDirty = observableFromEvent(this, Event.any(this.resultTextFileModel.onDidChangeDirty, this.resultTextFileModel.onDidSaveError), () => /** @description isDirty */ this.resultTextFileModel.isDirty());
        this.reported = false;
        this.dateTimeOpened = new Date();
    }
    dispose() {
        this.disposableStore.dispose();
        super.dispose();
        this.reportClose(false);
    }
    reportClose(accepted) {
        if (!this.reported) {
            const remainingConflictCount = this.model.unhandledConflictsCount.get();
            const durationOpenedMs = new Date().getTime() - this.dateTimeOpened.getTime();
            this.telemetry.reportMergeEditorClosed({
                durationOpenedSecs: durationOpenedMs / 1000,
                remainingConflictCount,
                accepted,
                conflictCount: this.model.conflictCount,
                combinableConflictCount: this.model.combinableConflictCount,
                conflictsResolvedWithBase: this.model.conflictsResolvedWithBase,
                conflictsResolvedWithInput1: this.model.conflictsResolvedWithInput1,
                conflictsResolvedWithInput2: this.model.conflictsResolvedWithInput2,
                conflictsResolvedWithSmartCombination: this.model.conflictsResolvedWithSmartCombination,
                manuallySolvedConflictCountThatEqualNone: this.model.manuallySolvedConflictCountThatEqualNone,
                manuallySolvedConflictCountThatEqualSmartCombine: this.model.manuallySolvedConflictCountThatEqualSmartCombine,
                manuallySolvedConflictCountThatEqualInput1: this.model.manuallySolvedConflictCountThatEqualInput1,
                manuallySolvedConflictCountThatEqualInput2: this.model.manuallySolvedConflictCountThatEqualInput2,
                manuallySolvedConflictCountThatEqualNoneAndStartedWithBase: this.model.manuallySolvedConflictCountThatEqualNoneAndStartedWithBase,
                manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1: this.model.manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1,
                manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2: this.model.manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2,
                manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart: this.model.manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart,
                manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart: this.model.manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart,
            });
            this.reported = true;
        }
    }
    async accept() {
        this.reportClose(true);
        await this.resultTextFileModel.save();
    }
    get resultUri() {
        return this.resultTextFileModel.resource;
    }
    async save(options) {
        await this.resultTextFileModel.save(options);
    }
    /**
     * If save resets the dirty state, revert must do so too.
     */
    async revert(options) {
        await this.resultTextFileModel.revert(options);
    }
    shouldConfirmClose() {
        // Always confirm
        return true;
    }
    async confirmClose(inputModels) {
        const isMany = inputModels.length > 1;
        const someDirty = inputModels.some((m) => m.isDirty.get());
        const someUnhandledConflicts = inputModels.some((m) => m.model.hasUnhandledConflicts.get());
        if (someDirty) {
            const message = isMany
                ? localize('workspace.messageN', 'Do you want to save the changes you made to {0} files?', inputModels.length)
                : localize('workspace.message1', 'Do you want to save the changes you made to {0}?', basename(inputModels[0].resultUri));
            const { result } = await this._dialogService.prompt({
                type: Severity.Info,
                message,
                detail: someUnhandledConflicts
                    ? isMany
                        ? localize('workspace.detailN.unhandled', "The files contain unhandled conflicts. Your changes will be lost if you don't save them.")
                        : localize('workspace.detail1.unhandled', "The file contains unhandled conflicts. Your changes will be lost if you don't save them.")
                    : isMany
                        ? localize('workspace.detailN.handled', "Your changes will be lost if you don't save them.")
                        : localize('workspace.detail1.handled', "Your changes will be lost if you don't save them."),
                buttons: [
                    {
                        label: someUnhandledConflicts
                            ? localize({ key: 'workspace.saveWithConflict', comment: ['&& denotes a mnemonic'] }, '&&Save with Conflicts')
                            : localize({ key: 'workspace.save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                        run: () => 0 /* ConfirmResult.SAVE */,
                    },
                    {
                        label: localize({ key: 'workspace.doNotSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
                        run: () => 1 /* ConfirmResult.DONT_SAVE */,
                    },
                ],
                cancelButton: {
                    run: () => 2 /* ConfirmResult.CANCEL */,
                },
            });
            return result;
        }
        else if (someUnhandledConflicts &&
            !this._storageService.getBoolean(StorageCloseWithConflicts, 0 /* StorageScope.PROFILE */, false)) {
            const { confirmed, checkboxChecked } = await this._dialogService.confirm({
                message: isMany
                    ? localize('workspace.messageN.nonDirty', 'Do you want to close {0} merge editors?', inputModels.length)
                    : localize('workspace.message1.nonDirty', 'Do you want to close the merge editor for {0}?', basename(inputModels[0].resultUri)),
                detail: someUnhandledConflicts
                    ? isMany
                        ? localize('workspace.detailN.unhandled.nonDirty', 'The files contain unhandled conflicts.')
                        : localize('workspace.detail1.unhandled.nonDirty', 'The file contains unhandled conflicts.')
                    : undefined,
                primaryButton: someUnhandledConflicts
                    ? localize({ key: 'workspace.closeWithConflicts', comment: ['&& denotes a mnemonic'] }, '&&Close with Conflicts')
                    : localize({ key: 'workspace.close', comment: ['&& denotes a mnemonic'] }, '&&Close'),
                checkbox: { label: localize('noMoreWarn', 'Do not ask me again') },
            });
            if (checkboxChecked) {
                this._storageService.store(StorageCloseWithConflicts, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
            return confirmed ? 0 /* ConfirmResult.SAVE */ : 2 /* ConfirmResult.CANCEL */;
        }
        else {
            // This shouldn't do anything
            return 0 /* ConfirmResult.SAVE */;
        }
    }
};
WorkspaceMergeEditorInputModel = __decorate([
    __param(4, IDialogService),
    __param(5, IStorageService)
], WorkspaceMergeEditorInputModel);
/* ================= Utils ================== */
async function toInputData(data, textModelService, store) {
    const ref = await textModelService.createModelReference(data.uri);
    store.add(ref);
    return {
        textModel: ref.object.textEditorModel,
        title: data.title,
        description: data.description,
        detail: data.detail,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JJbnB1dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tZXJnZUVkaXRvcklucHV0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBMkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEVBQ04sT0FBTyxFQUVQLG1CQUFtQixFQUNuQixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixjQUFjLEdBRWQsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFrQixrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxX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