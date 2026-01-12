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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTYXZlRXJyb3JIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvdGV4dEZpbGVTYXZlRXJyb3JIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBTXZELE9BQU8sRUFDTixnQkFBZ0IsR0FLaEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFlLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzlFLE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9B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