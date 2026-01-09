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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFRpbWluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2Jyb3dzZXIvc3RhcnR1cFRpbWluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzFFLE9BQU8sRUFDTixpQkFBaUIsRUFFakIsbUJBQW1CLEdBQ25CLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sS0FBSyxLQUFLLE1BQU0sNkJBQTZCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXBHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFL0MsSUFBZSxjQUFjLEdBQTdCLE1BQWUsY0FBYztJQUNu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