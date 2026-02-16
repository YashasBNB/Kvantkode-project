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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sd0JBQXdCLEdBR3hCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENB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