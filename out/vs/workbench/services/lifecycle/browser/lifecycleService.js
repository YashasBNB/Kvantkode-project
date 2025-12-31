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
import { ILifecycleService } from '../common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractLifecycleService } from '../common/lifecycleService.js';
import { localize } from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { addDisposableListener, EventType } from '../../../../base/browser/dom.js';
import { IStorageService, WillSaveStateReason, } from '../../../../platform/storage/common/storage.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { mainWindow } from '../../../../base/browser/window.js';
let BrowserLifecycleService = class BrowserLifecycleService extends AbstractLifecycleService {
    constructor(logService, storageService) {
        super(logService, storageService);
        this.beforeUnloadListener = undefined;
        this.unloadListener = undefined;
        this.ignoreBeforeUnload = false;
        this.didUnload = false;
        this.registerListeners();
    }
    registerListeners() {
        // Listen to `beforeUnload` to support to veto
        this.beforeUnloadListener = addDisposableListener(mainWindow, EventType.BEFORE_UNLOAD, (e) => this.onBeforeUnload(e));
        // Listen to `pagehide` to support orderly shutdown
        // We explicitly do not listen to `unload` event
        // which would disable certain browser caching.
        // We currently do not handle the `persisted` property
        // (https://github.com/microsoft/vscode/issues/136216)
        this.unloadListener = addDisposableListener(mainWindow, EventType.PAGE_HIDE, () => this.onUnload());
    }
    onBeforeUnload(event) {
        // Before unload ignored (once)
        if (this.ignoreBeforeUnload) {
            this.logService.info('[lifecycle] onBeforeUnload triggered but ignored once');
            this.ignoreBeforeUnload = false;
        }
        // Before unload with veto support
        else {
            this.logService.info('[lifecycle] onBeforeUnload triggered and handled with veto support');
            this.doShutdown(() => this.vetoBeforeUnload(event));
        }
    }
    vetoBeforeUnload(event) {
        event.preventDefault();
        event.returnValue = localize('lifecycleVeto', "Changes that you made may not be saved. Please check press 'Cancel' and try again.");
    }
    withExpectedShutdown(reason, callback) {
        // Standard shutdown
        if (typeof reason === 'number') {
            this.shutdownReason = reason;
            // Ensure UI state is persisted
            return this.storageService.flush(WillSaveStateReason.SHUTDOWN);
        }
        // Before unload handling ignored for duration of callback
        else {
            this.ignoreBeforeUnload = true;
            try {
                callback?.();
            }
            finally {
                this.ignoreBeforeUnload = false;
            }
        }
    }
    async shutdown() {
        this.logService.info('[lifecycle] shutdown triggered');
        // An explicit shutdown renders our unload
        // event handlers disabled, so dispose them.
        this.beforeUnloadListener?.dispose();
        this.unloadListener?.dispose();
        // Ensure UI state is persisted
        await this.storageService.flush(WillSaveStateReason.SHUTDOWN);
        // Handle shutdown without veto support
        this.doShutdown();
    }
    doShutdown(vetoShutdown) {
        const logService = this.logService;
        // Optimistically trigger a UI state flush
        // without waiting for it. The browser does
        // not guarantee that this is being executed
        // but if a dialog opens, we have a chance
        // to succeed.
        this.storageService.flush(WillSaveStateReason.SHUTDOWN);
        let veto = false;
        function handleVeto(vetoResult, id) {
            if (typeof vetoShutdown !== 'function') {
                return; // veto handling disabled
            }
            if (vetoResult instanceof Promise) {
                logService.error(`[lifecycle] Long running operations before shutdown are unsupported in the web (id: ${id})`);
                veto = true; // implicitly vetos since we cannot handle promises in web
            }
            if (vetoResult === true) {
                logService.info(`[lifecycle]: Unload was prevented (id: ${id})`);
                veto = true;
            }
        }
        // Before Shutdown
        this._onBeforeShutdown.fire({
            reason: 2 /* ShutdownReason.QUIT */,
            veto(value, id) {
                handleVeto(value, id);
            },
            finalVeto(valueFn, id) {
                handleVeto(valueFn(), id); // in browser, trigger instantly because we do not support async anyway
            },
        });
        // Veto: handle if provided
        if (veto && typeof vetoShutdown === 'function') {
            return vetoShutdown();
        }
        // No veto, continue to shutdown
        return this.onUnload();
    }
    onUnload() {
        if (this.didUnload) {
            return; // only once
        }
        this.didUnload = true;
        this._willShutdown = true;
        // Register a late `pageshow` listener specifically on unload
        this._register(addDisposableListener(mainWindow, EventType.PAGE_SHOW, (e) => this.onLoadAfterUnload(e)));
        // First indicate will-shutdown
        const logService = this.logService;
        this._onWillShutdown.fire({
            reason: 2 /* ShutdownReason.QUIT */,
            joiners: () => [], // Unsupported in web
            token: CancellationToken.None, // Unsupported in web
            join(promise, joiner) {
                if (typeof promise === 'function') {
                    promise();
                }
                logService.error(`[lifecycle] Long running operations during shutdown are unsupported in the web (id: ${joiner.id})`);
            },
            force: () => {
                /* No-Op in web */
            },
        });
        // Finally end with did-shutdown
        this._onDidShutdown.fire();
    }
    onLoadAfterUnload(event) {
        // We only really care about page-show events
        // where the browser indicates to us that the
        // page was restored from cache and not freshly
        // loaded.
        const wasRestoredFromCache = event.persisted;
        if (!wasRestoredFromCache) {
            return;
        }
        // At this point, we know that the page was restored from
        // cache even though it was unloaded before,
        // so in order to get back to a functional workbench, we
        // currently can only reload the window
        // Docs: https://web.dev/bfcache/#optimize-your-pages-for-bfcache
        // Refs: https://github.com/microsoft/vscode/issues/136035
        this.withExpectedShutdown({ disableShutdownHandling: true }, () => mainWindow.location.reload());
    }
    doResolveStartupKind() {
        let startupKind = super.doResolveStartupKind();
        if (typeof startupKind !== 'number') {
            const timing = performance.getEntriesByType('navigation').at(0);
            if (timing?.type === 'reload') {
                // MDN: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/type#value
                startupKind = 3 /* StartupKind.ReloadedWindow */;
            }
        }
        return startupKind;
    }
};
BrowserLifecycleService = __decorate([
    __param(0, ILogService),
    __param(1, IStorageService)
], BrowserLifecycleService);
export { BrowserLifecycleService };
registerSingleton(ILifecycleService, BrowserLifecycleService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9saWZlY3ljbGUvYnJvd3Nlci9saWZlY3ljbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBa0IsaUJBQWlCLEVBQWUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEYsT0FBTyxFQUNOLGVBQWUsRUFDZixtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx3QkFBd0I7SUFRcEUsWUFDYyxVQUF1QixFQUNuQixjQUErQjtRQUVoRCxLQUFLLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBWDFCLHlCQUFvQixHQUE0QixTQUFTLENBQUE7UUFDekQsbUJBQWMsR0FBNEIsU0FBUyxDQUFBO1FBRW5ELHVCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUUxQixjQUFTLEdBQUcsS0FBSyxDQUFBO1FBUXhCLElBQUksQ0FBQyxpQkFBaUIsRUFB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