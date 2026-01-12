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
import * as perf from '../../../../base/common/performance.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Barrier, timeout } from '../../../../base/common/async.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { isWeb } from '../../../../base/common/platform.js';
import { createBlobWorker } from '../../../../base/browser/webWorkerFactory.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { TerminalExtensions, } from '../../../../platform/terminal/common/terminal.js';
export const ITimerService = createDecorator('timerService');
class PerfMarks {
    constructor() {
        this._entries = [];
    }
    setMarks(source, entries) {
        this._entries.push([source, entries]);
    }
    getDuration(from, to) {
        const fromEntry = this._findEntry(from);
        if (!fromEntry) {
            return 0;
        }
        const toEntry = this._findEntry(to);
        if (!toEntry) {
            return 0;
        }
        return toEntry.startTime - fromEntry.startTime;
    }
    getStartTime(mark) {
        const entry = this._findEntry(mark);
        return entry ? entry.startTime : -1;
    }
    _findEntry(name) {
        for (const [, marks] of this._entries) {
            for (let i = marks.length - 1; i >= 0; i--) {
                if (marks[i].name === name) {
                    return marks[i];
                }
            }
        }
    }
    getEntries() {
        return this._entries.slice(0);
    }
}
let AbstractTimerService = class AbstractTimerService {
    constructor(_lifecycleService, _contextService, _extensionService, _updateService, _paneCompositeService, _editorService, _accessibilityService, _telemetryService, layoutService) {
        this._lifecycleService = _lifecycleService;
        this._contextService = _contextService;
        this._extensionService = _extensionService;
        this._updateService = _updateService;
        this._paneCompositeService = _paneCompositeService;
        this._editorService = _editorService;
        this._accessibilityService = _accessibilityService;
        this._telemetryService = _telemetryService;
        this._barrier = new Barrier();
        this._marks = new PerfMarks();
        this._rndValueShouldSendTelemetry = Math.random() < 0.03; // 3% of users
        Promise.all([
            this._extensionService.whenInstalledExtensionsRegistered(), // extensions registered
            _lifecycleService.when(3 /* LifecyclePhase.Restored */), // workbench created and parts restored
            layoutService.whenRestored, // layout restored (including visible editors resolved)
            Promise.all(Array.from(Registry.as(TerminalExtensions.Backend).backends.values()).map((e) => e.whenReady)),
        ])
            .then(() => {
            // set perf mark from renderer
            this.setPerformanceMarks('renderer', perf.getMarks());
            return this._computeStartupMetrics();
        })
            .then((metrics) => {
            this._startupMetrics = metrics;
            this._reportStartupTimes(metrics);
            this._barrier.open();
        });
        this.perfBaseline = this._barrier
            .wait()
            .then(() => this._lifecycleService.when(4 /* LifecyclePhase.Eventually */))
            .then(() => timeout(this._startupMetrics.timers.ellapsedRequire))
            .then(() => {
            // we use fibonacci numbers to have a performance baseline that indicates
            // how slow/fast THIS machine actually is.
            const jsSrc = function () {
                // the following operation took ~16ms (one frame at 64FPS) to complete on my machine. We derive performance observations
                // from that. We also bail if that took too long (>1s)
                let tooSlow = false;
                function fib(n) {
                    if (tooSlow) {
                        return 0;
                    }
                    if (performance.now() - t1 >= 1000) {
                        tooSlow = true;
                    }
                    if (n <= 2) {
                        return n;
                    }
                    return fib(n - 1) + fib(n - 2);
                }
                const t1 = performance.now();
                fib(24);
                const value = Math.round(performance.now() - t1);
                self.postMessage({ value: tooSlow ? -1 : value });
            }.toString();
            const blob = new Blob([`(${jsSrc})();`], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            const worker = createBlobWorker(blobUrl, { name: 'perfBaseline' });
            return new Promise((resolve) => {
                worker.onmessage = (e) => resolve(e.data.value);
            }).finally(() => {
                worker.terminate();
                URL.revokeObjectURL(blobUrl);
            });
        });
    }
    whenReady() {
        return this._barrier.wait();
    }
    get startupMetrics() {
        if (!this._startupMetrics) {
            throw new Error('illegal state, MUST NOT access startupMetrics before whenReady has resolved');
        }
        return this._startupMetrics;
    }
    setPerformanceMarks(source, marks) {
        // Perf marks are a shared resource because anyone can generate them
        // and because of that we only accept marks that start with 'code/'
        const codeMarks = marks.filter((mark) => mark.name.startsWith('code/'));
        this._marks.setMarks(source, codeMarks);
        this._reportPerformanceMarks(source, codeMarks);
    }
    getPerformanceMarks() {
        return this._marks.getEntries();
    }
    getDuration(from, to) {
        return this._marks.getDuration(from, to);
    }
    getStartTime(mark) {
        return this._marks.getStartTime(mark);
    }
    _reportStartupTimes(metrics) {
        // report IStartupMetrics as telemetry
        /* __GDPR__
            "startupTimeVaried" : {
                "owner": "jrieken",
                "${include}": [
                    "${IStartupMetrics}"
                ]
            }
        */
        this._telemetryService.publicLog('startupTimeVaried', metrics);
    }
    _shouldReportPerfMarks() {
        return this._rndValueShouldSendTelemetry;
    }
    _reportPerformanceMarks(source, marks) {
        if (!this._shouldReportPerfMarks()) {
            // the `startup.timer.mark` event is send very often. In order to save resources
            // we let some of our instances/sessions send this event
            return;
        }
        for (const mark of marks) {
            this._telemetryService.publicLog2('startup.timer.mark', {
                source,
                name: new TelemetryTrustedValue(mark.name),
                startTime: mark.startTime,
            });
        }
    }
    async _computeStartupMetrics() {
        const initialStartup = this._isInitialStartup();
        let startMark;
        if (isWeb) {
            startMark = 'code/timeOrigin';
        }
        else {
            startMark = initialStartup ? 'code/didStartMain' : 'code/willOpenNewWindow';
        }
        const activeViewlet = this._paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        const activePanel = this._paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        const info = {
            ellapsed: this._marks.getDuration(startMark, 'code/didStartWorkbench'),
            // reflections
            isLatestVersion: Boolean(await this._updateService.isLatestVersion()),
            didUseCachedData: this._didUseCachedData(),
            windowKind: this._lifecycleService.startupKind,
            windowCount: await this._getWindowCount(),
            viewletId: activeViewlet?.getId(),
            editorIds: this._editorService.visibleEditors.map((input) => input.typeId),
            panelId: activePanel ? activePanel.getId() : undefined,
            // timers
            timers: {
                ellapsedAppReady: initialStartup
                    ? this._marks.getDuration('code/didStartMain', 'code/mainAppReady')
                    : undefined,
                ellapsedNlsGeneration: initialStartup
                    ? this._marks.getDuration('code/willGenerateNls', 'code/didGenerateNls')
                    : undefined,
                ellapsedLoadMainBundle: initialStartup
                    ? this._marks.getDuration('code/willLoadMainBundle', 'code/didLoadMainBundle')
                    : undefined,
                ellapsedRunMainBundle: initialStartup
                    ? this._marks.getDuration('code/didStartMain', 'code/didRunMainBundle')
                    : undefined,
                ellapsedCrashReporter: initialStartup
                    ? this._marks.getDuration('code/willStartCrashReporter', 'code/didStartCrashReporter')
                    : undefined,
                ellapsedMainServer: initialStartup
                    ? this._marks.getDuration('code/willStartMainServer', 'code/didStartMainServer')
                    : undefined,
                ellapsedWindowCreate: initialStartup
                    ? this._marks.getDuration('code/willCreateCodeWindow', 'code/didCreateCodeWindow')
                    : undefined,
                ellapsedWindowRestoreState: initialStartup
                    ? this._marks.getDuration('code/willRestoreCodeWindowState', 'code/didRestoreCodeWindowState')
                    : undefined,
                ellapsedBrowserWindowCreate: initialStartup
                    ? this._marks.getDuration('code/willCreateCodeBrowserWindow', 'code/didCreateCodeBrowserWindow')
                    : undefined,
                ellapsedWindowMaximize: initialStartup
                    ? this._marks.getDuration('code/willMaximizeCodeWindow', 'code/didMaximizeCodeWindow')
                    : undefined,
                ellapsedWindowLoad: initialStartup
                    ? this._marks.getDuration('code/mainAppReady', 'code/willOpenNewWindow')
                    : undefined,
                ellapsedWindowLoadToRequire: this._marks.getDuration('code/willOpenNewWindow', 'code/willLoadWorkbenchMain'),
                ellapsedRequire: this._marks.getDuration('code/willLoadWorkbenchMain', 'code/didLoadWorkbenchMain'),
                ellapsedWaitForWindowConfig: this._marks.getDuration('code/willWaitForWindowConfig', 'code/didWaitForWindowConfig'),
                ellapsedStorageInit: this._marks.getDuration('code/willInitStorage', 'code/didInitStorage'),
                ellapsedSharedProcesConnected: this._marks.getDuration('code/willConnectSharedProcess', 'code/didConnectSharedProcess'),
                ellapsedWorkspaceServiceInit: this._marks.getDuration('code/willInitWorkspaceService', 'code/didInitWorkspaceService'),
                ellapsedRequiredUserDataInit: this._marks.getDuration('code/willInitRequiredUserData', 'code/didInitRequiredUserData'),
                ellapsedOtherUserDataInit: this._marks.getDuration('code/willInitOtherUserData', 'code/didInitOtherUserData'),
                ellapsedExtensions: this._marks.getDuration('code/willLoadExtensions', 'code/didLoadExtensions'),
                ellapsedEditorRestore: this._marks.getDuration('code/willRestoreEditors', 'code/didRestoreEditors'),
                ellapsedViewletRestore: this._marks.getDuration('code/willRestoreViewlet', 'code/didRestoreViewlet'),
                ellapsedPanelRestore: this._marks.getDuration('code/willRestorePanel', 'code/didRestorePanel'),
                ellapsedWorkbenchContributions: this._marks.getDuration('code/willCreateWorkbenchContributions/1', 'code/didCreateWorkbenchContributions/2'),
                ellapsedWorkbench: this._marks.getDuration('code/willStartWorkbench', 'code/didStartWorkbench'),
                ellapsedExtensionsReady: this._marks.getDuration(startMark, 'code/didLoadExtensions'),
                ellapsedRenderer: this._marks.getDuration('code/didStartRenderer', 'code/didStartWorkbench'),
            },
            // system info
            platform: undefined,
            release: undefined,
            arch: undefined,
            totalmem: undefined,
            freemem: undefined,
            meminfo: undefined,
            cpus: undefined,
            loadavg: undefined,
            isVMLikelyhood: undefined,
            initialStartup,
            hasAccessibilitySupport: this._accessibilityService.isScreenReaderOptimized(),
            emptyWorkbench: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */,
        };
        await this._extendStartupInfo(info);
        return info;
    }
};
AbstractTimerService = __decorate([
    __param(0, ILifecycleService),
    __param(1, IWorkspaceContextService),
    __param(2, IExtensionService),
    __param(3, IUpdateService),
    __param(4, IPaneCompositePartService),
    __param(5, IEditorService),
    __param(6, IAccessibilityService),
    __param(7, ITelemetryService),
    __param(8, IWorkbenchLayoutService)
], AbstractTimerService);
export { AbstractTimerService };
export class TimerService extends AbstractTimerService {
    _isInitialStartup() {
        return false;
    }
    _didUseCachedData() {
        return false;
    }
    async _getWindowCount() {
        return 1;
    }
    async _extendStartupInfo(info) {
        info.isVMLikelyhood = 0;
        info.isARM64Emulated = false;
        info.platform = navigator.userAgent;
        info.release = navigator.appVersion;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGltZXIvYnJvd3Nlci90aW1lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQy9FLE9BQU8sRUFB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