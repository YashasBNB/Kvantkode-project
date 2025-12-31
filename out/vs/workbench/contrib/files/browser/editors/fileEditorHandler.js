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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextEditorService } from '../../../../services/textfile/common/textEditorService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { NO_TYPE_ID, } from '../../../../services/workingCopy/common/workingCopy.js';
import { IWorkingCopyEditorService, } from '../../../../services/workingCopy/common/workingCopyEditorService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
export class FileEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        const fileEditorInput = editorInput;
        const resource = fileEditorInput.resource;
        const preferredResource = fileEditorInput.preferredResource;
        const serializedFileEditorInput = {
            resourceJSON: resource.toJSON(),
            preferredResourceJSON: isEqual(resource, preferredResource) ? undefined : preferredResource, // only storing preferredResource if it differs from the resource
            name: fileEditorInput.getPreferredName(),
            description: fileEditorInput.getPreferredDescription(),
            encoding: fileEditorInput.getEncoding(),
            modeId: fileEditorInput.getPreferredLanguageId(), // only using the preferred user associated language here if available to not store redundant data
        };
        return JSON.stringify(serializedFileEditorInput);
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction((accessor) => {
            const serializedFileEditorInput = JSON.parse(serializedEditorInput);
            const resource = URI.revive(serializedFileEditorInput.resourceJSON);
            const preferredResource = URI.revive(serializedFileEditorInput.preferredResourceJSON);
            const name = serializedFileEditorInput.name;
            const description = serializedFileEditorInput.description;
            const encoding = serializedFileEditorInput.encoding;
            const languageId = serializedFileEditorInput.modeId;
            const fileEditorInput = accessor
                .get(ITextEditorService)
                .createTextEditor({
                resource,
                label: name,
                description,
                encoding,
                languageId,
                forceFile: true,
            });
            if (preferredResource) {
                fileEditorInput.setPreferredResource(preferredResource);
            }
            return fileEditorInput;
        });
    }
}
let FileEditorWorkingCopyEditorHandler = class FileEditorWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.fileEditorWorkingCopyEditorHandler'; }
    constructor(workingCopyEditorService, textEditorService, fileService) {
        super();
        this.textEditorService = textEditorService;
        this.fileService = fileService;
        this._register(workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return (workingCopy.typeId === NO_TYPE_ID && this.fileService.canHandleResource(workingCopy.resource));
    }
    handlesSync(workingCopy) {
        return workingCopy.typeId === NO_TYPE_ID && this.fileService.hasProvider(workingCopy.resource);
    }
    isOpen(workingCopy, editor) {
        if (!this.handlesSync(workingCopy)) {
            return false;
        }
        // Naturally it would make sense here to check for `instanceof FileEditorInput`
        // but because some custom editors also leverage text file based working copies
        // we need to do a weaker check by only comparing for the resource
        return isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return this.textEditorService.createTextEditor({
            resource: workingCopy.resource,
            forceFile: true,
        });
    }
};
FileEditorWorkingCopyEditorHandler = __decorate([
    __param(0, IWorkingCopyEditorService),
    __param(1, ITextEditorService),
    __param(2, IFileService)
], FileEditorWorkingCopyEditorHandler);
export { FileEditorWorkingCopyEditorHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvZmlsZUVkaXRvckhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUE7QUFHdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR2pFLE9BQU8sRUFFTixVQUFVLEdBQ1YsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0scUVBQXFFLENBQUE7QUFFNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBVzVFLE1BQU0sT0FBTyx5QkFBeUI7SUFDckMsWUFBWSxDQUFDLFdBQXdCO1FBQ3BDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsQ0FBQyxXQUF3QjtRQUNqQyxNQUFNLGVBQWUsR0FBRyxXQUE4QixDQUFBO1FBQ3RELE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUE7UUFDekMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsaUJBQWlCLENBQUE7UUFDM0QsTUFBTSx5QkFBeUIsR0FBK0I7WUFDN0QsWUFBWSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDL0IscUJBQXFCLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGlCQUFp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