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
var NotebookEditorInput_1;
import * as glob from '../../../../base/common/glob.js';
import { isResourceEditorInput, } from '../../../common/editor.js';
import { INotebookService, SimpleNotebookProviderInfo } from './notebookService.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotebookEditorModelResolverService } from './notebookEditorModelResolverService.js';
import { CellUri } from './notebookCommon.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { AbstractResourceEditorInput } from '../../../common/editor/resourceEditorInput.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { localize } from '../../../../nls.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
let NotebookEditorInput = class NotebookEditorInput extends AbstractResourceEditorInput {
    static { NotebookEditorInput_1 = this; }
    static getOrCreate(instantiationService, resource, preferredResource, viewType, options = {}) {
        const editor = instantiationService.createInstance(NotebookEditorInput_1, resource, preferredResource, viewType, options);
        if (preferredResource) {
            editor.setPreferredResource(preferredResource);
        }
        return editor;
    }
    static { this.ID = 'workbench.input.notebook'; }
    constructor(resource, preferredResource, viewType, options, _notebookService, _notebookModelResolverService, _fileDialogService, labelService, fileService, filesConfigurationService, extensionService, editorService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, preferredResource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.viewType = viewType;
        this.options = options;
        this._notebookService = _notebookService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._fileDialogService = _fileDialogService;
        this.editorModelReference = null;
        this._defaultDirtyState = false;
        this._defaultDirtyState = !!options.startDirty;
        // Automatically resolve this input when the "wanted" model comes to life via
        // some other way. This happens only once per input and resolve disposes
        // this listener
        this._sideLoadedListener = _notebookService.onDidAddNotebookDocument((e) => {
            if (e.viewType === this.viewType && e.uri.toString() === this.resource.toString()) {
                this.resolve().catch(onUnexpectedError);
            }
        });
        this._register(extensionService.onWillStop((e) => {
            if (!e.auto && !this.isDirty()) {
                return;
            }
            const reason = e.auto
                ? localize('vetoAutoExtHostRestart', "An extension provided notebook for '{0}' is still open that would close otherwise.", this.getName())
                : localize('vetoExtHostRestart', "An extension provided notebook for '{0}' could not be saved.", this.getName());
            e.veto((async () => {
                const editors = editorService.findEditors(this);
                if (e.auto) {
                    return true;
                }
                if (editors.length > 0) {
                    const result = await editorService.save(editors[0]);
                    if (result.success) {
                        return false; // Don't Veto
                    }
                }
                return true; // Veto
            })(), reason);
        }));
    }
    dispose() {
        this._sideLoadedListener.dispose();
        this.editorModelReference?.dispose();
        this.editorModelReference = null;
        super.dispose();
    }
    get typeId() {
        return NotebookEditorInput_1.ID;
    }
    get editorId() {
        return this.viewType;
    }
    get capabilities() {
        let capabilities = 0 /* EditorInputCapabilities.None */;
        if (this.resource.scheme === Schemas.untitled) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        if (this.editorModelReference) {
            if (this.editorModelReference.object.isReadonly()) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            if (this.filesConfigurationService.isReadonly(this.resource)) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        if (!(capabilities & 2 /* EditorInputCapabilities.Readonly */)) {
            capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        }
        return capabilities;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        if (!this.hasCapability(4 /* EditorInputCapabilities.Untitled */) ||
            this.editorModelReference?.object.hasAssociatedFilePath()) {
            return super.getDescription(verbosity);
        }
        return undefined; // no description for untitled notebooks without associated file path
    }
    isReadonly() {
        if (!this.editorModelReference) {
            return this.filesConfigurationService.isReadonly(this.resource);
        }
        return this.editorModelReference.object.isReadonly();
    }
    isDirty() {
        if (!this.editorModelReference) {
            return this._defaultDirtyState;
        }
        return this.editorModelReference.object.isDirty();
    }
    isSaving() {
        const model = this.editorModelReference?.object;
        if (!model ||
            !model.isDirty() ||
            model.hasErrorState ||
            this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
            return false; // require the model to be dirty, file-backed and not in an error state
        }
        // if a short auto save is configured, treat this as being saved
        return this.filesConfigurationService.hasShortAutoSaveDelay(this);
    }
    async save(group, options) {
        if (this.editorModelReference) {
            if (this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                return this.saveAs(group, options);
            }
            else {
                await this.editorModelReference.object.save(options);
            }
            return this;
        }
        return undefined;
    }
    async saveAs(group, options) {
        if (!this.editorModelReference) {
            return undefined;
        }
        const provider = this._notebookService.getContributedNotebookType(this.viewType);
        if (!provider) {
            return undefined;
        }
        const pathCandidate = this.hasCapability(4 /* EditorInputCapabilities.Untitled */)
            ? await this._suggestName(provider, this.labelService.getUriBasenameLabel(this.resource))
            : this.editorModelReference.object.resource;
        let target;
        if (this.editorModelReference.object.hasAssociatedFilePath()) {
            target = pathCandidate;
        }
        else {
            target = await this._fileDialogService.pickFileToSave(pathCandidate, options?.availableFileSystems);
            if (!target) {
                return undefined; // save cancelled
            }
        }
        if (!provider.matches(target)) {
            const patterns = provider.selectors
                .map((pattern) => {
                if (typeof pattern === 'string') {
                    return pattern;
                }
                if (glob.isRelativePattern(pattern)) {
                    return `${pattern} (base ${pattern.base})`;
                }
                if (pattern.exclude) {
                    return `${pattern.include} (exclude: ${pattern.exclude})`;
                }
                else {
                    return `${pattern.include}`;
                }
            })
                .join(', ');
            throw new Error(`File name ${target} is not supported by ${provider.providerDisplayName}.\n\nPlease make sure the file name matches following patterns:\n${patterns}`);
        }
        return await this.editorModelReference.object.saveAs(target);
    }
    async _suggestName(provider, suggestedFilename) {
        // guess file extensions
        const firstSelector = provider.selectors[0];
        let selectorStr = firstSelector && typeof firstSelector === 'string' ? firstSelector : undefined;
        if (!selectorStr && firstSelector) {
            const include = firstSelector.include;
            if (typeof include === 'string') {
                selectorStr = include;
            }
        }
        if (selectorStr) {
            const matches = /^\*\.([A-Za-z_-]*)$/.exec(selectorStr);
            if (matches && matches.length > 1) {
                const fileExt = matches[1];
                if (!suggestedFilename.endsWith(fileExt)) {
                    return joinPath(await this._fileDialogService.defaultFilePath(), suggestedFilename + '.' + fileExt);
                }
            }
        }
        return joinPath(await this._fileDialogService.defaultFilePath(), suggestedFilename);
    }
    // called when users rename a notebook document
    async rename(group, target) {
        if (this.editorModelReference) {
            return { editor: { resource: target }, options: { override: this.viewType } };
        }
        return undefined;
    }
    async revert(_group, options) {
        if (this.editorModelReference && this.editorModelReference.object.isDirty()) {
            await this.editorModelReference.object.revert(options);
        }
    }
    async resolve(_options, perf) {
        if (!(await this._notebookService.canResolve(this.viewType))) {
            return null;
        }
        perf?.mark('extensionActivated');
        // we are now loading the notebook and don't need to listen to
        // "other" loading anymore
        this._sideLoadedListener.dispose();
        if (!this.editorModelReference) {
            const scratchpad = this.capabilities & 512 /* EditorInputCapabilities.Scratchpad */ ? true : false;
            const ref = await this._notebookModelResolverService.resolve(this.resource, this.viewType, {
                limits: this.ensureLimits(_options),
                scratchpad,
                viewType: this.editorId,
            });
            if (this.editorModelReference) {
                // Re-entrant, double resolve happened. Dispose the addition references and proceed
                // with the truth.
                ref.dispose();
                return this.editorModelReference.object;
            }
            this.editorModelReference = ref;
            if (this.isDisposed()) {
                this.editorModelReference.dispose();
                this.editorModelReference = null;
                return null;
            }
            this._register(this.editorModelReference.object.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
            this._register(this.editorModelReference.object.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
            this._register(this.editorModelReference.object.onDidRevertUntitled(() => this.dispose()));
            if (this.editorModelReference.object.isDirty()) {
                this._onDidChangeDirty.fire();
            }
        }
        else {
            this.editorModelReference.object.load({ limits: this.ensureLimits(_options) });
        }
        if (this.options._backupId) {
            const info = await this._notebookService.withNotebookDataProvider(this.editorModelReference.object.notebook.viewType);
            if (!(info instanceof SimpleNotebookProviderInfo)) {
                throw new Error('CANNOT open file notebook with this provider');
            }
            const data = await info.serializer.dataToNotebook(VSBuffer.fromString(JSON.stringify({ __webview_backup: this.options._backupId })));
            this.editorModelReference.object.notebook.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: this.editorModelReference.object.notebook.length,
                    cells: data.cells,
                },
            ], true, undefined, () => undefined, undefined, false);
            if (this.options._workingCopy) {
                this.options._backupId = undefined;
                this.options._workingCopy = undefined;
                this.options.startDirty = undefined;
            }
        }
        return this.editorModelReference.object;
    }
    toUntyped() {
        return {
            resource: this.resource,
            options: {
                override: this.viewType,
            },
        };
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof NotebookEditorInput_1) {
            return this.viewType === otherInput.viewType && isEqual(this.resource, otherInput.resource);
        }
        if (isResourceEditorInput(otherInput) && otherInput.resource.scheme === CellUri.scheme) {
            return isEqual(this.resource, CellUri.parse(otherInput.resource)?.notebook);
        }
        return false;
    }
};
NotebookEditorInput = NotebookEditorInput_1 = __decorate([
    __param(4, INotebookService),
    __param(5, INotebookEditorModelResolverService),
    __param(6, IFileDialogService),
    __param(7, ILabelService),
    __param(8, IFileService),
    __param(9, IFilesConfigurationService),
    __param(10, IExtensionService),
    __param(11, IEditorService),
    __param(12, ITextResourceConfigurationService),
    __param(13, ICustomEditorLabelService)
], NotebookEditorInput);
export { NotebookEditorInput };
export function isCompositeNotebookEditorInput(thing) {
    return (!!thing &&
        typeof thing === 'object' &&
        Array.isArray(thing.editorInputs) &&
        thing.editorInputs.every((input) => input instanceof NotebookEditorInput));
}
export function isNotebookEditorInput(thing) {
    return !!thing && typeof thing === 'object' && thing.typeId === NotebookEditorInput.ID;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFTTixxQkFBcUIsR0FDckIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVuRixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTdGLE9BQU8sRUFBZ0IsT0FBTyxFQUFnQyxNQUFNLHFCQUFxQixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUk1RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFB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