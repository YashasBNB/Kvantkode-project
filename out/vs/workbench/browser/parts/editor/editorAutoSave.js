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
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { IFilesConfigurationService, } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let EditorAutoSave = class EditorAutoSave extends Disposable {
    static { this.ID = 'workbench.contrib.editorAutoSave'; }
    constructor(filesConfigurationService, hostService, editorService, editorGroupService, workingCopyService, logService, markerService, uriIdentityService) {
        super();
        this.filesConfigurationService = filesConfigurationService;
        this.hostService = hostService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.workingCopyService = workingCopyService;
        this.logService = logService;
        this.markerService = markerService;
        this.uriIdentityService = uriIdentityService;
        // Auto save: after delay
        this.scheduledAutoSavesAfterDelay = new Map();
        // Auto save: focus change & window change
        this.lastActiveEditor = undefined;
        this.lastActiveGroupId = undefined;
        this.lastActiveEditorControlDisposable = this._register(new DisposableStore());
        // Auto save: waiting on specific condition
        this.waitingOnConditionAutoSaveWorkingCopies = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.waitingOnConditionAutoSaveEditors = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        // Fill in initial dirty working copies
        for (const dirtyWorkingCopy of this.workingCopyService.dirtyWorkingCopies) {
            this.onDidRegister(dirtyWorkingCopy);
        }
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.hostService.onDidChangeFocus((focused) => this.onWindowFocusChange(focused)));
        this._register(this.hostService.onDidChangeActiveWindow(() => this.onActiveWindowChange()));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.filesConfigurationService.onDidChangeAutoSaveConfiguration(() => this.onDidChangeAutoSaveConfiguration()));
        // Working Copy events
        this._register(this.workingCopyService.onDidRegister((workingCopy) => this.onDidRegister(workingCopy)));
        this._register(this.workingCopyService.onDidUnregister((workingCopy) => this.onDidUnregister(workingCopy)));
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => this.onDidChangeDirty(workingCopy)));
        this._register(this.workingCopyService.onDidChangeContent((workingCopy) => this.onDidChangeContent(workingCopy)));
        // Condition changes
        this._register(this.markerService.onMarkerChanged((e) => this.onConditionChanged(e, 3 /* AutoSaveDisabledReason.ERRORS */)));
        this._register(this.filesConfigurationService.onDidChangeAutoSaveDisabled((resource) => this.onConditionChanged([resource], 4 /* AutoSaveDisabledReason.DISABLED */)));
    }
    onConditionChanged(resources, condition) {
        for (const resource of resources) {
            // Waiting working copies
            const workingCopyResult = this.waitingOnConditionAutoSaveWorkingCopies.get(resource);
            if (workingCopyResult?.condition === condition) {
                if (workingCopyResult.workingCopy.isDirty() &&
                    this.filesConfigurationService.getAutoSaveMode(workingCopyResult.workingCopy.resource, workingCopyResult.reason).mode !== 0 /* AutoSaveMode.OFF */) {
                    this.discardAutoSave(workingCopyResult.workingCopy);
                    this.logService.trace(`[editor auto save] running auto save from condition change event`, workingCopyResult.workingCopy.resource.toString(), workingCopyResult.workingCopy.typeId);
                    workingCopyResult.workingCopy.save({ reason: workingCopyResult.reason });
                }
            }
            // Waiting editors
            else {
                const editorResult = this.waitingOnConditionAutoSaveEditors.get(resource);
                if (editorResult?.condition === condition &&
                    !editorResult.editor.editor.isDisposed() &&
                    editorResult.editor.editor.isDirty() &&
                    this.filesConfigurationService.getAutoSaveMode(editorResult.editor.editor, editorResult.reason).mode !== 0 /* AutoSaveMode.OFF */) {
                    this.waitingOnConditionAutoSaveEditors.delete(resource);
                    this.logService.trace(`[editor auto save] running auto save from condition change event with reason ${editorResult.reason}`);
                    this.editorService.save(editorResult.editor, { reason: editorResult.reason });
                }
            }
        }
    }
    onWindowFocusChange(focused) {
        if (!focused) {
            this.maybeTriggerAutoSave(4 /* SaveReason.WINDOW_CHANGE */);
        }
    }
    onActiveWindowChange() {
        this.maybeTriggerAutoSave(4 /* SaveReason.WINDOW_CHANGE */);
    }
    onDidActiveEditorChange() {
        // Treat editor change like a focus change for our last active editor if any
        if (this.lastActiveEditor && typeof this.lastActiveGroupId === 'number') {
            this.maybeTriggerAutoSave(3 /* SaveReason.FOCUS_CHANGE */, {
                groupId: this.lastActiveGroupId,
                editor: this.lastActiveEditor,
            });
        }
        // Remember as last active
        const activeGroup = this.editorGroupService.activeGroup;
        const activeEditor = (this.lastActiveEditor = activeGroup.activeEditor ?? undefined);
        this.lastActiveGroupId = activeGroup.id;
        // Dispose previous active control listeners
        this.lastActiveEditorControlDisposable.clear();
        // Listen to focus changes on control for auto save
        const activeEditorPane = this.editorService.activeEditorPane;
        if (activeEditor && activeEditorPane) {
            this.lastActiveEditorControlDisposable.add(activeEditorPane.onDidBlur(() => {
                this.maybeTriggerAutoSave(3 /* SaveReason.FOCUS_CHANGE */, {
                    groupId: activeGroup.id,
                    editor: activeEditor,
                });
            }));
        }
    }
    maybeTriggerAutoSave(reason, editorIdentifier) {
        if (editorIdentifier) {
            if (!editorIdentifier.editor.isDirty() ||
                editorIdentifier.editor.isReadonly() ||
                editorIdentifier.editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                return; // no auto save for non-dirty, readonly or untitled editors
            }
            const autoSaveMode = this.filesConfigurationService.getAutoSaveMode(editorIdentifier.editor, reason);
            if (autoSaveMode.mode !== 0 /* AutoSaveMode.OFF */) {
                // Determine if we need to save all. In case of a window focus change we also save if
                // auto save mode is configured to be ON_FOCUS_CHANGE (editor focus change)
                if ((reason === 4 /* SaveReason.WINDOW_CHANGE */ &&
                    (autoSaveMode.mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */ ||
                        autoSaveMode.mode === 4 /* AutoSaveMode.ON_WINDOW_CHANGE */)) ||
                    (reason === 3 /* SaveReason.FOCUS_CHANGE */ && autoSaveMode.mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */)) {
                    this.logService.trace(`[editor auto save] triggering auto save with reason ${reason}`);
                    this.editorService.save(editorIdentifier, { reason });
                }
            }
            else if (editorIdentifier.editor.resource &&
                (autoSaveMode.reason === 3 /* AutoSaveDisabledReason.ERRORS */ ||
                    autoSaveMode.reason === 4 /* AutoSaveDisabledReason.DISABLED */)) {
                this.waitingOnConditionAutoSaveEditors.set(editorIdentifier.editor.resource, {
                    editor: editorIdentifier,
                    reason,
                    condition: autoSaveMode.reason,
                });
            }
        }
        else {
            this.saveAllDirtyAutoSaveables(reason);
        }
    }
    onDidChangeAutoSaveConfiguration() {
        // Trigger a save-all when auto save is enabled
        let reason = undefined;
        switch (this.filesConfigurationService.getAutoSaveMode(undefined).mode) {
            case 3 /* AutoSaveMode.ON_FOCUS_CHANGE */:
                reason = 3 /* SaveReason.FOCUS_CHANGE */;
                break;
            case 4 /* AutoSaveMode.ON_WINDOW_CHANGE */:
                reason = 4 /* SaveReason.WINDOW_CHANGE */;
                break;
            case 1 /* AutoSaveMode.AFTER_SHORT_DELAY */:
            case 2 /* AutoSaveMode.AFTER_LONG_DELAY */:
                reason = 2 /* SaveReason.AUTO */;
                break;
        }
        if (reason) {
            this.saveAllDirtyAutoSaveables(reason);
        }
    }
    saveAllDirtyAutoSaveables(reason) {
        for (const workingCopy of this.workingCopyService.dirtyWorkingCopies) {
            if (workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) {
                continue; // we never auto save untitled working copies
            }
            const autoSaveMode = this.filesConfigurationService.getAutoSaveMode(workingCopy.resource, reason);
            if (autoSaveMode.mode !== 0 /* AutoSaveMode.OFF */) {
                workingCopy.save({ reason });
            }
            else if (autoSaveMode.reason === 3 /* AutoSaveDisabledReason.ERRORS */ ||
                autoSaveMode.reason === 4 /* AutoSaveDisabledReason.DISABLED */) {
                this.waitingOnConditionAutoSaveWorkingCopies.set(workingCopy.resource, {
                    workingCopy,
                    reason,
                    condition: autoSaveMode.reason,
                });
            }
        }
    }
    onDidRegister(workingCopy) {
        if (workingCopy.isDirty()) {
            this.scheduleAutoSave(workingCopy);
        }
    }
    onDidUnregister(workingCopy) {
        this.discardAutoSave(workingCopy);
    }
    onDidChangeDirty(workingCopy) {
        if (workingCopy.isDirty()) {
            this.scheduleAutoSave(workingCopy);
        }
        else {
            this.discardAutoSave(workingCopy);
        }
    }
    onDidChangeContent(workingCopy) {
        if (workingCopy.isDirty()) {
            // this listener will make sure that the auto save is
            // pushed out for as long as the user is still changing
            // the content of the working copy.
            this.scheduleAutoSave(workingCopy);
        }
    }
    scheduleAutoSave(workingCopy) {
        if (workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) {
            return; // we never auto save untitled working copies
        }
        const autoSaveAfterDelay = this.filesConfigurationService.getAutoSaveConfiguration(workingCopy.resource).autoSaveDelay;
        if (typeof autoSaveAfterDelay !== 'number') {
            return; // auto save after delay must be enabled
        }
        // Clear any running auto save operation
        this.discardAutoSave(workingCopy);
        this.logService.trace(`[editor auto save] scheduling auto save after ${autoSaveAfterDelay}ms`, workingCopy.resource.toString(), workingCopy.typeId);
        // Schedule new auto save
        const handle = setTimeout(() => {
            // Clear pending
            this.discardAutoSave(workingCopy);
            // Save if dirty and unless prevented by other conditions such as error markers
            if (workingCopy.isDirty()) {
                const reason = 2 /* SaveReason.AUTO */;
                const autoSaveMode = this.filesConfigurationService.getAutoSaveMode(workingCopy.resource, reason);
                if (autoSaveMode.mode !== 0 /* AutoSaveMode.OFF */) {
                    this.logService.trace(`[editor auto save] running auto save`, workingCopy.resource.toString(), workingCopy.typeId);
                    workingCopy.save({ reason });
                }
                else if (autoSaveMode.reason === 3 /* AutoSaveDisabledReason.ERRORS */ ||
                    autoSaveMode.reason === 4 /* AutoSaveDisabledReason.DISABLED */) {
                    this.waitingOnConditionAutoSaveWorkingCopies.set(workingCopy.resource, {
                        workingCopy,
                        reason,
                        condition: autoSaveMode.reason,
                    });
                }
            }
        }, autoSaveAfterDelay);
        // Keep in map for disposal as needed
        this.scheduledAutoSavesAfterDelay.set(workingCopy, toDisposable(() => {
            this.logService.trace(`[editor auto save] clearing pending auto save`, workingCopy.resource.toString(), workingCopy.typeId);
            clearTimeout(handle);
        }));
    }
    discardAutoSave(workingCopy) {
        dispose(this.scheduledAutoSavesAfterDelay.get(workingCopy));
        this.scheduledAutoSavesAfterDelay.delete(workingCopy);
        this.waitingOnConditionAutoSaveWorkingCopies.delete(workingCopy.resource);
        this.waitingOnConditionAutoSaveEditors.delete(workingCopy.resource);
    }
};
EditorAutoSave = __decorate([
    __param(0, IFilesConfigurationService),
    __param(1, IHostService),
    __param(2, IEditorService),
    __param(3, IEditorGroupsService),
    __param(4, IWorkingCopyService),
    __param(5, ILogService),
    __param(6, IMarkerService),
    __param(7, IUriIdentityService)
], EditorAutoSave);
export { EditorAutoSave };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQXV0b1NhdmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yQXV0b1NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTiwwQkFBMEIsR0FHMUIsTUFBTSwwRUFBMEUsQ0FBQTtBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFRckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBS2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRXJGLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO2FBQzdCLE9BQUUsR0FBRyxrQ0FBa0MsQUFBckMsQ0FBcUM7SUFzQnZELFlBRUMseUJBQXNFLEVBQ3hELFdBQTBDLEVBQ3hDLGFBQThDLEVBQ3hDLGtCQUF5RCxFQUMxRCxrQkFBd0QsRUFDaEUsVUFBd0MsRUFDckMsYUFBOEMsRUFDekMsa0JBQXdEO1FBRTdFLEtBQUssRUFBRSxDQUFBO1FBVFUsOEJBQXlCLEdB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