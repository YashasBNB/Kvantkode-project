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
var ChatGettingStartedContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IExtensionManagementService, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ensureSideBarChatViewSize, showCopilotView } from '../chat.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
let ChatGettingStartedContribution = class ChatGettingStartedContribution extends Disposable {
    static { ChatGettingStartedContribution_1 = this; }
    static { this.ID = 'workbench.contrib.chatGettingStarted'; }
    static { this.hideWelcomeView = 'workbench.chat.hideWelcomeView'; }
    constructor(productService, extensionService, viewsService, extensionManagementService, storageService, viewDescriptorService, layoutService, configurationService, statusbarService) {
        super();
        this.productService = productService;
        this.extensionService = extensionService;
        this.viewsService = viewsService;
        this.extensionManagementService = extensionManagementService;
        this.storageService = storageService;
        this.viewDescriptorService = viewDescriptorService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.recentlyInstalled = false;
        const defaultChatAgent = this.productService.defaultChatAgent;
        const hideWelcomeView = this.storageService.getBoolean(ChatGettingStartedContribution_1.hideWelcomeView, -1 /* StorageScope.APPLICATION */, false);
        if (!defaultChatAgent || hideWelcomeView) {
            return;
        }
        this.registerListeners(defaultChatAgent);
    }
    registerListeners(defaultChatAgent) {
        this._register(this.extensionManagementService.onDidInstallExtensions(async (result) => {
            for (const e of result) {
                if (ExtensionIdentifier.equals(defaultChatAgent.extensionId, e.identifier.id) &&
                    e.operation === 2 /* InstallOperation.Install */) {
                    this.recentlyInstalled = true;
                    return;
                }
            }
        }));
        this._register(this.extensionService.onDidChangeExtensionsStatus(async (event) => {
            for (const ext of event) {
                if (ExtensionIdentifier.equals(defaultChatAgent.extensionId, ext.value)) {
                    const extensionStatus = this.extensionService.getExtensionsStatus();
                    if (extensionStatus[ext.value].activationTimes && this.recentlyInstalled) {
                        this.onDidInstallChat();
                        return;
                    }
                }
            }
        }));
    }
    async onDidInstallChat() {
        // Open Copilot view
        showCopilotView(this.viewsService, this.layoutService);
        const setupFromDialog = this.configurationService.getValue('chat.setupFromDialog');
        if (!setupFromDialog) {
            ensureSideBarChatViewSize(this.viewDescriptorService, this.layoutService, this.viewsService);
        }
        // Only do this once
        this.storageService.store(ChatGettingStartedContribution_1.hideWelcomeView, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this.recentlyInstalled = false;
        // Enable Copilot related UI if previously disabled
        this.statusbarService.updateEntryVisibility('chat.statusBarEntry', true);
        this.configurationService.updateValue('chat.commandCenter.enabled', true);
    }
};
ChatGettingStartedContribution = ChatGettingStartedContribution_1 = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionService),
    __param(2, IViewsService),
    __param(3, IExtensionManagementService),
    __param(4, IStorageService),
    __param(5, IViewDescriptorService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IConfigurationService),
    __param(8, IStatusbarService)
], ChatGettingStartedContribution);
export { ChatGettingStartedContribution };
