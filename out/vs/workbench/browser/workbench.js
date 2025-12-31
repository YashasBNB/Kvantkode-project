/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './style.js';
import { runWhenWindowIdle } from '../../base/browser/dom.js';
import { Event, Emitter, setGlobalLeakWarningThreshold } from '../../base/common/event.js';
import { RunOnceScheduler, timeout } from '../../base/common/async.js';
import { isFirefox, isSafari, isChrome } from '../../base/browser/browser.js';
import { mark } from '../../base/common/performance.js';
import { onUnexpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { isWindows, isLinux, isWeb, isNative, isMacintosh } from '../../base/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../common/contributions.js';
import { EditorExtensions } from '../common/editor.js';
import { getSingletonServiceDescriptors } from '../../platform/instantiation/common/extensions.js';
import { IWorkbenchLayoutService, positionToString, } from '../services/layout/browser/layoutService.js';
import { IStorageService, WillSaveStateReason, } from '../../platform/storage/common/storage.js';
import { IConfigurationService, } from '../../platform/configuration/common/configuration.js';
import { ILifecycleService, } from '../services/lifecycle/common/lifecycle.js';
import { INotificationService } from '../../platform/notification/common/notification.js';
import { NotificationsCenter } from './parts/notifications/notificationsCenter.js';
import { NotificationsAlerts } from './parts/notifications/notificationsAlerts.js';
import { NotificationsStatus } from './parts/notifications/notificationsStatus.js';
import { registerNotificationCommands } from './parts/notifications/notificationsCommands.js';
import { NotificationsToasts } from './parts/notifications/notificationsToasts.js';
import { setARIAContainer } from '../../base/browser/ui/aria/aria.js';
import { FontMeasurements } from '../../editor/browser/config/fontMeasurements.js';
import { BareFontInfo } from '../../editor/common/config/fontInfo.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { WorkbenchContextKeysHandler } from './contextkeys.js';
import { coalesce } from '../../base/common/arrays.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { Layout } from './layout.js';
import { IHostService } from '../services/host/browser/host.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { mainWindow } from '../../base/browser/window.js';
import { PixelRatio } from '../../base/browser/pixelRatio.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../platform/hover/browser/hover.js';
import { setHoverDelegateFactory } from '../../base/browser/ui/hover/hoverDelegateFactory.js';
import { setBaseLayerHoverDelegate } from '../../base/browser/ui/hover/hoverDelegate2.js';
import { AccessibilityProgressSignalScheduler } from '../../platform/accessibilitySignal/browser/progressAccessibilitySignalScheduler.js';
import { setProgressAcccessibilitySignalScheduler } from '../../base/browser/ui/progressbar/progressAccessibilitySignal.js';
import { AccessibleViewRegistry } from '../../platform/accessibility/browser/accessibleViewRegistry.js';
import { NotificationAccessibleView } from './parts/notifications/notificationAccessibleView.js';
export class Workbench extends Layout {
    constructor(parent, options, serviceCollection, logService) {
        super(parent);
        this.options = options;
        this.serviceCollection = serviceCollection;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onDidShutdown = this._register(new Emitter());
        this.onDidShutdown = this._onDidShutdown.event;
        this.previousUnexpectedError = {
            message: undefined,
            time: 0,
        };
        // Perf: measure workbench startup time
        mark('code/willStartWorkbench');
        this.registerErrorHandler(logService);
    }
    registerErrorHandler(logService) {
        // Listen on unhandled rejection events
        // Note: intentionally not registered as disposable to handle
        //       errors that can occur during shutdown phase.
        mainWindow.addEventListener('unhandledrejection', (event) => {
            // See https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent
            onUnexpectedError(event.reason);
            // Prevent the printing of this event to the console
            event.preventDefault();
        });
        // Install handler for unexpected errors
        setUnexpectedErrorHandler((error) => this.handleUnexpectedError(error, logService));
    }
    handleUnexpectedError(error, logService) {
        const message = toErrorMessage(error, true);
        if (!message) {
            return;
        }
        const now = Date.now();
        if (message === this.previousUnexpectedError.message &&
            now - this.previousUnexpectedError.time <= 1000) {
            return; // Return if error message identical to previous and shorter than 1 second
        }
        this.previousUnexpectedError.time = now;
        this.previousUnexpectedError.message = message;
        // Log it
        logService.error(message);
    }
    startup() {
        try {
            // Configure emitter leak warning threshold
            this._register(setGlobalLeakWarningThreshold(175));
            // Services
            const instantiationService = this.initServices(this.serviceCollection);
            instantiationService.invokeFunction((accessor) => {
                const lifecycleService = accessor.get(ILifecycleService);
                const storageService = accessor.get(IStorageService);
                const configurationService = accessor.get(IConfigurationService);
                const hostService = accessor.get(IHostService);
                const hoverService = accessor.get(IHoverService);
                const dialogService = accessor.get(IDialogService);
                const notificationService = accessor.get(INotificationService);
                // Default Hover Delegate must be registered before creating any workbench/layout components
                // as these possibly will use the default hover delegate
                setHoverDelegateFactory((placement, enableInstantHover) => instantiationService.createInstance(WorkbenchHoverDelegate, placement, { instantHover: enableInstantHover }, {}));
                setBaseLayerHoverDelegate(hoverService);
                // Layout
                this.initLayout(accessor);
                // Registries
                Registry.as(WorkbenchExtensions.Workbench).start(accessor);
                Registry.as(EditorExtensions.EditorFactory).start(accessor);
                // Context Keys
                this._register(instantiationService.createInstance(WorkbenchContextKeysHandler));
                // Register Listeners
                this.registerListeners(lifecycleService, storageService, configurationService, hostService, dialogService);
                // Render Workbench
                this.renderWorkbench(instantiationService, notificationService, storageService, configurationService);
                // Workbench Layout
                this.createWorkbenchLayout();
                // Layout
                this.layout();
                // Restore
                this.restore(lifecycleService);
            });
            return instantiationService;
        }
        catch (error) {
            onUnexpectedError(error);
            throw error; // rethrow because this is a critical issue we cannot handle properly here
        }
    }
    initServices(serviceCollection) {
        // Layout Service
        serviceCollection.set(IWorkbenchLayoutService, this);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.desktop.main.ts` if the service
        //       is desktop only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // All Contributed Services
        const contributedServices = getSingletonServiceDescriptors();
        for (const [id, descriptor] of contributedServices) {
            serviceCollection.set(id, descriptor);
        }
        const instantiationService = new InstantiationService(serviceCollection, true);
        // Wrap up
        instantiationService.invokeFunction((accessor) => {
            const lifecycleService = accessor.get(ILifecycleService);
            // TODO@Sandeep debt around cyclic dependencies
            const configurationService = accessor.get(IConfigurationService);
            if (typeof configurationService.acquireInstantiationService === 'function') {
                configurationService.acquireInstantiationService(instantiationService);
            }
            // Signal to lifecycle that services are set
            lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        });
        return instantiationService;
    }
    registerListeners(lifecycleService, storageService, configurationService, hostService, dialogService) {
        // Configuration changes
        this._register(configurationService.onDidChangeConfiguration((e) => this.updateFontAliasing(e, configurationService)));
        // Font Info
        if (isNative) {
            this._register(storageService.onWillSaveState((e) => {
                if (e.reason === WillSaveStateReason.SHUTDOWN) {
                    this.storeFontInfo(storageService);
                }
            }));
        }
        else {
            this._register(lifecycleService.onWillShutdown(() => this.storeFontInfo(storageService)));
        }
        // Lifecycle
        this._register(lifecycleService.onWillShutdown((event) => this._onWillShutdown.fire(event)));
        this._register(lifecycleService.onDidShutdown(() => {
            this._onDidShutdown.fire();
            this.dispose();
        }));
        // In some environments we do not get enough time to persist state on shutdown.
        // In other cases, VSCode might crash, so we periodically save state to reduce
        // the chance of loosing any state.
        // The window loosing focus is a good indication that the user has stopped working
        // in that window so we pick that at a time to collect state.
        this._register(hostService.onDidChangeFocus((focus) => {
            if (!focus) {
                storageService.flush();
            }
        }));
        // Dialogs showing/hiding
        this._register(dialogService.onWillShowDialog(() => this.mainContainer.classList.add('modal-dialog-visible')));
        this._register(dialogService.onDidShowDialog(() => this.mainContainer.classList.remove('modal-dialog-visible')));
    }
    updateFontAliasing(e, configurationService) {
        if (!isMacintosh) {
            return; // macOS only
        }
        if (e && !e.affectsConfiguration('workbench.fontAliasing')) {
            return;
        }
        const aliasing = configurationService.getValue('workbench.fontAliasing');
        if (this.fontAliasing === aliasing) {
            return;
        }
        this.fontAliasing = aliasing;
        // Remove all
        const fontAliasingValues = ['antialiased', 'none', 'auto'];
        this.mainContainer.classList.remove(...fontAliasingValues.map((value) => `monaco-font-aliasing-${value}`));
        // Add specific
        if (fontAliasingValues.some((option) => option === aliasing)) {
            this.mainContainer.classList.add(`monaco-font-aliasing-${aliasing}`);
        }
    }
    restoreFontInfo(storageService, configurationService) {
        const storedFontInfoRaw = storageService.get('editorFontInfo', -1 /* StorageScope.APPLICATION */);
        if (storedFontInfoRaw) {
            try {
                const storedFontInfo = JSON.parse(storedFontInfoRaw);
                if (Array.isArray(storedFontInfo)) {
                    FontMeasurements.restoreFontInfo(mainWindow, storedFontInfo);
                }
            }
            catch (err) {
                /* ignore */
            }
        }
        FontMeasurements.readFontInfo(mainWindow, BareFontInfo.createFromRawSettings(configurationService.getValue('editor'), PixelRatio.getInstance(mainWindow).value));
    }
    storeFontInfo(storageService) {
        const serializedFontInfo = FontMeasurements.serializeFontInfo(mainWindow);
        if (serializedFontInfo) {
            storageService.store('editorFontInfo', JSON.stringify(serializedFontInfo), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    renderWorkbench(instantiationService, notificationService, storageService, configurationService) {
        // ARIA & Signals
        setARIAContainer(this.mainContainer);
        setProgressAcccessibilitySignalScheduler((msDelayTime, msLoopTime) => instantiationService.createInstance(AccessibilityProgressSignalScheduler, msDelayTime, msLoopTime));
        // State specific classes
        const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
        const workbenchClasses = coalesce([
            'monaco-workbench',
            platformClass,
            isWeb ? 'web' : undefined,
            isChrome ? 'chromium' : isFirefox ? 'firefox' : isSafari ? 'safari' : undefined,
            ...this.getLayoutClasses(),
            ...(this.options?.extraClasses ? this.options.extraClasses : []),
        ]);
        this.mainContainer.classList.add(...workbenchClasses);
        // Apply font aliasing
        this.updateFontAliasing(undefined, configurationService);
        // Warm up font cache information before building up too many dom elements
        this.restoreFontInfo(storageService, configurationService);
        // Create Parts
        for (const { id, role, classes, options } of [
            { id: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, role: 'none', classes: ['titlebar'] },
            { id: "workbench.parts.banner" /* Parts.BANNER_PART */, role: 'banner', classes: ['banner'] },
            {
                id: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */,
                role: 'none',
                classes: ['activitybar', this.getSideBarPosition() === 0 /* Position.LEFT */ ? 'left' : 'right'],
            }, // Use role 'none' for some parts to make screen readers less chatty #114892
            {
                id: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */,
                role: 'none',
                classes: ['sidebar', this.getSideBarPosition() === 0 /* Position.LEFT */ ? 'left' : 'right'],
            },
            {
                id: "workbench.parts.editor" /* Parts.EDITOR_PART */,
                role: 'main',
                classes: ['editor'],
                options: { restorePreviousState: this.willRestoreEditors() },
            },
            {
                id: "workbench.parts.panel" /* Parts.PANEL_PART */,
                role: 'none',
                classes: ['panel', 'basepanel', positionToString(this.getPanelPosition())],
            },
            {
                id: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */,
                role: 'none',
                classes: [
                    'auxiliarybar',
                    'basepanel',
                    this.getSideBarPosition() === 0 /* Position.LEFT */ ? 'right' : 'left',
                ],
            },
            { id: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, role: 'status', classes: ['statusbar'] },
        ]) {
            const partContainer = this.createPart(id, role, classes);
            mark(`code/willCreatePart/${id}`);
            this.getPart(id).create(partContainer, options);
            mark(`code/didCreatePart/${id}`);
        }
        // Notification Handlers
        this.createNotificationsHandlers(instantiationService, notificationService);
        // Add Workbench to DOM
        this.parent.appendChild(this.mainContainer);
    }
    createPart(id, role, classes) {
        const part = document.createElement(role === 'status' ? 'footer' /* Use footer element for status bar #98376 */ : 'div');
        part.classList.add('part', ...classes);
        part.id = id;
        part.setAttribute('role', role);
        if (role === 'status') {
            part.setAttribute('aria-live', 'off');
        }
        return part;
    }
    createNotificationsHandlers(instantiationService, notificationService) {
        // Instantiate Notification components
        const notificationsCenter = this._register(instantiationService.createInstance(NotificationsCenter, this.mainContainer, notificationService.model));
        const notificationsToasts = this._register(instantiationService.createInstance(NotificationsToasts, this.mainContainer, notificationService.model));
        this._register(instantiationService.createInstance(NotificationsAlerts, notificationService.model));
        const notificationsStatus = instantiationService.createInstance(NotificationsStatus, notificationService.model);
        // Visibility
        this._register(notificationsCenter.onDidChangeVisibility(() => {
            notificationsStatus.update(notificationsCenter.isVisible, notificationsToasts.isVisible);
            notificationsToasts.update(notificationsCenter.isVisible);
        }));
        this._register(notificationsToasts.onDidChangeVisibility(() => {
            notificationsStatus.update(notificationsCenter.isVisible, notificationsToasts.isVisible);
        }));
        // Register Commands
        registerNotificationCommands(notificationsCenter, notificationsToasts, notificationService.model);
        // Register notification accessible view
        AccessibleViewRegistry.register(new NotificationAccessibleView());
        // Register with Layout
        this.registerNotifications({
            onDidChangeNotificationsVisibility: Event.map(Event.any(notificationsToasts.onDidChangeVisibility, notificationsCenter.onDidChangeVisibility), () => notificationsToasts.isVisible || notificationsCenter.isVisible),
        });
    }
    restore(lifecycleService) {
        // Ask each part to restore
        try {
            this.restoreParts();
        }
        catch (error) {
            onUnexpectedError(error);
        }
        // Transition into restored phase after layout has restored
        // but do not wait indefinitely on this to account for slow
        // editors restoring. Since the workbench is fully functional
        // even when the visible editors have not resolved, we still
        // want contributions on the `Restored` phase to work before
        // slow editors have resolved. But we also do not want fast
        // editors to resolve slow when too many contributions get
        // instantiated, so we find a middle ground solution via
        // `Promise.race`
        this.whenReady.finally(() => Promise.race([this.whenRestored, timeout(2000)]).finally(() => {
            // Update perf marks only when the layout is fully
            // restored. We want the time it takes to restore
            // editors to be included in these numbers
            function markDidStartWorkbench() {
                mark('code/didStartWorkbench');
                performance.measure('perf: workbench create & restore', 'code/didLoadWorkbenchMain', 'code/didStartWorkbench');
            }
            if (this.isRestored()) {
                markDidStartWorkbench();
            }
            else {
                this.whenRestored.finally(() => markDidStartWorkbench());
            }
            // Set lifecycle phase to `Restored`
            lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
            // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
            const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
                this._register(runWhenWindowIdle(mainWindow, () => (lifecycleService.phase = 4 /* LifecyclePhase.Eventually */), 2500));
            }, 2500));
            eventuallyPhaseScheduler.schedule();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvd29ya2JlbmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzdFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRyxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBMEIsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRyxPQUFPLEVBR04sdUJBQXVCLEVBQ3ZCLGdCQUFnQixHQUNoQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFDTixlQUFlLEVBQ2YsbUJBQW1CLEdBR25C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