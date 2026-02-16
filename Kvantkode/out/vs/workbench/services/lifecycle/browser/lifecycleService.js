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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xpZmVjeWNsZS9icm93c2VyL2xpZmVjeWNsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFrQixpQkFBaUIsRUFBZSxNQUFNLHdCQUF3QixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRixPQUFPLEVBQ04sZUFBZSxFQUNmLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLHdCQUF3QjtJQVFwRSxZQUNjLFVBQXVCLEVBQ25CLGNBQStCO1FBRWhELEtBQUssQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFYMUIseUJBQW9CLEdBQTRCLFNBQVMsQ0FBQTtRQUN6RCxtQkFBYyxHQUE0QixTQUFTLENBQUE7UUFFbkQsdUJBQWtCLEdBQUcsS0FBSyxDQUFBO1FBRTFCLGNBQVMsR0FBRyxLQUFLLENBQUE7UUFReEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4Qiw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLHFCQUFxQixDQUNoRCxVQUFVLEVBQ1YsU0FBUyxDQUFDLGFBQWEsRUFDdkIsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUNoRCxDQUFBO1FBRUQsbURBQW1EO1FBQ25ELGdEQUFnRDtRQUNoRCwrQ0FBK0M7UUFDL0Msc0RBQXNEO1FBQ3RELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsY0FBYyxHQUFHLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUNqRixJQUFJLENBQUMsUUFBUSxFQUFFLENBQ2YsQ0FBQTtJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsS0FBd0I7UUFDOUMsK0JBQStCO1FBQy9CLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsdURBQXVELENBQUMsQ0FBQTtZQUU3RSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1FBQ2hDLENBQUM7UUFFRCxrQ0FBa0M7YUFDN0IsQ0FBQztZQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9FQUFvRSxDQUFDLENBQUE7WUFFMUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEtBQXdCO1FBQ2hELEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN0QixLQUFLLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDM0IsZUFBZSxFQUNmLG9GQUFvRixDQUNwRixDQUFBO0lBQ0YsQ0FBQztJQUlELG9CQUFvQixDQUNuQixNQUEwRCxFQUMxRCxRQUFtQjtRQUVuQixvQkFBb0I7UUFDcEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQTtZQUU1QiwrQkFBK0I7WUFDL0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQsMERBQTBEO2FBQ3JELENBQUM7WUFDTCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1lBQzlCLElBQUksQ0FBQztnQkFDSixRQUFRLEVBQUUsRUFBRSxDQUFBO1lBQ2IsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDYixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO1FBRXRELDBDQUEwQztRQUMxQyw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFFOUIsK0JBQStCO1FBQy9CLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFN0QsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sVUFBVSxDQUFDLFlBQXlCO1FBQzNDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFFbEMsMENBQTBDO1FBQzFDLDJDQUEyQztRQUMzQyw0Q0FBNEM7UUFDNUMsMENBQTBDO1FBQzFDLGNBQWM7UUFDZCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV2RCxJQUFJLElBQUksR0FBRyxLQUFLLENBQUE7UUFFaEIsU0FBUyxVQUFVLENBQUMsVUFBc0MsRUFBRSxFQUFVO1lBQ3JFLElBQUksT0FBTyxZQUFZLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ3hDLE9BQU0sQ0FBQyx5QkFBeUI7WUFDakMsQ0FBQztZQUVELElBQUksVUFBVSxZQUFZLE9BQU8sRUFBRSxDQUFDO2dCQUNuQyxVQUFVLENBQUMsS0FBSyxDQUNmLHVGQUF1RixFQUFFLEdBQUcsQ0FDNUYsQ0FBQTtnQkFFRCxJQUFJLEdBQUcsSUFBSSxDQUFBLENBQUMsMERBQTBEO1lBQ3ZFLENBQUM7WUFFRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDekIsVUFBVSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFaEUsSUFBSSxHQUFHLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7WUFDM0IsTUFBTSw2QkFBcUI7WUFDM0IsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNiLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDdEIsQ0FBQztZQUNELFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDcEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsdUVBQXVFO1lBQ2xHLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxJQUFJLElBQUksT0FBTyxZQUFZLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDaEQsT0FBTyxZQUFZLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsZ0NBQWdDO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTyxRQUFRO1FBQ2YsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTSxDQUFDLFlBQVk7UUFDcEIsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBRXpCLDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBc0IsRUFBRSxFQUFFLENBQ2pGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FDekIsQ0FDRCxDQUFBO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDekIsTUFBTSw2QkFBcUI7WUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxxQkFBcUI7WUFDeEMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLElBQUksRUFBRSxxQkFBcUI7WUFDcEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNO2dCQUNuQixJQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUNuQyxPQUFPLEVBQUUsQ0FBQTtnQkFDVixDQUFDO2dCQUNELFVBQVUsQ0FBQyxLQUFLLENBQ2YsdUZBQXVGLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FDbkcsQ0FBQTtZQUNGLENBQUM7WUFDRCxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNYLGtCQUFrQjtZQUNuQixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEtBQTBCO1FBQ25ELDZDQUE2QztRQUM3Qyw2Q0FBNkM7UUFDN0MsK0NBQStDO1FBQy9DLFVBQVU7UUFDVixNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUE7UUFDNUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsT0FBTTtRQUNQLENBQUM7UUFFRCx5REFBeUQ7UUFDekQsNENBQTRDO1FBQzVDLHdEQUF3RDtRQUN4RCx1Q0FBdUM7UUFDdkMsaUVBQWlFO1FBQ2pFLDBEQUEwRDtRQUMxRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDakcsQ0FBQztJQUVrQixvQkFBb0I7UUFDdEMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFDOUMsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FFbEQsQ0FBQTtZQUNaLElBQUksTUFBTSxFQUFFLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDL0IsK0ZBQStGO2dCQUMvRixXQUFXLHFDQUE2QixDQUFBO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztDQUNELENBQUE7QUE5TlksdUJBQXVCO0lBU2pDLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxlQUFlLENBQUE7R0FWTCx1QkFBdUIsQ0E4Tm5DOztBQUVELGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLHVCQUF1QixrQ0FBMEIsQ0FBQSJ9