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
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILifecycleService, StartupKindToString, } from '../../../services/lifecycle/common/lifecycle.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import * as files from '../../files/common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { posix } from '../../../../base/common/path.js';
import { hash } from '../../../../base/common/hash.js';
let StartupTimings = class StartupTimings {
    constructor(_editorService, _paneCompositeService, _lifecycleService, _updateService, _workspaceTrustService) {
        this._editorService = _editorService;
        this._paneCompositeService = _paneCompositeService;
        this._lifecycleService = _lifecycleService;
        this._updateService = _updateService;
        this._workspaceTrustService = _workspaceTrustService;
    }
    async _isStandardStartup() {
        // check for standard startup:
        // * new window (no reload)
        // * workspace is trusted
        // * just one window
        // * explorer viewlet visible
        // * one text editor (not multiple, not webview, welcome etc...)
        // * cached data present (not rejected, not created)
        if (this._lifecycleService.startupKind !== 1 /* StartupKind.NewWindow */) {
            return StartupKindToString(this._lifecycleService.startupKind);
        }
        if (!this._workspaceTrustService.isWorkspaceTrusted()) {
            return 'Workspace not trusted';
        }
        const activeViewlet = this._paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (!activeViewlet || activeViewlet.getId() !== files.VIEWLET_ID) {
            return 'Explorer viewlet not visible';
        }
        const visibleEditorPanes = this._editorService.visibleEditorPanes;
        if (visibleEditorPanes.length !== 1) {
            return `Expected text editor count : 1, Actual : ${visibleEditorPanes.length}`;
        }
        if (!isCodeEditor(visibleEditorPanes[0].getControl())) {
            return 'Active editor is not a text editor';
        }
        const activePanel = this._paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if (activePanel) {
            return `Current active panel : ${this._paneCompositeService.getPaneComposite(activePanel.getId(), 1 /* ViewContainerLocation.Panel */)?.name}`;
        }
        const isLatestVersion = await this._updateService.isLatestVersion();
        if (isLatestVersion === false) {
            return 'Not on latest version, updates available';
        }
        return undefined;
    }
};
StartupTimings = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, ILifecycleService),
    __param(3, IUpdateService),
    __param(4, IWorkspaceTrustManagementService)
], StartupTimings);
export { StartupTimings };
let BrowserStartupTimings = class BrowserStartupTimings extends StartupTimings {
    constructor(editorService, paneCompositeService, lifecycleService, updateService, workspaceTrustService, timerService, logService, environmentService, telemetryService, productService) {
        super(editorService, paneCompositeService, lifecycleService, updateService, workspaceTrustService);
        this.timerService = timerService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.logPerfMarks();
    }
    async logPerfMarks() {
        if (!this.environmentService.profDurationMarkers) {
            return;
        }
        await this.timerService.whenReady();
        const standardStartupError = await this._isStandardStartup();
        const perfBaseline = await this.timerService.perfBaseline;
        const [from, to] = this.environmentService.profDurationMarkers;
        const content = `${this.timerService.getDuration(from, to)}\t${this.productService.nameShort}\t${(this.productService.commit || '').slice(0, 10) || '0000000000'}\t${this.telemetryService.sessionId}\t${standardStartupError === undefined ? 'standard_start' : 'NO_standard_start : ' + standardStartupError}\t${String(perfBaseline).padStart(4, '0')}ms\n`;
        this.logService.info(`[prof-timers] ${content}`);
    }
};
BrowserStartupTimings = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, ILifecycleService),
    __param(3, IUpdateService),
    __param(4, IWorkspaceTrustManagementService),
    __param(5, ITimerService),
    __param(6, ILogService),
    __param(7, IBrowserWorkbenchEnvironmentService),
    __param(8, ITelemetryService),
    __param(9, IProductService)
], BrowserStartupTimings);
export { BrowserStartupTimings };
let BrowserResourcePerformanceMarks = class BrowserResourcePerformanceMarks {
    constructor(telemetryService) {
        for (const item of performance.getEntriesByType('resource')) {
            try {
                const url = new URL(item.name);
                const name = posix.basename(url.pathname);
                telemetryService.publicLog2('startup.resource.perf', {
                    hosthash: `H${hash(url.host).toString(16)}`,
                    name,
                    duration: item.duration,
                });
            }
            catch {
                // ignore
            }
        }
    }
};
BrowserResourcePerformanceMarks = __decorate([
    __param(0, ITelemetryService)
], BrowserResourcePerformanceMarks);
export { BrowserResourcePerformanceMarks };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFRpbWluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9icm93c2VyL3N0YXJ0dXBUaW1pbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04saUJBQWlCLEVBRWpCLG1CQUFtQixHQUNuQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEtBQUssS0FBSyxNQUFNLDZCQUE2QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRS9DLElBQWUsY0FBYyxHQUE3QixNQUFlLGNBQWM7SUFDbkMsWUFDa0MsY0FBOEIsRUFDbkIscUJB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