/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
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
import { URI } from '../../../../base/common/uri.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IVoidModelService } from '../common/voidModelService.js';
let ConvertContribWorkbenchContribution = class ConvertContribWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.void.convertcontrib'; }
    constructor(voidModelService, workspaceContext) {
        super();
        this.voidModelService = voidModelService;
        this.workspaceContext = workspaceContext;
        const initializeURI = (uri) => {
            this.workspaceContext.getWorkspace();
            const voidRulesURI = URI.joinPath(uri, '.voidrules');
            this.voidModelService.initializeModel(voidRulesURI);
        };
        // call
        this._register(this.workspaceContext.onDidChangeWorkspaceFolders((e) => {
            ;
            [...e.changed, ...e.added].forEach((w) => {
                initializeURI(w.uri);
            });
        }));
        this.workspaceContext.getWorkspace().folders.forEach((w) => {
            initializeURI(w.uri);
        });
    }
};
ConvertContribWorkbenchContribution = __decorate([
    __param(0, IVoidModelService),
    __param(1, IWorkspaceContextService)
], ConvertContribWorkbenchContribution);
registerWorkbenchContribution2(ConvertContribWorkbenchContribution.ID, ConvertContribWorkbenchContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVdvcmtiZW5jaENvbnRyaWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udmVydFRvTExNTWVzc2FnZVdvcmtiZW5jaENvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBRU4sOEJBQThCLEdBRTlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFakUsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSxVQUFVO2FBQzNDLE9BQUUsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMEM7SUFHNUQsWUFDcUMsZ0JBQW1DLEVBQzVCLGdCQUEwQztRQUVyRixLQUFLLEVBQUUsQ0FBQTtRQUg2QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQzVCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMEI7UUFJckYsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRTtZQUNsQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDcEMsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDcEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwRCxDQUFDLENBQUE7UUFFRCxPQUFPO1FBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2RCxDQUFDO1lBQUEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckIsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUEzQkksbUNBQW1DO0lBS3RDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSx3QkFBd0IsQ0FBQTtHQU5yQixtQ0FBbUMsQ0E0QnhDO0FBRUQsOEJBQThCLENBQzdCLG1DQUFtQyxDQUFDLEVBQUUsRUFDdEMsbUNBQW1DLHNDQUVuQyxDQUFBIn0=