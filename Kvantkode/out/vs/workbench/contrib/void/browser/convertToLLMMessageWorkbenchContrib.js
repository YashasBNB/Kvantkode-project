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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVdvcmtiZW5jaENvbnRyaWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9jb252ZXJ0VG9MTE1NZXNzYWdlV29ya2JlbmNoQ29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFFTiw4QkFBOEIsR0FFOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRSxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFvQyxTQUFRLFVBQVU7YUFDM0MsT0FBRSxHQUFHLHVDQUF1QyxBQUExQyxDQUEwQztJQUc1RCxZQUNxQyxnQkFBbUMsRUFDNUIsZ0JBQTBDO1FBRXJGLEtBQUssRUFBRSxDQUFBO1FBSDZCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDNUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUEwQjtRQUlyRixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFO1lBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNwQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNwRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3BELENBQUMsQ0FBQTtRQUVELE9BQU87UUFDUCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZELENBQUM7WUFBQSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDekMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFELGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQTNCSSxtQ0FBbUM7SUFLdEMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHdCQUF3QixDQUFBO0dBTnJCLG1DQUFtQyxDQTRCeEM7QUFFRCw4QkFBOEIsQ0FDN0IsbUNBQW1DLENBQUMsRUFBRSxFQUN0QyxtQ0FBbUMsc0NBRW5DLENBQUEifQ==