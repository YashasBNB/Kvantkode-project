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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { dispose, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { EditOperation } from '../../../editor/common/core/editOperation.js';
import { Range } from '../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
let MainThreadDocumentContentProviders = class MainThreadDocumentContentProviders {
    constructor(extHostContext, _textModelResolverService, _languageService, _modelService, _editorWorkerService) {
        this._textModelResolverService = _textModelResolverService;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._editorWorkerService = _editorWorkerService;
        this._resourceContentProvider = new DisposableMap();
        this._pendingUpdate = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentContentProviders);
    }
    dispose() {
        this._resourceContentProvider.dispose();
        dispose(this._pendingUpdate.values());
    }
    $registerTextContentProvider(handle, scheme) {
        const registration = this._textModelResolverService.registerTextModelContentProvider(scheme, {
            provideTextContent: (uri) => {
                return this._proxy.$provideTextDocumentContent(handle, uri).then((value) => {
                    if (typeof value === 'string') {
                        const firstLineText = value.substr(0, 1 + value.search(/\r?\n/));
                        const languageSelection = this._languageService.createByFilepathOrFirstLine(uri, firstLineText);
                        return this._modelService.createModel(value, languageSelection, uri);
                    }
                    return null;
                });
            },
        });
        this._resourceContentProvider.set(handle, registration);
    }
    $unregisterTextContentProvider(handle) {
        this._resourceContentProvider.deleteAndDispose(handle);
    }
    async $onVirtualDocumentChange(uri, value) {
        const model = this._modelService.getModel(URI.revive(uri));
        if (!model) {
            return;
        }
        // cancel and dispose an existing update
        const pending = this._pendingUpdate.get(model.id);
        pending?.cancel();
        // create and keep update token
        const myToken = new CancellationTokenSource();
        this._pendingUpdate.set(model.id, myToken);
        try {
            const edits = await this._editorWorkerService.computeMoreMinimalEdits(model.uri, [
                { text: value, range: model.getFullModelRange() },
            ]);
            // remove token
            this._pendingUpdate.delete(model.id);
            if (myToken.token.isCancellationRequested) {
                // ignore this
                return;
            }
            if (edits && edits.length > 0) {
                // use the evil-edit as these models show in readonly-editor only
                model.applyEdits(edits.map((edit) => EditOperation.replace(Range.lift(edit.range), edit.text)));
            }
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
MainThreadDocumentContentProviders = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDocumentContentProviders),
    __param(1, ITextModelService),
    __param(2, ILanguageService),
    __param(3, IModelService),
    __param(4, IEditorWorkerService)
], MainThreadDocumentContentProviders);
export { MainThreadDocumentContentProviders };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRG9jdW1lbnRDb250ZW50UHJvdmlkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUd2RSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFrQztJQUs5QyxZQUNDLGNBQStCLEVBQ1oseUJBQTZELEVBQzlELGdCQUFtRCxFQUN0RCxhQUE2QyxFQUN0QyxvQkFBMkQ7UUFI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