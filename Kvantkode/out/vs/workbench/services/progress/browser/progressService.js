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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJvZ3Jlc3MvYnJvd3Nlci9wcm9ncmVzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsVUFBVSxFQUNWLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixnQkFBZ0IsRUFLaEIsUUFBUSxHQU9SLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUVOLGlCQUFpQixHQUdqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25GLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxFQUVSLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsbUJBQW1CLEdBQ25CLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXRGLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsVUFBVTtJQUc5QyxZQUNtQixlQUFrRCxFQUN6QyxvQkFBZ0UsRUFDbkUscUJBQThELEVBQ3ZFLFlBQTRDLEVBQ3JDLG1CQUEwRCxFQUM3RCxnQkFBb0QsRUFDdkQsYUFBOEMsRUFDMUMsaUJBQXNELEVBQ3BELG1CQUEwRDtRQUVoRixLQUFLLEVBQUUsQ0FBQTtRQVY0QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDeEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEyQjtRQUNsRCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3RELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ3BCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDNUMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN0QyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDekIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNuQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBeUdoRSx3QkFBbUIsR0FBd0QsRUFBRSxDQUFBO1FBQ3RGLDhCQUF5QixHQUF3QyxTQUFTLENBQUE7SUF2R2xGLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNqQixPQUF5QixFQUN6QixZQUFnRSxFQUNoRSxXQUF1QztRQUV2QyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFBO1FBRTVCLE1BQU0sSUFBSSxHQUFHLEtBQUssRUFBRSxRQUFrQyxFQUFFLEVBQUU7WUFDekQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1lBQy9FLElBQUksQ0FBQztnQkFDSixPQUFPLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3BDLENBQUM7b0JBQVMsQ0FBQztnQkFDVixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQUU7WUFDakQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQy9FLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLE1BQU0scUJBQXFCLEdBQzFCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDbkUsSUFBSSxxQkFBcUIsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDcEMsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRTt3QkFDNUUsR0FBRyxPQUFPO3dCQUNWLFFBQVE7cUJBQ1IsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3pFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7WUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELENBQUMsQ0FBQTtRQUVELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbEMsT0FBTyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQiwyQ0FBa0MsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksUUFBUSxHQUFJLE9BQXdDLENBQUMsUUFBUSxDQUFBO2dCQUNqRSxJQUFJLFFBQVEsS0FBSyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLEtBQUssbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ3hFLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUE7b0JBQ3ZDLENBQUM7eUJBQU0sSUFDTixvQkFBb0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO3dCQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxtQkFBbUIsQ0FBQyxLQUFLLEVBQy9FLENBQUM7d0JBQ0YsUUFBUSxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQTtvQkFDdkMsQ0FBQztnQkFDRixDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsR0FBRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUM1RixDQUFDO1lBQ0QscUNBQTRCLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLElBQUksR0FBSSxPQUFrQyxDQUFDLElBQUksQ0FBQTtnQkFDckQsSUFBSyxPQUFrQyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqRCw2REFBNkQ7b0JBQzdELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsR0FBRyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO2dCQUNELHNFQUFzRTtnQkFDdEUsdUVBQXVFO2dCQUN2RSwyQkFBMkI7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUNuQztvQkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLHlDQUF5QztvQkFDcEQsR0FBRyxPQUFPO29CQUNWLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxNQUFNO29CQUNyQyxRQUFRLHdDQUErQjtvQkFDdkMsSUFBSTtpQkFDSixFQUNELElBQUksRUFDSixXQUFXLENBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRDtnQkFDQyxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FDcEMseUJBQXlCLHlDQUV6QixJQUFJLEVBQ0osRUFBRSxHQUFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FDeEIsQ0FBQTtZQUNGO2dCQUNDLE9BQU8sb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDN0M7Z0JBQ0MsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQ3BDLDJCQUEyQix5Q0FFM0IsSUFBSSxFQUNKLEVBQUUsR0FBRyxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQ3hCLENBQUE7WUFDRjtnQkFDQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzNEO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDdkQsQ0FBQztJQUNGLENBQUM7SUFLTyxrQkFBa0IsQ0FDekIsT0FBK0IsRUFDL0IsUUFBbUU7UUFFbkUsTUFBTSxJQUFJLEdBQXNEO1lBQy9ELE9BQU87WUFDUCxJQUFJLFFBQVEsQ0FBZ0IsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDOUQsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqQyxJQUFJLFdBQVcsR0FBUSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3RDLFdBQVcsR0FBRyxTQUFTLENBQUE7WUFDdkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUUzQixtQ0FBbUM7WUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2xELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN2QyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUM1QixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUVQLCtDQUErQztRQUMvQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVPLG9CQUFvQixDQUFDLE1BQWMsQ0FBQztRQUMzQyxpQ0FBaUM7UUFDakMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXpELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7WUFDbkMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQTtZQUNoRSxNQUFNLGVBQWUsR0FBNEIsT0FBUSxDQUFDLE9BQU8sQ0FBQTtZQUNqRSxJQUFJLElBQVksQ0FBQTtZQUNoQixJQUFJLEtBQWEsQ0FBQTtZQUNqQixNQUFNLE1BQU0sR0FDWCxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sT0FBTyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFBO1lBRTdGLElBQUksYUFBYSxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUN0QyxxQkFBcUI7Z0JBQ3JCLElBQUksR0FBRyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDN0UsS0FBSyxHQUFHLE1BQU07b0JBQ2IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQztvQkFDdkYsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNSLENBQUM7aUJBQU0sSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDMUIsVUFBVTtnQkFDVixJQUFJLEdBQUcsYUFBYSxDQUFBO2dCQUNwQixLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQ3pGLENBQUM7aUJBQU0sSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDNUIsWUFBWTtnQkFDWixJQUFJLEdBQUcsZUFBZSxDQUFBO2dCQUN0QixLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCw4REFBOEQ7Z0JBQzlELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxxQkFBcUIsR0FBb0I7Z0JBQzlDLElBQUksRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUM7Z0JBQ3JELElBQUk7Z0JBQ0osWUFBWSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSTtnQkFDbEMsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsT0FBTyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ2pDLE9BQU8sRUFBRSxlQUFlO2FBQ3hCLENBQUE7WUFFRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUE7WUFDN0QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUM5RCxxQkFBcUIsRUFDckIsaUJBQWlCLG1DQUVqQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQ3pDLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELGlEQUFpRDthQUM1QyxDQUFDO1lBQ0wsSUFBSSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ3pDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxTQUFTLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsT0FBcUMsRUFDckMsUUFBbUQsRUFDbkQsV0FBdUM7UUFFdkMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLFVBQVU7WUFRdkQsSUFBSSxJQUFJO2dCQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtZQUNsQixDQUFDO1lBR0QsSUFBSSxJQUFJO2dCQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtZQUNsQixDQUFDO1lBSUQ7Z0JBQ0MsS0FBSyxFQUFFLENBQUE7Z0JBbkJTLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBaUIsQ0FBQyxDQUFBO2dCQUNuRSxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO2dCQUU3QixtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO2dCQUM1RCxrQkFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO2dCQUUxQyxVQUFLLEdBQThCLFNBQVMsQ0FBQTtnQkFLNUMsVUFBSyxHQUFHLEtBQUssQ0FBQTtnQkFVcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBRTdCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtvQkFDekIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNmLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELE1BQU0sQ0FBQyxJQUFtQjtnQkFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7Z0JBRWpCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7WUFFRCxNQUFNLENBQUMsTUFBZTtnQkFDckIsV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRXJCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNmLENBQUM7WUFFUSxPQUFPO2dCQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO2dCQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUUxQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDaEIsQ0FBQztTQUNELENBQUMsRUFBRSxDQUFBO1FBRUosTUFBTSxvQkFBb0IsR0FBRyxHQUFHLEVBQUU7WUFDakMsaURBQWlEO1lBQ2pELHVDQUF1QztZQUN2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1lBRTNDLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEI7Z0JBQ0MsUUFBUSxrQ0FBeUI7Z0JBQ2pDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsbUNBQW1DO2dCQUNqSCxPQUFPLEVBQUUsd0JBQXdCO2dCQUNqQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7YUFDbEIsRUFDRCxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNaLFNBQVMsY0FBYyxDQUFDLElBQW1CO29CQUMxQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDbEIsUUFBUSxDQUFDLE1BQU0sQ0FBQzs0QkFDZixPQUFPLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxtQ0FBbUM7eUJBQ3RGLENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsMkNBQTJDO2dCQUMzQyxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO29CQUM3QixjQUFjLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3hDLENBQUM7Z0JBRUQsNENBQTRDO2dCQUM1QyxNQUFNLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBQzFGLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7Z0JBRXRELDZEQUE2RDtnQkFDN0QsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFFdEUsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ2pCLENBQUMsQ0FDRCxDQUFBO1lBRUQsdUNBQXVDO1lBQ3ZDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLENBQUMsQ0FBQTtRQUVELE1BQU0sa0JBQWtCLEdBQUcsQ0FDMUIsT0FBZSxFQUNmLFFBQStCLEVBQy9CLFNBQWtCLEVBQ0ksRUFBRTtZQUN4QixNQUFNLHVCQUF1QixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFFckQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUN2RixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBRTdGLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNyQixPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDekMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxNQUFNO3dCQUM3Qzs0QkFDQyxLQUFLLENBQUMsbUJBQW1CLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7d0JBQzVELENBQUM7d0JBRVEsS0FBSyxDQUFDLEdBQUc7NEJBQ2pCLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDakMsQ0FBQztxQkFDRCxDQUFDLEVBQUUsQ0FBQTtvQkFDSix1QkFBdUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBRXpDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ2xDLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLE1BQU07b0JBQzdDO3dCQUNDLEtBQUssQ0FDSixpQkFBaUIsRUFDakIsT0FBTyxPQUFPLENBQUMsV0FBVyxLQUFLLFFBQVE7NEJBQ3RDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVzs0QkFDckIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQy9CLFNBQVMsRUFDVCxJQUFJLENBQ0osQ0FBQTtvQkFDRixDQUFDO29CQUVRLEtBQUssQ0FBQyxHQUFHO3dCQUNqQixrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtvQkFDNUIsQ0FBQztpQkFDRCxDQUFDLEVBQUUsQ0FBQTtnQkFDSix1QkFBdUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBRXpDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7Z0JBQ3BELFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDdkIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxnSEFBZ0g7Z0JBQzlJLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pFLFFBQVEsRUFDUCxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLENBQUM7b0JBQzlDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtvQkFDbkMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtnQkFDdEIsUUFBUTthQUNSLENBQUMsQ0FBQTtZQUVGLHdEQUF3RDtZQUN4RCxxREFBcUQ7WUFDckQsMERBQTBEO1lBQzFELGVBQWU7WUFDZixJQUFJLHdCQUF3QixHQUE0QixTQUFTLENBQUE7WUFDakUsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLE9BQWdCLEVBQUUsRUFBRTtnQkFDL0MsNkNBQTZDO2dCQUM3QyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtnQkFFakMsd0RBQXdEO2dCQUN4RCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzFDLHdCQUF3QixHQUFHLG9CQUFvQixFQUFFLENBQUE7Z0JBQ2xELENBQUM7WUFDRixDQUFDLENBQUE7WUFDRCx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtZQUNuRixJQUFJLFFBQVEsS0FBSyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDOUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDMUIsQ0FBQztZQUVELHFCQUFxQjtZQUNyQixLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3hDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNqQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtZQUNsQyxDQUFDLENBQUMsQ0FBQTtZQUVGLE9BQU8sWUFBWSxDQUFBO1FBQ3BCLENBQUMsQ0FBQTtRQUVELE1BQU0sY0FBYyxHQUFHLENBQUMsWUFBaUMsRUFBRSxTQUFrQixFQUFRLEVBQUU7WUFDdEYsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFDLDBCQUEwQjtnQkFDM0QsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELElBQUksa0JBQW1ELENBQUE7UUFDdkQsSUFBSSxtQkFBb0MsQ0FBQTtRQUN4QyxJQUFJLGVBQW1DLENBQUEsQ0FBQyw0RUFBNEU7UUFFcEgsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLElBQW9CLEVBQVEsRUFBRTtZQUN6RCxrQ0FBa0M7WUFDbEMsSUFBSSxJQUFJLEVBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEMsZUFBZSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUEsQ0FBQyxvR0FBb0c7WUFDM0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRSxPQUFPLENBQUE7WUFDakQsQ0FBQztZQUVELElBQUksQ0FBQyxrQkFBa0IsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDNUMsMkNBQTJDO2dCQUMzQyxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDNUQsSUFBSSxPQUFPLG1CQUFtQixLQUFLLFFBQVEsRUFBRSxDQUFDO3dCQUM3QyxtQkFBbUIsR0FBRyxVQUFVLENBQy9CLEdBQUcsRUFBRSxDQUNKLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQ3ZDLGVBQWdCLEVBQ2hCLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLElBQUksRUFBRSxTQUFTLENBQ2YsQ0FBQyxFQUNILE9BQU8sQ0FBQyxLQUFLLENBQ2IsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FDdEMsZUFBZSxFQUNmLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLElBQUksRUFBRSxTQUFTLENBQ2YsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsa0JBQWtCLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNsRCxDQUFDO2dCQUVELElBQUksT0FBTyxJQUFJLEVBQUUsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN6QyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNuRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELGlCQUFpQjtRQUNqQixrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQyxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbkYsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FHckU7UUFBQSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ1osSUFBSSxDQUFDO2dCQUNKLDBEQUEwRDtnQkFDMUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzVELE1BQU0sa0JBQWtCLENBQUMsT0FBTyxDQUFBO2dCQUNqQyxDQUFDO2dCQUVELDhEQUE4RDtnQkFDOUQsa0VBQWtFO3FCQUM3RCxDQUFDO29CQUNMLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUM5RCxDQUFDO1lBQ0YsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO2dCQUNqQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVKLE9BQU8sa0JBQWtCLENBQUMsT0FBTyxDQUFBO0lBQ2xDLENBQUM7SUFFTyx5QkFBeUIsQ0FDaEMsZUFBdUIsRUFDdkIscUJBQTRDLEVBQzVDLElBQStDLEVBQy9DLE9BQWtDO1FBRWxDLGtCQUFrQjtRQUNsQixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FDdkUsZUFBZSxFQUNmLHFCQUFxQixDQUNyQixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsaUJBQWlCO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQztZQUM5RCxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFN0IsdUJBQXVCO1FBQ3ZCLElBQUkscUJBQXFCLDBDQUFrQyxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLGlCQUFpQixDQUFPLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLGdCQUFnQixDQUN2QixNQUFjLEVBQ2QsSUFBK0MsRUFDL0MsT0FBa0M7UUFFbEMsa0JBQWtCO1FBQ2xCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1RSxNQUFNLE9BQU8sR0FBRyxpQkFBaUI7WUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDO1lBQzlELENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUU3QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFBO1FBQ2pGLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sT0FBTyxDQUFBO1FBQ2YsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVuRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxpQkFBaUIsQ0FDeEIsU0FBaUIsRUFDakIsT0FBa0MsRUFDbEMsT0FBVTtRQUVWLElBQUksZ0JBQTZCLENBQUE7UUFDakMsSUFBSSxXQUFXLEdBQVEsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN0QyxXQUFXLEdBQUcsU0FBUyxDQUFBO1lBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsU0FBUyxFQUFFO2dCQUN4RSxLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQ2xDLENBQUMsQ0FBQTtZQUNGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ25DLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQTtZQUMxQixnQkFBZ0IsR0FBRztnQkFDbEIsT0FBTztvQkFDTixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsZ0JBQWdCLENBQUE7b0JBQ3ZDLElBQUksQ0FBQyxHQUFHLGNBQWMsRUFBRSxDQUFDO3dCQUN4QiwrQkFBK0I7d0JBQy9CLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUN2RCxDQUFDO3lCQUFNLENBQUM7d0JBQ1Asb0JBQW9CO3dCQUNwQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQ2pCLENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUE7UUFDRixDQUFDLEVBQUUsT0FBTyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUN4QixPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNwQixZQUFZLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDekIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDMUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8scUJBQXFCLENBQzVCLGlCQUFxQyxFQUNyQyxJQUErQyxFQUMvQyxPQUFrQztRQUVsQyxJQUFJLHNCQUFzQixHQUFnQyxTQUFTLENBQUE7UUFFbkUsU0FBUyxjQUFjLENBQ3RCLFdBQStDO1lBRS9DLCtDQUErQztZQUMvQywrQ0FBK0M7WUFDL0MsNEJBQTRCO1lBQzVCLElBQUksS0FBSyxHQUF1QixTQUFTLENBQUE7WUFDekMsSUFBSSxTQUFTLEdBQXVCLFNBQVMsQ0FBQTtZQUM3QyxJQUFJLE9BQU8sV0FBVyxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNyQyxLQUFLLEdBQUcsV0FBVyxDQUFBO2dCQUNwQixDQUFDO3FCQUFNLElBQUksT0FBTyxXQUFXLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN0RCxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUEsQ0FBQywwQkFBMEI7b0JBQzNELFNBQVMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFBO2dCQUNsQyxDQUFDO1lBQ0YsQ0FBQztZQUVELFdBQVc7WUFDWCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztvQkFDN0Isc0JBQXNCLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3JFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUMxRixDQUFDO2dCQUVELElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ25DLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztZQUNGLENBQUM7WUFFRCxXQUFXO2lCQUNOLENBQUM7Z0JBQ0wsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLENBQUE7Z0JBQzlCLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3BELENBQUM7WUFFRCxPQUFPLHNCQUFzQixDQUFBO1FBQzlCLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDcEIsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3BCLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN6QixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUU3QixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxrQkFBa0IsQ0FDekIsT0FBK0IsRUFDL0IsSUFBK0MsRUFDL0MsV0FBdUM7UUFFdkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxJQUFJLE1BQWMsQ0FBQTtRQUNsQixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUE7UUFFekIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxPQUFlLEVBQUUsRUFBRTtZQUN4QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNyQixPQUFPLENBQUMsSUFBSSxDQUNYLE9BQU8sQ0FBQyxXQUFXO29CQUNsQixDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVM7d0JBQ3pDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQzt3QkFDOUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXO29CQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FDakMsQ0FBQTtZQUNGLENBQUM7WUFFRCxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQ2xCLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUNsQyxPQUFPLEVBQ1AsT0FBTyxFQUNQLDRCQUE0QixDQUMzQjtnQkFDQyxJQUFJLEVBQUUsU0FBUztnQkFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07Z0JBQ3RCLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQzVCLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUNsQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsTUFBTTthQUNwQyxFQUNELElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsSUFBSSxDQUFDLGFBQWEsQ0FDbEIsQ0FDRCxDQUFBO1lBRUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUV2QixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEIsV0FBVyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO2dCQUNELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoQixDQUFDLENBQUMsQ0FBQTtZQUVGLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQyxDQUFBO1FBRUQsNkRBQTZEO1FBQzdELDJEQUEyRDtRQUMzRCwyREFBMkQ7UUFDM0QsZ0NBQWdDO1FBQ2hDLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFBO1FBQzlCLElBQUksYUFBYSxHQUF1QixTQUFTLENBQUE7UUFDakQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDekIsS0FBSyxHQUFHLENBQUMsQ0FBQSxDQUFDLDZDQUE2QztZQUV2RCxJQUFJLGFBQWEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7aUJBQU0sSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNMLENBQUE7UUFFRCxNQUFNLFlBQVksR0FBRyxVQUFVLE9BQWdCO1lBQzlDLGFBQWEsR0FBRyxPQUFPLENBQUE7WUFFdkIsMkRBQTJEO1lBQzNELElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFDOUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMxQixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNwQixZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQy9CLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNwQixhQUFhLEdBQUcsSUFBSSxDQUFBO1lBQ3BCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztDQUNELENBQUE7QUEvckJZLGVBQWU7SUFJekIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7R0FaVixlQUFlLENBK3JCM0I7O0FBRUQsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxvQ0FBNEIsQ0FBQSJ9