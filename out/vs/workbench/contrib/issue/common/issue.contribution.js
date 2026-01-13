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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9jb21tb24vaXNzdWUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFdkYsT0FBTyxFQUFxQixzQkFBc0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUV0RSxNQUFNLHlCQUF5QixHQUFHLG9DQUFvQyxDQUFBO0FBQ3RFLE1BQU0sc0JBQXNCLEdBQUcsMEJBQTBCLENBQUE7QUFFekQsTUFBTSxnQ0FBZ0MsR0FBcUI7SUFDMUQsV0FBVyxFQUFFLGtFQUFrRTtJQUMvRSxJQUFJLEVBQUU7UUFDTDtZQUNDLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLGlEQUFpRDtZQUM5RCxVQUFVLEVBQUUsSUFBSTtZQUNoQixNQUFNLEVBQUU7Z0JBQ1AsS0FBSyxFQUFFO29CQUNOO3dC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