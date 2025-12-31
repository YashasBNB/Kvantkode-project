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
import { timeout } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { StartupTimings } from '../browser/startupTimings.js';
import { coalesce } from '../../../../base/common/arrays.js';
let NativeStartupTimings = class NativeStartupTimings extends StartupTimings {
    constructor(_fileService, _timerService, _nativeHostService, editorService, paneCompositeService, _telemetryService, lifecycleService, updateService, _environmentService, _productService, workspaceTrustService) {
        super(editorService, paneCompositeService, lifecycleService, updateService, workspaceTrustService);
        this._fileService = _fileService;
        this._timerService = _timerService;
        this._nativeHostService = _nativeHostService;
        this._telemetryService = _telemetryService;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._report().catch(onUnexpectedError);
    }
    async _report() {
        const standardStartupError = await this._isStandardStartup();
        this._appendStartupTimes(standardStartupError).catch(onUnexpectedError);
    }
    async _appendStartupTimes(standardStartupError) {
        const appendTo = this._environmentService.args['prof-append-timers'];
        const durationMarkers = this._environmentService.args['prof-duration-markers'];
        const durationMarkersFile = this._environmentService.args['prof-duration-markers-file'];
        if (!appendTo && !durationMarkers) {
            // nothing to do
            return;
        }
        try {
            await Promise.all([
                this._timerService.whenReady(),
                timeout(15000), // wait: cached data creation, telemetry sending
            ]);
            const perfBaseline = await this._timerService.perfBaseline;
            const heapStatistics = await this._resolveStartupHeapStatistics();
            if (heapStatistics) {
                this._telemetryLogHeapStatistics(heapStatistics);
            }
            if (appendTo) {
                const content = coalesce([
                    this._timerService.startupMetrics.ellapsed,
                    this._productService.nameShort,
                    (this._productService.commit || '').slice(0, 10) || '0000000000',
                    this._telemetryService.sessionId,
                    standardStartupError === undefined
                        ? 'standard_start'
                        : `NO_standard_start : ${standardStartupError}`,
                    `${String(perfBaseline).padStart(4, '0')}ms`,
                    heapStatistics ? this._printStartupHeapStatistics(heapStatistics) : undefined,
                ]).join('\t') + '\n';
                await this._appendContent(URI.file(appendTo), content);
            }
            if (durationMarkers?.length) {
                const durations = [];
                for (const durationMarker of durationMarkers) {
                    let duration = 0;
                    if (durationMarker === 'ellapsed') {
                        duration = this._timerService.startupMetrics.ellapsed;
                    }
                    else if (durationMarker.indexOf('-') !== -1) {
                        const markers = durationMarker.split('-');
                        if (markers.length === 2) {
                            duration = this._timerService.getDuration(markers[0], markers[1]);
                        }
                    }
                    if (duration) {
                        durations.push(durationMarker);
                        durations.push(`${duration}`);
                    }
                }
                const durationsContent = `${durations.join('\t')}\n`;
                if (durationMarkersFile) {
                    await this._appendContent(URI.file(durationMarkersFile), durationsContent);
                }
                else {
                    console.log(durationsContent);
                }
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this._nativeHostService.exit(0);
        }
    }
    async _isStandardStartup() {
        const windowCount = await this._nativeHostService.getWindowCount();
        if (windowCount !== 1) {
            return `Expected window count : 1, Actual : ${windowCount}`;
        }
        return super._isStandardStartup();
    }
    async _appendContent(file, content) {
        const chunks = [];
        if (await this._fileService.exists(file)) {
            chunks.push((await this._fileService.readFile(file)).value);
        }
        chunks.push(VSBuffer.fromString(content));
        await this._fileService.writeFile(file, VSBuffer.concat(chunks));
    }
    async _resolveStartupHeapStatistics() {
        if (!this._environmentService.args['enable-tracing'] ||
            !this._environmentService.args['trace-startup-file'] ||
            this._environmentService.args['trace-startup-format'] !== 'json' ||
            !this._environmentService.args['trace-startup-duration']) {
            return undefined; // unexpected arguments for startup heap statistics
        }
        const windowProcessId = await this._nativeHostService.getProcessId();
        const used = performance.memory?.usedJSHeapSize ??
            0; // https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
        let minorGCs = 0;
        let majorGCs = 0;
        let garbage = 0;
        let duration = 0;
        try {
            const traceContents = JSON.parse((await this._fileService.readFile(URI.file(this._environmentService.args['trace-startup-file']))).value.toString());
            for (const event of traceContents.traceEvents) {
                if (event.pid !== windowProcessId) {
                    continue;
                }
                switch (event.name) {
                    // Major/Minor GC Events
                    case 'MinorGC':
                        minorGCs++;
                        break;
                    case 'MajorGC':
                        majorGCs++;
                        break;
                    // GC Events that block the main thread
                    // Refs: https://v8.dev/blog/trash-talk
                    case 'V8.GCFinalizeMC':
                    case 'V8.GCScavenger':
                        duration += event.dur;
                        break;
                }
                if (event.name === 'MajorGC' || event.name === 'MinorGC') {
                    if (typeof event.args?.usedHeapSizeAfter === 'number' &&
                        typeof event.args.usedHeapSizeBefore === 'number') {
                        garbage += event.args.usedHeapSizeBefore - event.args.usedHeapSizeAfter;
                    }
                }
            }
            return { minorGCs, majorGCs, used, garbage, duration: Math.round(duration / 1000) };
        }
        catch (error) {
            console.error(error);
        }
        return undefined;
    }
    _telemetryLogHeapStatistics({ used, garbage, majorGCs, minorGCs, duration, }) {
        this._telemetryService.publicLog2('startupHeapStatistics', {
            heapUsed: used,
            heapGarbage: garbage,
            majorGCs,
            minorGCs,
            gcsDuration: duration,
        });
    }
    _printStartupHeapStatistics({ used, garbage, majorGCs, minorGCs, duration, }) {
        const MB = 1024 * 1024;
        return `Heap: ${Math.round(used / MB)}MB (used) ${Math.round(garbage / MB)}MB (garbage) ${majorGCs} (MajorGC) ${minorGCs} (MinorGC) ${duration}ms (GC duration)`;
    }
};
NativeStartupTimings = __decorate([
    __param(0, IFileService),
    __param(1, ITimerService),
    __param(2, INativeHostService),
    __param(3, IEditorService),
    __param(4, IPaneCompositePartService),
    __param(5, ITelemetryService),
    __param(6, ILifecycleService),
    __param(7, IUpdateService),
    __param(8, INativeWorkbenchEnvironmentService),
    __param(9, IProductService),
    __param(10, IWorkspaceTrustManagementService)
], NativeStartupTimings);
export { NativeStartupTimings };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFRpbWluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9lbGVjdHJvbi1zYW5kYm94L3N0YXJ0dXBUaW1pbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDMUcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQW9CckQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxjQUFjO0lBQ3ZELFlBQ2dDLFlBQTBCLEVBQ3pCLGFBQTRCLEVBQ3ZCLGtCQUFzQyxFQUMzRCxhQUE2QixFQUNsQixvQkFBK0MsRUFDdEMsaUJBQW9DLEVBQ3JELGdCQUFtQyxFQUN0QyxhQUE2QixFQUU1QixtQkFBdUQsRUFDdEMsZUFBZ0MsRUFDaEMscUJBQXVEO1FBRXpGLEtBQUssQ0FDSixhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IscUJBQXFCLENBQ3JCLENBQUE7UUFuQjhCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQ3pCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3ZCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFHdkMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUl2RCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQW9DO1FBQ3RDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQVdsRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPO1FBQ3BCLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUM1RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUFDLG9CQUF3QztRQUN6RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDcEUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3ZGLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNuQyxnQkFBZ0I7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFO2dCQUM5QixPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsZ0RBQWdEO2FBQ2hFLENBQUMsQ0FBQTtZQUVGLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUE7WUFDMUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtZQUNqRSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsMkJBQTJCLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDakQsQ0FBQztZQUVELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxPQUFPLEdBQ1osUUFBUSxDQUFDO29CQUNSLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLFFBQVE7b0JBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUztvQkFDOUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLFlBQVk7b0JBQ2hFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO29CQUNoQyxvQkFBb0IsS0FBSyxTQUFTO3dCQUNqQyxDQUFDLENBQUMsZ0JBQWdCO3dCQUNsQixDQUFDLENBQUMsdUJBQXVCLG9CQUFvQixFQUFFO29CQUNoRCxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJO29CQUM1QyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztpQkFDN0UsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUE7Z0JBQ3JCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZELENBQUM7WUFFRCxJQUFJLGVBQWUsRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFBO2dCQUM5QixLQUFLLE1BQU0sY0FBYyxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUM5QyxJQUFJLFFBQVEsR0FBVyxDQUFDLENBQUE7b0JBQ3hCLElBQUksY0FBYyxLQUFLLFVBQVUsRUFBRSxDQUFDO3dCQUNuQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFBO29CQUN0RCxDQUFDO3lCQUFNLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUMvQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUN6QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQzFCLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQ2xFLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUNkLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7d0JBQzlCLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLEVBQUUsQ0FBQyxDQUFBO29CQUM5QixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQTtnQkFDcEQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO29CQUN6QixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7Z0JBQzNFLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFFa0IsS0FBSyxDQUFDLGtCQUFrQjtRQUMxQyxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUNsRSxJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLHVDQUF1QyxXQUFXLEVBQUUsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFTLEVBQUUsT0FBZTtRQUN0RCxNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUE7UUFDN0IsSUFBSSxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDekMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFTyxLQUFLLENBQUMsNkJBQTZCO1FBQzFDLElBQ0MsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQ2hELENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztZQUNwRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssTUFBTTtZQUNoRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsRUFDdkQsQ0FBQztZQUNGLE9BQU8sU0FBUyxDQUFBLENBQUMsbURBQW1EO1FBQ3JFLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNwRSxNQUFNLElBQUksR0FDUixXQUFtRSxDQUFDLE1BQU0sRUFBRSxjQUFjO1lBQzNGLENBQUMsQ0FBQSxDQUFDLHNFQUFzRTtRQUV6RSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDaEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtRQUNmLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUVoQixJQUFJLENBQUM7WUFDSixNQUFNLGFBQWEsR0FBb0MsSUFBSSxDQUFDLEtBQUssQ0FDaEUsQ0FDQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUMvQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUM3RCxDQUNELENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUNsQixDQUFBO1lBQ0QsS0FBSyxNQUFNLEtBQUssSUFBSSxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQy9DLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxlQUFlLEVBQUUsQ0FBQztvQkFDbkMsU0FBUTtnQkFDVCxDQUFDO2dCQUVELFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNwQix3QkFBd0I7b0JBQ3hCLEtBQUssU0FBUzt3QkFDYixRQUFRLEVBQUUsQ0FBQTt3QkFDVixNQUFLO29CQUNOLEtBQUssU0FBUzt3QkFDYixRQUFRLEVBQUUsQ0FBQTt3QkFDVixNQUFLO29CQUVOLHVDQUF1QztvQkFDdkMsdUNBQXVDO29CQUN2QyxLQUFLLGlCQUFpQixDQUFDO29CQUN2QixLQUFLLGdCQUFnQjt3QkFDcEIsUUFBUSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUE7d0JBQ3JCLE1BQUs7Z0JBQ1AsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQzFELElBQ0MsT0FBTyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixLQUFLLFFBQVE7d0JBQ2pELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLEVBQ2hELENBQUM7d0JBQ0YsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtvQkFDeEUsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUE7UUFDcEYsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNyQixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLDJCQUEyQixDQUFDLEVBQ25DLElBQUksRUFDSixPQUFPLEVBQ1AsUUFBUSxFQUNSLFFBQVEsRUFDUixRQUFRLEdBQ1M7UUFxQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBRy9CLHVCQUF1QixFQUFFO1lBQzFCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsV0FBVyxFQUFFLE9BQU87WUFDcEIsUUFBUTtZQUNSLFFBQVE7WUFDUixXQUFXLEVBQUUsUUFBUTtTQUNyQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sMkJBQTJCLENBQUMsRUFDbkMsSUFBSSxFQUNKLE9BQU8sRUFDUCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFFBQVEsR0FDUztRQUNqQixNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLE9BQU8sU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsYUFBYSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLFFBQVEsY0FBYyxRQUFRLGNBQWMsUUFBUSxrQkFBa0IsQ0FBQTtJQUNqSyxDQUFDO0NBQ0QsQ0FBQTtBQTFQWSxvQkFBb0I7SUFFOUIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsa0NBQWtDLENBQUE7SUFFbEMsV0FBQSxlQUFlLENBQUE7SUFDZixZQUFBLGdDQUFnQyxDQUFBO0dBYnRCLG9CQUFvQixDQTBQaEMifQ==