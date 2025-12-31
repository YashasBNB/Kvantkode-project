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
var RemoteStartEntry_1;
import * as nls from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
export const showStartEntryInWeb = new RawContextKey('showRemoteStartEntryInWeb', false);
let RemoteStartEntry = class RemoteStartEntry extends Disposable {
    static { RemoteStartEntry_1 = this; }
    static { this.REMOTE_WEB_START_ENTRY_ACTIONS_COMMAND_ID = 'workbench.action.remote.showWebStartEntryActions'; }
    constructor(commandService, productService, extensionManagementService, extensionEnablementService, telemetryService, contextKeyService) {
        super();
        this.commandService = commandService;
        this.productService = productService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.telemetryService = telemetryService;
        this.contextKeyService = contextKeyService;
        const remoteExtensionTips = this.productService.remoteExtensionTips?.['tunnel'];
        this.startCommand = remoteExtensionTips?.startEntry?.startCommand ?? '';
        this.remoteExtensionId = remoteExtensionTips?.extensionId ?? '';
        this._init();
        this.registerActions();
        this.registerListeners();
    }
    registerActions() {
        const category = nls.localize2('remote.category', 'Remote');
        // Show Remote Start Action
        const startEntry = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteStartEntry_1.REMOTE_WEB_START_ENTRY_ACTIONS_COMMAND_ID,
                    category,
                    title: nls.localize2('remote.showWebStartEntryActions', 'Show Remote Start Entry for web'),
                    f1: false,
                });
            }
            async run() {
                await startEntry.showWebRemoteStartActions();
            }
        }));
    }
    registerListeners() {
        this._register(this.extensionEnablementService.onEnablementChanged(async (result) => {
            for (const ext of result) {
                if (ExtensionIdentifier.equals(this.remoteExtensionId, ext.identifier.id)) {
                    if (this.extensionEnablementService.isEnabled(ext)) {
                        showStartEntryInWeb.bindTo(this.contextKeyService).set(true);
                    }
                    else {
                        showStartEntryInWeb.bindTo(this.contextKeyService).set(false);
                    }
                }
            }
        }));
    }
    async _init() {
        // Check if installed and enabled
        const installed = (await this.extensionManagementService.getInstalled()).find((value) => ExtensionIdentifier.equals(value.identifier.id, this.remoteExtensionId));
        if (installed) {
            if (this.extensionEnablementService.isEnabled(installed)) {
                showStartEntryInWeb.bindTo(this.contextKeyService).set(true);
            }
        }
    }
    async showWebRemoteStartActions() {
        this.commandService.executeCommand(this.startCommand);
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: this.startCommand,
            from: 'remote start entry',
        });
    }
};
RemoteStartEntry = RemoteStartEntry_1 = __decorate([
    __param(0, ICommandService),
    __param(1, IProductService),
    __param(2, IExtensionManagementService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, ITelemetryService),
    __param(5, IContextKeyService)
], RemoteStartEntry);
export { RemoteStartEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlU3RhcnRFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3JlbW90ZVN0YXJ0RW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNwSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMxSCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBTTdELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksYUFBYSxDQUFVLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQzFGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTs7YUFDdkIsOENBQXlDLEdBQ2hFLGtEQUFrRCxBQURjLENBQ2Q7SUFLbkQsWUFDbUMsY0FBK0IsRUFDL0IsY0FBK0IsRUFFaEQsMEJBQXVELEVBRXZELDBCQUFnRSxFQUM3QyxnQkFB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