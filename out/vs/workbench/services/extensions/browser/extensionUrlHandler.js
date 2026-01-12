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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVXJsSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25VcmxIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFlLFdBQVcsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFrQixpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcs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