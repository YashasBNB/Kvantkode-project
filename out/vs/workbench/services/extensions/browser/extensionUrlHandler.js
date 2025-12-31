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
var ExtensionUrlBootstrapHandler_1;
import { localize, localize2 } from '../../../../nls.js';
import { combinedDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { IHostService } from '../../host/browser/host.js';
import { IExtensionService } from '../common/extensions.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { disposableWindowInterval } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;
const URL_TO_HANDLE = 'extensionUrlHandler.urlToHandle';
const USER_TRUSTED_EXTENSIONS_CONFIGURATION_KEY = 'extensions.confirmedUriHandlerExtensionIds';
const USER_TRUSTED_EXTENSIONS_STORAGE_KEY = 'extensionUrlHandler.confirmedExtensions';
function isExtensionId(value) {
    return /^[a-z0-9][a-z0-9\-]*\.[a-z0-9][a-z0-9\-]*$/i.test(value);
}
class UserTrustedExtensionIdStorage {
    get extensions() {
        const userTrustedExtensionIdsJson = this.storageService.get(USER_TRUSTED_EXTENSIONS_STORAGE_KEY, 0 /* StorageScope.PROFILE */, '[]');
        try {
            return JSON.parse(userTrustedExtensionIdsJson);
        }
        catch {
            return [];
        }
    }
    constructor(storageService) {
        this.storageService = storageService;
    }
    has(id) {
        return this.extensions.indexOf(id) > -1;
    }
    add(id) {
        this.set([...this.extensions, id]);
    }
    set(ids) {
        this.storageService.store(USER_TRUSTED_EXTENSIONS_STORAGE_KEY, JSON.stringify(ids), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
}
export const IExtensionUrlHandler = createDecorator('extensionUrlHandler');
export class ExtensionUrlHandlerOverrideRegistry {
    static { this.handlers = new Set(); }
    static registerHandler(handler) {
        this.handlers.add(handler);
        return toDisposable(() => this.handlers.delete(handler));
    }
    static getHandler(uri) {
        for (const handler of this.handlers) {
            if (handler.canHandleURL(uri)) {
                return handler;
            }
        }
        return undefined;
    }
}
/**
 * This class handles URLs which are directed towards extensions.
 * If a URL is directed towards an inactive extension, it buffers it,
 * activates the extension and re-opens the URL once the extension registers
 * a URL handler. If the extension never registers a URL handler, the urls
 * will eventually be garbage collected.
 *
 * It also makes sure the user confirms opening URLs directed towards extensions.
 */
let ExtensionUrlHandler = class ExtensionUrlHandler {
    constructor(urlService, extensionService, dialogService, commandService, hostService, storageService, configurationService, notificationService, productService) {
        this.extensionService = extensionService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.hostService = hostService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.productService = productService;
        this.extensionHandlers = new Map();
        this.uriBuffer = new Map();
        this.userTrustedExtensionsStorage = new UserTrustedExtensionIdStorage(storageService);
        const interval = disposableWindowInterval(mainWindow, () => this.garbageCollect(), THIRTY_SECONDS);
        const urlToHandleValue = this.storageService.get(URL_TO_HANDLE, 1 /* StorageScope.WORKSPACE */);
        if (urlToHandleValue) {
            this.storageService.remove(URL_TO_HANDLE, 1 /* StorageScope.WORKSPACE */);
            this.handleURL(URI.revive(JSON.parse(urlToHandleValue)), { trusted: true });
        }
        this.disposable = combinedDisposable(urlService.registerHandler(this), interval);
        const cache = ExtensionUrlBootstrapHandler.cache;
        setTimeout(() => cache.forEach(([uri, option]) => this.handleURL(uri, option)));
    }
    async handleURL(uri, options) {
        if (!isExtensionId(uri.authority)) {
            return false;
        }
        const overrideHandler = ExtensionUrlHandlerOverrideRegistry.getHandler(uri);
        if (overrideHandler) {
            const handled = await overrideHandler.handleURL(uri);
            if (handled) {
                return handled;
            }
        }
        const extensionId = uri.authority;
        const initialHandler = this.extensionHandlers.get(ExtensionIdentifier.toKey(extensionId));
        let extensionDisplayName;
        if (!initialHandler) {
            // The extension is not yet activated, so let's check if it is installed and enabled
            const extension = await this.extensionService.getExtension(extensionId);
            if (!extension) {
                await this.handleUnhandledURL(uri, extensionId, options);
                return true;
            }
            else {
                extensionDisplayName = extension.displayName ?? '';
            }
        }
        else {
            extensionDisplayName = initialHandler.extensionDisplayName;
        }
        const trusted = options?.trusted ||
            this.productService.trustedExtensionProtocolHandlers?.includes(extensionId) ||
            this.didUserTrustExtension(ExtensionIdentifier.toKey(extensionId));
        if (!trusted) {
            const uriString = uri.toString(false);
            let uriLabel = uriString;
            if (uriLabel.length > 40) {
                uriLabel = `${uriLabel.substring(0, 30)}...${uriLabel.substring(uriLabel.length - 5)}`;
            }
            const result = await this.dialogService.confirm({
                message: localize('confirmUrl', "Allow '{0}' extension to open this URI?", extensionDisplayName),
                checkbox: {
                    label: localize('rememberConfirmUrl', 'Do not ask me again for this extension'),
                },
                primaryButton: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open'),
                custom: {
                    markdownDetails: [
                        {
                            markdown: new MarkdownString(`<div title="${uriString}" aria-label='${uriString}'>${uriLabel}</div>`, { supportHtml: true }),
                        },
                    ],
                },
            });
            if (!result.confirmed) {
                return true;
            }
            if (result.checkboxChecked) {
                this.userTrustedExtensionsStorage.add(ExtensionIdentifier.toKey(extensionId));
            }
        }
        const handler = this.extensionHandlers.get(ExtensionIdentifier.toKey(extensionId));
        if (handler) {
            if (!initialHandler) {
                // forward it directly
                return await this.handleURLByExtension(extensionId, handler, uri, options);
            }
            // let the ExtensionUrlHandler instance handle this
            return false;
        }
        // collect URI for eventual extension activation
        const timestamp = new Date().getTime();
        let uris = this.uriBuffer.get(ExtensionIdentifier.toKey(extensionId));
        if (!uris) {
            uris = [];
            this.uriBuffer.set(ExtensionIdentifier.toKey(extensionId), uris);
        }
        uris.push({ timestamp, uri });
        // activate the extension using ActivationKind.Immediate because URI handling might be part
        // of resolving authorities (via authentication extensions)
        await this.extensionService.activateByEvent(`onUri:${ExtensionIdentifier.toKey(extensionId)}`, 1 /* ActivationKind.Immediate */);
        return true;
    }
    registerExtensionHandler(extensionId, handler) {
        this.extensionHandlers.set(ExtensionIdentifier.toKey(extensionId), handler);
        const uris = this.uriBuffer.get(ExtensionIdentifier.toKey(extensionId)) || [];
        for (const { uri } of uris) {
            this.handleURLByExtension(extensionId, handler, uri);
        }
        this.uriBuffer.delete(ExtensionIdentifier.toKey(extensionId));
    }
    unregisterExtensionHandler(extensionId) {
        this.extensionHandlers.delete(ExtensionIdentifier.toKey(extensionId));
    }
    async handleURLByExtension(extensionId, handler, uri, options) {
        return await handler.handleURL(uri, options);
    }
    async handleUnhandledURL(uri, extensionId, options) {
        try {
            await this.commandService.executeCommand('workbench.extensions.installExtension', extensionId, {
                justification: {
                    reason: `${localize('installDetail', 'This extension wants to open a URI:')}\n${uri.toString()}`,
                    action: localize('openUri', 'Open URI'),
                },
                enable: true,
            });
        }
        catch (error) {
            if (!isCancellationError(error)) {
                this.notificationService.error(error);
            }
            return;
        }
        const extension = await this.extensionService.getExtension(extensionId);
        if (extension) {
            await this.handleURL(uri, { ...options, trusted: true });
        }
        else {
            /* Extension cannot be added and require window reload */
            const result = await this.dialogService.confirm({
                message: localize('reloadAndHandle', "Extension '{0}' is not loaded. Would you like to reload the window to load the extension and open the URL?", extensionId),
                primaryButton: localize({ key: 'reloadAndOpen', comment: ['&& denotes a mnemonic'] }, '&&Reload Window and Open'),
            });
            if (!result.confirmed) {
                return;
            }
            this.storageService.store(URL_TO_HANDLE, JSON.stringify(uri.toJSON()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            await this.hostService.reload();
        }
    }
    // forget about all uris buffered more than 5 minutes ago
    garbageCollect() {
        const now = new Date().getTime();
        const uriBuffer = new Map();
        this.uriBuffer.forEach((uris, extensionId) => {
            uris = uris.filter(({ timestamp }) => now - timestamp < FIVE_MINUTES);
            if (uris.length > 0) {
                uriBuffer.set(extensionId, uris);
            }
        });
        this.uriBuffer = uriBuffer;
    }
    didUserTrustExtension(id) {
        if (this.userTrustedExtensionsStorage.has(id)) {
            return true;
        }
        return this.getConfirmedTrustedExtensionIdsFromConfiguration().indexOf(id) > -1;
    }
    getConfirmedTrustedExtensionIdsFromConfiguration() {
        const trustedExtensionIds = this.configurationService.getValue(USER_TRUSTED_EXTENSIONS_CONFIGURATION_KEY);
        if (!Array.isArray(trustedExtensionIds)) {
            return [];
        }
        return trustedExtensionIds;
    }
    dispose() {
        this.disposable.dispose();
        this.extensionHandlers.clear();
        this.uriBuffer.clear();
    }
};
ExtensionUrlHandler = __decorate([
    __param(0, IURLService),
    __param(1, IExtensionService),
    __param(2, IDialogService),
    __param(3, ICommandService),
    __param(4, IHostService),
    __param(5, IStorageService),
    __param(6, IConfigurationService),
    __param(7, INotificationService),
    __param(8, IProductService)
], ExtensionUrlHandler);
registerSingleton(IExtensionUrlHandler, ExtensionUrlHandler, 0 /* InstantiationType.Eager */);
/**
 * This class handles URLs before `ExtensionUrlHandler` is instantiated.
 * More info: https://github.com/microsoft/vscode/issues/73101
 */
let ExtensionUrlBootstrapHandler = class ExtensionUrlBootstrapHandler {
    static { ExtensionUrlBootstrapHandler_1 = this; }
    static { this.ID = 'workbench.contrib.extensionUrlBootstrapHandler'; }
    static { this._cache = []; }
    static get cache() {
        ExtensionUrlBootstrapHandler_1.disposable.dispose();
        const result = ExtensionUrlBootstrapHandler_1._cache;
        ExtensionUrlBootstrapHandler_1._cache = [];
        return result;
    }
    constructor(urlService) {
        ExtensionUrlBootstrapHandler_1.disposable = urlService.registerHandler(this);
    }
    async handleURL(uri, options) {
        if (!isExtensionId(uri.authority)) {
            return false;
        }
        ExtensionUrlBootstrapHandler_1._cache.push([uri, options]);
        return true;
    }
};
ExtensionUrlBootstrapHandler = ExtensionUrlBootstrapHandler_1 = __decorate([
    __param(0, IURLService)
], ExtensionUrlBootstrapHandler);
registerWorkbenchContribution2(ExtensionUrlBootstrapHandler.ID, ExtensionUrlBootstrapHandler, 2 /* WorkbenchPhase.BlockRestore */);
class ManageAuthorizedExtensionURIsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.manageAuthorizedExtensionURIs',
            title: localize2('manage', 'Manage Authorized Extension URIs...'),
            category: localize2('extensions', 'Extensions'),
            menu: {
                id: MenuId.CommandPalette,
                when: IsWebContext.toNegated(),
            },
        });
    }
    async run(accessor) {
        const storageService = accessor.get(IStorageService);
        const quickInputService = accessor.get(IQuickInputService);
        const storage = new UserTrustedExtensionIdStorage(storageService);
        const items = storage.extensions.map((label) => ({ label, picked: true }));
        if (items.length === 0) {
            await quickInputService.pick([
                { label: localize('no', 'There are currently no authorized extension URIs.') },
            ]);
            return;
        }
        const result = await quickInputService.pick(items, { canPickMany: true });
        if (!result) {
            return;
        }
        storage.set(result.map((item) => item.label));
    }
}
registerAction2(ManageAuthorizedExtensionURIsAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVXJsSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uVXJsSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBZSxXQUFXLEVBQW1CLE1BQU0sd0NBQXdDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8s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