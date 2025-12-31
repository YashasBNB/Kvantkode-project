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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CustomEditorInput } from './customEditorInput.js';
import { ICustomEditorService } from '../common/customEditor.js';
import { NotebookEditorInput } from '../../notebook/common/notebookEditorInput.js';
import { IWebviewService, } from '../../webview/browser/webview.js';
import { restoreWebviewContentOptions, restoreWebviewOptions, reviveWebviewExtensionDescription, WebviewEditorInputSerializer, } from '../../webviewPanel/browser/webviewEditorInputSerializer.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyEditorService, } from '../../../services/workingCopy/common/workingCopyEditorService.js';
let CustomEditorInputSerializer = class CustomEditorInputSerializer extends WebviewEditorInputSerializer {
    static { this.ID = CustomEditorInput.typeId; }
    constructor(webviewWorkbenchService, _instantiationService, _webviewService) {
        super(webviewWorkbenchService);
        this._instantiationService = _instantiationService;
        this._webviewService = _webviewService;
    }
    serialize(input) {
        const dirty = input.isDirty();
        const data = {
            ...this.toJson(input),
            editorResource: input.resource.toJSON(),
            dirty,
            backupId: dirty ? input.backupId : undefined,
        };
        try {
            return JSON.stringify(data);
        }
        catch {
            return undefined;
        }
    }
    fromJson(data) {
        return {
            ...super.fromJson(data),
            editorResource: URI.from(data.editorResource),
            dirty: data.dirty,
        };
    }
    deserialize(_instantiationService, serializedEditorInput) {
        const data = this.fromJson(JSON.parse(serializedEditorInput));
        const webview = reviveWebview(this._webviewService, data);
        const customInput = this._instantiationService.createInstance(CustomEditorInput, { resource: data.editorResource, viewType: data.viewType }, webview, { startsDirty: data.dirty, backupId: data.backupId });
        if (typeof data.group === 'number') {
            customInput.updateGroup(data.group);
        }
        return customInput;
    }
};
CustomEditorInputSerializer = __decorate([
    __param(0, IWebviewWorkbenchService),
    __param(1, IInstantiationService),
    __param(2, IWebviewService)
], CustomEditorInputSerializer);
export { CustomEditorInputSerializer };
function reviveWebview(webviewService, data) {
    const webview = webviewService.createWebviewOverlay({
        providedViewType: data.viewType,
        origin: data.origin,
        title: undefined,
        options: {
            purpose: "customEditor" /* WebviewContentPurpose.CustomEditor */,
            enableFindWidget: data.webviewOptions.enableFindWidget,
            retainContextWhenHidden: data.webviewOptions.retainContextWhenHidden,
        },
        contentOptions: data.contentOptions,
        extension: data.extension,
    });
    webview.state = data.state;
    return webview;
}
let ComplexCustomWorkingCopyEditorHandler = class ComplexCustomWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.complexCustomWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _workingCopyBackupService, _webviewService, _customEditorService) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyBackupService = _workingCopyBackupService;
        this._webviewService = _webviewService;
        this._register(_workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return workingCopy.resource.scheme === Schemas.vscodeCustomEditor;
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        if (workingCopy.resource.authority === 'jupyter-notebook-ipynb' &&
            editor instanceof NotebookEditorInput) {
            try {
                const data = JSON.parse(workingCopy.resource.query);
                const workingCopyResource = URI.from(data);
                return isEqual(workingCopyResource, editor.resource);
            }
            catch {
                return false;
            }
        }
        if (!(editor instanceof CustomEditorInput)) {
            return false;
        }
        if (workingCopy.resource.authority !==
            editor.viewType.replace(/[^a-z0-9\-_]/gi, '-').toLowerCase()) {
            return false;
        }
        // The working copy stores the uri of the original resource as its query param
        try {
            const data = JSON.parse(workingCopy.resource.query);
            const workingCopyResource = URI.from(data);
            return isEqual(workingCopyResource, editor.resource);
        }
        catch {
            return false;
        }
    }
    async createEditor(workingCopy) {
        const backup = await this._workingCopyBackupService.resolve(workingCopy);
        if (!backup?.meta) {
            throw new Error(`No backup found for custom editor: ${workingCopy.resource}`);
        }
        const backupData = backup.meta;
        const extension = reviveWebviewExtensionDescription(backupData.extension?.id, backupData.extension?.location);
        const webview = reviveWebview(this._webviewService, {
            viewType: backupData.viewType,
            origin: backupData.webview.origin,
            webviewOptions: restoreWebviewOptions(backupData.webview.options),
            contentOptions: restoreWebviewContentOptions(backupData.webview.options),
            state: backupData.webview.state,
            extension,
        });
        const editor = this._instantiationService.createInstance(CustomEditorInput, { resource: URI.revive(backupData.editorResource), viewType: backupData.viewType }, webview, { backupId: backupData.backupId });
        editor.updateGroup(0);
        return editor;
    }
};
ComplexCustomWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IWorkingCopyBackupService),
    __param(3, IWebviewService),
    __param(4, ICustomEditorService)
], ComplexCustomWorkingCopyEditorHandler);
export { ComplexCustomWorkingCopyEditorHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ySW5wdXRGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2Jyb3dzZXIvY3VzdG9tRWRpdG9ySW5wdXRGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUNOLGVBQWUsR0FLZixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFFTiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLGlDQUFpQyxFQUdqQyw0QkFBNEIsR0FDNUIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUtoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNyRyxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0sa0VBQWtFLENBQUE7QUFpQ2xFLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEs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