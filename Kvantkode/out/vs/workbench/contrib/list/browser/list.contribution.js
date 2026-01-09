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
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ListResizeColumnAction } from './listResizeColumnAction.js';
let ListContext = class ListContext {
    static { this.ID = 'workbench.contrib.listContext'; }
    constructor(contextKeyService) {
        contextKeyService.createKey('listSupportsTypeNavigation', true);
        // @deprecated in favor of listSupportsTypeNavigation
        contextKeyService.createKey('listSupportsKeyboardNavigation', true);
    }
};
ListContext = __decorate([
    __param(0, IContextKeyService)
], ListContext);
export { ListContext };
registerWorkbenchContribution2(ListContext.ID, ListContext, 1 /* WorkbenchPhase.BlockStartup */);
registerAction2(ListResizeColumnAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xpc3QvYnJvd3Nlci9saXN0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRTdELElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVc7YUFDUCxPQUFFLEdBQUcsK0JBQStCLEFBQWxDLENBQWtDO0lBRXBELFlBQWdDLGlCQUFxQztRQUNwRSxpQkFBaUIsQ0FBQyxTQUFTLENBQVUsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFeEUscURBQXFEO1FBQ3JELGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNwRSxDQUFDOztBQVJXLFdBQVc7SUFHVixXQUFBLGtCQUFrQixDQUFBO0dBSG5CLFdBQVcsQ0FTdkI7O0FBRUQsOEJBQThCLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxXQUFXLHNDQUE4QixDQUFBO0FBQ3hGLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBIn0=