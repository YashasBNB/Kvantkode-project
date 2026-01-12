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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFdlYnZpZXdNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEtBQUssZUFBZSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSxzREFBc0QsQ0FBQTtBQUd0RCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFDdkQsWUFDQyxPQUF3QixFQUNELG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzlCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVyRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUMvRSxDQUFBO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRS9FLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsdUJBQXVCLEVBQ3ZCLE9BQU8sRUFDUCxRQUFRLEVBQ1IsYUFBYSxDQUNiLENBQ0QsQ0FBQTtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUUvRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUMvRSxDQUFBO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLHNCQUFzQixFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzlFLENBQUM7Q0FDRCxDQUFBO0FBaENZLHdCQUF3QjtJQURwQyxlQUFlO0lBSWIsV0FBQSxxQkFBcUIsQ0FBQTtHQUhYLHdCQUF3QixDQWdDcEMifQ==