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
var PerfviewContrib_1, PerfviewInput_1;
import { localize } from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { ILifecycleService, StartupKindToString, } from '../../../services/lifecycle/common/lifecycle.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { writeTransientState } from '../../codeEditor/browser/toggleWordWrap.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, getWorkbenchContribution, } from '../../../common/contributions.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let PerfviewContrib = class PerfviewContrib {
    static { PerfviewContrib_1 = this; }
    static get() {
        return getWorkbenchContribution(PerfviewContrib_1.ID);
    }
    static { this.ID = 'workbench.contrib.perfview'; }
    constructor(_instaService, textModelResolverService) {
        this._instaService = _instaService;
        this._inputUri = URI.from({ scheme: 'perf', path: 'Startup Performance' });
        this._registration = textModelResolverService.registerTextModelContentProvider('perf', _instaService.createInstance(PerfModelContentProvider));
    }
    dispose() {
        this._registration.dispose();
    }
    getInputUri() {
        return this._inputUri;
    }
    getEditorInput() {
        return this._instaService.createInstance(PerfviewInput);
    }
};
PerfviewContrib = PerfviewContrib_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextModelService)
], PerfviewContrib);
export { PerfviewContrib };
let PerfviewInput = class PerfviewInput extends TextResourceEditorInput {
    static { PerfviewInput_1 = this; }
    static { this.Id = 'PerfviewInput'; }
    get typeId() {
        return PerfviewInput_1.Id;
    }
    constructor(textModelResolverService, textFileService, editorService, fileService, labelService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(PerfviewContrib.get().getInputUri(), localize('name', 'Startup Performance'), undefined, undefined, undefined, textModelResolverService, textFileService, editorService, fileService, labelService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
    }
};
PerfviewInput = PerfviewInput_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, ITextFileService),
    __param(2, IEditorService),
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, IFilesConfigurationService),
    __param(6, ITextResourceConfigurationService),
    __param(7, ICustomEditorLabelService)
], PerfviewInput);
export { PerfviewInput };
let PerfModelContentProvider = class PerfModelContentProvider {
    constructor(_modelService, _languageService, _editorService, _lifecycleService, _timerService, _extensionService, _productService, _remoteAgentService, _terminalService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._editorService = _editorService;
        this._lifecycleService = _lifecycleService;
        this._timerService = _timerService;
        this._extensionService = _extensionService;
        this._productService = _productService;
        this._remoteAgentService = _remoteAgentService;
        this._terminalService = _terminalService;
        this._modelDisposables = [];
    }
    provideTextContent(resource) {
        if (!this._model || this._model.isDisposed()) {
            dispose(this._modelDisposables);
            const langId = this._languageService.createById('markdown');
            this._model =
                this._modelService.getModel(resource) ||
                    this._modelService.createModel('Loading...', langId, resource);
            this._modelDisposables.push(langId.onDidChange((e) => {
                this._model?.setLanguage(e);
            }));
            this._modelDisposables.push(this._extensionService.onDidChangeExtensionsStatus(this._updateModel, this));
            writeTransientState(this._model, { wordWrapOverride: 'off' }, this._editorService);
        }
        this._updateModel();
        return Promise.resolve(this._model);
    }
    _updateModel() {
        Promise.all([
            this._timerService.whenReady(),
            this._lifecycleService.when(4 /* LifecyclePhase.Eventually */),
            this._extensionService.whenInstalledExtensionsRegistered(),
            // The terminal service never connects to the pty host on the web
            isWeb && !this._remoteAgentService.getConnection()?.remoteAuthority
                ? Promise.resolve()
                : this._terminalService.whenConnected,
        ]).then(() => {
            if (this._model && !this._model.isDisposed()) {
                const md = new MarkdownBuilder();
                this._addSummary(md);
                md.blank();
                this._addSummaryTable(md);
                md.blank();
                this._addExtensionsTable(md);
                md.blank();
                this._addPerfMarksTable('Terminal Stats', md, this._timerService
                    .getPerformanceMarks()
                    .find((e) => e[0] === 'renderer')?.[1]
                    .filter((e) => e.name.startsWith('code/terminal/')));
                md.blank();
                this._addWorkbenchContributionsPerfMarksTable(md);
                md.blank();
                this._addRawPerfMarks(md);
                md.blank();
                this._addResourceTimingStats(md);
                this._model.setValue(md.value);
            }
        });
    }
    _addSummary(md) {
        const metrics = this._timerService.startupMetrics;
        md.heading(2, 'System Info');
        md.li(`${this._productService.nameShort}: ${this._productService.version} (${this._productService.commit || '0000000'})`);
        md.li(`OS: ${metrics.platform}(${metrics.release})`);
        if (metrics.cpus) {
            md.li(`CPUs: ${metrics.cpus.model}(${metrics.cpus.count} x ${metrics.cpus.speed})`);
        }
        if (typeof metrics.totalmem === 'number' && typeof metrics.freemem === 'number') {
            md.li(`Memory(System): ${(metrics.totalmem / ByteSize.GB).toFixed(2)} GB(${(metrics.freemem / ByteSize.GB).toFixed(2)}GB free)`);
        }
        if (metrics.meminfo) {
            md.li(`Memory(Process): ${(metrics.meminfo.workingSetSize / ByteSize.KB).toFixed(2)} MB working set(${(metrics.meminfo.privateBytes / ByteSize.KB).toFixed(2)}MB private, ${(metrics.meminfo.sharedBytes / ByteSize.KB).toFixed(2)}MB shared)`);
        }
        md.li(`VM(likelihood): ${metrics.isVMLikelyhood}%`);
        md.li(`Initial Startup: ${metrics.initialStartup}`);
        md.li(`Has ${metrics.windowCount - 1} other windows`);
        md.li(`Screen Reader Active: ${metrics.hasAccessibilitySupport}`);
        md.li(`Empty Workspace: ${metrics.emptyWorkbench}`);
    }
    _addSummaryTable(md) {
        const metrics = this._timerService.startupMetrics;
        const contribTimings = Registry.as(WorkbenchExtensions.Workbench).timings;
        const table = [];
        table.push([
            'start => app.isReady',
            metrics.timers.ellapsedAppReady,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'nls:start => nls:end',
            metrics.timers.ellapsedNlsGeneration,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'import(main.js)',
            metrics.timers.ellapsedLoadMainBundle,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'run main.js',
            metrics.timers.ellapsedRunMainBundle,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'start crash reporter',
            metrics.timers.ellapsedCrashReporter,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'serve main IPC handle',
            metrics.timers.ellapsedMainServer,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'create window',
            metrics.timers.ellapsedWindowCreate,
            '[main]',
            `initial startup: ${metrics.initialStartup}, ${metrics.initialStartup ? `state: ${metrics.timers.ellapsedWindowRestoreState}ms, widget: ${metrics.timers.ellapsedBrowserWindowCreate}ms, show: ${metrics.timers.ellapsedWindowMaximize}ms` : ''}`,
        ]);
        table.push([
            'app.isReady => window.loadUrl()',
            metrics.timers.ellapsedWindowLoad,
            '[main]',
            `initial startup: ${metrics.initialStartup}`,
        ]);
        table.push([
            'window.loadUrl() => begin to import(workbench.desktop.main.js)',
            metrics.timers.ellapsedWindowLoadToRequire,
            '[main->renderer]',
            StartupKindToString(metrics.windowKind),
        ]);
        table.push([
            'import(workbench.desktop.main.js)',
            metrics.timers.ellapsedRequire,
            '[renderer]',
            `cached data: ${metrics.didUseCachedData ? 'YES' : 'NO'}`,
        ]);
        table.push([
            'wait for window config',
            metrics.timers.ellapsedWaitForWindowConfig,
            '[renderer]',
            undefined,
        ]);
        table.push([
            'init storage (global & workspace)',
            metrics.timers.ellapsedStorageInit,
            '[renderer]',
            undefined,
        ]);
        table.push([
            'init workspace service',
            metrics.timers.ellapsedWorkspaceServiceInit,
            '[renderer]',
            undefined,
        ]);
        if (isWeb) {
            table.push([
                'init settings and global state from settings sync service',
                metrics.timers.ellapsedRequiredUserDataInit,
                '[renderer]',
                undefined,
            ]);
            table.push([
                'init keybindings, snippets & extensions from settings sync service',
                metrics.timers.ellapsedOtherUserDataInit,
                '[renderer]',
                undefined,
            ]);
        }
        table.push([
            'register extensions & spawn extension host',
            metrics.timers.ellapsedExtensions,
            '[renderer]',
            undefined,
        ]);
        table.push([
            'restore viewlet',
            metrics.timers.ellapsedViewletRestore,
            '[renderer]',
            metrics.viewletId,
        ]);
        table.push([
            'restore panel',
            metrics.timers.ellapsedPanelRestore,
            '[renderer]',
            metrics.panelId,
        ]);
        table.push([
            'restore & resolve visible editors',
            metrics.timers.ellapsedEditorRestore,
            '[renderer]',
            `${metrics.editorIds.length}: ${metrics.editorIds.join(', ')}`,
        ]);
        table.push([
            'create workbench contributions',
            metrics.timers.ellapsedWorkbenchContributions,
            '[renderer]',
            `${(contribTimings.get(1 /* LifecyclePhase.Starting */)?.length ?? 0) + (contribTimings.get(1 /* LifecyclePhase.Starting */)?.length ?? 0)} blocking startup`,
        ]);
        table.push([
            'overall workbench load',
            metrics.timers.ellapsedWorkbench,
            '[renderer]',
            undefined,
        ]);
        table.push(['workbench ready', metrics.ellapsed, '[main->renderer]', undefined]);
        table.push(['renderer ready', metrics.timers.ellapsedRenderer, '[renderer]', undefined]);
        table.push([
            'shared process connection ready',
            metrics.timers.ellapsedSharedProcesConnected,
            '[renderer->sharedprocess]',
            undefined,
        ]);
        table.push([
            'extensions registered',
            metrics.timers.ellapsedExtensionsReady,
            '[renderer]',
            undefined,
        ]);
        md.heading(2, 'Performance Marks');
        md.table(['What', 'Duration', 'Process', 'Info'], table);
    }
    _addExtensionsTable(md) {
        const eager = [];
        const normal = [];
        const extensionsStatus = this._extensionService.getExtensionsStatus();
        for (const id in extensionsStatus) {
            const { activationTimes: times } = extensionsStatus[id];
            if (!times) {
                continue;
            }
            if (times.activationReason.startup) {
                eager.push([
                    id,
                    times.activationReason.startup,
                    times.codeLoadingTime,
                    times.activateCallTime,
                    times.activateResolvedTime,
                    times.activationReason.activationEvent,
                    times.activationReason.extensionId.value,
                ]);
            }
            else {
                normal.push([
                    id,
                    times.activationReason.startup,
                    times.codeLoadingTime,
                    times.activateCallTime,
                    times.activateResolvedTime,
                    times.activationReason.activationEvent,
                    times.activationReason.extensionId.value,
                ]);
            }
        }
        const table = eager.concat(normal);
        if (table.length > 0) {
            md.heading(2, 'Extension Activation Stats');
            md.table(['Extension', 'Eager', 'Load Code', 'Call Activate', 'Finish Activate', 'Event', 'By'], table);
        }
    }
    _addPerfMarksTable(name, md, marks) {
        if (!marks) {
            return;
        }
        const table = [];
        let lastStartTime = -1;
        let total = 0;
        for (const { name, startTime } of marks) {
            const delta = lastStartTime !== -1 ? startTime - lastStartTime : 0;
            total += delta;
            table.push([name, Math.round(startTime), Math.round(delta), Math.round(total)]);
            lastStartTime = startTime;
        }
        if (name) {
            md.heading(2, name);
        }
        md.table(['Name', 'Timestamp', 'Delta', 'Total'], table);
    }
    _addWorkbenchContributionsPerfMarksTable(md) {
        md.heading(2, 'Workbench Contributions Blocking Restore');
        const timings = Registry.as(WorkbenchExtensions.Workbench).timings;
        md.li(`Total (LifecyclePhase.Starting): ${timings.get(1 /* LifecyclePhase.Starting */)?.length} (${timings.get(1 /* LifecyclePhase.Starting */)?.reduce((p, c) => p + c[1], 0)}ms)`);
        md.li(`Total (LifecyclePhase.Ready): ${timings.get(2 /* LifecyclePhase.Ready */)?.length} (${timings.get(2 /* LifecyclePhase.Ready */)?.reduce((p, c) => p + c[1], 0)}ms)`);
        md.blank();
        const marks = this._timerService
            .getPerformanceMarks()
            .find((e) => e[0] === 'renderer')?.[1]
            .filter((e) => e.name.startsWith('code/willCreateWorkbenchContribution/1') ||
            e.name.startsWith('code/didCreateWorkbenchContribution/1') ||
            e.name.startsWith('code/willCreateWorkbenchContribution/2') ||
            e.name.startsWith('code/didCreateWorkbenchContribution/2'));
        this._addPerfMarksTable(undefined, md, marks);
    }
    _addRawPerfMarks(md) {
        for (const [source, marks] of this._timerService.getPerformanceMarks()) {
            md.heading(2, `Raw Perf Marks: ${source}`);
            md.value += '```\n';
            md.value += `Name\tTimestamp\tDelta\tTotal\n`;
            let lastStartTime = -1;
            let total = 0;
            for (const { name, startTime } of marks) {
                const delta = lastStartTime !== -1 ? startTime - lastStartTime : 0;
                total += delta;
                md.value += `${name}\t${startTime}\t${delta}\t${total}\n`;
                lastStartTime = startTime;
            }
            md.value += '```\n';
        }
    }
    _addResourceTimingStats(md) {
        const stats = performance.getEntriesByType('resource').map((entry) => {
            return [entry.name, entry.duration];
        });
        if (!stats.length) {
            return;
        }
        md.heading(2, 'Resource Timing Stats');
        md.table(['Name', 'Duration'], stats);
    }
};
PerfModelContentProvider = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService),
    __param(2, ICodeEditorService),
    __param(3, ILifecycleService),
    __param(4, ITimerService),
    __param(5, IExtensionService),
    __param(6, IProductService),
    __param(7, IRemoteAgentService),
    __param(8, ITerminalService)
], PerfModelContentProvider);
class MarkdownBuilder {
    constructor() {
        this.value = '';
    }
    heading(level, value) {
        this.value += `${'#'.repeat(level)} ${value}\n\n`;
        return this;
    }
    blank() {
        this.value += '\n';
        return this;
    }
    li(value) {
        this.value += `* ${value}\n`;
        return this;
    }
    table(header, rows) {
        this.value += this.toMarkdownTable(header, rows);
    }
    toMarkdownTable(header, rows) {
        let result = '';
        const lengths = [];
        header.forEach((cell, ci) => {
            lengths[ci] = cell.length;
        });
        rows.forEach((row) => {
            row.forEach((cell, ci) => {
                if (typeof cell === 'undefined') {
                    cell = row[ci] = '-';
                }
                const len = cell.toString().length;
                lengths[ci] = Math.max(len, lengths[ci]);
            });
        });
        // header
        header.forEach((cell, ci) => {
            result += `| ${cell + ' '.repeat(lengths[ci] - cell.toString().length)} `;
        });
        result += '|\n';
        header.forEach((_cell, ci) => {
            result += `| ${'-'.repeat(lengths[ci])} `;
        });
        result += '|\n';
        // cells
        rows.forEach((row) => {
            row.forEach((cell, ci) => {
                if (typeof cell !== 'undefined') {
                    result += `| ${cell + ' '.repeat(lengths[ci] - cell.toString().length)} `;
                }
            });
            result += '|\n';
        });
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZnZpZXdFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2Jyb3dzZXIvcGVyZnZpZXdFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE9BQU8sRUFDTixpQkFBaUIsRUFFakIsbUJBQW1CLEdBQ25CLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEVBQ2pDLHdCQUF3QixHQUN4QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXBGLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7O0lBQzNCLE1BQU0sQ0FBQyxHQUFHO1FBQ1QsT0FBTyx3QkFBd0IsQ0FBa0IsaUJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNyRSxDQUFDO2FBRWUsT0FBRSxHQUFHLDRCQUE0QixBQUEvQixDQUErQjtJQUtqRCxZQUN3QixhQUFxRCxFQUN6RCx3QkFBMkM7UUFEdEIsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBSjVELGNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFBO1FBT3JGLElBQUksQ0FBQyxhQUFhLEdBQUcsd0JBQXdCLENBQUMsZ0NBQWdDLENBQzdFLE1BQU0sRUFDTixhQUFhLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQ3RELENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDN0IsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3hELENBQUM7O0FBOUJXLGVBQWU7SUFXekIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0dBWlAsZUFBZSxDQStCM0I7O0FBRU0sSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLHVCQUF1Qjs7YUFDekMsT0FBRSxHQUFHLGVBQWUsQUFBbEIsQ0FBa0I7SUFFcEMsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sZUFBYSxDQUFDLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRUQsWUFDb0Isd0JBQTJDLEVBQzVDLGVBQWlDLEVBQ25DLGFBQTZCLEVBQy9CLFdBQXlCLEVBQ3hCLFlBQTJCLEVBQ2QseUJBQXFELEVBRWpGLGdDQUFtRSxFQUN4Qyx3QkFBbUQ7UUFFOUUsS0FBSyxDQUNKLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFDbkMsUUFBUSxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxFQUN2QyxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCx3QkFBd0IsRUFDeEIsZUFBZSxFQUNmLGFBQWEsRUFDYixXQUFXLEVBQ1gsWUFBWSxFQUNaLHlCQUF5QixFQUN6QixnQ0FBZ0MsRUFDaEMsd0JBQXdCLENBQ3hCLENBQUE7SUFDRixDQUFDOztBQWpDVyxhQUFhO0lBUXZCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLDBCQUEwQixDQUFBO0lBQzFCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSx5QkFBeUIsQ0FBQTtHQWhCZixhQUFhLENBa0N6Qjs7QUFFRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF3QjtJQUk3QixZQUNnQixhQUE2QyxFQUMxQyxnQkFBbUQsRUFDakQsY0FBbUQsRUFDcEQsaUJBQXFELEVBQ3pELGFBQTZDLEVBQ3pDLGlCQUFxRCxFQUN2RCxlQUFpRCxFQUM3QyxtQkFBeUQsRUFDNUQsZ0JBQW1EO1FBUnJDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDaEMsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1FBQ25DLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDeEMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDeEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUN0QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDNUIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUMzQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBWDlELHNCQUFpQixHQUFrQixFQUFFLENBQUE7SUFZMUMsQ0FBQztJQUVKLGtCQUFrQixDQUFDLFFBQWE7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUMvQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzNELElBQUksQ0FBQyxNQUFNO2dCQUNWLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztvQkFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUUvRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMxQixJQUFJLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FDM0UsQ0FBQTtZQUVELG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbkYsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTyxZQUFZO1FBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDWCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUM5QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxtQ0FBMkI7WUFDdEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlDQUFpQyxFQUFFO1lBQzFELGlFQUFpRTtZQUNqRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFLEVBQUUsZUFBZTtnQkFDbEUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25CLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtTQUN0QyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNaLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtnQkFDaEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDcEIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNWLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDekIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNWLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDNUIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNWLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsZ0JBQWdCLEVBQ2hCLEVBQUUsRUFDRixJQUFJLENBQUMsYUFBYTtxQkFDaEIsbUJBQW1CLEVBQUU7cUJBQ3JCLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUNyQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FDcEQsQ0FBQTtnQkFDRCxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ1YsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ1YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUN6QixFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ1YsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUVoQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxFQUFtQjtRQUN0QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQTtRQUNqRCxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM1QixFQUFFLENBQUMsRUFBRSxDQUNKLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLElBQUksU0FBUyxHQUFHLENBQ2xILENBQUE7UUFDRCxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8sT0FBTyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQTtRQUNwRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQixFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7UUFDRCxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksT0FBTyxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pGLEVBQUUsQ0FBQyxFQUFFLENBQ0osbUJBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQ3pILENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsRUFBRSxDQUFDLEVBQUUsQ0FDSixvQkFBb0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUN4TyxDQUFBO1FBQ0YsQ0FBQztRQUNELEVBQUUsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLE9BQU8sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ25ELEVBQUUsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUNyRCxFQUFFLENBQUMsRUFBRSxDQUFDLHlCQUF5QixPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLEVBQUUsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxFQUFtQjtRQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQTtRQUNqRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUNqQyxtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsT0FBTyxDQUFBO1FBRVQsTUFBTSxLQUFLLEdBQThDLEVBQUUsQ0FBQTtRQUMzRCxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1Ysc0JBQXNCO1lBQ3RCLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCO1lBQy9CLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1Ysc0JBQXNCO1lBQ3RCLE9BQU8sQ0FBQyxNQUFNLENBQUMscUJBQXFCO1lBQ3BDLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsaUJBQWlCO1lBQ2pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsc0JBQXNCO1lBQ3JDLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsYUFBYTtZQUNiLE9BQU8sQ0FBQyxNQUFNLENBQUMscUJBQXFCO1lBQ3BDLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1Ysc0JBQXNCO1lBQ3RCLE9BQU8sQ0FBQyxNQUFNLENBQUMscUJBQXFCO1lBQ3BDLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsdUJBQXVCO1lBQ3ZCLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCO1lBQ2pDLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsZUFBZTtZQUNmLE9BQU8sQ0FBQyxNQUFNLENBQUMsb0JBQW9CO1lBQ25DLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsS0FBSyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLE9BQU8sQ0FBQyxNQUFNLENBQUMsMEJBQTBCLGVBQWUsT0FBTyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsYUFBYSxPQUFPLENBQUMsTUFBTSxDQUFDLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtTQUNqUCxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsaUNBQWlDO1lBQ2pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCO1lBQ2pDLFFBQVE7WUFDUixvQkFBb0IsT0FBTyxDQUFDLGNBQWMsRUFBRTtTQUM1QyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsZ0VBQWdFO1lBQ2hFLE9BQU8sQ0FBQyxNQUFNLENBQUMsMkJBQTJCO1lBQzFDLGtCQUFrQjtZQUNsQixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQ3ZDLENBQUMsQ0FBQTtRQUNGLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVixtQ0FBbUM7WUFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlO1lBQzlCLFlBQVk7WUFDWixnQkFBZ0IsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtTQUN6RCxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1Ysd0JBQXdCO1lBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsMkJBQTJCO1lBQzFDLFlBQVk7WUFDWixTQUFTO1NBQ1QsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNWLG1DQUFtQztZQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQjtZQUNsQyxZQUFZO1lBQ1osU0FBUztTQUNULENBQUMsQ0FBQTtRQUNGLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVix3QkFBd0I7WUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEI7WUFDM0MsWUFBWTtZQUNaLFNBQVM7U0FDVCxDQUFDLENBQUE7UUFDRixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDViwyREFBMkQ7Z0JBQzNELE9BQU8sQ0FBQyxNQUFNLENBQUMsNEJBQTRCO2dCQUMzQyxZQUFZO2dCQUNaLFNBQVM7YUFDVCxDQUFDLENBQUE7WUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLG9FQUFvRTtnQkFDcEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyx5QkFBeUI7Z0JBQ3hDLFlBQVk7Z0JBQ1osU0FBUzthQUNULENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsNENBQTRDO1lBQzVDLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCO1lBQ2pDLFlBQVk7WUFDWixTQUFTO1NBQ1QsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNWLGlCQUFpQjtZQUNqQixPQUFPLENBQUMsTUFBTSxDQUFDLHNCQUFzQjtZQUNyQyxZQUFZO1lBQ1osT0FBTyxDQUFDLFNBQVM7U0FDakIsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNWLGVBQWU7WUFDZixPQUFPLENBQUMsTUFBTSxDQUFDLG9CQUFvQjtZQUNuQyxZQUFZO1lBQ1osT0FBTyxDQUFDLE9BQU87U0FDZixDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsbUNBQW1DO1lBQ25DLE9BQU8sQ0FBQyxNQUFNLENBQUMscUJBQXFCO1lBQ3BDLFlBQVk7WUFDWixHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1NBQzlELENBQUMsQ0FBQTtRQUNGLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVixnQ0FBZ0M7WUFDaEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyw4QkFBOEI7WUFDN0MsWUFBWTtZQUNaLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxpQ0FBeUIsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxpQ0FBeUIsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLG1CQUFtQjtTQUM3SSxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1Ysd0JBQXdCO1lBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCO1lBQ2hDLFlBQVk7WUFDWixTQUFTO1NBQ1QsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNoRixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUN4RixLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsaUNBQWlDO1lBQ2pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsNkJBQTZCO1lBQzVDLDJCQUEyQjtZQUMzQixTQUFTO1NBQ1QsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNWLHVCQUF1QjtZQUN2QixPQUFPLENBQUMsTUFBTSxDQUFDLHVCQUF1QjtZQUN0QyxZQUFZO1lBQ1osU0FBUztTQUNULENBQUMsQ0FBQTtRQUVGLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFDbEMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxFQUFtQjtRQUM5QyxNQUFNLEtBQUssR0FBK0IsRUFBRSxDQUFBO1FBQzVDLE1BQU0sTUFBTSxHQUErQixFQUFFLENBQUE7UUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUNyRSxLQUFLLE1BQU0sRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDbkMsTUFBTSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDVixFQUFFO29CQUNGLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPO29CQUM5QixLQUFLLENBQUMsZUFBZTtvQkFDckIsS0FBSyxDQUFDLGdCQUFnQjtvQkFDdEIsS0FBSyxDQUFDLG9CQUFvQjtvQkFDMUIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWU7b0JBQ3RDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsS0FBSztpQkFDeEMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsRUFBRTtvQkFDRixLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTztvQkFDOUIsS0FBSyxDQUFDLGVBQWU7b0JBQ3JCLEtBQUssQ0FBQyxnQkFBZ0I7b0JBQ3RCLEtBQUssQ0FBQyxvQkFBb0I7b0JBQzFCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlO29CQUN0QyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEtBQUs7aUJBQ3hDLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtZQUMzQyxFQUFFLENBQUMsS0FBSyxDQUNQLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFDdEYsS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUN6QixJQUF3QixFQUN4QixFQUFtQixFQUNuQixLQUFrRDtRQUVsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUE4QyxFQUFFLENBQUE7UUFDM0QsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3pDLE1BQU0sS0FBSyxHQUFHLGFBQWEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLEtBQUssSUFBSSxLQUFLLENBQUE7WUFDZCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMvRSxhQUFhLEdBQUcsU0FBUyxDQUFBO1FBQzFCLENBQUM7UUFDRCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEIsQ0FBQztRQUNELEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRU8sd0NBQXdDLENBQUMsRUFBbUI7UUFDbkUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsMENBQTBDLENBQUMsQ0FBQTtRQUV6RCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsRUFBRSxDQUMxQixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsT0FBTyxDQUFBO1FBQ1QsRUFBRSxDQUFDLEVBQUUsQ0FDSixvQ0FBb0MsT0FBTyxDQUFDLEdBQUcsaUNBQXlCLEVBQUUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxHQUFHLGlDQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FDN0osQ0FBQTtRQUNELEVBQUUsQ0FBQyxFQUFFLENBQ0osaUNBQWlDLE9BQU8sQ0FBQyxHQUFHLDhCQUFzQixFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsR0FBRyw4QkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQ3BKLENBQUE7UUFDRCxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFVixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYTthQUM5QixtQkFBbUIsRUFBRTthQUNyQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNyQyxNQUFNLENBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHdDQUF3QyxDQUFDO1lBQzNELENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHVDQUF1QyxDQUFDO1lBQzFELENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHdDQUF3QyxDQUFDO1lBQzNELENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHVDQUF1QyxDQUFDLENBQzNELENBQUE7UUFDRixJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsRUFBbUI7UUFDM0MsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1lBQ3hFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixNQUFNLEVBQUUsQ0FBQyxDQUFBO1lBQzFDLEVBQUUsQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFBO1lBQ25CLEVBQUUsQ0FBQyxLQUFLLElBQUksaUNBQWlDLENBQUE7WUFDN0MsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ2IsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN6QyxNQUFNLEtBQUssR0FBRyxhQUFhLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDbEUsS0FBSyxJQUFJLEtBQUssQ0FBQTtnQkFDZCxFQUFFLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLFNBQVMsS0FBSyxLQUFLLEtBQUssS0FBSyxJQUFJLENBQUE7Z0JBQ3pELGFBQWEsR0FBRyxTQUFTLENBQUE7WUFDMUIsQ0FBQztZQUNELEVBQUUsQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsRUFBbUI7UUFDbEQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3BFLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFDRCxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3RDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEMsQ0FBQztDQUNELENBQUE7QUF6WEssd0JBQXdCO0lBSzNCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGdCQUFnQixDQUFBO0dBYmIsd0JBQXdCLENBeVg3QjtBQUVELE1BQU0sZUFBZTtJQUFyQjtRQUNDLFVBQUssR0FBVyxFQUFFLENBQUE7SUErRG5CLENBQUM7SUE3REEsT0FBTyxDQUFDLEtBQWEsRUFBRSxLQUFhO1FBQ25DLElBQUksQ0FBQyxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFBO1FBQ2pELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQTtRQUNsQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxFQUFFLENBQUMsS0FBYTtRQUNmLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQTtRQUM1QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBZ0IsRUFBRSxJQUFzRDtRQUM3RSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFTyxlQUFlLENBQ3RCLE1BQWdCLEVBQ2hCLElBQXNEO1FBRXRELElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUVmLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtRQUM1QixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzFCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3BCLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQ3hCLElBQUksT0FBTyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7b0JBQ2pDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFBO2dCQUNyQixDQUFDO2dCQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUE7Z0JBQ2xDLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsU0FBUztRQUNULE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFBO1FBQzFFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxJQUFJLEtBQUssQ0FBQTtRQUNmLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEtBQUssR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQzFDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxJQUFJLEtBQUssQ0FBQTtRQUVmLFFBQVE7UUFDUixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDcEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDeEIsSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxJQUFJLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFBO2dCQUMxRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDRixNQUFNLElBQUksS0FBSyxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QifQ==