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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVHJ1c3RlZEV4dGVuc2lvbnNGb3JBY2NvdW50QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlVHJ1c3RlZEV4dGVuc2lvbnNGb3JBY2NvdW50QWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3pILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQ3ZILE9BQU8sRUFFTixzQkFBc0IsR0FDdEIsTUFBTSw4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