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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { IBulkEditService, ResourceFileEdit, ResourceTextEdit, } from '../../../../editor/browser/services/bulkEditService.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress, } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { UndoRedoGroup } from '../../../../platform/undoRedo/common/undoRedo.js';
import { BulkCellEdits, ResourceNotebookCellEdit } from './bulkCellEdits.js';
import { BulkFileEdits } from './bulkFileEdits.js';
import { BulkTextEdits } from './bulkTextEdits.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { OpaqueEdits, ResourceAttachmentEdit } from './opaqueEdits.js';
function liftEdits(edits) {
    return edits.map((edit) => {
        if (ResourceTextEdit.is(edit)) {
            return ResourceTextEdit.lift(edit);
        }
        if (ResourceFileEdit.is(edit)) {
            return ResourceFileEdit.lift(edit);
        }
        if (ResourceNotebookCellEdit.is(edit)) {
            return ResourceNotebookCellEdit.lift(edit);
        }
        if (ResourceAttachmentEdit.is(edit)) {
            return ResourceAttachmentEdit.lift(edit);
        }
        throw new Error('Unsupported edit');
    });
}
let BulkEdit = class BulkEdit {
    constructor(_label, _code, _editor, _progress, _token, _edits, _undoRedoGroup, _undoRedoSource, _confirmBeforeUndo, _instaService, _logService) {
        this._label = _label;
        this._code = _code;
        this._editor = _editor;
        this._progress = _progress;
        this._token = _token;
        this._edits = _edits;
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._confirmBeforeUndo = _confirmBeforeUndo;
        this._instaService = _instaService;
        this._logService = _logService;
    }
    ariaMessage() {
        const otherResources = new ResourceMap();
        const textEditResources = new ResourceMap();
        let textEditCount = 0;
        for (const edit of this._edits) {
            if (edit instanceof ResourceTextEdit) {
                textEditCount += 1;
                textEditResources.set(edit.resource, true);
            }
            else if (edit instanceof ResourceFileEdit) {
                otherResources.set(edit.oldResource ?? edit.newResource, true);
            }
        }
        if (this._edits.length === 0) {
            return localize('summary.0', 'Made no edits');
        }
        else if (otherResources.size === 0) {
            if (textEditCount > 1 && textEditResources.size > 1) {
                return localize('summary.nm', 'Made {0} text edits in {1} files', textEditCount, textEditResources.size);
            }
            else {
                return localize('summary.n0', 'Made {0} text edits in one file', textEditCount);
            }
        }
        else {
            return localize('summary.textFiles', 'Made {0} text edits in {1} files, also created or deleted {2} files', textEditCount, textEditResources.size, otherResources.size);
        }
    }
    async perform() {
        if (this._edits.length === 0) {
            return [];
        }
        const ranges = [1];
        for (let i = 1; i < this._edits.length; i++) {
            if (Object.getPrototypeOf(this._edits[i - 1]) === Object.getPrototypeOf(this._edits[i])) {
                ranges[ranges.length - 1]++;
            }
            else {
                ranges.push(1);
            }
        }
        // Show infinte progress when there is only 1 item since we do not know how long it takes
        const increment = this._edits.length > 1 ? 0 : undefined;
        this._progress.report({ increment, total: 100 });
        // Increment by percentage points since progress API expects that
        const progress = {
            report: (_) => this._progress.report({ increment: 100 / this._edits.length }),
        };
        const resources = [];
        let index = 0;
        for (const range of ranges) {
            if (this._token.isCancellationRequested) {
                break;
            }
            const group = this._edits.slice(index, index + range);
            if (group[0] instanceof ResourceFileEdit) {
                resources.push(await this._performFileEdits(group, this._undoRedoGroup, this._undoRedoSource, this._confirmBeforeUndo, progress));
            }
            else if (group[0] instanceof ResourceTextEdit) {
                resources.push(await this._performTextEdits(group, this._undoRedoGroup, this._undoRedoSource, progress));
            }
            else if (group[0] instanceof ResourceNotebookCellEdit) {
                resources.push(await this._performCellEdits(group, this._undoRedoGroup, this._undoRedoSource, progress));
            }
            else if (group[0] instanceof ResourceAttachmentEdit) {
                resources.push(await this._performOpaqueEdits(group, this._undoRedoGroup, this._undoRedoSource, progress));
            }
            else {
                console.log('UNKNOWN EDIT');
            }
            index = index + range;
        }
        return resources.flat();
    }
    async _performFileEdits(edits, undoRedoGroup, undoRedoSource, confirmBeforeUndo, progress) {
        this._logService.debug('_performFileEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(BulkFileEdits, this._label || localize('workspaceEdit', 'Workspace Edit'), this._code || 'undoredo.workspaceEdit', undoRedoGroup, undoRedoSource, confirmBeforeUndo, progress, this._token, edits);
        return await model.apply();
    }
    async _performTextEdits(edits, undoRedoGroup, undoRedoSource, progress) {
        this._logService.debug('_performTextEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(BulkTextEdits, this._label || localize('workspaceEdit', 'Workspace Edit'), this._code || 'undoredo.workspaceEdit', this._editor, undoRedoGroup, undoRedoSource, progress, this._token, edits);
        return await model.apply();
    }
    async _performCellEdits(edits, undoRedoGroup, undoRedoSource, progress) {
        this._logService.debug('_performCellEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(BulkCellEdits, undoRedoGroup, undoRedoSource, progress, this._token, edits);
        return await model.apply();
    }
    async _performOpaqueEdits(edits, undoRedoGroup, undoRedoSource, progress) {
        this._logService.debug('_performOpaqueEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(OpaqueEdits, undoRedoGroup, undoRedoSource, progress, this._token, edits);
        return await model.apply();
    }
};
BulkEdit = __decorate([
    __param(9, IInstantiationService),
    __param(10, ILogService)
], BulkEdit);
let BulkEditService = class BulkEditService {
    constructor(_instaService, _logService, _editorService, _lifecycleService, _dialogService, _workingCopyService, _configService) {
        this._instaService = _instaService;
        this._logService = _logService;
        this._editorService = _editorService;
        this._lifecycleService = _lifecycleService;
        this._dialogService = _dialogService;
        this._workingCopyService = _workingCopyService;
        this._configService = _configService;
        this._activeUndoRedoGroups = new LinkedList();
    }
    setPreviewHandler(handler) {
        this._previewHandler = handler;
        return toDisposable(() => {
            if (this._previewHandler === handler) {
                this._previewHandler = undefined;
            }
        });
    }
    hasPreviewHandler() {
        return Boolean(this._previewHandler);
    }
    async apply(editsIn, options) {
        let edits = liftEdits(Array.isArray(editsIn) ? editsIn : editsIn.edits);
        if (edits.length === 0) {
            return { ariaSummary: localize('nothing', 'Made no edits'), isApplied: false };
        }
        if (this._previewHandler &&
            (options?.showPreview || edits.some((value) => value.metadata?.needsConfirmation))) {
            edits = await this._previewHandler(edits, options);
        }
        let codeEditor = options?.editor;
        // try to find code editor
        if (!codeEditor) {
            const candidate = this._editorService.activeTextEditorControl;
            if (isCodeEditor(candidate)) {
                codeEditor = candidate;
            }
            else if (isDiffEditor(candidate)) {
                codeEditor = candidate.getModifiedEditor();
            }
        }
        if (codeEditor && codeEditor.getOption(96 /* EditorOption.readOnly */)) {
            // If the code editor is readonly still allow bulk edits to be applied #68549
            codeEditor = undefined;
        }
        // undo-redo-group: if a group id is passed then try to find it
        // in the list of active edits. otherwise (or when not found)
        // create a separate undo-redo-group
        let undoRedoGroup;
        let undoRedoGroupRemove = () => { };
        if (typeof options?.undoRedoGroupId === 'number') {
            for (const candidate of this._activeUndoRedoGroups) {
                if (candidate.id === options.undoRedoGroupId) {
                    undoRedoGroup = candidate;
                    break;
                }
            }
        }
        if (!undoRedoGroup) {
            undoRedoGroup = new UndoRedoGroup();
            undoRedoGroupRemove = this._activeUndoRedoGroups.push(undoRedoGroup);
        }
        const label = options?.quotableLabel || options?.label;
        const bulkEdit = this._instaService.createInstance(BulkEdit, label, options?.code, codeEditor, options?.progress ?? Progress.None, options?.token ?? CancellationToken.None, edits, undoRedoGroup, options?.undoRedoSource, !!options?.confirmBeforeUndo);
        let listener;
        try {
            listener = this._lifecycleService.onBeforeShutdown((e) => e.veto(this._shouldVeto(label, e.reason), 'veto.blukEditService'));
            const resources = await bulkEdit.perform();
            // when enabled (option AND setting) loop over all dirty working copies and trigger save
            // for those that were involved in this bulk edit operation.
            if (options?.respectAutoSaveConfig &&
                this._configService.getValue(autoSaveSetting) === true &&
                resources.length > 1) {
                await this._saveAll(resources);
            }
            return { ariaSummary: bulkEdit.ariaMessage(), isApplied: edits.length > 0 };
        }
        catch (err) {
            // console.log('apply FAILED');
            // console.log(err);
            this._logService.error(err);
            throw err;
        }
        finally {
            listener?.dispose();
            undoRedoGroupRemove();
        }
    }
    async _saveAll(resources) {
        const set = new ResourceSet(resources);
        const saves = this._workingCopyService.dirtyWorkingCopies.map(async (copy) => {
            if (set.has(copy.resource)) {
                await copy.save();
            }
        });
        const result = await Promise.allSettled(saves);
        for (const item of result) {
            if (item.status === 'rejected') {
                this._logService.warn(item.reason);
            }
        }
    }
    async _shouldVeto(label, reason) {
        let message;
        let primaryButton;
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                message = localize('closeTheWindow.message', 'Are you sure you want to close the window?');
                primaryButton = localize({ key: 'closeTheWindow', comment: ['&& denotes a mnemonic'] }, '&&Close Window');
                break;
            case 4 /* ShutdownReason.LOAD */:
                message = localize('changeWorkspace.message', 'Are you sure you want to change the workspace?');
                primaryButton = localize({ key: 'changeWorkspace', comment: ['&& denotes a mnemonic'] }, 'Change &&Workspace');
                break;
            case 3 /* ShutdownReason.RELOAD */:
                message = localize('reloadTheWindow.message', 'Are you sure you want to reload the window?');
                primaryButton = localize({ key: 'reloadTheWindow', comment: ['&& denotes a mnemonic'] }, '&&Reload Window');
                break;
            default:
                message = localize('quit.message', 'Are you sure you want to quit?');
                primaryButton = localize({ key: 'quit', comment: ['&& denotes a mnemonic'] }, '&&Quit');
                break;
        }
        const result = await this._dialogService.confirm({
            message,
            detail: localize('areYouSureQuiteBulkEdit.detail', "'{0}' is in progress.", label || localize('fileOperation', 'File operation')),
            primaryButton,
        });
        return !result.confirmed;
    }
};
BulkEditService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService),
    __param(2, IEditorService),
    __param(3, ILifecycleService),
    __param(4, IDialogService),
    __param(5, IWorkingCopyService),
    __param(6, IConfigurationService)
], BulkEditService);
export { BulkEditService };
registerSingleton(IBulkEditService, BulkEditService, 1 /* InstantiationType.Delayed */);
const autoSaveSetting = 'files.refactoring.autoSave';
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'files',
    properties: {
        [autoSaveSetting]: {
            description: localize('refactoring.autoSave', 'Controls if files that were part of a refactoring are saved automatically'),
            default: true,
            type: 'boolean',
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9idWxrRWRpdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpFLE9BQU8sRUFFTixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUlOLGdCQUFnQixFQUVoQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sd0RBQXdELENBQUE7QUFHL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBR04sUUFBUSxHQUNSLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEs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