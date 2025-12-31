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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RpbWVyL2Jyb3dzZXIvdGltZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXhGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFB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