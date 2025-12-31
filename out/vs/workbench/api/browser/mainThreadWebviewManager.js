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
import { Disposable } from '../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { MainThreadCustomEditors } from './mainThreadCustomEditors.js';
import { MainThreadWebviewPanels } from './mainThreadWebviewPanels.js';
import { MainThreadWebviews } from './mainThreadWebviews.js';
import { MainThreadWebviewsViews } from './mainThreadWebviewViews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadWebviewManager = class MainThreadWebviewManager extends Disposable {
    constructor(context, instantiationService) {
        super();
        const webviews = this._register(instantiationService.createInstance(MainThreadWebviews, context));
        context.set(extHostProtocol.MainContext.MainThreadWebviews, webviews);
        const webviewPanels = this._register(instantiationService.createInstance(MainThreadWebviewPanels, context, webviews));
        context.set(extHostProtocol.MainContext.MainThreadWebviewPanels, webviewPanels);
        const customEditors = this._register(instantiationService.createInstance(MainThreadCustomEditors, context, webviews, webviewPanels));
        context.set(extHostProtocol.MainContext.MainThreadCustomEditors, customEditors);
        const webviewViews = this._register(instantiationService.createInstance(MainThreadWebviewsViews, context, webviews));
        context.set(extHostProtocol.MainContext.MainThreadWebviewViews, webviewViews);
    }
};
MainThreadWebviewManager = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService)
], MainThreadWebviewManager);
export { MainThreadWebviewManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRXZWJ2aWV3TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxLQUFLLGVBQWUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sc0RBQXNELENBQUE7QUFHdEQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBQ3ZELFlBQ0MsT0FBd0IsRUFDRCxvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM5QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQ2hFLENBQUE7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFckUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FDL0UsQ0FBQTtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUUvRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2xDLHVCQUF1QixFQUN2QixPQUFPLEVBQ1AsUUFBUSxFQUNSLGFBQWEsQ0FDYixDQUNELENBQUE7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFL0UsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FDL0UsQ0FBQTtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0NBQ0QsQ0FBQTtBQWhDWSx3QkFBd0I7SUFEcEMsZUFBZTtJQUliLFdBQUEscUJBQXFCLENBQUE7R0FIWCx3QkFBd0IsQ0FnQ3BDIn0=