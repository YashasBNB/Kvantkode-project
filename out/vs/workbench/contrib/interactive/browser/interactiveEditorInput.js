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
var InteractiveEditorInput_1;
import { Event } from '../../../../base/common/event.js';
import * as paths from '../../../../base/common/path.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IInteractiveDocumentService } from './interactiveDocumentService.js';
import { IInteractiveHistoryService } from './interactiveHistoryService.js';
import { NotebookSetting, } from '../../notebook/common/notebookCommon.js';
import { NotebookEditorInput, } from '../../notebook/common/notebookEditorInput.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
let InteractiveEditorInput = class InteractiveEditorInput extends EditorInput {
    static { InteractiveEditorInput_1 = this; }
    static create(instantiationService, resource, inputResource, title, language) {
        return instantiationService.createInstance(InteractiveEditorInput_1, resource, inputResource, title, language);
    }
    static { this.windowNames = {}; }
    static setName(notebookUri, title) {
        if (title) {
            this.windowNames[notebookUri.path] = title;
        }
    }
    static { this.ID = 'workbench.input.interactive'; }
    get editorId() {
        return 'interactive';
    }
    get typeId() {
        return InteractiveEditorInput_1.ID;
    }
    get language() {
        return this._inputModelRef?.object.textEditorModel.getLanguageId() ?? this._initLanguage;
    }
    get notebookEditorInput() {
        return this._notebookEditorInput;
    }
    get editorInputs() {
        return [this._notebookEditorInput];
    }
    get resource() {
        return this._resource;
    }
    get inputResource() {
        return this._inputResource;
    }
    get primary() {
        return this._notebookEditorInput;
    }
    constructor(resource, inputResource, title, languageId, instantiationService, textModelService, interactiveDocumentService, historyService, _notebookService, _fileDialogService, configurationService) {
        const input = NotebookEditorInput.getOrCreate(instantiationService, resource, undefined, 'interactive', {});
        super();
        this._notebookService = _notebookService;
        this._fileDialogService = _fileDialogService;
        this.isScratchpad =
            configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true;
        this._notebookEditorInput = input;
        this._register(this._notebookEditorInput);
        this.name =
            title ??
                InteractiveEditorInput_1.windowNames[resource.path] ??
                paths.basename(resource.path, paths.extname(resource.path));
        this._initLanguage = languageId;
        this._resource = resource;
        this._inputResource = inputResource;
        this._inputResolver = null;
        this._editorModelReference = null;
        this._inputModelRef = null;
        this._textModelService = textModelService;
        this._interactiveDocumentService = interactiveDocumentService;
        this._historyService = historyService;
        this._registerListeners();
    }
    _registerListeners() {
        const oncePrimaryDisposed = Event.once(this.primary.onWillDispose);
        this._register(oncePrimaryDisposed(() => {
            if (!this.isDisposed()) {
                this.dispose();
            }
        }));
        // Re-emit some events from the primary side to the outside
        this._register(this.primary.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        this._register(this.primary.onDidChangeLabel(() => this._onDidChangeLabel.fire()));
        // Re-emit some events from both sides to the outside
        this._register(this.primary.onDidChangeCapabilities(() => this._onDidChangeCapabilities.fire()));
    }
    get capabilities() {
        const scratchPad = this.isScratchpad ? 512 /* EditorInputCapabilities.Scratchpad */ : 0;
        return 4 /* EditorInputCapabilities.Untitled */ | 2 /* EditorInputCapabilities.Readonly */ | scratchPad;
    }
    async _resolveEditorModel() {
        if (!this._editorModelReference) {
            this._editorModelReference = await this._notebookEditorInput.resolve();
        }
        return this._editorModelReference;
    }
    async resolve() {
        if (this._editorModelReference) {
            return this._editorModelReference;
        }
        if (this._inputResolver) {
            return this._inputResolver;
        }
        this._inputResolver = this._resolveEditorModel();
        return this._inputResolver;
    }
    async resolveInput(language) {
        if (this._inputModelRef) {
            return this._inputModelRef.object.textEditorModel;
        }
        const resolvedLanguage = language ?? this._initLanguage ?? PLAINTEXT_LANGUAGE_ID;
        this._interactiveDocumentService.willCreateInteractiveDocument(this.resource, this.inputResource, resolvedLanguage);
        this._inputModelRef = await this._textModelService.createModelReference(this.inputResource);
        return this._inputModelRef.object.textEditorModel;
    }
    async save(group, options) {
        if (this._editorModelReference) {
            if (this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                return this.saveAs(group, options);
            }
            else {
                await this._editorModelReference.save(options);
            }
            return this;
        }
        return undefined;
    }
    async saveAs(group, options) {
        if (!this._editorModelReference) {
            return undefined;
        }
        const provider = this._notebookService.getContributedNotebookType('interactive');
        if (!provider) {
            return undefined;
        }
        const filename = this.getName() + '.ipynb';
        const pathCandidate = joinPath(await this._fileDialogService.defaultFilePath(), filename);
        const target = await this._fileDialogService.pickFileToSave(pathCandidate, options?.availableFileSystems);
        if (!target) {
            return undefined; // save cancelled
        }
        const saved = await this._editorModelReference.saveAs(target);
        if (saved && 'resource' in saved && saved.resource) {
            this._notebookService.getNotebookTextModel(saved.resource)?.dispose();
        }
        return saved;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof InteractiveEditorInput_1) {
            return (isEqual(this.resource, otherInput.resource) &&
                isEqual(this.inputResource, otherInput.inputResource));
        }
        return false;
    }
    getName() {
        return this.name;
    }
    isDirty() {
        if (this.isScratchpad) {
            return false;
        }
        return this._editorModelReference?.isDirty() ?? false;
    }
    isModified() {
        return this._editorModelReference?.isModified() ?? false;
    }
    async revert(_group, options) {
        if (this._editorModelReference && this._editorModelReference.isDirty()) {
            await this._editorModelReference.revert(options);
        }
    }
    dispose() {
        // we support closing the interactive window without prompt, so the editor model should not be dirty
        this._editorModelReference?.revert({ soft: true });
        this._notebookEditorInput?.dispose();
        this._editorModelReference?.dispose();
        this._editorModelReference = null;
        this._interactiveDocumentService.willRemoveInteractiveDocument(this.resource, this.inputResource);
        this._inputModelRef?.dispose();
        this._inputModelRef = null;
        super.dispose();
    }
    get historyService() {
        return this._historyService;
    }
};
InteractiveEditorInput = InteractiveEditorInput_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, ITextModelService),
    __param(6, IInteractiveDocumentService),
    __param(7, IInteractiveHistoryService),
    __param(8, INotebookService),
    __param(9, IFileDialogService),
    __param(10, IConfigurationService)
], InteractiveEditorInput);
export { InteractiveEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ludGVyYWN0aXZlL2Jyb3dzZXIvaW50ZXJhY3RpdmVFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sS0FBSyxLQUFLLE1BQU0saUNBQWlDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFRbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNFLE9BQU8sRUFFTixlQUFlLEdBQ2YsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFcEUsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIs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