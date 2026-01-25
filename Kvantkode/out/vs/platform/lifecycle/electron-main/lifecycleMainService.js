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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xpZmVjeWNsZS9lbGVjdHJvbi1tYWluL2xpZmVjeWNsZU1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU16RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV4RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUFt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