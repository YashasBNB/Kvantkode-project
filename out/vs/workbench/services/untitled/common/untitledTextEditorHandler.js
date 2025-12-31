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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9ySGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91bnRpdGxlZC9jb21tb24vdW50aXRsZWRUZXh0RWRpdG9ySGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFHbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUU1RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFdEUsT0FBTyxFQUEwQixVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RixPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFRcEUsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBaUM7SUFDN0MsWUFFa0IseUJBQXFELEVBQ3ZCLGtCQUFnRCxFQUNoRSxX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