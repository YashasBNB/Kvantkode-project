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
var LifecycleMainService_1;
import electron from 'electron';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Barrier, Promises, timeout } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { cwd } from '../../../base/common/process.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
export const ILifecycleMainService = createDecorator('lifecycleMainService');
export var ShutdownReason;
(function (ShutdownReason) {
    /**
     * The application exits normally.
     */
    ShutdownReason[ShutdownReason["QUIT"] = 1] = "QUIT";
    /**
     * The application exits abnormally and is being
     * killed with an exit code (e.g. from integration
     * test run)
     */
    ShutdownReason[ShutdownReason["KILL"] = 2] = "KILL";
})(ShutdownReason || (ShutdownReason = {}));
export var LifecycleMainPhase;
(function (LifecycleMainPhase) {
    /**
     * The first phase signals that we are about to startup.
     */
    LifecycleMainPhase[LifecycleMainPhase["Starting"] = 1] = "Starting";
    /**
     * Services are ready and first window is about to open.
     */
    LifecycleMainPhase[LifecycleMainPhase["Ready"] = 2] = "Ready";
    /**
     * This phase signals a point in time after the window has opened
     * and is typically the best place to do work that is not required
     * for the window to open.
     */
    LifecycleMainPhase[LifecycleMainPhase["AfterWindowOpen"] = 3] = "AfterWindowOpen";
    /**
     * The last phase after a window has opened and some time has passed
     * (2-5 seconds).
     */
    LifecycleMainPhase[LifecycleMainPhase["Eventually"] = 4] = "Eventually";
})(LifecycleMainPhase || (LifecycleMainPhase = {}));
let LifecycleMainService = class LifecycleMainService extends Disposable {
    static { LifecycleMainService_1 = this; }
    static { this.QUIT_AND_RESTART_KEY = 'lifecycle.quitAndRestart'; }
    get quitRequested() {
        return this._quitRequested;
    }
    get wasRestarted() {
        return this._wasRestarted;
    }
    get phase() {
        return this._phase;
    }
    constructor(logService, stateService, environmentMainService) {
        super();
        this.logService = logService;
        this.stateService = stateService;
        this.environmentMainService = environmentMainService;
        this._onBeforeShutdown = this._register(new Emitter());
        this.onBeforeShutdown = this._onBeforeShutdown.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onWillLoadWindow = this._register(new Emitter());
        this.onWillLoadWindow = this._onWillLoadWindow.event;
        this._onBeforeCloseWindow = this._register(new Emitter());
        this.onBeforeCloseWindow = this._onBeforeCloseWindow.event;
        this._quitRequested = false;
        this._wasRestarted = false;
        this._phase = 1 /* LifecycleMainPhase.Starting */;
        this.windowToCloseRequest = new Set();
        this.oneTimeListenerTokenGenerator = 0;
        this.windowCounter = 0;
        this.pendingQuitPromise = undefined;
        this.pendingQuitPromiseResolve = undefined;
        this.pendingWillShutdownPromise = undefined;
        this.mapWindowIdToPendingUnload = new Map();
        this.phaseWhen = new Map();
        this.relaunchHandler = undefined;
        this.resolveRestarted();
        this.when(2 /* LifecycleMainPhase.Ready */).then(() => this.registerListeners());
    }
    resolveRestarted() {
        this._wasRestarted = !!this.stateService.getItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY);
        if (this._wasRestarted) {
            // remove the marker right after if found
            this.stateService.removeItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY);
        }
    }
    registerListeners() {
        // before-quit: an event that is fired if application quit was
        // requested but before any window was closed.
        const beforeQuitListener = () => {
            if (this._quitRequested) {
                return;
            }
            this.trace('Lifecycle#app.on(before-quit)');
            this._quitRequested = true;
            // Emit event to indicate that we are about to shutdown
            this.trace('Lifecycle#onBeforeShutdown.fire()');
            this._onBeforeShutdown.fire();
            // macOS: can run without any window open. in that case we fire
            // the onWillShutdown() event directly because there is no veto
            // to be expected.
            if (isMacintosh && this.windowCounter === 0) {
                this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            }
        };
        electron.app.addListener('before-quit', beforeQuitListener);
        // window-all-closed: an event that only fires when the last window
        // was closed. We override this event to be in charge if app.quit()
        // should be called or not.
        const windowAllClosedListener = () => {
            this.trace('Lifecycle#app.on(window-all-closed)');
            // Windows/Linux: we quit when all windows have closed
            // Mac: we only quit when quit was requested
            if (this._quitRequested || !isMacintosh) {
                electron.app.quit();
            }
        };
        electron.app.addListener('window-all-closed', windowAllClosedListener);
        // will-quit: an event that is fired after all windows have been
        // closed, but before actually quitting.
        electron.app.once('will-quit', (e) => {
            this.trace('Lifecycle#app.on(will-quit) - begin');
            // Prevent the quit until the shutdown promise was resolved
            e.preventDefault();
            // Start shutdown sequence
            const shutdownPromise = this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            // Wait until shutdown is signaled to be complete
            shutdownPromise.finally(() => {
                this.trace('Lifecycle#app.on(will-quit) - after fireOnWillShutdown');
                // Resolve pending quit promise now without veto
                this.resolvePendingQuitPromise(false /* no veto */);
                // Quit again, this time do not prevent this, since our
                // will-quit listener is only installed "once". Also
                // remove any listener we have that is no longer needed
                electron.app.removeListener('before-quit', beforeQuitListener);
                electron.app.removeListener('window-all-closed', windowAllClosedListener);
                this.trace('Lifecycle#app.on(will-quit) - calling app.quit()');
                electron.app.quit();
            });
        });
    }
    fireOnWillShutdown(reason) {
        if (this.pendingWillShutdownPromise) {
            return this.pendingWillShutdownPromise; // shutdown is already running
        }
        const logService = this.logService;
        this.trace('Lifecycle#onWillShutdown.fire()');
        const joiners = [];
        this._onWillShutdown.fire({
            reason,
            join(id, promise) {
                logService.trace(`Lifecycle#onWillShutdown - begin '${id}'`);
                joiners.push(promise.finally(() => {
                    logService.trace(`Lifecycle#onWillShutdown - end '${id}'`);
                }));
            },
        });
        this.pendingWillShutdownPromise = (async () => {
            // Settle all shutdown event joiners
            try {
                await Promises.settled(joiners);
            }
            catch (error) {
                this.logService.error(error);
            }
            // Then, always make sure at the end
            // the state service is flushed.
            try {
                await this.stateService.close();
            }
            catch (error) {
                this.logService.error(error);
            }
        })();
        return this.pendingWillShutdownPromise;
    }
    set phase(value) {
        if (value < this.phase) {
            throw new Error('Lifecycle cannot go backwards');
        }
        if (this._phase === value) {
            return;
        }
        this.trace(`lifecycle (main): phase changed (value: ${value})`);
        this._phase = value;
        const barrier = this.phaseWhen.get(this._phase);
        if (barrier) {
            barrier.open();
            this.phaseWhen.delete(this._phase);
        }
    }
    async when(phase) {
        if (phase <= this._phase) {
            return;
        }
        let barrier = this.phaseWhen.get(phase);
        if (!barrier) {
            barrier = new Barrier();
            this.phaseWhen.set(phase, barrier);
        }
        await barrier.wait();
    }
    registerWindow(window) {
        const windowListeners = new DisposableStore();
        // track window count
        this.windowCounter++;
        // Window Will Load
        windowListeners.add(window.onWillLoad((e) => this._onWillLoadWindow.fire({ window, workspace: e.workspace, reason: e.reason })));
        // Window Before Closing: Main -> Renderer
        const win = assertIsDefined(window.win);
        windowListeners.add(Event.fromNodeEventEmitter(win, 'close')((e) => {
            // The window already acknowledged to be closed
            const windowId = window.id;
            if (this.windowToCloseRequest.has(windowId)) {
                this.windowToCloseRequest.delete(windowId);
                return;
            }
            this.trace(`Lifecycle#window.on('close') - window ID ${window.id}`);
            // Otherwise prevent unload and handle it from window
            e.preventDefault();
            this.unload(window, 1 /* UnloadReason.CLOSE */).then((veto) => {
                if (veto) {
                    this.windowToCloseRequest.delete(windowId);
                    return;
                }
                this.windowToCloseRequest.add(windowId);
                // Fire onBeforeCloseWindow before actually closing
                this.trace(`Lifecycle#onBeforeCloseWindow.fire() - window ID ${windowId}`);
                this._onBeforeCloseWindow.fire(window);
                // No veto, close window now
                window.close();
            });
        }));
        windowListeners.add(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this.trace(`Lifecycle#window.on('closed') - window ID ${window.id}`);
            // update window count
            this.windowCounter--;
            // clear window listeners
            windowListeners.dispose();
            // if there are no more code windows opened, fire the onWillShutdown event, unless
            // we are on macOS where it is perfectly fine to close the last window and
            // the application continues running (unless quit was actually requested)
            if (this.windowCounter === 0 && (!isMacintosh || this._quitRequested)) {
                this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            }
        }));
    }
    registerAuxWindow(auxWindow) {
        const win = assertIsDefined(auxWindow.win);
        const windowListeners = new DisposableStore();
        windowListeners.add(Event.fromNodeEventEmitter(win, 'close')((e) => {
            this.trace(`Lifecycle#auxWindow.on('close') - window ID ${auxWindow.id}`);
            if (this._quitRequested) {
                this.trace(`Lifecycle#auxWindow.on('close') - preventDefault() because quit requested`);
                // When quit is requested, Electron will close all
                // auxiliary windows before closing the main windows.
                // This prevents us from storing the auxiliary window
                // state on shutdown and thus we prevent closing if
                // quit is requested.
                //
                // Interestingly, this will not prevent the application
                // from quitting because the auxiliary windows will still
                // close once the owning window closes.
                e.preventDefault();
            }
        }));
        windowListeners.add(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this.trace(`Lifecycle#auxWindow.on('closed') - window ID ${auxWindow.id}`);
            windowListeners.dispose();
        }));
    }
    async reload(window, cli) {
        // Only reload when the window has not vetoed this
        const veto = await this.unload(window, 3 /* UnloadReason.RELOAD */);
        if (!veto) {
            window.reload(cli);
        }
    }
    unload(window, reason) {
        // Ensure there is only 1 unload running at the same time
        const pendingUnloadPromise = this.mapWindowIdToPendingUnload.get(window.id);
        if (pendingUnloadPromise) {
            return pendingUnloadPromise;
        }
        // Start unload and remember in map until finished
        const unloadPromise = this.doUnload(window, reason).finally(() => {
            this.mapWindowIdToPendingUnload.delete(window.id);
        });
        this.mapWindowIdToPendingUnload.set(window.id, unloadPromise);
        return unloadPromise;
    }
    async doUnload(window, reason) {
        // Always allow to unload a window that is not yet ready
        if (!window.isReady) {
            return false;
        }
        this.trace(`Lifecycle#unload() - window ID ${window.id}`);
        // first ask the window itself if it vetos the unload
        const windowUnloadReason = this._quitRequested ? 2 /* UnloadReason.QUIT */ : reason;
        const veto = await this.onBeforeUnloadWindowInRenderer(window, windowUnloadReason);
        if (veto) {
            this.trace(`Lifecycle#unload() - veto in renderer (window ID ${window.id})`);
            return this.handleWindowUnloadVeto(veto);
        }
        // finally if there are no vetos, unload the renderer
        await this.onWillUnloadWindowInRenderer(window, windowUnloadReason);
        return false;
    }
    handleWindowUnloadVeto(veto) {
        if (!veto) {
            return false; // no veto
        }
        // a veto resolves any pending quit with veto
        this.resolvePendingQuitPromise(true /* veto */);
        // a veto resets the pending quit request flag
        this._quitRequested = false;
        return true; // veto
    }
    resolvePendingQuitPromise(veto) {
        if (this.pendingQuitPromiseResolve) {
            this.pendingQuitPromiseResolve(veto);
            this.pendingQuitPromiseResolve = undefined;
            this.pendingQuitPromise = undefined;
        }
    }
    onBeforeUnloadWindowInRenderer(window, reason) {
        return new Promise((resolve) => {
            const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
            const okChannel = `vscode:ok${oneTimeEventToken}`;
            const cancelChannel = `vscode:cancel${oneTimeEventToken}`;
            validatedIpcMain.once(okChannel, () => {
                resolve(false); // no veto
            });
            validatedIpcMain.once(cancelChannel, () => {
                resolve(true); // veto
            });
            window.send('vscode:onBeforeUnload', { okChannel, cancelChannel, reason });
        });
    }
    onWillUnloadWindowInRenderer(window, reason) {
        return new Promise((resolve) => {
            const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
            const replyChannel = `vscode:reply${oneTimeEventToken}`;
            validatedIpcMain.once(replyChannel, () => resolve());
            window.send('vscode:onWillUnload', { replyChannel, reason });
        });
    }
    quit(willRestart) {
        return this.doQuit(willRestart).then((veto) => {
            if (!veto && willRestart) {
                // Windows: we are about to restart and as such we need to restore the original
                // current working directory we had on startup to get the exact same startup
                // behaviour. As such, we briefly change back to that directory and then when
                // Code starts it will set it back to the installation directory again.
                try {
                    if (isWindows) {
                        const currentWorkingDir = cwd();
                        if (currentWorkingDir !== process.cwd()) {
                            process.chdir(currentWorkingDir);
                        }
                    }
                }
                catch (err) {
                    this.logService.error(err);
                }
            }
            return veto;
        });
    }
    doQuit(willRestart) {
        this.trace(`Lifecycle#quit() - begin (willRestart: ${willRestart})`);
        if (this.pendingQuitPromise) {
            this.trace('Lifecycle#quit() - returning pending quit promise');
            return this.pendingQuitPromise;
        }
        // Remember if we are about to restart
        if (willRestart) {
            this.stateService.setItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY, true);
        }
        this.pendingQuitPromise = new Promise((resolve) => {
            // Store as field to access it from a window cancellation
            this.pendingQuitPromiseResolve = resolve;
            // Calling app.quit() will trigger the close handlers of each opened window
            // and only if no window vetoed the shutdown, we will get the will-quit event
            this.trace('Lifecycle#quit() - calling app.quit()');
            electron.app.quit();
        });
        return this.pendingQuitPromise;
    }
    trace(msg) {
        if (this.environmentMainService.args['enable-smoke-test-driver']) {
            this.logService.info(msg); // helps diagnose issues with exiting from smoke tests
        }
        else {
            this.logService.trace(msg);
        }
    }
    setRelaunchHandler(handler) {
        this.relaunchHandler = handler;
    }
    async relaunch(options) {
        this.trace('Lifecycle#relaunch()');
        const args = process.argv.slice(1);
        if (options?.addArgs) {
            args.push(...options.addArgs);
        }
        if (options?.removeArgs) {
            for (const a of options.removeArgs) {
                const idx = args.indexOf(a);
                if (idx >= 0) {
                    args.splice(idx, 1);
                }
            }
        }
        const quitListener = () => {
            if (!this.relaunchHandler?.handleRelaunch(options)) {
                this.trace('Lifecycle#relaunch() - calling app.relaunch()');
                electron.app.relaunch({ args });
            }
        };
        electron.app.once('quit', quitListener);
        // `app.relaunch()` does not quit automatically, so we quit first,
        // check for vetoes and then relaunch from the `app.on('quit')` event
        const veto = await this.quit(true /* will restart */);
        if (veto) {
            electron.app.removeListener('quit', quitListener);
        }
    }
    async kill(code) {
        this.trace('Lifecycle#kill()');
        // Give main process participants a chance to orderly shutdown
        await this.fireOnWillShutdown(2 /* ShutdownReason.KILL */);
        // From extension tests we have seen issues where calling app.exit()
        // with an opened window can lead to native crashes (Linux). As such,
        // we should make sure to destroy any opened window before calling
        // `app.exit()`.
        //
        // Note: Electron implements a similar logic here:
        // https://github.com/electron/electron/blob/fe5318d753637c3903e23fc1ed1b263025887b6a/spec-main/window-helpers.ts#L5
        await Promise.race([
            // Still do not block more than 1s
            timeout(1000),
            // Destroy any opened window: we do not unload windows here because
            // there is a chance that the unload is veto'd or long running due
            // to a participant within the window. this is not wanted when we
            // are asked to kill the application.
            (async () => {
                for (const window of getAllWindowsExcludingOffscreen()) {
                    if (window && !window.isDestroyed()) {
                        let whenWindowClosed;
                        if (window.webContents && !window.webContents.isDestroyed()) {
                            whenWindowClosed = new Promise((resolve) => window.once('closed', resolve));
                        }
                        else {
                            whenWindowClosed = Promise.resolve();
                        }
                        window.destroy();
                        await whenWindowClosed;
                    }
                }
            })(),
        ]);
        // Now exit either after 1s or all windows destroyed
        electron.app.exit(code);
    }
};
LifecycleMainService = LifecycleMainService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStateService),
    __param(2, IEnvironmentMainService)
], LifecycleMainService);
export { LifecycleMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9saWZlY3ljbGUvZWxlY3Ryb24tbWFpbi9saWZlY3ljbGVNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFNekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFbkcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFeEYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFBO0FBbUJuRyxN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