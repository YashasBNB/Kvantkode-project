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
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow } from '../../../../../base/common/date.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationAccessService } from '../../../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../../../services/authentication/browser/authenticationUsageService.js';
import { IAuthenticationService, } from '../../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export class ManageTrustedExtensionsForAccountAction extends Action2 {
    constructor() {
        super({
            id: '_manageTrustedExtensionsForAccount',
            title: localize2('manageTrustedExtensionsForAccount', 'Manage Trusted Extensions For Account'),
            category: localize2('accounts', 'Accounts'),
            f1: true,
        });
    }
    run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService
            .createInstance(ManageTrustedExtensionsForAccountActionImpl)
            .run(options);
    }
}
let ManageTrustedExtensionsForAccountActionImpl = class ManageTrustedExtensionsForAccountActionImpl {
    constructor(_productService, _extensionService, _dialogService, _quickInputService, _authenticationService, _authenticationUsageService, _authenticationAccessService, _commandService) {
        this._productService = _productService;
        this._extensionService = _extensionService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._authenticationService = _authenticationService;
        this._authenticationUsageService = _authenticationUsageService;
        this._authenticationAccessService = _authenticationAccessService;
        this._commandService = _commandService;
    }
    async run(options) {
        const { providerId, accountLabel } = await this._resolveProviderAndAccountLabel(options?.providerId, options?.accountLabel);
        if (!providerId || !accountLabel) {
            return;
        }
        const items = await this._getItems(providerId, accountLabel);
        if (!items.length) {
            return;
        }
        const disposables = new DisposableStore();
        const picker = this._createQuickPick(disposables, providerId, accountLabel);
        picker.items = items;
        picker.selectedItems = items.filter((i) => i.type !== 'separator' && !!i.picked);
        picker.show();
    }
    async _resolveProviderAndAccountLabel(providerId, accountLabel) {
        if (!providerId || !accountLabel) {
            const accounts = new Array();
            for (const id of this._authenticationService.getProviderIds()) {
                const providerLabel = this._authenticationService.getProvider(id).label;
                const sessions = await this._authenticationService.getSessions(id);
                const uniqueAccountLabels = new Set();
                for (const session of sessions) {
                    if (!uniqueAccountLabels.has(session.account.label)) {
                        uniqueAccountLabels.add(session.account.label);
                        accounts.push({ providerId: id, providerLabel, accountLabel: session.account.label });
                    }
                }
            }
            const pick = await this._quickInputService.pick(accounts.map((account) => ({
                providerId: account.providerId,
                label: account.accountLabel,
                description: account.providerLabel,
            })), {
                placeHolder: localize('pickAccount', 'Pick an account to manage trusted extensions for'),
                matchOnDescription: true,
            });
            if (pick) {
                providerId = pick.providerId;
                accountLabel = pick.label;
            }
            else {
                return { providerId: undefined, accountLabel: undefined };
            }
        }
        return { providerId, accountLabel };
    }
    async _getItems(providerId, accountLabel) {
        let allowedExtensions = this._authenticationAccessService.readAllowedExtensions(providerId, accountLabel);
        // only include extensions that are installed
        const resolvedExtensions = await Promise.all(allowedExtensions.map((ext) => this._extensionService.getExtension(ext.id)));
        allowedExtensions = resolvedExtensions
            .map((ext, i) => (ext ? allowedExtensions[i] : undefined))
            .filter((ext) => !!ext);
        const trustedExtensionAuthAccess = this._productService.trustedExtensionAuthAccess;
        const trustedExtensionIds = 
        // Case 1: trustedExtensionAuthAccess is an array
        Array.isArray(trustedExtensionAuthAccess)
            ? trustedExtensionAuthAccess
            : // Case 2: trustedExtensionAuthAccess is an object
                typeof trustedExtensionAuthAccess === 'object'
                    ? (trustedExtensionAuthAccess[providerId] ?? [])
                    : [];
        for (const extensionId of trustedExtensionIds) {
            const allowedExtension = allowedExtensions.find((ext) => ext.id === extensionId);
            if (!allowedExtension) {
                // Add the extension to the allowedExtensions list
                const extension = await this._extensionService.getExtension(extensionId);
                if (extension) {
                    allowedExtensions.push({
                        id: extensionId,
                        name: extension.displayName || extension.name,
                        allowed: true,
                        trusted: true,
                    });
                }
            }
            else {
                // Update the extension to be allowed
                allowedExtension.allowed = true;
                allowedExtension.trusted = true;
            }
        }
        if (!allowedExtensions.length) {
            this._dialogService.info(localize('noTrustedExtensions', 'This account has not been used by any extensions.'));
            return [];
        }
        const usages = this._authenticationUsageService.readAccountUsages(providerId, accountLabel);
        const trustedExtensions = [];
        const otherExtensions = [];
        for (const extension of allowedExtensions) {
            const usage = usages.find((usage) => extension.id === usage.extensionId);
            extension.lastUsed = usage?.lastUsed;
            if (extension.trusted) {
                trustedExtensions.push(extension);
            }
            else {
                otherExtensions.push(extension);
            }
        }
        const sortByLastUsed = (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0);
        const items = [
            ...otherExtensions.sort(sortByLastUsed).map(this._toQuickPickItem),
            {
                type: 'separator',
                label: localize('trustedExtensions', 'Trusted by Microsoft'),
            },
            ...trustedExtensions.sort(sortByLastUsed).map(this._toQuickPickItem),
        ];
        return items;
    }
    _toQuickPickItem(extension) {
        const lastUsed = extension.lastUsed;
        const description = lastUsed
            ? localize({
                key: 'accountLastUsedDate',
                comment: [
                    'The placeholder {0} is a string with time information, such as "3 days ago"',
                ],
            }, 'Last used this account {0}', fromNow(lastUsed, true))
            : localize('notUsed', 'Has not used this account');
        let tooltip;
        let disabled;
        if (extension.trusted) {
            tooltip = localize('trustedExtensionTooltip', 'This extension is trusted by Microsoft and\nalways has access to this account');
            disabled = true;
        }
        return {
            label: extension.name,
            extension,
            description,
            tooltip,
            disabled,
            buttons: [
                {
                    tooltip: localize('accountPreferences', 'Manage account preferences for this extension'),
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                },
            ],
            picked: extension.allowed === undefined || extension.allowed,
        };
    }
    _createQuickPick(disposableStore, providerId, accountLabel) {
        const quickPick = disposableStore.add(this._quickInputService.createQuickPick({
            useSeparators: true,
        }));
        quickPick.canSelectMany = true;
        quickPick.customButton = true;
        quickPick.customLabel = localize('manageTrustedExtensions.cancel', 'Cancel');
        quickPick.title = localize('manageTrustedExtensions', 'Manage Trusted Extensions');
        quickPick.placeholder = localize('manageExtensions', 'Choose which extensions can access this account');
        disposableStore.add(quickPick.onDidAccept(() => {
            const updatedAllowedList = quickPick.items
                .filter((item) => item.type !== 'separator')
                .map((i) => i.extension);
            const allowedExtensionsSet = new Set(quickPick.selectedItems.map((i) => i.extension));
            updatedAllowedList.forEach((extension) => {
                extension.allowed = allowedExtensionsSet.has(extension);
            });
            this._authenticationAccessService.updateAllowedExtensions(providerId, accountLabel, updatedAllowedList);
            quickPick.hide();
        }));
        disposableStore.add(quickPick.onDidHide(() => {
            disposableStore.dispose();
        }));
        disposableStore.add(quickPick.onDidCustom(() => {
            quickPick.hide();
        }));
        disposableStore.add(quickPick.onDidTriggerItemButton((e) => this._commandService.executeCommand('_manageAccountPreferencesForExtension', e.item.extension.id, providerId)));
        return quickPick;
    }
};
ManageTrustedExtensionsForAccountActionImpl = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionService),
    __param(2, IDialogService),
    __param(3, IQuickInputService),
    __param(4, IAuthenticationService),
    __param(5, IAuthenticationUsageService),
    __param(6, IAuthenticationAccessService),
    __param(7, ICommandService)
], ManageTrustedExtensionsForAccountActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVHJ1c3RlZEV4dGVuc2lvbnNGb3JBY2NvdW50QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hY3Rpb25zL21hbmFnZVRydXN0ZWRFeHRlbnNpb25zRm9yQWNjb3VudEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUN2SCxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sOERBQThE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