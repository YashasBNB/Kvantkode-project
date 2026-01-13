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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZWRpdG9ycy9maWxlRWRpdG9ySGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUd0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHakUsT0FBTyxFQUVOLFVBQVUsR0FDVixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSxxRUFBcUUsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFXNUUsTUFBTSxPQUFPLHlCQUF5QjtJQUNyQyxZQUFZLENBQUMsV0FBd0I7UUFDcEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsU0FBUyxDQUFDLFdBQXdCO1FBQ2pDLE1BQU0sZUFBZSxHQUFHLFdBQThCLENBQUE7UUFDdEQsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQTtRQUN6QyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQTtRQUMzRCxNQUFNLHlCQUF5QixHQUErQjtZQUM3RCxZQUFZLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMvQixxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNB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