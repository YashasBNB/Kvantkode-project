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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFRpbWluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2VsZWN0cm9uLXNhbmRib3gvc3RhcnR1cFRpbWluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSww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