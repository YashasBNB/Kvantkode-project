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
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { UserDataSyncWorkbenchContribution } from './userDataSync.js';
import { IUserDataAutoSyncService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { isWeb } from '../../../../base/common/platform.js';
import { UserDataSyncTrigger } from './userDataSyncTrigger.js';
import { toAction } from '../../../../base/common/actions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { SHOW_SYNC_LOG_COMMAND_ID } from '../../../services/userDataSync/common/userDataSync.js';
let UserDataSyncReportIssueContribution = class UserDataSyncReportIssueContribution extends Disposable {
    constructor(userDataAutoSyncService, notificationService, productService, commandService, hostService) {
        super();
        this.notificationService = notificationService;
        this.productService = productService;
        this.commandService = commandService;
        this.hostService = hostService;
        this._register(userDataAutoSyncService.onError((error) => this.onAutoSyncError(error)));
    }
    onAutoSyncError(error) {
        switch (error.code) {
            case "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */: {
                const message = isWeb
                    ? localize({
                        key: 'local too many requests - reload',
                        comment: ['Settings Sync is the name of the feature'],
                    }, 'Settings sync is suspended temporarily because the current device is making too many requests. Please reload {0} to resume.', this.productService.nameLong)
                    : localize({
                        key: 'local too many requests - restart',
                        comment: ['Settings Sync is the name of the feature'],
                    }, 'Settings sync is suspended temporarily because the current device is making too many requests. Please restart {0} to resume.', this.productService.nameLong);
                this.notificationService.notify({
                    severity: Severity.Error,
                    message,
                    actions: {
                        primary: [
                            toAction({
                                id: 'Show Sync Logs',
                                label: localize('show sync logs', 'Show Log'),
                                run: () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID),
                            }),
                            toAction({
                                id: 'Restart',
                                label: isWeb ? localize('reload', 'Reload') : localize('restart', 'Restart'),
                                run: () => this.hostService.restart(),
                            }),
                        ],
                    },
                });
                return;
            }
            case "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */: {
                const operationId = error.operationId
                    ? localize('operationId', 'Operation Id: {0}', error.operationId)
                    : undefined;
                const message = localize({
                    key: 'server too many requests',
                    comment: ['Settings Sync is the name of the feature'],
                }, 'Settings sync is disabled because the current device is making too many requests. Please wait for 10 minutes and turn on sync.');
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: operationId ? `${message} ${operationId}` : message,
                    source: error.operationId
                        ? localize('settings sync', 'Settings Sync. Operation Id: {0}', error.operationId)
                        : undefined,
                    actions: {
                        primary: [
                            toAction({
                                id: 'Show Sync Logs',
                                label: localize('show sync logs', 'Show Log'),
                                run: () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID),
                            }),
                        ],
                    },
                });
                return;
            }
        }
    }
};
UserDataSyncReportIssueContribution = __decorate([
    __param(0, IUserDataAutoSyncService),
    __param(1, INotificationService),
    __param(2, IProductService),
    __param(3, ICommandService),
    __param(4, IHostService)
], UserDataSyncReportIssueContribution);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(UserDataSyncWorkbenchContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(UserDataSyncTrigger, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(UserDataSyncReportIssueContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhU3luYy9icm93c2VyL3VzZXJEYXRhU3luYy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDckUsT0FBTyxFQUNOLHdCQUF3QixHQUd4QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRWhHLElBQU0sbUNBQW1DLEdB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