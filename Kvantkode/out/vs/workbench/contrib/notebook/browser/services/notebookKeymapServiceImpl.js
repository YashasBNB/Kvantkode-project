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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXltYXBTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0tleW1hcFNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV0RCxPQUFPLEVBRU4sb0NBQW9DLEdBQ3BDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUVOLDJCQUEyQixHQUUzQixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ2pILE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFpQixNQUFNLCtCQUErQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxTQUFTLGtC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