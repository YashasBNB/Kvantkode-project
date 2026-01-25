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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1V0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLDJCQUEyQixHQUkzQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTixvQ0FBb0MsR0FFcEMsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNoSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVuRixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDOUcsT0FBTyxFQUNOLFFBQVEsRUFDUixvQkFBb0IsR0FDcEIsTUFBTSwwREFBMEQsQ0FBQTtBQVExRCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFDL0MsWUFDeUMsb0JBQTJDLEVBRWxFLDBCQUFnRSxFQUVoRSxXQUE2QyxFQUMzQyxnQkFBbUMsRUFDZixtQkFBeUM7UUFFaEYsS0FBSyxFQUFFLENBQUE7UUFSaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUVs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