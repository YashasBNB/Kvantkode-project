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
var CustomEditorInput_1;
import { getWindow } from '../../../../base/browser/dom.js';
import { toAction } from '../../../../base/common/actions.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename } from '../../../../base/common/path.js';
import { dirname, isEqual } from '../../../../base/common/resources.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { createEditorOpenError, } from '../../../common/editor.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { ICustomEditorService } from '../common/customEditor.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import { IWebviewWorkbenchService, LazilyResolvedWebviewEditorInput, } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IUntitledTextEditorService } from '../../../services/untitled/common/untitledTextEditorService.js';
let CustomEditorInput = class CustomEditorInput extends LazilyResolvedWebviewEditorInput {
    static { CustomEditorInput_1 = this; }
    static create(instantiationService, resource, viewType, group, options) {
        return instantiationService.invokeFunction((accessor) => {
            // If it's an untitled file we must populate the untitledDocumentData
            const untitledString = accessor.get(IUntitledTextEditorService).getValue(resource);
            const untitledDocumentData = untitledString ? VSBuffer.fromString(untitledString) : undefined;
            const webview = accessor.get(IWebviewService).createWebviewOverlay({
                providedViewType: viewType,
                title: undefined,
                options: { customClasses: options?.customClasses },
                contentOptions: {},
                extension: undefined,
            });
            const input = instantiationService.createInstance(CustomEditorInput_1, { resource, viewType }, webview, { untitledDocumentData: untitledDocumentData, oldResource: options?.oldResource });
            if (typeof group !== 'undefined') {
                input.updateGroup(group);
            }
            return input;
        });
    }
    static { this.typeId = 'workbench.editors.webviewEditor'; }
    get resource() {
        return this._editorResource;
    }
    constructor(init, webview, options, webviewWorkbenchService, instantiationService, labelService, customEditorService, fileDialogService, undoRedoService, fileService, filesConfigurationService, editorGroupsService, layoutService, customEditorLabelService) {
        super({ providedId: init.viewType, viewType: init.viewType, name: '' }, webview, webviewWorkbenchService);
        this.instantiationService = instantiationService;
        this.labelService = labelService;
        this.customEditorService = customEditorService;
        this.fileDialogService = fileDialogService;
        this.undoRedoService = undoRedoService;
        this.fileService = fileService;
        this.filesConfigurationService = filesConfigurationService;
        this.editorGroupsService = editorGroupsService;
        this.layoutService = layoutService;
        this.customEditorLabelService = customEditorLabelService;
        this._editorName = undefined;
        this._shortDescription = undefined;
        this._mediumDescription = undefined;
        this._longDescription = undefined;
        this._shortTitle = undefined;
        this._mediumTitle = undefined;
        this._longTitle = undefined;
        this._editorResource = init.resource;
        this.oldResource = options.oldResource;
        this._defaultDirtyState = options.startsDirty;
        this._backupId = options.backupId;
        this._untitledDocumentData = options.untitledDocumentData;
        this.registerListeners();
    }
    registerListeners() {
        // Clear our labels on certain label related events
        this._register(this.labelService.onDidChangeFormatters((e) => this.onLabelEvent(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations((e) => this.onLabelEvent(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities((e) => this.onLabelEvent(e.scheme)));
        this._register(this.customEditorLabelService.onDidChange(() => this.updateLabel()));
        this._register(this.filesConfigurationService.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
    }
    onLabelEvent(scheme) {
        if (scheme === this.resource.scheme) {
            this.updateLabel();
        }
    }
    updateLabel() {
        // Clear any cached labels from before
        this._editorName = undefined;
        this._shortDescription = undefined;
        this._mediumDescription = undefined;
        this._longDescription = undefined;
        this._shortTitle = undefined;
        this._mediumTitle = undefined;
        this._longTitle = undefined;
        // Trigger recompute of label
        this._onDidChangeLabel.fire();
    }
    get typeId() {
        return CustomEditorInput_1.typeId;
    }
    get editorId() {
        return this.viewType;
    }
    get capabilities() {
        let capabilities = 0 /* EditorInputCapabilities.None */;
        capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        if (!this.customEditorService.getCustomEditorCapabilities(this.viewType)
            ?.supportsMultipleEditorsPerDocument) {
            capabilities |= 8 /* EditorInputCapabilities.Singleton */;
        }
        if (this._modelRef) {
            if (this._modelRef.object.isReadonly()) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            if (this.filesConfigurationService.isReadonly(this.resource)) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        if (this.resource.scheme === Schemas.untitled) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        return capabilities;
    }
    getName() {
        if (typeof this._editorName !== 'string') {
            this._editorName =
                this.customEditorLabelService.getName(this.resource) ??
                    basename(this.labelService.getUriLabel(this.resource));
        }
        return this._editorName;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.shortDescription;
            case 2 /* Verbosity.LONG */:
                return this.longDescription;
            case 1 /* Verbosity.MEDIUM */:
            default:
                return this.mediumDescription;
        }
    }
    get shortDescription() {
        if (typeof this._shortDescription !== 'string') {
            this._shortDescription = this.labelService.getUriBasenameLabel(dirname(this.resource));
        }
        return this._shortDescription;
    }
    get mediumDescription() {
        if (typeof this._mediumDescription !== 'string') {
            this._mediumDescription = this.labelService.getUriLabel(dirname(this.resource), {
                relative: true,
            });
        }
        return this._mediumDescription;
    }
    get longDescription() {
        if (typeof this._longDescription !== 'string') {
            this._longDescription = this.labelService.getUriLabel(dirname(this.resource));
        }
        return this._longDescription;
    }
    get shortTitle() {
        if (typeof this._shortTitle !== 'string') {
            this._shortTitle = this.getName();
        }
        return this._shortTitle;
    }
    get mediumTitle() {
        if (typeof this._mediumTitle !== 'string') {
            this._mediumTitle = this.labelService.getUriLabel(this.resource, { relative: true });
        }
        return this._mediumTitle;
    }
    get longTitle() {
        if (typeof this._longTitle !== 'string') {
            this._longTitle = this.labelService.getUriLabel(this.resource);
        }
        return this._longTitle;
    }
    getTitle(verbosity) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.shortTitle;
            case 2 /* Verbosity.LONG */:
                return this.longTitle;
            default:
            case 1 /* Verbosity.MEDIUM */:
                return this.mediumTitle;
        }
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return (this === other ||
            (other instanceof CustomEditorInput_1 &&
                this.viewType === other.viewType &&
                isEqual(this.resource, other.resource)));
    }
    copy() {
        return CustomEditorInput_1.create(this.instantiationService, this.resource, this.viewType, this.group, this.webview.options);
    }
    isReadonly() {
        if (!this._modelRef) {
            return this.filesConfigurationService.isReadonly(this.resource);
        }
        return this._modelRef.object.isReadonly();
    }
    isDirty() {
        if (!this._modelRef) {
            return !!this._defaultDirtyState;
        }
        return this._modelRef.object.isDirty();
    }
    async save(groupId, options) {
        if (!this._modelRef) {
            return undefined;
        }
        const target = await this._modelRef.object.saveCustomEditor(options);
        if (!target) {
            return undefined; // save cancelled
        }
        // Different URIs == untyped input returned to allow resolver to possibly resolve to a different editor type
        if (!isEqual(target, this.resource)) {
            return { resource: target };
        }
        return this;
    }
    async saveAs(groupId, options) {
        if (!this._modelRef) {
            return undefined;
        }
        const dialogPath = this._editorResource;
        const target = await this.fileDialogService.pickFileToSave(dialogPath, options?.availableFileSystems);
        if (!target) {
            return undefined; // save cancelled
        }
        if (!(await this._modelRef.object.saveCustomEditorAs(this._editorResource, target, options))) {
            return undefined;
        }
        return (await this.rename(groupId, target))?.editor;
    }
    async revert(group, options) {
        if (this._modelRef) {
            return this._modelRef.object.revert(options);
        }
        this._defaultDirtyState = false;
        this._onDidChangeDirty.fire();
    }
    async resolve() {
        await super.resolve();
        if (this.isDisposed()) {
            return null;
        }
        if (!this._modelRef) {
            const oldCapabilities = this.capabilities;
            this._modelRef = this._register(assertIsDefined(await this.customEditorService.models.tryRetain(this.resource, this.viewType)));
            this._register(this._modelRef.object.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
            this._register(this._modelRef.object.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
            // If we're loading untitled file data we should ensure it's dirty
            if (this._untitledDocumentData) {
                this._defaultDirtyState = true;
            }
            if (this.isDirty()) {
                this._onDidChangeDirty.fire();
            }
            if (this.capabilities !== oldCapabilities) {
                this._onDidChangeCapabilities.fire();
            }
        }
        return null;
    }
    async rename(group, newResource) {
        // We return an untyped editor input which can then be resolved in the editor service
        return { editor: { resource: newResource } };
    }
    undo() {
        assertIsDefined(this._modelRef);
        return this.undoRedoService.undo(this.resource);
    }
    redo() {
        assertIsDefined(this._modelRef);
        return this.undoRedoService.redo(this.resource);
    }
    onMove(handler) {
        // TODO: Move this to the service
        this._moveHandler = handler;
    }
    transfer(other) {
        if (!super.transfer(other)) {
            return;
        }
        other._moveHandler = this._moveHandler;
        this._moveHandler = undefined;
        return other;
    }
    get backupId() {
        if (this._modelRef) {
            return this._modelRef.object.backupId;
        }
        return this._backupId;
    }
    get untitledDocumentData() {
        return this._untitledDocumentData;
    }
    toUntyped() {
        return {
            resource: this.resource,
            options: {
                override: this.viewType,
            },
        };
    }
    claim(claimant, targetWindow, scopedContextKeyService) {
        if (this.doCanMove(targetWindow.vscodeWindowId) !== true) {
            throw createEditorOpenError(localize('editorUnsupportedInWindow', 'Unable to open the editor in this window, it contains modifications that can only be saved in the original window.'), [
                toAction({
                    id: 'openInOriginalWindow',
                    label: localize('reopenInOriginalWindow', 'Open in Original Window'),
                    run: async () => {
                        const originalPart = this.editorGroupsService.getPart(this.layoutService.getContainer(getWindow(this.webview.container).window));
                        const currentPart = this.editorGroupsService.getPart(this.layoutService.getContainer(targetWindow.window));
                        currentPart.activeGroup.moveEditor(this, originalPart.activeGroup);
                    },
                }),
            ], { forceMessage: true });
        }
        return super.claim(claimant, targetWindow, scopedContextKeyService);
    }
    canMove(sourceGroup, targetGroup) {
        const resolvedTargetGroup = this.editorGroupsService.getGroup(targetGroup);
        if (resolvedTargetGroup) {
            const canMove = this.doCanMove(resolvedTargetGroup.windowId);
            if (typeof canMove === 'string') {
                return canMove;
            }
        }
        return super.canMove(sourceGroup, targetGroup);
    }
    doCanMove(targetWindowId) {
        if (this.isModified() && this._modelRef?.object.canHotExit === false) {
            const sourceWindowId = getWindow(this.webview.container).vscodeWindowId;
            if (sourceWindowId !== targetWindowId) {
                // The custom editor is modified, not backed by a file and without a backup.
                // We have to assume that the modified state is enclosed into the webview
                // managed by an extension. As such, we cannot just move the webview
                // into another window because that means, we potentally loose the modified
                // state and thus trigger data loss.
                return localize('editorCannotMove', "Unable to move '{0}': The editor contains changes that can only be saved in its current window.", this.getName());
            }
        }
        return true;
    }
};
CustomEditorInput = CustomEditorInput_1 = __decorate([
    __param(3, IWebviewWorkbenchService),
    __param(4, IInstantiationService),
    __param(5, ILabelService),
    __param(6, ICustomEditorService),
    __param(7, IFileDialogService),
    __param(8, IUndoRedoService),
    __param(9, IFileService),
    __param(10, IFilesConfigurationService),
    __param(11, IEditorGroupsService),
    __param(12, IWorkbenchLayoutService),
    __param(13, ICustomEditorLabelService)
], CustomEditorInput);
export { CustomEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2N1c3RvbUVkaXRvci9icm93c2VyL2N1c3RvbUVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFRTixxQkFBcUIsR0FDckIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUs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