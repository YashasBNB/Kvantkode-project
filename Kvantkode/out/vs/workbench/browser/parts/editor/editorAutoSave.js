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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQXV0b1NhdmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JBdXRvU2F2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLDBCQUEwQixHQUcxQixNQUFNLDBFQUEwRSxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQVFyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFckYsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7YUFDN0IsT0FBRSxHQUFHLGtDQUFrQyxBQUFyQyxDQUFxQztJQXNCdkQsWUFFQyx5QkFBc0UsRUFDeEQsV0FBMEMsRUFDeEMsYUFBOEMsRUFDeEMsa0JBQXlELEVBQzFELGtCQUF3RCxFQUNoRSxVQUF3QyxFQUNyQyxhQUE4QyxFQUN6QyxrQkFBd0Q7UUFFN0UsS0FBSyxF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