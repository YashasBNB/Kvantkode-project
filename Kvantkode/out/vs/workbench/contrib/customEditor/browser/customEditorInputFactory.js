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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ySW5wdXRGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvYnJvd3Nlci9jdXN0b21FZGl0b3JJbnB1dEZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNsRixPQUFPLEVBQ04sZUFBZSxHQUtmLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUVOLDRCQUE0QixFQUM1QixxQkFBcUIsRUFDckIsaUNBQWlDLEVBR2pDLDRCQUE0QixHQUM1QixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBS2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3JHLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSxrRUFBa0UsQ0FBQTtBQWlDbEUsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIs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