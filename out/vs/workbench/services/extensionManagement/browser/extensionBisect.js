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
var ExtensionBisectService_1, ExtensionBisectUi_1;
import { localize, localize2 } from '../../../../nls.js';
import { IExtensionManagementService, IGlobalExtensionEnablementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isResolverExtension, } from '../../../../platform/extensions/common/extensions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../host/browser/host.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchExtensionEnablementService } from '../common/extensionManagement.js';
// --- bisect service
export const IExtensionBisectService = createDecorator('IExtensionBisectService');
class BisectState {
    static fromJSON(raw) {
        if (!raw) {
            return undefined;
        }
        try {
            const data = JSON.parse(raw);
            return new BisectState(data.extensions, data.low, data.high, data.mid);
        }
        catch {
            return undefined;
        }
    }
    constructor(extensions, low, high, mid = ((low + high) / 2) | 0) {
        this.extensions = extensions;
        this.low = low;
        this.high = high;
        this.mid = mid;
    }
}
let ExtensionBisectService = class ExtensionBisectService {
    static { ExtensionBisectService_1 = this; }
    static { this._storageKey = 'extensionBisectState'; }
    constructor(logService, _storageService, _envService) {
        this._storageService = _storageService;
        this._envService = _envService;
        this._disabled = new Map();
        const raw = _storageService.get(ExtensionBisectService_1._storageKey, -1 /* StorageScope.APPLICATION */);
        this._state = BisectState.fromJSON(raw);
        if (this._state) {
            const { mid, high } = this._state;
            for (let i = 0; i < this._state.extensions.length; i++) {
                const isDisabled = i >= mid && i < high;
                this._disabled.set(this._state.extensions[i], isDisabled);
            }
            logService.warn('extension BISECT active', [...this._disabled]);
        }
    }
    get isActive() {
        return !!this._state;
    }
    get disabledCount() {
        return this._state ? this._state.high - this._state.mid : -1;
    }
    isDisabledByBisect(extension) {
        if (!this._state) {
            // bisect isn't active
            return false;
        }
        if (isResolverExtension(extension.manifest, this._envService.remoteAuthority)) {
            // the current remote resolver extension cannot be disabled
            return false;
        }
        if (this._isEnabledInEnv(extension)) {
            // Extension enabled in env cannot be disabled
            return false;
        }
        const disabled = this._disabled.get(extension.identifier.id);
        return disabled ?? false;
    }
    _isEnabledInEnv(extension) {
        return (Array.isArray(this._envService.enableExtensions) &&
            this._envService.enableExtensions.some((id) => areSameExtensions({ id }, extension.identifier)));
    }
    async start(extensions) {
        if (this._state) {
            throw new Error('invalid state');
        }
        const extensionIds = extensions.map((ext) => ext.identifier.id);
        const newState = new BisectState(extensionIds, 0, extensionIds.length, 0);
        this._storageService.store(ExtensionBisectService_1._storageKey, JSON.stringify(newState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this._storageService.flush();
    }
    async next(seeingBad) {
        if (!this._state) {
            throw new Error('invalid state');
        }
        // check if bad when all extensions are disabled
        if (seeingBad && this._state.mid === 0 && this._state.high === this._state.extensions.length) {
            return { bad: true, id: '' };
        }
        // check if there is only one left
        if (this._state.low === this._state.high - 1) {
            await this.reset();
            return { id: this._state.extensions[this._state.low], bad: seeingBad };
        }
        // the second half is disabled so if there is still bad it must be
        // in the first half
        const nextState = new BisectState(this._state.extensions, seeingBad ? this._state.low : this._state.mid, seeingBad ? this._state.mid : this._state.high);
        this._storageService.store(ExtensionBisectService_1._storageKey, JSON.stringify(nextState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this._storageService.flush();
        return undefined;
    }
    async reset() {
        this._storageService.remove(ExtensionBisectService_1._storageKey, -1 /* StorageScope.APPLICATION */);
        await this._storageService.flush();
    }
};
ExtensionBisectService = ExtensionBisectService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStorageService),
    __param(2, IWorkbenchEnvironmentService)
], ExtensionBisectService);
registerSingleton(IExtensionBisectService, ExtensionBisectService, 1 /* InstantiationType.Delayed */);
// --- bisect UI
let ExtensionBisectUi = class ExtensionBisectUi {
    static { ExtensionBisectUi_1 = this; }
    static { this.ctxIsBisectActive = new RawContextKey('isExtensionBisectActive', false); }
    constructor(contextKeyService, _extensionBisectService, _notificationService, _commandService) {
        this._extensionBisectService = _extensionBisectService;
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        if (_extensionBisectService.isActive) {
            ExtensionBisectUi_1.ctxIsBisectActive.bindTo(contextKeyService).set(true);
            this._showBisectPrompt();
        }
    }
    _showBisectPrompt() {
        const goodPrompt = {
            label: localize('I cannot reproduce', "I can't reproduce"),
            run: () => this._commandService.executeCommand('extension.bisect.next', false),
        };
        const badPrompt = {
            label: localize('This is Bad', 'I can reproduce'),
            run: () => this._commandService.executeCommand('extension.bisect.next', true),
        };
        const stop = {
            label: 'Stop Bisect',
            run: () => this._commandService.executeCommand('extension.bisect.stop'),
        };
        const message = this._extensionBisectService.disabledCount === 1
            ? localize('bisect.singular', 'Extension Bisect is active and has disabled 1 extension. Check if you can still reproduce the problem and proceed by selecting from these options.')
            : localize('bisect.plural', 'Extension Bisect is active and has disabled {0} extensions. Check if you can still reproduce the problem and proceed by selecting from these options.', this._extensionBisectService.disabledCount);
        this._notificationService.prompt(Severity.Info, message, [goodPrompt, badPrompt, stop], {
            sticky: true,
            priority: NotificationPriority.URGENT,
        });
    }
};
ExtensionBisectUi = ExtensionBisectUi_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IExtensionBisectService),
    __param(2, INotificationService),
    __param(3, ICommandService)
], ExtensionBisectUi);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(ExtensionBisectUi, 3 /* LifecyclePhase.Restored */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'extension.bisect.start',
            title: localize2('title.start', 'Start Extension Bisect'),
            category: Categories.Help,
            f1: true,
            precondition: ExtensionBisectUi.ctxIsBisectActive.negate(),
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', 'workbench.view.extensions'),
                group: '2_enablement',
                order: 4,
            },
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const hostService = accessor.get(IHostService);
        const extensionManagement = accessor.get(IExtensionManagementService);
        const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
        const extensionsBisect = accessor.get(IExtensionBisectService);
        const extensions = (await extensionManagement.getInstalled(1 /* ExtensionType.User */)).filter((ext) => extensionEnablementService.isEnabled(ext));
        const res = await dialogService.confirm({
            message: localize('msg.start', 'Extension Bisect'),
            detail: localize('detail.start', 'Extension Bisect will use binary search to find an extension that causes a problem. During the process the window reloads repeatedly (~{0} times). Each time you must confirm if you are still seeing problems.', (2 + Math.log2(extensions.length)) | 0),
            primaryButton: localize({ key: 'msg2', comment: ['&& denotes a mnemonic'] }, '&&Start Extension Bisect'),
        });
        if (res.confirmed) {
            await extensionsBisect.start(extensions);
            hostService.reload();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'extension.bisect.next',
            title: localize2('title.isBad', 'Continue Extension Bisect'),
            category: Categories.Help,
            f1: true,
            precondition: ExtensionBisectUi.ctxIsBisectActive,
        });
    }
    async run(accessor, seeingBad) {
        const dialogService = accessor.get(IDialogService);
        const hostService = accessor.get(IHostService);
        const bisectService = accessor.get(IExtensionBisectService);
        const productService = accessor.get(IProductService);
        const extensionEnablementService = accessor.get(IGlobalExtensionEnablementService);
        const commandService = accessor.get(ICommandService);
        if (!bisectService.isActive) {
            return;
        }
        if (seeingBad === undefined) {
            const goodBadStopCancel = await this._checkForBad(dialogService, bisectService);
            if (goodBadStopCancel === null) {
                return;
            }
            seeingBad = goodBadStopCancel;
        }
        if (seeingBad === undefined) {
            await bisectService.reset();
            hostService.reload();
            return;
        }
        const done = await bisectService.next(seeingBad);
        if (!done) {
            hostService.reload();
            return;
        }
        if (done.bad) {
            // DONE but nothing found
            await dialogService.info(localize('done.msg', 'Extension Bisect'), localize('done.detail2', 'Extension Bisect is done but no extension has been identified. This might be a problem with {0}.', productService.nameShort));
        }
        else {
            // DONE and identified extension
            const res = await dialogService.confirm({
                type: Severity.Info,
                message: localize('done.msg', 'Extension Bisect'),
                primaryButton: localize({ key: 'report', comment: ['&& denotes a mnemonic'] }, '&&Report Issue & Continue'),
                cancelButton: localize('continue', 'Continue'),
                detail: localize('done.detail', 'Extension Bisect is done and has identified {0} as the extension causing the problem.', done.id),
                checkbox: {
                    label: localize('done.disbale', 'Keep this extension disabled'),
                    checked: true,
                },
            });
            if (res.checkboxChecked) {
                await extensionEnablementService.disableExtension({ id: done.id }, undefined);
            }
            if (res.confirmed) {
                await commandService.executeCommand('workbench.action.openIssueReporter', done.id);
            }
        }
        await bisectService.reset();
        hostService.reload();
    }
    async _checkForBad(dialogService, bisectService) {
        const { result } = await dialogService.prompt({
            type: Severity.Info,
            message: localize('msg.next', 'Extension Bisect'),
            detail: localize('bisect', 'Extension Bisect is active and has disabled {0} extensions. Check if you can still reproduce the problem and proceed by selecting from these options.', bisectService.disabledCount),
            buttons: [
                {
                    label: localize({ key: 'next.good', comment: ['&& denotes a mnemonic'] }, "I ca&&n't reproduce"),
                    run: () => false, // good now
                },
                {
                    label: localize({ key: 'next.bad', comment: ['&& denotes a mnemonic'] }, 'I can &&reproduce'),
                    run: () => true, // bad
                },
                {
                    label: localize({ key: 'next.stop', comment: ['&& denotes a mnemonic'] }, '&&Stop Bisect'),
                    run: () => undefined, // stop
                },
            ],
            cancelButton: {
                label: localize({ key: 'next.cancel', comment: ['&& denotes a mnemonic'] }, '&&Cancel Bisect'),
                run: () => null, // cancel
            },
        });
        return result;
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'extension.bisect.stop',
            title: localize2('title.stop', 'Stop Extension Bisect'),
            category: Categories.Help,
            f1: true,
            precondition: ExtensionBisectUi.ctxIsBisectActive,
        });
    }
    async run(accessor) {
        const extensionsBisect = accessor.get(IExtensionBisectService);
        const hostService = accessor.get(IHostService);
        await extensionsBisect.reset();
        hostService.reload();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uQmlzZWN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvYnJvd3Nlci9leHRlbnNpb25CaXNlY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixpQ0FBaUMsR0FFakMsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUdOLG1CQUFtQixHQUNuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sb0JBQW9CLEVBRXBCLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RixP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