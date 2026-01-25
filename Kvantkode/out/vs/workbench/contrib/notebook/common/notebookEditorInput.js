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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL25vdGVib29rRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQVNOLHFCQUFxQixHQUNyQixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRW5GLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFN0YsT0FBTyxFQUFnQixPQUFPLEVBQWdDLE1BQU0scUJBQXFCLENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSTVELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFN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