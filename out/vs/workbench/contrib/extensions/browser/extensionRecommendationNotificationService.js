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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25Ob3RpZmljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25Ob3RpZmljYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsRUFDdkIsZ0JBQWdCLEVBQ2hCLE9BQU8sR0FDUCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDOUcsT0FBTyxFQUtOLDRCQUE0QixHQUM1QixNQUFNLGtGQUFrRixDQUFBO0FBQ3pGLE9BQU8sRUFFTixvQkFBb0IsRUFH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