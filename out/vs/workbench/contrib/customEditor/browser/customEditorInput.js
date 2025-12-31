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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvYnJvd3Nlci9jdXN0b21FZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBUU4scUJBQXFCLEdBQ3JCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDdkcsT0FBTyxFQUFzQixvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BGLE9BQU8sRUFBbUIsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkYsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixnQ0FBZ0MsR0FDaEMsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQU9wRyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLGdDQUFnQzs7SUFDdEUsTUFBTSxDQUFDLE1BQU0sQ0FDWixvQkFBMkMsRUFDM0MsUUFBYSxFQUNiLFFBQWdCLEVBQ2hCLEtBQWtDLEVBQ2xDLE9BQXlFO1FBRXpFLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDdkQscUVBQXFFO1lBQ3JFLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbEYsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUM3RixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO2dCQUNsRSxnQkFBZ0IsRUFBRSxRQUFRO2dCQUMxQixLQUFLLEVBQUUsU0FBUztnQkFDaEIsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUU7Z0JBQ2xELGNBQWMsRUFBRSxFQUFFO2dCQUNsQixTQUFTLEVBQUUsU0FBUzthQUNwQixDQUFDLENBQUE7WUFDRixNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2hELG1CQUFpQixFQUNqQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFDdEIsT0FBTyxFQUNQLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FDakYsQ0FBQTtZQUNELElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekIsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO2FBRStCLFdBQU0sR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBb0M7SUFVMUUsSUFBYSxRQUFRO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBSUQsWUFDQyxJQUErQixFQUMvQixPQUF3QixFQUN4QixPQUtDLEVBQ3lCLHVCQUFpRCxFQUNwRCxvQkFBNEQsRUFDcEUsWUFBNEMsRUFDckMsbUJBQTBELEVBQzVELGlCQUFzRCxFQUN4RCxlQUFrRCxFQUN0RCxXQUEwQyxFQUV4RCx5QkFBc0UsRUFDaEQsbUJBQTBELEVBQ3ZELGFBQXVELEVBQ3JELHdCQUFvRTtRQUUvRixLQUFLLENBQ0osRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQ2hFLE9BQU8sRUFDUCx1QkFBdUIsQ0FDdkIsQ0FBQTtRQWhCdUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNwQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQzNDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDdkMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ3JDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBRXZDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDL0Isd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN0QyxrQkFBYSxHQUFiLGFBQWEsQ0FBeUI7UUFDcEMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQThGeEYsZ0JBQVcsR0FBdUIsU0FBUyxDQUFBO1FBdUIzQyxzQkFBaUIsR0FBdUIsU0FBUyxDQUFBO1FBU2pELHVCQUFrQixHQUF1QixTQUFTLENBQUE7UUFXbEQscUJBQWdCLEdBQXVCLFNBQVMsQ0FBQTtRQVNoRCxnQkFBVyxHQUF1QixTQUFTLENBQUE7UUFTM0MsaUJBQVksR0FBdUIsU0FBUyxDQUFBO1FBUzVDLGVBQVUsR0FBdUIsU0FBUyxDQUFBO1FBN0pqRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDcEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUNqQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFBO1FBRXpELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2pFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUMzQixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQUMseUNBQXlDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNoRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDM0IsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMseUJBQXlCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQ3ZELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsQ0FDcEMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxNQUFjO1FBQ2xDLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVztRQUNsQixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1FBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUE7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFFM0IsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBb0IsTUFBTTtRQUN6QixPQUFPLG1CQUFpQixDQUFDLE1BQU0sQ0FBQTtJQUNoQyxDQUFDO0lBRUQsSUFBb0IsUUFBUTtRQUMzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQW9CLFlBQVk7UUFDL0IsSUFBSSxZQUFZLHVDQUErQixDQUFBO1FBRS9DLFlBQVksdURBQTZDLENBQUE7UUFFekQsSUFDQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ25FLEVBQUUsa0NBQWtDLEVBQ3BDLENBQUM7WUFDRixZQUFZLDZDQUFxQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ3hDLFlBQVksNENBQW9DLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxZQUFZLDRDQUFvQyxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0MsWUFBWSw0Q0FBb0MsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUdRLE9BQU87UUFDZixJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsV0FBVztnQkFDZixJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBQ3BELFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFUSxjQUFjLENBQUMsU0FBUywyQkFBbUI7UUFDbkQsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQjtnQkFDQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtZQUM3QjtnQkFDQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7WUFDNUIsOEJBQXNCO1lBQ3RCO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBR0QsSUFBWSxnQkFBZ0I7UUFDM0IsSUFBSSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDdkYsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFHRCxJQUFZLGlCQUFpQjtRQUM1QixJQUFJLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMvRSxRQUFRLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtJQUMvQixDQUFDO0lBR0QsSUFBWSxlQUFlO1FBQzFCLElBQUksT0FBTyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUM5RSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUdELElBQVksVUFBVTtRQUNyQixJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFHRCxJQUFZLFdBQVc7UUFDdEIsSUFBSSxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDckYsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBR0QsSUFBWSxTQUFTO1FBQ3BCLElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUVRLFFBQVEsQ0FBQyxTQUFxQjtRQUN0QyxRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ25CO2dCQUNDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtZQUN2QjtnQkFDQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7WUFDdEIsUUFBUTtZQUNSO2dCQUNDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVlLE9BQU8sQ0FBQyxLQUF3QztRQUMvRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLENBQ04sSUFBSSxLQUFLLEtBQUs7WUFDZCxDQUFDLEtBQUssWUFBWSxtQkFBaUI7Z0JBQ2xDLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVE7Z0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUN4QyxDQUFBO0lBQ0YsQ0FBQztJQUVlLElBQUk7UUFDbkIsT0FBTyxtQkFBaUIsQ0FBQyxNQUFNLENBQzlCLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxLQUFLLEVBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQ3BCLENBQUE7SUFDRixDQUFDO0lBRWUsVUFBVTtRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdkMsQ0FBQztJQUVlLEtBQUssQ0FBQyxJQUFJLENBQ3pCLE9BQXdCLEVBQ3hCLE9BQXNCO1FBRXRCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUEsQ0FBQyxpQkFBaUI7UUFDbkMsQ0FBQztRQUVELDRHQUE0RztRQUM1RyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxLQUFLLENBQUMsTUFBTSxDQUMzQixPQUF3QixFQUN4QixPQUFzQjtRQUV0QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFBO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FDekQsVUFBVSxFQUNWLE9BQU8sRUFBRSxvQkFBb0IsQ0FDN0IsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sU0FBUyxDQUFBLENBQUMsaUJBQWlCO1FBQ25DLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5RixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUE7SUFDcEQsQ0FBQztJQUVlLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBc0IsRUFBRSxPQUF3QjtRQUM1RSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUMvQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVlLEtBQUssQ0FBQyxPQUFPO1FBQzVCLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXJCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyQixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1lBQ3pDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUIsZUFBZSxDQUNkLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQzdFLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMzRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUNyRixDQUFBO1lBQ0Qsa0VBQWtFO1lBQ2xFLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7WUFDL0IsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUM5QixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxLQUFLLENBQUMsTUFBTSxDQUMzQixLQUFzQixFQUN0QixXQUFnQjtRQUVoQixxRkFBcUY7UUFDckYsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFTSxJQUFJO1FBQ1YsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRU0sSUFBSTtRQUNWLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDL0IsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUlNLE1BQU0sQ0FBQyxPQUFtQztRQUNoRCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUE7SUFDNUIsQ0FBQztJQUVrQixRQUFRLENBQUMsS0FBd0I7UUFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFNO1FBQ1AsQ0FBQztRQUVELEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQTtRQUM3QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFXLFFBQVE7UUFDbEIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7UUFDdEMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsSUFBVyxvQkFBb0I7UUFDOUIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUE7SUFDbEMsQ0FBQztJQUVlLFNBQVM7UUFDeEIsT0FBTztZQUNOLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixPQUFPLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2FBQ3ZCO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFZSxLQUFLLENBQ3BCLFFBQWlCLEVBQ2pCLFlBQXdCLEVBQ3hCLHVCQUF1RDtRQUV2RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzFELE1BQU0scUJBQXFCLENBQzFCLFFBQVEsQ0FDUCwyQkFBMkIsRUFDM0Isb0hBQW9ILENBQ3BILEVBQ0Q7Z0JBQ0MsUUFBUSxDQUFDO29CQUNSLEVBQUUsRUFBRSxzQkFBc0I7b0JBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUM7b0JBQ3BFLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDZixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUNwRCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDekUsQ0FBQTt3QkFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUNuRCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQ3BELENBQUE7d0JBQ0QsV0FBVyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQTtvQkFDbkUsQ0FBQztpQkFDRCxDQUFDO2FBQ0YsRUFDRCxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FDdEIsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFZSxPQUFPLENBQ3RCLFdBQTRCLEVBQzVCLFdBQTRCO1FBRTVCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMxRSxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM1RCxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLE9BQU8sQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRU8sU0FBUyxDQUFDLGNBQXNCO1FBQ3ZDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN0RSxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxjQUFjLENBQUE7WUFDdkUsSUFBSSxjQUFjLEtBQUssY0FBYyxFQUFFLENBQUM7Z0JBQ3ZDLDRFQUE0RTtnQkFDNUUseUVBQXlFO2dCQUN6RSxvRUFBb0U7Z0JBQ3BFLDJFQUEyRTtnQkFDM0Usb0NBQW9DO2dCQUVwQyxPQUFPLFFBQVEsQ0FDZCxrQkFBa0IsRUFDbEIsaUdBQWlHLEVBQ2pHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FDZCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7O0FBaGZXLGlCQUFpQjtJQXlEM0IsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxZQUFZLENBQUE7SUFDWixZQUFBLDBCQUEwQixDQUFBO0lBRTFCLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSx1QkFBdUIsQ0FBQTtJQUN2QixZQUFBLHlCQUF5QixDQUFBO0dBcEVmLGlCQUFpQixDQWlmN0IifQ==