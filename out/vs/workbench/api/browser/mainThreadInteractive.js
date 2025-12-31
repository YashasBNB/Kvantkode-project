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
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../editor/common/languages/modesRegistry.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IInteractiveDocumentService } from '../../contrib/interactive/browser/interactiveDocumentService.js';
let MainThreadInteractive = class MainThreadInteractive {
    constructor(extHostContext, interactiveDocumentService) {
        this._disposables = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostInteractive);
        this._disposables.add(interactiveDocumentService.onWillAddInteractiveDocument((e) => {
            this._proxy.$willAddInteractiveDocument(e.inputUri, '\n', PLAINTEXT_LANGUAGE_ID, e.notebookUri);
        }));
        this._disposables.add(interactiveDocumentService.onWillRemoveInteractiveDocument((e) => {
            this._proxy.$willRemoveInteractiveDocument(e.inputUri, e.notebookUri);
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
};
MainThreadInteractive = __decorate([
    extHostNamedCustomer(MainContext.MainThreadInteractive),
    __param(1, IInteractiveDocumentService)
], MainThreadInteractive);
export { MainThreadInteractive };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEludGVyYWN0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRJbnRlcmFjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDekYsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFHdEcsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFLakMsWUFDQyxjQUErQixFQUNGLDBCQUF1RDtRQUpwRSxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFNcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRXhFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQiwwQkFBMEIsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdELElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQ3RDLENBQUMsQ0FBQyxRQUFRLEVBQ1YsSUFBSSxFQUNKLHFCQUFxQixFQUNyQixDQUFDLENBQUMsV0FBVyxDQUNiLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ3BCLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN0RSxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRCxDQUFBO0FBaENZLHFCQUFxQjtJQURqQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUM7SUFRckQsV0FBQSwyQkFBMkIsQ0FBQTtHQVBqQixxQkFBcUIsQ0FnQ2pDIn0=