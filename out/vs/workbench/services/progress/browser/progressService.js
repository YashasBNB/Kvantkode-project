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
import './media/progressService.css';
import { localize } from '../../../../nls.js';
import { dispose, DisposableStore, Disposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { IProgressService, Progress, } from '../../../../platform/progress/common/progress.js';
import { IStatusbarService, } from '../../statusbar/browser/statusbar.js';
import { DeferredPromise, RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { ProgressBadge, IActivityService } from '../../activity/common/activity.js';
import { INotificationService, Severity, NotificationPriority, isNotificationSource, NotificationsFilter, } from '../../../../platform/notification/common/notification.js';
import { Action } from '../../../../base/common/actions.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../views/common/viewsService.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { IUserActivityService } from '../../userActivity/common/userActivityService.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
let ProgressService = class ProgressService extends Disposable {
    constructor(activityService, paneCompositeService, viewDescriptorService, viewsService, notificationService, statusbarService, layoutService, keybindingService, userActivityService) {
        super();
        this.activityService = activityService;
        this.paneCompositeService = paneCompositeService;
        this.viewDescriptorService = viewDescriptorService;
        this.viewsService = viewsService;
        this.notificationService = notificationService;
        this.statusbarService = statusbarService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.userActivityService = userActivityService;
        this.windowProgressStack = [];
        this.windowProgressStatusEntry = undefined;
    }
    async withProgress(options, originalTask, onDidCancel) {
        const { location } = options;
        const task = async (progress) => {
            const activeLock = this.userActivityService.markActive({ whenHeldFor: 15_000 });
            try {
                return await originalTask(progress);
            }
            finally {
                activeLock.dispose();
            }
        };
        const handleStringLocation = (location) => {
            const viewContainer = this.viewDescriptorService.getViewContainerById(location);
            if (viewContainer) {
                const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
                if (viewContainerLocation !== null) {
                    return this.withPaneCompositeProgress(location, viewContainerLocation, task, {
                        ...options,
                        location,
                    });
                }
            }
            if (this.viewDescriptorService.getViewDescriptorById(location) !== null) {
                return this.withViewProgress(location, task, { ...options, location });
            }
            throw new Error(`Bad progress location: ${location}`);
        };
        if (typeof location === 'string') {
            return handleStringLocation(location);
        }
        switch (location) {
            case 15 /* ProgressLocation.Notification */: {
                let priority = options.priority;
                if (priority !== NotificationPriority.URGENT) {
                    if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
                        priority = NotificationPriority.SILENT;
                    }
                    else if (isNotificationSource(options.source) &&
                        this.notificationService.getFilter(options.source) === NotificationsFilter.ERROR) {
                        priority = NotificationPriority.SILENT;
                    }
                }
                return this.withNotificationProgress({ ...options, location, priority }, task, onDidCancel);
            }
            case 10 /* ProgressLocation.Window */: {
                const type = options.type;
                if (options.command) {
                    // Window progress with command get's shown in the status bar
                    return this.withWindowProgress({ ...options, location, type }, task);
                }
                // Window progress without command can be shown as silent notification
                // which will first appear in the status bar and can then be brought to
                // the front when clicking.
                return this.withNotificationProgress({
                    delay: 150 /* default for ProgressLocation.Window */,
                    ...options,
                    priority: NotificationPriority.SILENT,
                    location: 15 /* ProgressLocation.Notification */,
                    type,
                }, task, onDidCancel);
            }
            case 1 /* ProgressLocation.Explorer */:
                return this.withPaneCompositeProgress('workbench.view.explorer', 0 /* ViewContainerLocation.Sidebar */, task, { ...options, location });
            case 3 /* ProgressLocation.Scm */:
                return handleStringLocation('workbench.scm');
            case 5 /* ProgressLocation.Extensions */:
                return this.withPaneCompositeProgress('workbench.view.extensions', 0 /* ViewContainerLocation.Sidebar */, task, { ...options, location });
            case 20 /* ProgressLocation.Dialog */:
                return this.withDialogProgress(options, task, onDidCancel);
            default:
                throw new Error(`Bad progress location: ${location}`);
        }
    }
    withWindowProgress(options, callback) {
        const task = [
            options,
            new Progress(() => this.updateWindowProgress()),
        ];
        const promise = callback(task[1]);
        let delayHandle = setTimeout(() => {
            delayHandle = undefined;
            this.windowProgressStack.unshift(task);
            this.updateWindowProgress();
            // show progress for at least 150ms
            Promise.all([timeout(150), promise]).finally(() => {
                const idx = this.windowProgressStack.indexOf(task);
                this.windowProgressStack.splice(idx, 1);
                this.updateWindowProgress();
            });
        }, 150);
        // cancel delay if promise finishes below 150ms
        return promise.finally(() => clearTimeout(delayHandle));
    }
    updateWindowProgress(idx = 0) {
        // We still have progress to show
        if (idx < this.windowProgressStack.length) {
            const [options, progress] = this.windowProgressStack[idx];
            const progressTitle = options.title;
            const progressMessage = progress.value && progress.value.message;
            const progressCommand = options.command;
            let text;
            let title;
            const source = options.source && typeof options.source !== 'string' ? options.source.label : options.source;
            if (progressTitle && progressMessage) {
                // <title>: <message>
                text = localize('progress.text2', '{0}: {1}', progressTitle, progressMessage);
                title = source
                    ? localize('progress.title3', '[{0}] {1}: {2}', source, progressTitle, progressMessage)
                    : text;
            }
            else if (progressTitle) {
                // <title>
                text = progressTitle;
                title = source ? localize('progress.title2', '[{0}]: {1}', source, progressTitle) : text;
            }
            else if (progressMessage) {
                // <message>
                text = progressMessage;
                title = source ? localize('progress.title2', '[{0}]: {1}', source, progressMessage) : text;
            }
            else {
                // no title, no message -> no progress. try with next on stack
                this.updateWindowProgress(idx + 1);
                return;
            }
            const statusEntryProperties = {
                name: localize('status.progress', 'Progress Message'),
                text,
                showProgress: options.type || true,
                ariaLabel: text,
                tooltip: stripIcons(title).trim(),
                command: progressCommand,
            };
            if (this.windowProgressStatusEntry) {
                this.windowProgressStatusEntry.update(statusEntryProperties);
            }
            else {
                this.windowProgressStatusEntry = this.statusbarService.addEntry(statusEntryProperties, 'status.progress', 0 /* StatusbarAlignment.LEFT */, -Number.MAX_VALUE /* almost last entry */);
            }
        }
        // Progress is done so we remove the status entry
        else {
            this.windowProgressStatusEntry?.dispose();
            this.windowProgressStatusEntry = undefined;
        }
    }
    withNotificationProgress(options, callback, onDidCancel) {
        const progressStateModel = new (class extends Disposable {
            get step() {
                return this._step;
            }
            get done() {
                return this._done;
            }
            constructor() {
                super();
                this._onDidReport = this._register(new Emitter());
                this.onDidReport = this._onDidReport.event;
                this._onWillDispose = this._register(new Emitter());
                this.onWillDispose = this._onWillDispose.event;
                this._step = undefined;
                this._done = false;
                this.promise = callback(this);
                this.promise.finally(() => {
                    this.dispose();
                });
            }
            report(step) {
                this._step = step;
                this._onDidReport.fire(step);
            }
            cancel(choice) {
                onDidCancel?.(choice);
                this.dispose();
            }
            dispose() {
                this._done = true;
                this._onWillDispose.fire();
                super.dispose();
            }
        })();
        const createWindowProgress = () => {
            // Create a promise that we can resolve as needed
            // when the outside calls dispose on us
            const promise = new DeferredPromise();
            this.withWindowProgress({
                location: 10 /* ProgressLocation.Window */,
                title: options.title ? parseLinkedText(options.title).toString() : undefined, // convert markdown links => string
                command: 'notifications.showList',
                type: options.type,
            }, (progress) => {
                function reportProgress(step) {
                    if (step.message) {
                        progress.report({
                            message: parseLinkedText(step.message).toString(), // convert markdown links => string
                        });
                    }
                }
                // Apply any progress that was made already
                if (progressStateModel.step) {
                    reportProgress(progressStateModel.step);
                }
                // Continue to report progress as it happens
                const onDidReportListener = progressStateModel.onDidReport((step) => reportProgress(step));
                promise.p.finally(() => onDidReportListener.dispose());
                // When the progress model gets disposed, we are done as well
                Event.once(progressStateModel.onWillDispose)(() => promise.complete());
                return promise.p;
            });
            // Dispose means completing our promise
            return toDisposable(() => promise.complete());
        };
        const createNotification = (message, priority, increment) => {
            const notificationDisposables = new DisposableStore();
            const primaryActions = options.primaryActions ? Array.from(options.primaryActions) : [];
            const secondaryActions = options.secondaryActions ? Array.from(options.secondaryActions) : [];
            if (options.buttons) {
                options.buttons.forEach((button, index) => {
                    const buttonAction = new (class extends Action {
                        constructor() {
                            super(`progress.button.${button}`, button, undefined, true);
                        }
                        async run() {
                            progressStateModel.cancel(index);
                        }
                    })();
                    notificationDisposables.add(buttonAction);
                    primaryActions.push(buttonAction);
                });
            }
            if (options.cancellable) {
                const cancelAction = new (class extends Action {
                    constructor() {
                        super('progress.cancel', typeof options.cancellable === 'string'
                            ? options.cancellable
                            : localize('cancel', 'Cancel'), undefined, true);
                    }
                    async run() {
                        progressStateModel.cancel();
                    }
                })();
                notificationDisposables.add(cancelAction);
                primaryActions.push(cancelAction);
            }
            const notification = this.notificationService.notify({
                severity: Severity.Info,
                message: stripIcons(message), // status entries support codicons, but notifications do not (https://github.com/microsoft/vscode/issues/145722)
                source: options.source,
                actions: { primary: primaryActions, secondary: secondaryActions },
                progress: typeof increment === 'number' && increment >= 0
                    ? { total: 100, worked: increment }
                    : { infinite: true },
                priority,
            });
            // Switch to window based progress once the notification
            // changes visibility to hidden and is still ongoing.
            // Remove that window based progress once the notification
            // shows again.
            let windowProgressDisposable = undefined;
            const onVisibilityChange = (visible) => {
                // Clear any previous running window progress
                dispose(windowProgressDisposable);
                // Create new window progress if notification got hidden
                if (!visible && !progressStateModel.done) {
                    windowProgressDisposable = createWindowProgress();
                }
            };
            notificationDisposables.add(notification.onDidChangeVisibility(onVisibilityChange));
            if (priority === NotificationPriority.SILENT) {
                onVisibilityChange(false);
            }
            // Clear upon dispose
            Event.once(notification.onDidClose)(() => {
                notificationDisposables.dispose();
                dispose(windowProgressDisposable);
            });
            return notification;
        };
        const updateProgress = (notification, increment) => {
            if (typeof increment === 'number' && increment >= 0) {
                notification.progress.total(100); // always percentage based
                notification.progress.worked(increment);
            }
            else {
                notification.progress.infinite();
            }
        };
        let notificationHandle;
        let notificationTimeout;
        let titleAndMessage; // hoisted to make sure a delayed notification shows the most recent message
        const updateNotification = (step) => {
            // full message (inital or update)
            if (step?.message && options.title) {
                titleAndMessage = `${options.title}: ${step.message}`; // always prefix with overall title if we have it (https://github.com/microsoft/vscode/issues/50932)
            }
            else {
                titleAndMessage = options.title || step?.message;
            }
            if (!notificationHandle && titleAndMessage) {
                // create notification now or after a delay
                if (typeof options.delay === 'number' && options.delay > 0) {
                    if (typeof notificationTimeout !== 'number') {
                        notificationTimeout = setTimeout(() => (notificationHandle = createNotification(titleAndMessage, options.priority, step?.increment)), options.delay);
                    }
                }
                else {
                    notificationHandle = createNotification(titleAndMessage, options.priority, step?.increment);
                }
            }
            if (notificationHandle) {
                if (titleAndMessage) {
                    notificationHandle.updateMessage(titleAndMessage);
                }
                if (typeof step?.increment === 'number') {
                    updateProgress(notificationHandle, step.increment);
                }
            }
        };
        // Show initially
        updateNotification(progressStateModel.step);
        const listener = progressStateModel.onDidReport((step) => updateNotification(step));
        Event.once(progressStateModel.onWillDispose)(() => listener.dispose());
        (async () => {
            try {
                // with a delay we only wait for the finish of the promise
                if (typeof options.delay === 'number' && options.delay > 0) {
                    await progressStateModel.promise;
                }
                // without a delay we show the notification for at least 800ms
                // to reduce the chance of the notification flashing up and hiding
                else {
                    await Promise.all([timeout(800), progressStateModel.promise]);
                }
            }
            finally {
                clearTimeout(notificationTimeout);
                notificationHandle?.close();
            }
        })();
        return progressStateModel.promise;
    }
    withPaneCompositeProgress(paneCompositeId, viewContainerLocation, task, options) {
        // show in viewlet
        const progressIndicator = this.paneCompositeService.getProgressIndicator(paneCompositeId, viewContainerLocation);
        const promise = progressIndicator
            ? this.withCompositeProgress(progressIndicator, task, options)
            : task({ report: () => { } });
        // show on activity bar
        if (viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
            this.showOnActivityBar(paneCompositeId, options, promise);
        }
        return promise;
    }
    withViewProgress(viewId, task, options) {
        // show in viewlet
        const progressIndicator = this.viewsService.getViewProgressIndicator(viewId);
        const promise = progressIndicator
            ? this.withCompositeProgress(progressIndicator, task, options)
            : task({ report: () => { } });
        const viewletId = this.viewDescriptorService.getViewContainerByViewId(viewId)?.id;
        if (viewletId === undefined) {
            return promise;
        }
        // show on activity bar
        this.showOnActivityBar(viewletId, options, promise);
        return promise;
    }
    showOnActivityBar(viewletId, options, promise) {
        let activityProgress;
        let delayHandle = setTimeout(() => {
            delayHandle = undefined;
            const handle = this.activityService.showViewContainerActivity(viewletId, {
                badge: new ProgressBadge(() => ''),
            });
            const startTimeVisible = Date.now();
            const minTimeVisible = 300;
            activityProgress = {
                dispose() {
                    const d = Date.now() - startTimeVisible;
                    if (d < minTimeVisible) {
                        // should at least show for Nms
                        setTimeout(() => handle.dispose(), minTimeVisible - d);
                    }
                    else {
                        // shown long enough
                        handle.dispose();
                    }
                },
            };
        }, options.delay || 300);
        promise.finally(() => {
            clearTimeout(delayHandle);
            dispose(activityProgress);
        });
    }
    withCompositeProgress(progressIndicator, task, options) {
        let discreteProgressRunner = undefined;
        function updateProgress(stepOrTotal) {
            // Figure out whether discrete progress applies
            // by figuring out the "total" progress to show
            // and the increment if any.
            let total = undefined;
            let increment = undefined;
            if (typeof stepOrTotal !== 'undefined') {
                if (typeof stepOrTotal === 'number') {
                    total = stepOrTotal;
                }
                else if (typeof stepOrTotal.increment === 'number') {
                    total = stepOrTotal.total ?? 100; // always percentage based
                    increment = stepOrTotal.increment;
                }
            }
            // Discrete
            if (typeof total === 'number') {
                if (!discreteProgressRunner) {
                    discreteProgressRunner = progressIndicator.show(total, options.delay);
                    promise.catch(() => undefined /* ignore */).finally(() => discreteProgressRunner?.done());
                }
                if (typeof increment === 'number') {
                    discreteProgressRunner.worked(increment);
                }
            }
            // Infinite
            else {
                discreteProgressRunner?.done();
                progressIndicator.showWhile(promise, options.delay);
            }
            return discreteProgressRunner;
        }
        const promise = task({
            report: (progress) => {
                updateProgress(progress);
            },
        });
        updateProgress(options.total);
        return promise;
    }
    withDialogProgress(options, task, onDidCancel) {
        const disposables = new DisposableStore();
        let dialog;
        let taskCompleted = false;
        const createDialog = (message) => {
            const buttons = options.buttons || [];
            if (!options.sticky) {
                buttons.push(options.cancellable
                    ? typeof options.cancellable === 'boolean'
                        ? localize('cancel', 'Cancel')
                        : options.cancellable
                    : localize('dismiss', 'Dismiss'));
            }
            dialog = new Dialog(this.layoutService.activeContainer, message, buttons, createWorkbenchDialogOptions({
                type: 'pending',
                detail: options.detail,
                cancelId: buttons.length - 1,
                disableCloseAction: options.sticky,
                disableDefaultAction: options.sticky,
            }, this.keybindingService, this.layoutService));
            disposables.add(dialog);
            dialog.show().then((dialogResult) => {
                if (!taskCompleted) {
                    onDidCancel?.(dialogResult.button);
                }
                dispose(dialog);
            });
            return dialog;
        };
        // In order to support the `delay` option, we use a scheduler
        // that will guard each access to the dialog behind a delay
        // that is either the original delay for one invocation and
        // otherwise runs without delay.
        let delay = options.delay ?? 0;
        let latestMessage = undefined;
        const scheduler = disposables.add(new RunOnceScheduler(() => {
            delay = 0; // since we have run once, we reset the delay
            if (latestMessage && !dialog) {
                dialog = createDialog(latestMessage);
            }
            else if (latestMessage) {
                dialog.updateMessage(latestMessage);
            }
        }, 0));
        const updateDialog = function (message) {
            latestMessage = message;
            // Make sure to only run one dialog update and not multiple
            if (!scheduler.isScheduled()) {
                scheduler.schedule(delay);
            }
        };
        const promise = task({
            report: (progress) => {
                updateDialog(progress.message);
            },
        });
        promise.finally(() => {
            taskCompleted = true;
            dispose(disposables);
        });
        if (options.title) {
            updateDialog(options.title);
        }
        return promise;
    }
};
ProgressService = __decorate([
    __param(0, IActivityService),
    __param(1, IPaneCompositePartService),
    __param(2, IViewDescriptorService),
    __param(3, IViewsService),
    __param(4, INotificationService),
    __param(5, IStatusbarService),
    __param(6, ILayoutService),
    __param(7, IKeybindingService),
    __param(8, IUserActivityService)
], ProgressService);
export { ProgressService };
registerSingleton(IProgressService, ProgressService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3Byb2dyZXNzL2Jyb3dzZXIvcHJvZ3Jlc3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixPQUFPLEVBQ1AsZUFBZSxFQUNmLFVBQVUsRUFDVixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sZ0JBQWdCLEVBS2hCLFFBQVEsR0FPUixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFFTixpQkFBaUIsR0FHakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsRUFFUixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxD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