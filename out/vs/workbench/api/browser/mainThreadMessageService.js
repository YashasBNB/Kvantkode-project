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
import * as nls from '../../../nls.js';
import { toAction } from '../../../base/common/actions.js';
import { MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService, } from '../../../platform/notification/common/notification.js';
import { Event } from '../../../base/common/event.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
let MainThreadMessageService = class MainThreadMessageService {
    constructor(extHostContext, _notificationService, _commandService, _dialogService, extensionService) {
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        this._dialogService = _dialogService;
        this.extensionsListener = extensionService.onDidChangeExtensions((e) => {
            for (const extension of e.removed) {
                this._notificationService.removeFilter(extension.identifier.value);
            }
        });
    }
    dispose() {
        this.extensionsListener.dispose();
    }
    $showMessage(severity, message, options, commands) {
        if (options.modal) {
            return this._showModalMessage(severity, message, options.detail, commands, options.useCustom);
        }
        else {
            return this._showMessage(severity, message, commands, options);
        }
    }
    _showMessage(severity, message, commands, options) {
        return new Promise((resolve) => {
            const primaryActions = commands.map((command) => toAction({
                id: `_extension_message_handle_${command.handle}`,
                label: command.title,
                enabled: true,
                run: () => {
                    resolve(command.handle);
                    return Promise.resolve();
                },
            }));
            let source;
            if (options.source) {
                source = {
                    label: options.source.label,
                    id: options.source.identifier.value,
                };
            }
            if (!source) {
                source = nls.localize('defaultSource', 'Extension');
            }
            const secondaryActions = [];
            if (options.source) {
                secondaryActions.push(toAction({
                    id: options.source.identifier.value,
                    label: nls.localize('manageExtension', 'Manage Extension'),
                    run: () => {
                        return this._commandService.executeCommand('_extensions.manage', options.source.identifier.value);
                    },
                }));
            }
            const messageHandle = this._notificationService.notify({
                severity,
                message,
                actions: { primary: primaryActions, secondary: secondaryActions },
                source,
            });
            // if promise has not been resolved yet, now is the time to ensure a return value
            // otherwise if already resolved it means the user clicked one of the buttons
            Event.once(messageHandle.onDidClose)(() => {
                resolve(undefined);
            });
        });
    }
    async _showModalMessage(severity, message, detail, commands, useCustom) {
        const buttons = [];
        let cancelButton = undefined;
        for (const command of commands) {
            const button = {
                label: command.title,
                run: () => command.handle,
            };
            if (command.isCloseAffordance) {
                cancelButton = button;
            }
            else {
                buttons.push(button);
            }
        }
        if (!cancelButton) {
            if (buttons.length > 0) {
                cancelButton = {
                    label: nls.localize('cancel', 'Cancel'),
                    run: () => undefined,
                };
            }
            else {
                cancelButton = {
                    label: nls.localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                    run: () => undefined,
                };
            }
        }
        const { result } = await this._dialogService.prompt({
            type: severity,
            message,
            detail,
            buttons,
            cancelButton,
            custom: useCustom,
        });
        return result;
    }
};
MainThreadMessageService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMessageService),
    __param(1, INotificationService),
    __param(2, ICommandService),
    __param(3, IDialogService),
    __param(4, IExtensionService)
], MainThreadMessageService);
export { MainThreadMessageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRNZXNzYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBRXRDLE9BQU8sRUFBVyxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQWlCLE1BQU0sNkNBQTZDLENBQUE7QUFDM0YsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFJM0UsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFHcEMsWUFDQyxjQUErQixFQUNRLG9CQUEwQyxFQUMvQyxlQUFnQyxFQUNqQyxjQUE4QixFQUM1QyxnQkFBbUM7UUFIZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQy9DLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFHL0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEUsS0FBSyxNQUFNLFNBQVMsSUFB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