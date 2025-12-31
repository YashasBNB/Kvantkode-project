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
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchIssueService } from './issue.js';
const OpenIssueReporterActionId = 'workbench.action.openIssueReporter';
const OpenIssueReporterApiId = 'vscode.openIssueReporter';
const OpenIssueReporterCommandMetadata = {
    description: 'Open the issue reporter and optionally prefill part of the form.',
    args: [
        {
            name: 'options',
            description: 'Data to use to prefill the issue reporter with.',
            isOptional: true,
            schema: {
                oneOf: [
                    {
                        type: 'string',
                        description: 'The extension id to preselect.',
                    },
                    {
                        type: 'object',
                        properties: {
                            extensionId: {
                                type: 'string',
                            },
                            issueTitle: {
                                type: 'string',
                            },
                            issueBody: {
                                type: 'string',
                            },
                        },
                    },
                ],
            },
        },
    ],
};
let BaseIssueContribution = class BaseIssueContribution extends Disposable {
    constructor(productService, configurationService) {
        super();
        if (!configurationService.getValue('telemetry.feedback.enabled')) {
            this._register(CommandsRegistry.registerCommand({
                id: 'workbench.action.openIssueReporter',
                handler: function (accessor) {
                    const data = accessor.get(INotificationService);
                    data.info('Feedback is disabled.');
                },
            }));
            return;
        }
        if (!productService.reportIssueUrl) {
            return;
        }
        this._register(CommandsRegistry.registerCommand({
            id: OpenIssueReporterActionId,
            handler: function (accessor, args) {
                const data = typeof args === 'string'
                    ? { extensionId: args }
                    : Array.isArray(args)
                        ? { extensionId: args[0] }
                        : (args ?? {});
                return accessor.get(IWorkbenchIssueService).openReporter(data);
            },
            metadata: OpenIssueReporterCommandMetadata,
        }));
        this._register(CommandsRegistry.registerCommand({
            id: OpenIssueReporterApiId,
            handler: function (accessor, args) {
                const data = typeof args === 'string'
                    ? { extensionId: args }
                    : Array.isArray(args)
                        ? { extensionId: args[0] }
                        : (args ?? {});
                return accessor.get(IWorkbenchIssueService).openReporter(data);
            },
            metadata: OpenIssueReporterCommandMetadata,
        }));
        const reportIssue = {
            id: OpenIssueReporterActionId,
            title: localize2({
                key: 'reportIssueInEnglish',
                comment: ['Translate this to "Report Issue in English" in all languages please!'],
            }, 'Report Issue...'),
            category: Categories.Help,
        };
        this._register(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: reportIssue }));
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
            group: '3_feedback',
            command: {
                id: OpenIssueReporterActionId,
                title: localize({
                    key: 'miReportIssue',
                    comment: [
                        '&& denotes a mnemonic',
                        'Translate this to "Report Issue in English" in all languages please!',
                    ],
                }, 'Report &&Issue'),
            },
            order: 3,
        }));
    }
};
BaseIssueContribution = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], BaseIssueContribution);
export { BaseIssueContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvY29tbW9uL2lzc3VlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXZGLE9BQU8sRUFBcUIsc0JBQXNCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFdEUsTUFBTSx5QkFBeUIsR0FBRyxvQ0FBb0MsQ0FBQTtBQUN0RSxNQUFNLHNCQUFzQixHQUFHLDBCQUEwQixDQUFBO0FBRXpELE1BQU0sZ0NBQWdDLEdBQXFCO0lBQzFELFdBQVcsRUFBRSxrRUFBa0U7SUFDL0UsSUFBSSxFQUFFO1FBQ0w7WUFDQyxJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxpREFBaUQ7WUFDOUQsVUFBVSxFQUFFLElBQUk7WUFDaEIsTUFBTSxFQUFFO2dCQUNQLEtBQUssRUFBRTtvQkFDTjt3QkFDQyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsZ0NBQWdDO3FCQUM3QztvQkFDRDt3QkFDQyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxVQUFVLEVBQUU7NEJBQ1gsV0FBVyxFQUFFO2dDQUNaLElBQUksRUFBRSxRQUFROzZCQUNkOzRCQUNELFVBQVUsRUFBRTtnQ0FDWCxJQUFJLEVBQUUsUUFBUTs2QkFDZDs0QkFDRCxTQUFTLEVBQUU7Z0NBQ1YsSUFBSSxFQUFFLFFBQVE7NkJBQ2Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxDQUFBO0FBU00sSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBQ3BELFlBQ2tCLGNBQStCLEVBQ3pCLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVUsNEJBQTRCLENBQUMsRUFBRSxDQUFDO1lBQzNFLElBQUksQ0FBQyxTQUFTLENBQ2IsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO2dCQUNoQyxFQUFFLEVBQUUsb0NBQW9DO2dCQUN4QyxPQUFPLEVBQUUsVUFBVSxRQUFRO29CQUMxQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7b0JBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkMsQ0FBQzthQUNELENBQUMsQ0FDRixDQUFBO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7WUFDaEMsRUFBRSxFQUFFLHlCQUF5QjtZQUM3QixPQUFPLEVBQUUsVUFBVSxRQUFRLEVBQUUsSUFBZ0Q7Z0JBQzVFLE1BQU0sSUFBSSxHQUNULE9BQU8sSUFBSSxLQUFLLFFBQVE7b0JBQ3ZCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7b0JBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDcEIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDMUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUVqQixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDL0QsQ0FBQztZQUNELFFBQVEsRUFBRSxnQ0FBZ0M7U0FDMUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztZQUNoQyxFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLE9BQU8sRUFBRSxVQUFVLFFBQVEsRUFBRSxJQUFnRDtnQkFDNUUsTUFBTSxJQUFJLEdBQ1QsT0FBTyxJQUFJLEtBQUssUUFBUTtvQkFDdkIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtvQkFDdkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNwQixDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUMxQixDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUE7Z0JBRWpCLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvRCxDQUFDO1lBQ0QsUUFBUSxFQUFFLGdDQUFnQztTQUMxQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sV0FBVyxHQUFtQjtZQUNuQyxFQUFFLEVBQUUseUJBQXlCO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQ2Y7Z0JBQ0MsR0FBRyxFQUFFLHNCQUFzQjtnQkFDM0IsT0FBTyxFQUFFLENBQUMsc0VBQXNFLENBQUM7YUFDakYsRUFDRCxpQkFBaUIsQ0FDakI7WUFDRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7U0FDekIsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RixJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtZQUNuRCxLQUFLLEVBQUUsWUFBWTtZQUNuQixPQUFPLEVBQUU7Z0JBQ1IsRUFBRSxFQUFFLHlCQUF5QjtnQkFDN0IsS0FBSyxFQUFFLFFBQVEsQ0FDZDtvQkFDQyxHQUFHLEVBQUUsZUFBZTtvQkFDcEIsT0FBTyxFQUFFO3dCQUNSLHVCQUF1Qjt3QkFDdkIsc0VBQXNFO3FCQUN0RTtpQkFDRCxFQUNELGdCQUFnQixDQUNoQjthQUNEO1lBQ0QsS0FBSyxFQUFFLENBQUM7U0FDUixDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBNUZZLHFCQUFxQjtJQUUvQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7R0FIWCxxQkFBcUIsQ0E0RmpDIn0=