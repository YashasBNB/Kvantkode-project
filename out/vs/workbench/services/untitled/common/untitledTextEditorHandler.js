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
import { Schemas } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextEditorService } from '../../textfile/common/textEditorService.js';
import { isEqual, toLocalResource } from '../../../../base/common/resources.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IPathService } from '../../path/common/pathService.js';
import { UntitledTextEditorInput } from './untitledTextEditorInput.js';
import { NO_TYPE_ID } from '../../workingCopy/common/workingCopy.js';
import { IWorkingCopyEditorService, } from '../../workingCopy/common/workingCopyEditorService.js';
import { IUntitledTextEditorService } from './untitledTextEditorService.js';
let UntitledTextEditorInputSerializer = class UntitledTextEditorInputSerializer {
    constructor(filesConfigurationService, environmentService, pathService) {
        this.filesConfigurationService = filesConfigurationService;
        this.environmentService = environmentService;
        this.pathService = pathService;
    }
    canSerialize(editorInput) {
        return this.filesConfigurationService.isHotExitEnabled && !editorInput.isDisposed();
    }
    serialize(editorInput) {
        if (!this.canSerialize(editorInput)) {
            return undefined;
        }
        const untitledTextEditorInput = editorInput;
        let resource = untitledTextEditorInput.resource;
        if (untitledTextEditorInput.hasAssociatedFilePath) {
            resource = toLocalResource(resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme); // untitled with associated file path use the local schema
        }
        // Language: only remember language if it is either specific (not text)
        // or if the language was explicitly set by the user. We want to preserve
        // this information across restarts and not set the language unless
        // this is the case.
        let languageId;
        const languageIdCandidate = untitledTextEditorInput.getLanguageId();
        if (languageIdCandidate !== PLAINTEXT_LANGUAGE_ID) {
            languageId = languageIdCandidate;
        }
        else if (untitledTextEditorInput.hasLanguageSetExplicitly) {
            languageId = languageIdCandidate;
        }
        const serialized = {
            resourceJSON: resource.toJSON(),
            modeId: languageId,
            encoding: untitledTextEditorInput.getEncoding(),
        };
        return JSON.stringify(serialized);
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction((accessor) => {
            const deserialized = JSON.parse(serializedEditorInput);
            const resource = URI.revive(deserialized.resourceJSON);
            const languageId = deserialized.modeId;
            const encoding = deserialized.encoding;
            return accessor
                .get(ITextEditorService)
                .createTextEditor({
                resource,
                languageId,
                encoding,
                forceUntitled: true,
            });
        });
    }
};
UntitledTextEditorInputSerializer = __decorate([
    __param(0, IFilesConfigurationService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IPathService)
], UntitledTextEditorInputSerializer);
export { UntitledTextEditorInputSerializer };
let UntitledTextEditorWorkingCopyEditorHandler = class UntitledTextEditorWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.untitledTextEditorWorkingCopyEditorHandler'; }
    constructor(workingCopyEditorService, environmentService, pathService, textEditorService, untitledTextEditorService) {
        super();
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.textEditorService = textEditorService;
        this.untitledTextEditorService = untitledTextEditorService;
        this._register(workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return workingCopy.resource.scheme === Schemas.untitled && workingCopy.typeId === NO_TYPE_ID;
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return (editor instanceof UntitledTextEditorInput && isEqual(workingCopy.resource, editor.resource));
    }
    createEditor(workingCopy) {
        let editorInputResource;
        // If the untitled has an associated resource,
        // ensure to restore the local resource it had
        if (this.untitledTextEditorService.isUntitledWithAssociatedResource(workingCopy.resource)) {
            editorInputResource = toLocalResource(workingCopy.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
        }
        else {
            editorInputResource = workingCopy.resource;
        }
        return this.textEditorService.createTextEditor({
            resource: editorInputResource,
            forceUntitled: true,
        });
    }
};
UntitledTextEditorWorkingCopyEditorHandler = __decorate([
    __param(0, IWorkingCopyEditorService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IPathService),
    __param(3, ITextEditorService),
    __param(4, IUntitledTextEditorService)
], UntitledTextEditorWorkingCopyEditorHandler);
export { UntitledTextEditorWorkingCopyEditorHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9ySGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VudGl0bGVkL2NvbW1vbi91bnRpdGxlZFRleHRFZGl0b3JIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUduRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRTVGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV0RSxPQUFPLEVBQTBCLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVGLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQVFwRSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFpQztJQUM3QyxZQUVrQix5QkFB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