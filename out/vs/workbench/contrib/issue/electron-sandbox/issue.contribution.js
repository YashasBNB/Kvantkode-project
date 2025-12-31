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
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Extensions as QuickAccessExtensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { IssueQuickAccess } from '../browser/issueQuickAccess.js';
import '../browser/issueTroubleshoot.js';
import { BaseIssueContribution } from '../common/issue.contribution.js';
import { IIssueFormService, IWorkbenchIssueService } from '../common/issue.js';
import { NativeIssueService } from './issueService.js';
import { NativeIssueFormService } from './nativeIssueFormService.js';
import './processMainService.js';
//#region Issue Contribution
registerSingleton(IWorkbenchIssueService, NativeIssueService, 1 /* InstantiationType.Delayed */);
registerSingleton(IIssueFormService, NativeIssueFormService, 1 /* InstantiationType.Delayed */);
let NativeIssueContribution = class NativeIssueContribution extends BaseIssueContribution {
    constructor(productService, configurationService) {
        super(productService, configurationService);
        if (!configurationService.getValue('telemetry.feedback.enabled')) {
            return;
        }
        if (productService.reportIssueUrl) {
            this._register(registerAction2(ReportPerformanceIssueUsingReporterAction));
        }
        let disposable;
        const registerQuickAccessProvider = () => {
            disposable = Registry.as(QuickAccessExtensions.Quickaccess).registerQuickAccessProvider({
                ctor: IssueQuickAccess,
                prefix: IssueQuickAccess.PREFIX,
                contextKey: 'inReportIssuePicker',
                placeholder: localize('tasksQuickAccessPlaceholder', 'Type the name of an extension to report on.'),
                helpEntries: [
                    {
                        description: localize('openIssueReporter', 'Open Issue Reporter'),
                        commandId: 'workbench.action.openIssueReporter',
                    },
                ],
            });
        };
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (!configurationService.getValue('extensions.experimental.issueQuickAccess') &&
                disposable) {
                disposable.dispose();
                disposable = undefined;
            }
            else if (!disposable) {
                registerQuickAccessProvider();
            }
        }));
        if (configurationService.getValue('extensions.experimental.issueQuickAccess')) {
            registerQuickAccessProvider();
        }
    }
};
NativeIssueContribution = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], NativeIssueContribution);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(NativeIssueContribution, 3 /* LifecyclePhase.Restored */);
class ReportPerformanceIssueUsingReporterAction extends Action2 {
    static { this.ID = 'workbench.action.reportPerformanceIssueUsingReporter'; }
    constructor() {
        super({
            id: ReportPerformanceIssueUsingReporterAction.ID,
            title: localize2({ key: 'reportPerformanceIssue', comment: [`Here, 'issue' means problem or bug`] }, 'Report Performance Issue...'),
            category: Categories.Help,
            f1: true,
        });
    }
    async run(accessor) {
        const issueService = accessor.get(IWorkbenchIssueService); // later can just get IIssueFormService
        return issueService.openReporter({ issueType: 1 /* IssueType.PerformanceIssue */ });
    }
}
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvZWxlY3Ryb24tc2FuZGJveC9pc3N1ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFFTixVQUFVLElBQUkscUJBQXFCLEdBQ25DLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUE7QUFFOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQWEsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUs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