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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlU3RhcnRFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlU3RhcnRFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzFILE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFNN0QsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxhQUFhLENBQVUsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDMUYsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVOzthQUN2Qiw4Q0FBeUMsR0FDaEUsa0RBQWtELEFBRGMsQ0FDZDtJQUtuRCxZQUNtQyxjQUErQixFQUMvQixjQUErQixFQUVoRCwwQkFBdUQsRUFFdkQsMEJBQWdFLEVBQzdD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