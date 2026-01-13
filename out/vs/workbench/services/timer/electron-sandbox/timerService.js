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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGltZXIvZWxlY3Ryb24tc2FuZGJveC90aW1lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sb0JBQW9CLEVBRXBCLGFBQWEsR0FDYixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNwRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVqRixJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsb0JBQW9CO0lBQ3JELFlBQ3NDLGtCQUFzQyxFQUUxRCxtQkFBdUQsRUFDckQsZ0JBQW1DLEVBQzVCLGNBQXdDLEVBQy9DLGdCQUFtQyxFQUN0QyxhQUE2QixFQUNsQixvQkFBK0MsRUFDMUQsYUFBNkIsRUFDdEIsb0JBQTJDLEVBQy9DLGdCQUFtQyxFQUM3QixhQUFzQyxFQUM3QixlQUFnQyxFQUNoQyxlQUFnQztRQUVsRSxLQUFLLENBQ0osZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLG9CQUFvQixFQUNwQixhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixhQUFhLENBQ2IsQ0FBQTtRQXpCb0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUUxRCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQW9DO1FBVXRDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFhbEUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVTLGlCQUFpQjtRQUMxQixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDakUsQ0FBQztJQUNTLGlCQUFpQjtRQUMxQixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUM5RixDQUFDO0lBQ1MsZUFBZTtRQUN4QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUNoRCxDQUFDO0lBRVMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQWdDO1FBQ2xFLElBQUksQ0FBQztZQUNKLE1BQU0sQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDM0YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRTtnQkFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRTtnQkFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixFQUFFO2dCQUNqRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsOEJBQThCLEVBQUU7YUFDeEQsQ0FBQyxDQUFBO1lBRUYsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFBO1lBQ3JDLElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQTtZQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUE7WUFDckMsSUFBSSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFBO1lBQ25DLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQTtZQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUE7WUFDbkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7WUFFdEMsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1lBQzlELElBQUksQ0FBQyxPQUFPLEdBQUc7Z0JBQ2QsY0FBYyxFQUFFLGlCQUFpQixDQUFDLFdBQVc7Z0JBQzdDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxPQUFPO2dCQUN2QyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsTUFBTTthQUNyQyxDQUFBO1lBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBRTFELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUE7WUFDakMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDeEYsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLCtEQUErRDtRQUNoRSxDQUFDO0lBQ0YsQ0FBQztJQUVrQixzQkFBc0I7UUFDeEMsNERBQTREO1FBQzVELE9BQU8sQ0FDTixLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQzlGLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWxGWSxZQUFZO0lBRXRCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQ0FBa0MsQ0FBQTtJQUVsQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSx1QkFBdUIsQ0FBQTtJQUN2QixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsZUFBZSxDQUFBO0dBZkwsWUFBWSxDQWtGeEI7O0FBRUQsaUJBQWlCLENBQUMsYUFBYSxFQUFFLFlBQVksb0NBQTRCLENBQUE7QUFFekUsMkJBQTJCO0FBRTNCLE1BQU0sMkJBQTJCLEdBQUcsd0JBQXdCLENBQUE7QUFDNUQsSUFBSSxpQkFBaUIsR0FBd0IsU0FBUyxDQUFBO0FBRXRELE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsY0FBK0IsRUFDL0IsY0FBK0IsRUFDL0Isa0JBQXNEO0lBRXRELDhDQUE4QztJQUM5Qyw2Q0FBNkM7SUFDN0MsZ0JBQWdCO0lBQ2hCLElBQUksT0FBTyxpQkFBaUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGFBQWEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4RSxpQkFBaUIsR0FBRyxLQUFLLENBQUEsQ0FBQywrREFBK0Q7UUFDMUYsQ0FBQzthQUFNLElBQ04sY0FBYyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsb0NBQTJCO1lBQ3pFLGNBQWMsQ0FBQyxNQUFNLEVBQ3BCLENBQUM7WUFDRixpQkFBaUIsR0FBRyxJQUFJLENBQUEsQ0FBQywrREFBK0Q7UUFDekYsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjLENBQUMsS0FBSyxDQUNuQiwyQkFBMkIsRUFDM0IsY0FBYyxDQUFDLE1BQU0sbUVBR3JCLENBQUE7WUFDRCxpQkFBaUIsR0FBRyxLQUFLLENBQUEsQ0FBQyxrRUFBa0U7UUFDN0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLGlCQUFpQixDQUFBO0FBQ3pCLENBQUM7QUFFRCxZQUFZIn0=