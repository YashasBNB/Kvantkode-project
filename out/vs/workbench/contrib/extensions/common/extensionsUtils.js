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
import { localize } from '../../../../nls.js';
import { Event } from '../../../../base/common/event.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Severity, INotificationService, } from '../../../../platform/notification/common/notification.js';
let KeymapExtensions = class KeymapExtensions extends Disposable {
    constructor(instantiationService, extensionEnablementService, tipsService, lifecycleService, notificationService) {
        super();
        this.instantiationService = instantiationService;
        this.extensionEnablementService = extensionEnablementService;
        this.tipsService = tipsService;
        this.notificationService = notificationService;
        this._register(lifecycleService.onDidShutdown(() => this.dispose()));
        this._register(instantiationService.invokeFunction(onExtensionChanged)((identifiers) => {
            Promise.all(identifiers.map((identifier) => this.checkForOtherKeymaps(identifier))).then(undefined, onUnexpectedError);
        }));
    }
    checkForOtherKeymaps(extensionIdentifier) {
        return this.instantiationService.invokeFunction(getInstalledExtensions).then((extensions) => {
            const keymaps = extensions.filter((extension) => isKeymapExtension(this.tipsService, extension));
            const extension = keymaps.find((extension) => areSameExtensions(extension.identifier, extensionIdentifier));
            if (extension && extension.globallyEnabled) {
                const otherKeymaps = keymaps.filter((extension) => !areSameExtensions(extension.identifier, extensionIdentifier) &&
                    extension.globallyEnabled);
                if (otherKeymaps.length) {
                    return this.promptForDisablingOtherKeymaps(extension, otherKeymaps);
                }
            }
            return undefined;
        });
    }
    promptForDisablingOtherKeymaps(newKeymap, oldKeymaps) {
        const onPrompt = (confirmed) => {
            if (confirmed) {
                this.extensionEnablementService.setEnablement(oldKeymaps.map((keymap) => keymap.local), 9 /* EnablementState.DisabledGlobally */);
            }
        };
        this.notificationService.prompt(Severity.Info, localize('disableOtherKeymapsConfirmation', 'Disable other keymaps ({0}) to avoid conflicts between keybindings?', oldKeymaps.map((k) => `'${k.local.manifest.displayName}'`).join(', ')), [
            {
                label: localize('yes', 'Yes'),
                run: () => onPrompt(true),
            },
            {
                label: localize('no', 'No'),
                run: () => onPrompt(false),
            },
        ]);
    }
};
KeymapExtensions = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IExtensionRecommendationsService),
    __param(3, ILifecycleService),
    __param(4, INotificationService)
], KeymapExtensions);
export { KeymapExtensions };
function onExtensionChanged(accessor) {
    const extensionService = accessor.get(IExtensionManagementService);
    const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
    const onDidInstallExtensions = Event.chain(extensionService.onDidInstallExtensions, ($) => $.filter((e) => e.some(({ operation }) => operation === 2 /* InstallOperation.Install */)).map((e) => e.map(({ identifier }) => identifier)));
    return Event.debounce(Event.any(Event.any(onDidInstallExtensions, Event.map(extensionService.onDidUninstallExtension, (e) => [e.identifier])), Event.map(extensionEnablementService.onEnablementChanged, (extensions) => extensions.map((e) => e.identifier))), (result, identifiers) => {
        result = result || [];
        for (const identifier of identifiers) {
            if (result.some((l) => !areSameExtensions(l, identifier))) {
                result.push(identifier);
            }
        }
        return result;
    });
}
export async function getInstalledExtensions(accessor) {
    const extensionService = accessor.get(IExtensionManagementService);
    const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
    const extensions = await extensionService.getInstalled();
    return extensions.map((extension) => {
        return {
            identifier: extension.identifier,
            local: extension,
            globallyEnabled: extensionEnablementService.isEnabled(extension),
        };
    });
}
function isKeymapExtension(tipsService, extension) {
    const cats = extension.local.manifest.categories;
    return ((cats && cats.indexOf('Keymaps') !== -1) ||
        tipsService
            .getKeymapRecommendations()
            .some((extensionId) => areSameExtensions({ id: extensionId }, extension.local.identifier)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1V0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uc1V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTiwyQkFBMkIsR0FJM0IsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sb0NBQW9DLEdBRXBDLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDaEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkYsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzlHLE9BQU8sRUFDTixRQUFRLEVBQ1Isb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFRMUQsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBQy9DLFlBQ3lDLG9CQUEyQyxFQUVsRSwwQkFBZ0UsRUFFaEUsV0FBNkMsRUFDM0MsZ0JBQW1DLEVBQ2YsbUJBQXlDO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBUmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFbEUsK0JB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