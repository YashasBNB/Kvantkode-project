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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { SignOutOfAccountAction } from './actions/signOutOfAccountAction.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { Extensions, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ManageTrustedExtensionsForAccountAction } from './actions/manageTrustedExtensionsForAccountAction.js';
import { ManageAccountPreferencesForExtensionAction } from './actions/manageAccountPreferencesForExtensionAction.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
const codeExchangeProxyCommand = CommandsRegistry.registerCommand('workbench.getCodeExchangeProxyEndpoints', function (accessor, _) {
    const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
    return environmentService.options?.codeExchangeProxyEndpoints;
});
class AuthenticationDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.authentication;
    }
    render(manifest) {
        const authentication = manifest.contributes?.authentication || [];
        if (!authentication.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [localize('authenticationlabel', 'Label'), localize('authenticationid', 'ID')];
        const rows = authentication
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((auth) => {
            return [auth.label, auth.id];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
const extensionFeature = Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'authentication',
    label: localize('authentication', 'Authentication'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(AuthenticationDataRenderer),
});
let AuthenticationContribution = class AuthenticationContribution extends Disposable {
    static { this.ID = 'workbench.contrib.authentication'; }
    constructor(_authenticationService) {
        super();
        this._authenticationService = _authenticationService;
        this._placeholderMenuItem = MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            command: {
                id: 'noAuthenticationProviders',
                title: localize('authentication.Placeholder', 'No accounts requested yet...'),
                precondition: ContextKeyExpr.false(),
            },
        });
        this._register(codeExchangeProxyCommand);
        this._register(extensionFeature);
        // Clear the placeholder menu item if there are already providers registered.
        if (_authenticationService.getProviderIds().length) {
            this._clearPlaceholderMenuItem();
        }
        this._registerHandlers();
        this._registerActions();
    }
    _registerHandlers() {
        this._register(this._authenticationService.onDidRegisterAuthenticationProvider((_e) => {
            this._clearPlaceholderMenuItem();
        }));
        this._register(this._authenticationService.onDidUnregisterAuthenticationProvider((_e) => {
            if (!this._authenticationService.getProviderIds().length) {
                this._placeholderMenuItem = MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
                    command: {
                        id: 'noAuthenticationProviders',
                        title: localize('loading', 'Loading...'),
                        precondition: ContextKeyExpr.false(),
                    },
                });
            }
        }));
    }
    _registerActions() {
        this._register(registerAction2(SignOutOfAccountAction));
        this._register(registerAction2(ManageTrustedExtensionsForAccountAction));
        this._register(registerAction2(ManageAccountPreferencesForExtensionAction));
    }
    _clearPlaceholderMenuItem() {
        this._placeholderMenuItem?.dispose();
        this._placeholderMenuItem = undefined;
    }
};
AuthenticationContribution = __decorate([
    __param(0, IAuthenticationService)
], AuthenticationContribution);
let AuthenticationUsageContribution = class AuthenticationUsageContribution {
    static { this.ID = 'workbench.contrib.authenticationUsage'; }
    constructor(_authenticationUsageService) {
        this._authenticationUsageService = _authenticationUsageService;
        this._initializeExtensionUsageCache();
    }
    async _initializeExtensionUsageCache() {
        await this._authenticationUsageService.initializeExtensionUsageCache();
    }
};
AuthenticationUsageContribution = __decorate([
    __param(0, IAuthenticationUsageService)
], AuthenticationUsageContribution);
registerWorkbenchContribution2(AuthenticationContribution.ID, AuthenticationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(AuthenticationUsageContribution.ID, AuthenticationUsageContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUNOLFVBQVUsR0FNVixNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlHLE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3BILE9BQU8sRUFB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