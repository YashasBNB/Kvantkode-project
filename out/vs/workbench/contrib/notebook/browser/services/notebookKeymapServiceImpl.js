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
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity, } from '../../../../../platform/notification/common/notification.js';
import { getInstalledExtensions, } from '../../../extensions/common/extensionsUtils.js';
import { IWorkbenchExtensionEnablementService, } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IExtensionManagementService, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { Memento } from '../../../../common/memento.js';
import { distinct } from '../../../../../base/common/arrays.js';
function onExtensionChanged(accessor) {
    const extensionService = accessor.get(IExtensionManagementService);
    const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
    const onDidInstallExtensions = Event.chain(extensionService.onDidInstallExtensions, ($) => $.filter((e) => e.some(({ operation }) => operation === 2 /* InstallOperation.Install */)).map((e) => e.map(({ identifier }) => identifier)));
    return Event.debounce(Event.any(Event.any(onDidInstallExtensions, Event.map(extensionService.onDidUninstallExtension, (e) => [e.identifier])), Event.map(extensionEnablementService.onEnablementChanged, (extensions) => extensions.map((e) => e.identifier))), (result, identifiers) => {
        result = result || (identifiers.length ? [identifiers[0]] : []);
        for (const identifier of identifiers) {
            if (result.some((l) => !areSameExtensions(l, identifier))) {
                result.push(identifier);
            }
        }
        return result;
    });
}
const hasRecommendedKeymapKey = 'hasRecommendedKeymap';
let NotebookKeymapService = class NotebookKeymapService extends Disposable {
    constructor(instantiationService, extensionEnablementService, notificationService, storageService, lifecycleService) {
        super();
        this.instantiationService = instantiationService;
        this.extensionEnablementService = extensionEnablementService;
        this.notificationService = notificationService;
        this.notebookKeymapMemento = new Memento('notebookKeymap', storageService);
        this.notebookKeymap = this.notebookKeymapMemento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this._register(lifecycleService.onDidShutdown(() => this.dispose()));
        this._register(this.instantiationService.invokeFunction(onExtensionChanged)((identifiers) => {
            Promise.all(identifiers.map((identifier) => this.checkForOtherKeymaps(identifier))).then(undefined, onUnexpectedError);
        }));
    }
    checkForOtherKeymaps(extensionIdentifier) {
        return this.instantiationService.invokeFunction(getInstalledExtensions).then((extensions) => {
            const keymaps = extensions.filter((extension) => isNotebookKeymapExtension(extension));
            const extension = keymaps.find((extension) => areSameExtensions(extension.identifier, extensionIdentifier));
            if (extension && extension.globallyEnabled) {
                // there is already a keymap extension
                this.notebookKeymap[hasRecommendedKeymapKey] = true;
                this.notebookKeymapMemento.saveMemento();
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
        this.notificationService.prompt(Severity.Info, localize('disableOtherKeymapsConfirmation', 'Disable other keymaps ({0}) to avoid conflicts between keybindings?', distinct(oldKeymaps.map((k) => k.local.manifest.displayName))
            .map((name) => `'${name}'`)
            .join(', ')), [
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
NotebookKeymapService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, INotificationService),
    __param(3, IStorageService),
    __param(4, ILifecycleService)
], NotebookKeymapService);
export { NotebookKeymapService };
export function isNotebookKeymapExtension(extension) {
    if (extension.local.manifest.extensionPack) {
        return false;
    }
    const keywords = extension.local.manifest.keywords;
    if (!keywords) {
        return false;
    }
    return keywords.indexOf('notebook-keymap') !== -1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXltYXBTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tLZXltYXBTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sK0NBQStDLENBQUE7QUFFdEQsT0FBTyxFQUVOLG9DQUFvQyxHQUNwQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFFTiwyQkFBMkIsR0FFM0IsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNqSCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsU0FBUyxrQkFBa0Is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