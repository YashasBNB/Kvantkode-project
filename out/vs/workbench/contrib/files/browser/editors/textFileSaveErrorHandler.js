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
import { localize } from '../../../../../nls.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { Action } from '../../../../../base/common/actions.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextFileService, } from '../../../../services/textfile/common/textfiles.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { dispose, Disposable } from '../../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IContextKeyService, RawContextKey, } from '../../../../../platform/contextkey/common/contextkey.js';
import { TextFileContentProvider } from '../../common/files.js';
import { FileEditorInput } from './fileEditorInput.js';
import { SAVE_FILE_AS_LABEL } from '../fileConstants.js';
import { INotificationService, Severity, } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Event } from '../../../../../base/common/event.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { SideBySideEditor } from '../../../../common/editor.js';
import { hash } from '../../../../../base/common/hash.js';
export const CONFLICT_RESOLUTION_CONTEXT = 'saveConflictResolutionContext';
export const CONFLICT_RESOLUTION_SCHEME = 'conflictResolution';
const LEARN_MORE_DIRTY_WRITE_IGNORE_KEY = 'learnMoreDirtyWriteError';
const conflictEditorHelp = localize('userGuide', 'Use the actions in the editor tool bar to either undo your changes or overwrite the content of the file with your changes.');
// A handler for text file save error happening with conflict resolution actions
let TextFileSaveErrorHandler = class TextFileSaveErrorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.textFileSaveErrorHandler'; }
    constructor(notificationService, textFileService, contextKeyService, editorService, textModelService, instantiationService, storageService) {
        super();
        this.notificationService = notificationService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.messages = new ResourceMap();
        this.activeConflictResolutionResource = undefined;
        this.conflictResolutionContext = new RawContextKey(CONFLICT_RESOLUTION_CONTEXT, false, true).bindTo(contextKeyService);
        const provider = this._register(instantiationService.createInstance(TextFileContentProvider));
        this._register(textModelService.registerTextModelContentProvider(CONFLICT_RESOLUTION_SCHEME, provider));
        // Set as save error handler to service for text files
        this.textFileService.files.saveErrorHandler = this;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.textFileService.files.onDidSave((e) => this.onFileSavedOrReverted(e.model.resource)));
        this._register(this.textFileService.files.onDidRevert((model) => this.onFileSavedOrReverted(model.resource)));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onActiveEditorChanged()));
    }
    onActiveEditorChanged() {
        let isActiveEditorSaveConflictResolution = false;
        let activeConflictResolutionResource;
        const activeInput = this.editorService.activeEditor;
        if (activeInput instanceof DiffEditorInput) {
            const resource = activeInput.original.resource;
            if (resource?.scheme === CONFLICT_RESOLUTION_SCHEME) {
                isActiveEditorSaveConflictResolution = true;
                activeConflictResolutionResource = activeInput.modified.resource;
            }
        }
        this.conflictResolutionContext.set(isActiveEditorSaveConflictResolution);
        this.activeConflictResolutionResource = activeConflictResolutionResource;
    }
    onFileSavedOrReverted(resource) {
        const messageHandle = this.messages.get(resource);
        if (messageHandle) {
            messageHandle.close();
            this.messages.delete(resource);
        }
    }
    onSaveError(error, model, options) {
        const fileOperationError = error;
        const resource = model.resource;
        let message;
        const primaryActions = [];
        const secondaryActions = [];
        // Dirty write prevention
        if (fileOperationError.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
            // If the user tried to save from the opened conflict editor, show its message again
            if (this.activeConflictResolutionResource &&
                isEqual(this.activeConflictResolutionResource, model.resource)) {
                if (this.storageService.getBoolean(LEARN_MORE_DIRTY_WRITE_IGNORE_KEY, -1 /* StorageScope.APPLICATION */)) {
                    return; // return if this message is ignored
                }
                message = conflictEditorHelp;
                primaryActions.push(this.instantiationService.createInstance(ResolveConflictLearnMoreAction));
                secondaryActions.push(this.instantiationService.createInstance(DoNotShowResolveConflictLearnMoreAction));
            }
            // Otherwise show the message that will lead the user into the save conflict editor.
            else {
                message = localize('staleSaveError', "Failed to save '{0}': The content of the file is newer. Please compare your version with the file contents or overwrite the content of the file with your changes.", basename(resource));
                primaryActions.push(this.instantiationService.createInstance(ResolveSaveConflictAction, model));
                primaryActions.push(this.instantiationService.createInstance(SaveModelIgnoreModifiedSinceAction, model, options));
                secondaryActions.push(this.instantiationService.createInstance(ConfigureSaveConflictAction));
            }
        }
        // Any other save error
        else {
            const isWriteLocked = fileOperationError.fileOperationResult === 5 /* FileOperationResult.FILE_WRITE_LOCKED */;
            const triedToUnlock = isWriteLocked && fileOperationError.options?.unlock;
            const isPermissionDenied = fileOperationError.fileOperationResult === 6 /* FileOperationResult.FILE_PERMISSION_DENIED */;
            const canSaveElevated = resource.scheme === Schemas.file; // currently only supported for local schemes (https://github.com/microsoft/vscode/issues/48659)
            // Save Elevated
            if (canSaveElevated && (isPermissionDenied || triedToUnlock)) {
                primaryActions.push(this.instantiationService.createInstance(SaveModelElevatedAction, model, options, !!triedToUnlock));
            }
            // Unlock
            else if (isWriteLocked) {
                primaryActions.push(this.instantiationService.createInstance(UnlockModelAction, model, options));
            }
            // Retry
            else {
                primaryActions.push(this.instantiationService.createInstance(RetrySaveModelAction, model, options));
            }
            // Save As
            primaryActions.push(this.instantiationService.createInstance(SaveModelAsAction, model));
            // Revert
            primaryActions.push(this.instantiationService.createInstance(RevertModelAction, model));
            // Message
            if (isWriteLocked) {
                if (triedToUnlock && canSaveElevated) {
                    message = isWindows
                        ? localize('readonlySaveErrorAdmin', "Failed to save '{0}': File is read-only. Select 'Overwrite as Admin' to retry as administrator.", basename(resource))
                        : localize('readonlySaveErrorSudo', "Failed to save '{0}': File is read-only. Select 'Overwrite as Sudo' to retry as superuser.", basename(resource));
                }
                else {
                    message = localize('readonlySaveError', "Failed to save '{0}': File is read-only. Select 'Overwrite' to attempt to make it writeable.", basename(resource));
                }
            }
            else if (canSaveElevated && isPermissionDenied) {
                message = isWindows
                    ? localize('permissionDeniedSaveError', "Failed to save '{0}': Insufficient permissions. Select 'Retry as Admin' to retry as administrator.", basename(resource))
                    : localize('permissionDeniedSaveErrorSudo', "Failed to save '{0}': Insufficient permissions. Select 'Retry as Sudo' to retry as superuser.", basename(resource));
            }
            else {
                message = localize({
                    key: 'genericSaveError',
                    comment: ['{0} is the resource that failed to save and {1} the error message'],
                }, "Failed to save '{0}': {1}", basename(resource), toErrorMessage(error, false));
            }
        }
        // Show message and keep function to hide in case the file gets saved/reverted
        const actions = { primary: primaryActions, secondary: secondaryActions };
        const handle = this.notificationService.notify({
            id: `${hash(model.resource.toString())}`, // unique per model (https://github.com/microsoft/vscode/issues/121539)
            severity: Severity.Error,
            message,
            actions,
        });
        Event.once(handle.onDidClose)(() => {
            dispose(primaryActions);
            dispose(secondaryActions);
        });
        this.messages.set(model.resource, handle);
    }
    dispose() {
        super.dispose();
        this.messages.clear();
    }
};
TextFileSaveErrorHandler = __decorate([
    __param(0, INotificationService),
    __param(1, ITextFileService),
    __param(2, IContextKeyService),
    __param(3, IEditorService),
    __param(4, ITextModelService),
    __param(5, IInstantiationService),
    __param(6, IStorageService)
], TextFileSaveErrorHandler);
export { TextFileSaveErrorHandler };
const pendingResolveSaveConflictMessages = [];
function clearPendingResolveSaveConflictMessages() {
    while (pendingResolveSaveConflictMessages.length > 0) {
        const item = pendingResolveSaveConflictMessages.pop();
        item?.close();
    }
}
let ResolveConflictLearnMoreAction = class ResolveConflictLearnMoreAction extends Action {
    constructor(openerService) {
        super('workbench.files.action.resolveConflictLearnMore', localize('learnMore', 'Learn More'));
        this.openerService = openerService;
    }
    async run() {
        await this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=868264'));
    }
};
ResolveConflictLearnMoreAction = __decorate([
    __param(0, IOpenerService)
], ResolveConflictLearnMoreAction);
let DoNotShowResolveConflictLearnMoreAction = class DoNotShowResolveConflictLearnMoreAction extends Action {
    constructor(storageService) {
        super('workbench.files.action.resolveConflictLearnMoreDoNotShowAgain', localize('dontShowAgain', "Don't Show Again"));
        this.storageService = storageService;
    }
    async run(notification) {
        // Remember this as application state
        this.storageService.store(LEARN_MORE_DIRTY_WRITE_IGNORE_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        // Hide notification
        notification.dispose();
    }
};
DoNotShowResolveConflictLearnMoreAction = __decorate([
    __param(0, IStorageService)
], DoNotShowResolveConflictLearnMoreAction);
let ResolveSaveConflictAction = class ResolveSaveConflictAction extends Action {
    constructor(model, editorService, notificationService, instantiationService, productService) {
        super('workbench.files.action.resolveConflict', localize('compareChanges', 'Compare'));
        this.model = model;
        this.editorService = editorService;
        this.notificationService = notificationService;
        this.instantiationService = instantiationService;
        this.productService = productService;
    }
    async run() {
        if (!this.model.isDisposed()) {
            const resource = this.model.resource;
            const name = basename(resource);
            const editorLabel = localize('saveConflictDiffLabel', '{0} (in file) ↔ {1} (in {2}) - Resolve save conflict', name, name, this.productService.nameLong);
            await TextFileContentProvider.open(resource, CONFLICT_RESOLUTION_SCHEME, editorLabel, this.editorService, { pinned: true });
            // Show additional help how to resolve the save conflict
            const actions = {
                primary: [this.instantiationService.createInstance(ResolveConflictLearnMoreAction)],
            };
            const handle = this.notificationService.notify({
                id: `${hash(resource.toString())}`, // unique per model
                severity: Severity.Info,
                message: conflictEditorHelp,
                actions,
                neverShowAgain: { id: LEARN_MORE_DIRTY_WRITE_IGNORE_KEY, isSecondary: true },
            });
            Event.once(handle.onDidClose)(() => dispose(actions.primary));
            pendingResolveSaveConflictMessages.push(handle);
        }
    }
};
ResolveSaveConflictAction = __decorate([
    __param(1, IEditorService),
    __param(2, INotificationService),
    __param(3, IInstantiationService),
    __param(4, IProductService)
], ResolveSaveConflictAction);
class SaveModelElevatedAction extends Action {
    constructor(model, options, triedToUnlock) {
        super('workbench.files.action.saveModelElevated', triedToUnlock
            ? isWindows
                ? localize('overwriteElevated', 'Overwrite as Admin...')
                : localize('overwriteElevatedSudo', 'Overwrite as Sudo...')
            : isWindows
                ? localize('saveElevated', 'Retry as Admin...')
                : localize('saveElevatedSudo', 'Retry as Sudo...'));
        this.model = model;
        this.options = options;
        this.triedToUnlock = triedToUnlock;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({
                ...this.options,
                writeElevated: true,
                writeUnlock: this.triedToUnlock,
                reason: 1 /* SaveReason.EXPLICIT */,
            });
        }
    }
}
class RetrySaveModelAction extends Action {
    constructor(model, options) {
        super('workbench.files.action.saveModel', localize('retry', 'Retry'));
        this.model = model;
        this.options = options;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({ ...this.options, reason: 1 /* SaveReason.EXPLICIT */ });
        }
    }
}
class RevertModelAction extends Action {
    constructor(model) {
        super('workbench.files.action.revertModel', localize('revert', 'Revert'));
        this.model = model;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.revert();
        }
    }
}
let SaveModelAsAction = class SaveModelAsAction extends Action {
    constructor(model, editorService) {
        super('workbench.files.action.saveModelAs', SAVE_FILE_AS_LABEL.value);
        this.model = model;
        this.editorService = editorService;
    }
    async run() {
        if (!this.model.isDisposed()) {
            const editor = this.findEditor();
            if (editor) {
                await this.editorService.save(editor, { saveAs: true, reason: 1 /* SaveReason.EXPLICIT */ });
            }
        }
    }
    findEditor() {
        let preferredMatchingEditor;
        const editors = this.editorService.findEditors(this.model.resource, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        for (const identifier of editors) {
            if (identifier.editor instanceof FileEditorInput) {
                // We prefer a `FileEditorInput` for "Save As", but it is possible
                // that a custom editor is leveraging the text file model and as
                // such we need to fallback to any other editor having the resource
                // opened for running the save.
                preferredMatchingEditor = identifier;
                break;
            }
            else if (!preferredMatchingEditor) {
                preferredMatchingEditor = identifier;
            }
        }
        return preferredMatchingEditor;
    }
};
SaveModelAsAction = __decorate([
    __param(1, IEditorService)
], SaveModelAsAction);
class UnlockModelAction extends Action {
    constructor(model, options) {
        super('workbench.files.action.unlock', localize('overwrite', 'Overwrite'));
        this.model = model;
        this.options = options;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({ ...this.options, writeUnlock: true, reason: 1 /* SaveReason.EXPLICIT */ });
        }
    }
}
class SaveModelIgnoreModifiedSinceAction extends Action {
    constructor(model, options) {
        super('workbench.files.action.saveIgnoreModifiedSince', localize('overwrite', 'Overwrite'));
        this.model = model;
        this.options = options;
    }
    async run() {
        if (!this.model.isDisposed()) {
            await this.model.save({
                ...this.options,
                ignoreModifiedSince: true,
                reason: 1 /* SaveReason.EXPLICIT */,
            });
        }
    }
}
let ConfigureSaveConflictAction = class ConfigureSaveConflictAction extends Action {
    constructor(preferencesService) {
        super('workbench.files.action.configureSaveConflict', localize('configure', 'Configure'));
        this.preferencesService = preferencesService;
    }
    async run() {
        this.preferencesService.openSettings({ query: 'files.saveConflictResolution' });
    }
};
ConfigureSaveConflictAction = __decorate([
    __param(0, IPreferencesService)
], ConfigureSaveConflictAction);
export const acceptLocalChangesCommand = (accessor, resource) => {
    return acceptOrRevertLocalChangesCommand(accessor, resource, true);
};
export const revertLocalChangesCommand = (accessor, resource) => {
    return acceptOrRevertLocalChangesCommand(accessor, resource, false);
};
async function acceptOrRevertLocalChangesCommand(accessor, resource, accept) {
    const editorService = accessor.get(IEditorService);
    const editorPane = editorService.activeEditorPane;
    if (!editorPane) {
        return;
    }
    const editor = editorPane.input;
    const group = editorPane.group;
    // Hide any previously shown message about how to use these actions
    clearPendingResolveSaveConflictMessages();
    // Accept or revert
    if (accept) {
        const options = {
            ignoreModifiedSince: true,
            reason: 1 /* SaveReason.EXPLICIT */,
        };
        await editorService.save({ editor, groupId: group.id }, options);
    }
    else {
        await editorService.revert({ editor, groupId: group.id });
    }
    // Reopen original editor
    await editorService.openEditor({ resource }, group);
    // Clean up
    return group.closeEditor(editor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTYXZlRXJyb3JIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9lZGl0b3JzL3RleHRGaWxlU2F2ZUVycm9ySGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQU12RCxPQUFPLEVBQ04sZ0JBQWdCLEdBS2hCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBZSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVB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