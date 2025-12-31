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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZnZpZXdFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9icm93c2VyL3BlcmZ2aWV3RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNGLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQ04saUJBQWlCLEVBRWpCLG1CQUFtQixHQUNuQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtB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