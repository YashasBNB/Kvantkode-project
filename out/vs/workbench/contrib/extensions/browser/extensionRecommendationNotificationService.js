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
import { distinct } from '../../../../base/common/arrays.js';
import { createCancelablePromise, Promises, raceCancellablePromises, raceCancellation, timeout, } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RecommendationSourceToString, } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataSyncEnablementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionManagementService, IWorkbenchExtensionEnablementService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
const ignoreImportantExtensionRecommendationStorageKey = 'extensionsAssistant/importantRecommendationsIgnore';
const donotShowWorkspaceRecommendationsStorageKey = 'extensionsAssistant/workspaceRecommendationsIgnore';
class RecommendationsNotification extends Disposable {
    constructor(severity, message, choices, notificationService) {
        super();
        this.severity = severity;
        this.message = message;
        this.choices = choices;
        this.notificationService = notificationService;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.cancelled = false;
        this.onDidCloseDisposable = this._register(new MutableDisposable());
        this.onDidChangeVisibilityDisposable = this._register(new MutableDisposable());
    }
    show() {
        if (!this.notificationHandle) {
            this.updateNotificationHandle(this.notificationService.prompt(this.severity, this.message, this.choices, {
                sticky: true,
                onCancel: () => (this.cancelled = true),
            }));
        }
    }
    hide() {
        if (this.notificationHandle) {
            this.onDidCloseDisposable.clear();
            this.notificationHandle.close();
            this.cancelled = false;
            this.updateNotificationHandle(this.notificationService.prompt(this.severity, this.message, this.choices, {
                priority: NotificationPriority.SILENT,
                onCancel: () => (this.cancelled = true),
            }));
        }
    }
    isCancelled() {
        return this.cancelled;
    }
    updateNotificationHandle(notificationHandle) {
        this.onDidCloseDisposable.clear();
        this.onDidChangeVisibilityDisposable.clear();
        this.notificationHandle = notificationHandle;
        this.onDidCloseDisposable.value = this.notificationHandle.onDidClose(() => {
            this.onDidCloseDisposable.dispose();
            this.onDidChangeVisibilityDisposable.dispose();
            this._onDidClose.fire();
            this._onDidClose.dispose();
            this._onDidChangeVisibility.dispose();
        });
        this.onDidChangeVisibilityDisposable.value = this.notificationHandle.onDidChangeVisibility((e) => this._onDidChangeVisibility.fire(e));
    }
}
let ExtensionRecommendationNotificationService = class ExtensionRecommendationNotificationService extends Disposable {
    // Ignored Important Recommendations
    get ignoredRecommendations() {
        return distinct([
            ...(JSON.parse(this.storageService.get(ignoreImportantExtensionRecommendationStorageKey, 0 /* StorageScope.PROFILE */, '[]'))),
        ].map((i) => i.toLowerCase()));
    }
    constructor(configurationService, storageService, notificationService, telemetryService, extensionsWorkbenchService, extensionManagementService, extensionEnablementService, extensionIgnoredRecommendationsService, userDataSyncEnablementService, workbenchEnvironmentService, uriIdentityService) {
        super();
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionIgnoredRecommendationsService = extensionIgnoredRecommendationsService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.workbenchEnvironmentService = workbenchEnvironmentService;
        this.uriIdentityService = uriIdentityService;
        this.recommendedExtensions = [];
        this.recommendationSources = [];
        this.pendingNotificaitons = [];
    }
    hasToIgnoreRecommendationNotifications() {
        const config = this.configurationService.getValue('extensions');
        return config.ignoreRecommendations || !!config.showRecommendationsOnlyOnDemand;
    }
    async promptImportantExtensionsInstallNotification(extensionRecommendations) {
        const ignoredRecommendations = [
            ...this.extensionIgnoredRecommendationsService.ignoredRecommendations,
            ...this.ignoredRecommendations,
        ];
        const extensions = extensionRecommendations.extensions.filter((id) => !ignoredRecommendations.includes(id));
        if (!extensions.length) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        return this.promptRecommendationsNotification({ ...extensionRecommendations, extensions }, {
            onDidInstallRecommendedExtensions: (extensions) => extensions.forEach((extension) => this.telemetryService.publicLog2('extensionRecommendations:popup', {
                userReaction: 'install',
                extensionId: extension.identifier.id,
                source: RecommendationSourceToString(extensionRecommendations.source),
            })),
            onDidShowRecommendedExtensions: (extensions) => extensions.forEach((extension) => this.telemetryService.publicLog2('extensionRecommendations:popup', {
                userReaction: 'show',
                extensionId: extension.identifier.id,
                source: RecommendationSourceToString(extensionRecommendations.source),
            })),
            onDidCancelRecommendedExtensions: (extensions) => extensions.forEach((extension) => this.telemetryService.publicLog2('extensionRecommendations:popup', {
                userReaction: 'cancelled',
                extensionId: extension.identifier.id,
                source: RecommendationSourceToString(extensionRecommendations.source),
            })),
            onDidNeverShowRecommendedExtensionsAgain: (extensions) => {
                for (const extension of extensions) {
                    this.addToImportantRecommendationsIgnore(extension.identifier.id);
                    this.telemetryService.publicLog2('extensionRecommendations:popup', {
                        userReaction: 'neverShowAgain',
                        extensionId: extension.identifier.id,
                        source: RecommendationSourceToString(extensionRecommendations.source),
                    });
                }
                this.notificationService.prompt(Severity.Info, localize('ignoreExtensionRecommendations', 'Do you want to ignore all extension recommendations?'), [
                    {
                        label: localize('ignoreAll', 'Yes, Ignore All'),
                        run: () => this.setIgnoreRecommendationsConfig(true),
                    },
                    {
                        label: localize('no', 'No'),
                        run: () => this.setIgnoreRecommendationsConfig(false),
                    },
                ]);
            },
        });
    }
    async promptWorkspaceRecommendations(recommendations) {
        if (this.storageService.getBoolean(donotShowWorkspaceRecommendationsStorageKey, 1 /* StorageScope.WORKSPACE */, false)) {
            return;
        }
        let installed = await this.extensionManagementService.getInstalled();
        installed = installed.filter((l) => this.extensionEnablementService.getEnablementState(l) !==
            1 /* EnablementState.DisabledByExtensionKind */); // Filter extensions disabled by kind
        recommendations = recommendations.filter((recommendation) => installed.every((local) => isString(recommendation)
            ? !areSameExtensions({ id: recommendation }, local.identifier)
            : !this.uriIdentityService.extUri.isEqual(recommendation, local.location)));
        if (!recommendations.length) {
            return;
        }
        await this.promptRecommendationsNotification({
            extensions: recommendations,
            source: 2 /* RecommendationSource.WORKSPACE */,
            name: localize({
                key: 'this repository',
                comment: ['this repository means the current repository that is opened'],
            }, 'this repository'),
        }, {
            onDidInstallRecommendedExtensions: () => this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'install' }),
            onDidShowRecommendedExtensions: () => this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'show' }),
            onDidCancelRecommendedExtensions: () => this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'cancelled' }),
            onDidNeverShowRecommendedExtensionsAgain: () => {
                this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'neverShowAgain' });
                this.storageService.store(donotShowWorkspaceRecommendationsStorageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            },
        });
    }
    async promptRecommendationsNotification({ extensions: extensionIds, source, name, searchValue }, recommendationsNotificationActions) {
        if (this.hasToIgnoreRecommendationNotifications()) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        // Do not show exe based recommendations in remote window
        if (source === 3 /* RecommendationSource.EXE */ && this.workbenchEnvironmentService.remoteAuthority) {
            return "incompatibleWindow" /* RecommendationsNotificationResult.IncompatibleWindow */;
        }
        // Ignore exe recommendation if the window
        // 		=> has shown an exe based recommendation already
        // 		=> or has shown any two recommendations already
        if (source === 3 /* RecommendationSource.EXE */ &&
            (this.recommendationSources.includes(3 /* RecommendationSource.EXE */) ||
                this.recommendationSources.length >= 2)) {
            return "toomany" /* RecommendationsNotificationResult.TooMany */;
        }
        this.recommendationSources.push(source);
        // Ignore exe recommendation if recommendations are already shown
        if (source === 3 /* RecommendationSource.EXE */ &&
            extensionIds.every((id) => isString(id) && this.recommendedExtensions.includes(id))) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        const extensions = await this.getInstallableExtensions(extensionIds);
        if (!extensions.length) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        this.recommendedExtensions = distinct([
            ...this.recommendedExtensions,
            ...extensionIds.filter(isString),
        ]);
        let extensionsMessage = '';
        if (extensions.length === 1) {
            extensionsMessage = localize('extensionFromPublisher', "'{0}' extension from {1}", extensions[0].displayName, extensions[0].publisherDisplayName);
        }
        else {
            const publishers = [
                ...extensions.reduce((result, extension) => result.add(extension.publisherDisplayName), new Set()),
            ];
            if (publishers.length > 2) {
                extensionsMessage = localize('extensionsFromMultiplePublishers', 'extensions from {0}, {1} and others', publishers[0], publishers[1]);
            }
            else if (publishers.length === 2) {
                extensionsMessage = localize('extensionsFromPublishers', 'extensions from {0} and {1}', publishers[0], publishers[1]);
            }
            else {
                extensionsMessage = localize('extensionsFromPublisher', 'extensions from {0}', publishers[0]);
            }
        }
        let message = localize('recommended', 'Do you want to install the recommended {0} for {1}?', extensionsMessage, name);
        if (source === 3 /* RecommendationSource.EXE */) {
            message = localize({
                key: 'exeRecommended',
                comment: ['Placeholder string is the name of the software that is installed.'],
            }, 'You have {0} installed on your system. Do you want to install the recommended {1} for it?', name, extensionsMessage);
        }
        if (!searchValue) {
            searchValue =
                source === 2 /* RecommendationSource.WORKSPACE */
                    ? '@recommended'
                    : extensions.map((extensionId) => `@id:${extensionId.identifier.id}`).join(' ');
        }
        const donotShowAgainLabel = source === 2 /* RecommendationSource.WORKSPACE */
            ? localize('donotShowAgain', "Don't Show Again for this Repository")
            : extensions.length > 1
                ? localize('donotShowAgainExtension', "Don't Show Again for these Extensions")
                : localize('donotShowAgainExtensionSingle', "Don't Show Again for this Extension");
        return raceCancellablePromises([
            this._registerP(this.showRecommendationsNotification(extensions, message, searchValue, donotShowAgainLabel, source, recommendationsNotificationActions)),
            this._registerP(this.waitUntilRecommendationsAreInstalled(extensions)),
        ]);
    }
    showRecommendationsNotification(extensions, message, searchValue, donotShowAgainLabel, source, { onDidInstallRecommendedExtensions, onDidShowRecommendedExtensions, onDidCancelRecommendedExtensions, onDidNeverShowRecommendedExtensionsAgain, }) {
        return createCancelablePromise(async (token) => {
            let accepted = false;
            const choices = [];
            const installExtensions = async (isMachineScoped) => {
                this.extensionsWorkbenchService.openSearch(searchValue);
                onDidInstallRecommendedExtensions(extensions);
                const galleryExtensions = [], resourceExtensions = [];
                for (const extension of extensions) {
                    if (extension.gallery) {
                        galleryExtensions.push(extension.gallery);
                    }
                    else if (extension.resourceExtension) {
                        resourceExtensions.push(extension);
                    }
                }
                await Promises.settled([
                    Promises.settled(extensions.map((extension) => this.extensionsWorkbenchService.open(extension, { pinned: true }))),
                    galleryExtensions.length
                        ? this.extensionManagementService.installGalleryExtensions(galleryExtensions.map((e) => ({ extension: e, options: { isMachineScoped } })))
                        : Promise.resolve(),
                    resourceExtensions.length
                        ? Promise.allSettled(resourceExtensions.map((r) => this.extensionsWorkbenchService.install(r)))
                        : Promise.resolve(),
                ]);
            };
            choices.push({
                label: localize('install', 'Install'),
                run: () => installExtensions(false),
                menu: this.userDataSyncEnablementService.isEnabled() &&
                    this.userDataSyncEnablementService.isResourceEnabled("extensions" /* SyncResource.Extensions */)
                    ? [
                        {
                            label: localize('install and do no sync', 'Install (Do not sync)'),
                            run: () => installExtensions(true),
                        },
                    ]
                    : undefined,
            });
            choices.push(...[
                {
                    label: localize('show recommendations', 'Show Recommendations'),
                    run: async () => {
                        onDidShowRecommendedExtensions(extensions);
                        for (const extension of extensions) {
                            this.extensionsWorkbenchService.open(extension, { pinned: true });
                        }
                        this.extensionsWorkbenchService.openSearch(searchValue);
                    },
                },
                {
                    label: donotShowAgainLabel,
                    isSecondary: true,
                    run: () => {
                        onDidNeverShowRecommendedExtensionsAgain(extensions);
                    },
                },
            ]);
            try {
                accepted = await this.doShowRecommendationsNotification(Severity.Info, message, choices, source, token);
            }
            catch (error) {
                if (!isCancellationError(error)) {
                    throw error;
                }
            }
            if (accepted) {
                return "reacted" /* RecommendationsNotificationResult.Accepted */;
            }
            else {
                onDidCancelRecommendedExtensions(extensions);
                return "cancelled" /* RecommendationsNotificationResult.Cancelled */;
            }
        });
    }
    waitUntilRecommendationsAreInstalled(extensions) {
        const installedExtensions = [];
        const disposables = new DisposableStore();
        return createCancelablePromise(async (token) => {
            disposables.add(token.onCancellationRequested((e) => disposables.dispose()));
            return new Promise((c, e) => {
                disposables.add(this.extensionManagementService.onInstallExtension((e) => {
                    installedExtensions.push(e.identifier.id.toLowerCase());
                    if (extensions.every((e) => installedExtensions.includes(e.identifier.id.toLowerCase()))) {
                        c("reacted" /* RecommendationsNotificationResult.Accepted */);
                    }
                }));
            });
        });
    }
    /**
     * Show recommendations in Queue
     * At any time only one recommendation is shown
     * If a new recommendation comes in
     * 		=> If no recommendation is visible, show it immediately
     *		=> Otherwise, add to the pending queue
     * 			=> If it is not exe based and has higher or same priority as current, hide the current notification after showing it for 3s.
     * 			=> Otherwise wait until the current notification is hidden.
     */
    async doShowRecommendationsNotification(severity, message, choices, source, token) {
        const disposables = new DisposableStore();
        try {
            const recommendationsNotification = disposables.add(new RecommendationsNotification(severity, message, choices, this.notificationService));
            disposables.add(Event.once(Event.filter(recommendationsNotification.onDidChangeVisibility, (e) => !e))(() => this.showNextNotification()));
            if (this.visibleNotification) {
                const index = this.pendingNotificaitons.length;
                disposables.add(token.onCancellationRequested(() => this.pendingNotificaitons.splice(index, 1)));
                this.pendingNotificaitons.push({ recommendationsNotification, source, token });
                if (source !== 3 /* RecommendationSource.EXE */ && source <= this.visibleNotification.source) {
                    this.hideVisibleNotification(3000);
                }
            }
            else {
                this.visibleNotification = { recommendationsNotification, source, from: Date.now() };
                recommendationsNotification.show();
            }
            await raceCancellation(new Promise((c) => disposables.add(Event.once(recommendationsNotification.onDidClose)(c))), token);
            return !recommendationsNotification.isCancelled();
        }
        finally {
            disposables.dispose();
        }
    }
    showNextNotification() {
        const index = this.getNextPendingNotificationIndex();
        const [nextNotificaiton] = index > -1 ? this.pendingNotificaitons.splice(index, 1) : [];
        // Show the next notification after a delay of 500ms (after the current notification is dismissed)
        timeout(nextNotificaiton ? 500 : 0).then(() => {
            this.unsetVisibileNotification();
            if (nextNotificaiton) {
                this.visibleNotification = {
                    recommendationsNotification: nextNotificaiton.recommendationsNotification,
                    source: nextNotificaiton.source,
                    from: Date.now(),
                };
                nextNotificaiton.recommendationsNotification.show();
            }
        });
    }
    /**
     * Return the recent high priroity pending notification
     */
    getNextPendingNotificationIndex() {
        let index = this.pendingNotificaitons.length - 1;
        if (this.pendingNotificaitons.length) {
            for (let i = 0; i < this.pendingNotificaitons.length; i++) {
                if (this.pendingNotificaitons[i].source <= this.pendingNotificaitons[index].source) {
                    index = i;
                }
            }
        }
        return index;
    }
    hideVisibleNotification(timeInMillis) {
        if (this.visibleNotification && !this.hideVisibleNotificationPromise) {
            const visibleNotification = this.visibleNotification;
            this.hideVisibleNotificationPromise = timeout(Math.max(timeInMillis - (Date.now() - visibleNotification.from), 0));
            this.hideVisibleNotificationPromise.then(() => visibleNotification.recommendationsNotification.hide());
        }
    }
    unsetVisibileNotification() {
        this.hideVisibleNotificationPromise?.cancel();
        this.hideVisibleNotificationPromise = undefined;
        this.visibleNotification = undefined;
    }
    async getInstallableExtensions(recommendations) {
        const result = [];
        if (recommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of recommendations) {
                if (typeof recommendation === 'string') {
                    galleryExtensions.push(recommendation);
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            if (galleryExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getExtensions(galleryExtensions.map((id) => ({ id })), { source: 'install-recommendations' }, CancellationToken.None);
                for (const extension of extensions) {
                    if (extension.gallery &&
                        (await this.extensionManagementService.canInstall(extension.gallery)) === true) {
                        result.push(extension);
                    }
                }
            }
            if (resourceExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getResourceExtensions(resourceExtensions, true);
                for (const extension of extensions) {
                    if ((await this.extensionsWorkbenchService.canInstall(extension)) === true) {
                        result.push(extension);
                    }
                }
            }
        }
        return result;
    }
    addToImportantRecommendationsIgnore(id) {
        const importantRecommendationsIgnoreList = [...this.ignoredRecommendations];
        if (!importantRecommendationsIgnoreList.includes(id.toLowerCase())) {
            importantRecommendationsIgnoreList.push(id.toLowerCase());
            this.storageService.store(ignoreImportantExtensionRecommendationStorageKey, JSON.stringify(importantRecommendationsIgnoreList), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
    setIgnoreRecommendationsConfig(configVal) {
        this.configurationService.updateValue('extensions.ignoreRecommendations', configVal);
    }
    _registerP(o) {
        this._register(toDisposable(() => o.cancel()));
        return o;
    }
};
ExtensionRecommendationNotificationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IStorageService),
    __param(2, INotificationService),
    __param(3, ITelemetryService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IWorkbenchExtensionManagementService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IExtensionIgnoredRecommendationsService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IUriIdentityService)
], ExtensionRecommendationNotificationService);
export { ExtensionRecommendationNotificationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25Ob3RpZmljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvblJlY29tbWVuZGF0aW9uTm90aWZpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixRQUFRLEVBQ1IsdUJBQXVCLEVBQ3ZCLGdCQUFnQixFQUNoQixPQUFPLEdBQ1AsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzlHLE9BQU8sRUFLTiw0QkFBNEIsR0FDNUIsTUFBTSxrRkFBa0YsQ0FBQTtBQUN6RixPQUFPLEVBRU4sb0JBQW9CLEVBR3BCLG9CQUFvQixFQUNwQixRQUFRLEdB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