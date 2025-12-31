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
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AbstractTimerService, ITimerService, } from '../browser/timerService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
let TimerService = class TimerService extends AbstractTimerService {
    constructor(_nativeHostService, _environmentService, lifecycleService, contextService, extensionService, updateService, paneCompositeService, editorService, accessibilityService, telemetryService, layoutService, _productService, _storageService) {
        super(lifecycleService, contextService, extensionService, updateService, paneCompositeService, editorService, accessibilityService, telemetryService, layoutService);
        this._nativeHostService = _nativeHostService;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._storageService = _storageService;
        this.setPerformanceMarks('main', _environmentService.window.perfMarks);
    }
    _isInitialStartup() {
        return Boolean(this._environmentService.window.isInitialStartup);
    }
    _didUseCachedData() {
        return didUseCachedData(this._productService, this._storageService, this._environmentService);
    }
    _getWindowCount() {
        return this._nativeHostService.getWindowCount();
    }
    async _extendStartupInfo(info) {
        try {
            const [osProperties, osStatistics, virtualMachineHint, isARM64Emulated] = await Promise.all([
                this._nativeHostService.getOSProperties(),
                this._nativeHostService.getOSStatistics(),
                this._nativeHostService.getOSVirtualMachineHint(),
                this._nativeHostService.isRunningUnderARM64Translation(),
            ]);
            info.totalmem = osStatistics.totalmem;
            info.freemem = osStatistics.freemem;
            info.platform = osProperties.platform;
            info.release = osProperties.release;
            info.arch = osProperties.arch;
            info.loadavg = osStatistics.loadavg;
            info.isARM64Emulated = isARM64Emulated;
            const processMemoryInfo = await process.getProcessMemoryInfo();
            info.meminfo = {
                workingSetSize: processMemoryInfo.residentSet,
                privateBytes: processMemoryInfo.private,
                sharedBytes: processMemoryInfo.shared,
            };
            info.isVMLikelyhood = Math.round(virtualMachineHint * 100);
            const rawCpus = osProperties.cpus;
            if (rawCpus && rawCpus.length > 0) {
                info.cpus = { count: rawCpus.length, speed: rawCpus[0].speed, model: rawCpus[0].model };
            }
        }
        catch (error) {
            // ignore, be on the safe side with these hardware method calls
        }
    }
    _shouldReportPerfMarks() {
        // always send when running with the prof-append-timers flag
        return (super._shouldReportPerfMarks() || Boolean(this._environmentService.args['prof-append-timers']));
    }
};
TimerService = __decorate([
    __param(0, INativeHostService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, ILifecycleService),
    __param(3, IWorkspaceContextService),
    __param(4, IExtensionService),
    __param(5, IUpdateService),
    __param(6, IPaneCompositePartService),
    __param(7, IEditorService),
    __param(8, IAccessibilityService),
    __param(9, ITelemetryService),
    __param(10, IWorkbenchLayoutService),
    __param(11, IProductService),
    __param(12, IStorageService)
], TimerService);
export { TimerService };
registerSingleton(ITimerService, TimerService, 1 /* InstantiationType.Delayed */);
//#region cached data logic
const lastRunningCommitStorageKey = 'perf/lastRunningCommit';
let _didUseCachedData = undefined;
export function didUseCachedData(productService, storageService, environmentService) {
    // browser code loading: only a guess based on
    // this being the first start with the commit
    // or subsequent
    if (typeof _didUseCachedData !== 'boolean') {
        if (!environmentService.window.isCodeCaching || !productService.commit) {
            _didUseCachedData = false; // we only produce cached data whith commit and code cache path
        }
        else if (storageService.get(lastRunningCommitStorageKey, -1 /* StorageScope.APPLICATION */) ===
            productService.commit) {
            _didUseCachedData = true; // subsequent start on same commit, assume cached data is there
        }
        else {
            storageService.store(lastRunningCommitStorageKey, productService.commit, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            _didUseCachedData = false; // first time start on commit, assume cached data is not yet there
        }
    }
    return _didUseCachedData;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RpbWVyL2VsZWN0cm9uLXNhbmRib3gvdGltZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLG9CQUFvQixFQUVwQixhQUFhLEdBQ2IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDcEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFD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