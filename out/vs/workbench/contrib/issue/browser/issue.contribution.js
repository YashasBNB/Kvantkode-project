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
import * as nls from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { IssueFormService } from './issueFormService.js';
import { BrowserIssueService } from './issueService.js';
import './issueTroubleshoot.js';
import { IIssueFormService, IWorkbenchIssueService } from '../common/issue.js';
import { BaseIssueContribution } from '../common/issue.contribution.js';
let WebIssueContribution = class WebIssueContribution extends BaseIssueContribution {
    constructor(productService, configurationService) {
        super(productService, configurationService);
        Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
            properties: {
                'issueReporter.experimental.webReporter': {
                    type: 'boolean',
                    default: productService.quality !== 'stable',
                    description: 'Enable experimental issue reporter for web.',
                },
            },
        });
    }
};
WebIssueContribution = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], WebIssueContribution);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(WebIssueContribution, 3 /* LifecyclePhase.Restored */);
registerSingleton(IWorkbenchIssueService, BrowserIssueService, 1 /* InstantiationType.Delayed */);
registerSingleton(IIssueFormService, IssueFormService, 1 /* InstantiationType.Delayed */);
CommandsRegistry.registerCommand('_issues.getSystemStatus', (accessor) => {
    return nls.localize('statusUnsupported', 'The --status argument is not yet supported in browsers.');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDdkQsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd2RSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLHFCQUFxQjtJQUN2RCxZQUNrQixjQUErQixFQUN6QixvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLGNBQWMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQzNDLFFBQVEsQ0FBQyxFQUFFLENBQ1YsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFDLHFCQUFxQixDQUFDO1lBQ3ZCLFVBQVUsRUFBRTtnQkFDWCx3Q0FBd0MsRUFBRTtvQkFDekMsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUTtvQkFDNUMsV0FBVyxFQUFFLDZDQUE2QztpQkFDMUQ7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBbEJLLG9CQUFvQjtJQUV2QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7R0FIbEIsb0JBQW9CLENBa0J6QjtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0Ysb0JBQW9CLGtDQUVwQixDQUFBO0FBRUQsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsbUJBQW1CLG9DQUE0QixDQUFBO0FBQ3pGLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixvQ0FBNEIsQ0FBQTtBQUVqRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtJQUN4RSxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLG1CQUFtQixFQUNuQix5REFBeUQsQ0FDekQsQ0FBQTtBQUNGLENBQUMsQ0FBQyxDQUFBIn0=