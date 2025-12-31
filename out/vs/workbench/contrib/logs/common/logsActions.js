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
import * as nls from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { ILoggerService, LogLevel, LogLevelToLocalizedString, isLogLevel, } from '../../../../platform/log/common/log.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { dirname, basename, isEqual } from '../../../../base/common/resources.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IOutputService, isMultiSourceOutputChannelDescriptor, isSingleSourceOutputChannelDescriptor, } from '../../../services/output/common/output.js';
import { IDefaultLogLevelsService } from './defaultLogLevels.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
let SetLogLevelAction = class SetLogLevelAction extends Action {
    static { this.ID = 'workbench.action.setLogLevel'; }
    static { this.TITLE = nls.localize2('setLogLevel', 'Set Log Level...'); }
    constructor(id, label, quickInputService, loggerService, outputService, defaultLogLevelsService) {
        super(id, label);
        this.quickInputService = quickInputService;
        this.loggerService = loggerService;
        this.outputService = outputService;
        this.defaultLogLevelsService = defaultLogLevelsService;
    }
    async run() {
        const logLevelOrChannel = await this.selectLogLevelOrChannel();
        if (logLevelOrChannel !== null) {
            if (isLogLevel(logLevelOrChannel)) {
                this.loggerService.setLogLevel(logLevelOrChannel);
            }
            else {
                await this.setLogLevelForChannel(logLevelOrChannel);
            }
        }
    }
    async selectLogLevelOrChannel() {
        const defaultLogLevels = await this.defaultLogLevelsService.getDefaultLogLevels();
        const extensionLogs = [], logs = [];
        const logLevel = this.loggerService.getLogLevel();
        for (const channel of this.outputService.getChannelDescriptors()) {
            if (!this.outputService.canSetLogLevel(channel)) {
                continue;
            }
            const sources = isSingleSourceOutputChannelDescriptor(channel)
                ? [channel.source]
                : isMultiSourceOutputChannelDescriptor(channel)
                    ? channel.source
                    : [];
            if (!sources.length) {
                continue;
            }
            const channelLogLevel = sources.reduce((prev, curr) => Math.min(prev, this.loggerService.getLogLevel(curr.resource) ?? logLevel), logLevel);
            const item = {
                id: channel.id,
                label: channel.label,
                description: channelLogLevel !== logLevel ? this.getLabel(channelLogLevel) : undefined,
                channel,
            };
            if (channel.extensionId) {
                extensionLogs.push(item);
            }
            else {
                logs.push(item);
            }
        }
        const entries = [];
        entries.push({ type: 'separator', label: nls.localize('all', 'All') });
        entries.push(...this.getLogLevelEntries(defaultLogLevels.default, this.loggerService.getLogLevel(), true));
        if (extensionLogs.length) {
            entries.push({ type: 'separator', label: nls.localize('extensionLogs', 'Extension Logs') });
            entries.push(...extensionLogs.sort((a, b) => a.label.localeCompare(b.label)));
        }
        entries.push({ type: 'separator', label: nls.localize('loggers', 'Logs') });
        entries.push(...logs.sort((a, b) => a.label.localeCompare(b.label)));
        return new Promise((resolve, reject) => {
            const disposables = new DisposableStore();
            const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
            quickPick.placeholder = nls.localize('selectlog', 'Set Log Level');
            quickPick.items = entries;
            let selectedItem;
            disposables.add(quickPick.onDidTriggerItemButton((e) => {
                quickPick.hide();
                this.defaultLogLevelsService.setDefaultLogLevel(e.item.level);
            }));
            disposables.add(quickPick.onDidAccept((e) => {
                selectedItem = quickPick.selectedItems[0];
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                const result = selectedItem
                    ? (selectedItem.level ?? selectedItem)
                    : null;
                disposables.dispose();
                resolve(result);
            }));
            quickPick.show();
        });
    }
    async setLogLevelForChannel(logChannel) {
        const defaultLogLevels = await this.defaultLogLevelsService.getDefaultLogLevels();
        const defaultLogLevel = defaultLogLevels.extensions.find((e) => e[0] === logChannel.channel.extensionId?.toLowerCase())?.[1] ?? defaultLogLevels.default;
        const entries = this.getLogLevelEntries(defaultLogLevel, this.outputService.getLogLevel(logChannel.channel) ?? defaultLogLevel, !!logChannel.channel.extensionId);
        return new Promise((resolve, reject) => {
            const disposables = new DisposableStore();
            const quickPick = disposables.add(this.quickInputService.createQuickPick());
            quickPick.placeholder = logChannel
                ? nls.localize('selectLogLevelFor', ' {0}: Select log level', logChannel?.label)
                : nls.localize('selectLogLevel', 'Select log level');
            quickPick.items = entries;
            quickPick.activeItems = entries.filter((entry) => entry.level === this.loggerService.getLogLevel());
            let selectedItem;
            disposables.add(quickPick.onDidTriggerItemButton((e) => {
                quickPick.hide();
                this.defaultLogLevelsService.setDefaultLogLevel(e.item.level, logChannel.channel.extensionId);
            }));
            disposables.add(quickPick.onDidAccept((e) => {
                selectedItem = quickPick.selectedItems[0];
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                if (selectedItem) {
                    this.outputService.setLogLevel(logChannel.channel, selectedItem.level);
                }
                disposables.dispose();
                resolve();
            }));
            quickPick.show();
        });
    }
    getLogLevelEntries(defaultLogLevel, currentLogLevel, canSetDefaultLogLevel) {
        const button = canSetDefaultLogLevel
            ? {
                iconClass: ThemeIcon.asClassName(Codicon.checkAll),
                tooltip: nls.localize('resetLogLevel', 'Set as Default Log Level'),
            }
            : undefined;
        return [
            {
                label: this.getLabel(LogLevel.Trace, currentLogLevel),
                level: LogLevel.Trace,
                description: this.getDescription(LogLevel.Trace, defaultLogLevel),
                buttons: button && defaultLogLevel !== LogLevel.Trace ? [button] : undefined,
            },
            {
                label: this.getLabel(LogLevel.Debug, currentLogLevel),
                level: LogLevel.Debug,
                description: this.getDescription(LogLevel.Debug, defaultLogLevel),
                buttons: button && defaultLogLevel !== LogLevel.Debug ? [button] : undefined,
            },
            {
                label: this.getLabel(LogLevel.Info, currentLogLevel),
                level: LogLevel.Info,
                description: this.getDescription(LogLevel.Info, defaultLogLevel),
                buttons: button && defaultLogLevel !== LogLevel.Info ? [button] : undefined,
            },
            {
                label: this.getLabel(LogLevel.Warning, currentLogLevel),
                level: LogLevel.Warning,
                description: this.getDescription(LogLevel.Warning, defaultLogLevel),
                buttons: button && defaultLogLevel !== LogLevel.Warning ? [button] : undefined,
            },
            {
                label: this.getLabel(LogLevel.Error, currentLogLevel),
                level: LogLevel.Error,
                description: this.getDescription(LogLevel.Error, defaultLogLevel),
                buttons: button && defaultLogLevel !== LogLevel.Error ? [button] : undefined,
            },
            {
                label: this.getLabel(LogLevel.Off, currentLogLevel),
                level: LogLevel.Off,
                description: this.getDescription(LogLevel.Off, defaultLogLevel),
                buttons: button && defaultLogLevel !== LogLevel.Off ? [button] : undefined,
            },
        ];
    }
    getLabel(level, current) {
        const label = LogLevelToLocalizedString(level).value;
        return level === current ? `$(check) ${label}` : label;
    }
    getDescription(level, defaultLogLevel) {
        return defaultLogLevel === level ? nls.localize('default', 'Default') : undefined;
    }
};
SetLogLevelAction = __decorate([
    __param(2, IQuickInputService),
    __param(3, ILoggerService),
    __param(4, IOutputService),
    __param(5, IDefaultLogLevelsService)
], SetLogLevelAction);
export { SetLogLevelAction };
let OpenWindowSessionLogFileAction = class OpenWindowSessionLogFileAction extends Action {
    static { this.ID = 'workbench.action.openSessionLogFile'; }
    static { this.TITLE = nls.localize2('openSessionLogFile', 'Open Window Log File (Session)...'); }
    constructor(id, label, environmentService, fileService, quickInputService, editorService) {
        super(id, label);
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.quickInputService = quickInputService;
        this.editorService = editorService;
    }
    async run() {
        const sessionResult = await this.quickInputService.pick(this.getSessions().then((sessions) => sessions.map((s, index) => ({
            id: s.toString(),
            label: basename(s),
            description: index === 0 ? nls.localize('current', 'Current') : undefined,
        }))), {
            canPickMany: false,
            placeHolder: nls.localize('sessions placeholder', 'Select Session'),
        });
        if (sessionResult) {
            const logFileResult = await this.quickInputService.pick(this.getLogFiles(URI.parse(sessionResult.id)).then((logFiles) => logFiles.map((s) => ({
                id: s.toString(),
                label: basename(s),
            }))), {
                canPickMany: false,
                placeHolder: nls.localize('log placeholder', 'Select Log file'),
            });
            if (logFileResult) {
                return this.editorService
                    .openEditor({ resource: URI.parse(logFileResult.id), options: { pinned: true } })
                    .then(() => undefined);
            }
        }
    }
    async getSessions() {
        const logsPath = this.environmentService.logsHome.with({
            scheme: this.environmentService.logFile.scheme,
        });
        const result = [logsPath];
        const stat = await this.fileService.resolve(dirname(logsPath));
        if (stat.children) {
            result.push(...stat.children
                .filter((stat) => !isEqual(stat.resource, logsPath) &&
                stat.isDirectory &&
                /^\d{8}T\d{6}$/.test(stat.name))
                .sort()
                .reverse()
                .map((d) => d.resource));
        }
        return result;
    }
    async getLogFiles(session) {
        const stat = await this.fileService.resolve(session);
        if (stat.children) {
            return stat.children.filter((stat) => !stat.isDirectory).map((stat) => stat.resource);
        }
        return [];
    }
};
OpenWindowSessionLogFileAction = __decorate([
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IFileService),
    __param(4, IQuickInputService),
    __param(5, IEditorService)
], OpenWindowSessionLogFileAction);
export { OpenWindowSessionLogFileAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2dzL2NvbW1vbi9sb2dzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sY0FBYyxFQUNkLFFBQVEsRUFDUix5QkFBeUIsRUFDekIsVUFBVSxHQUNWLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUVOLGtCQUFrQixHQUdsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFFTixjQUFjLEVBQ2Qsb0NBQW9DLEVBQ3BDLHFDQUFxQyxHQUNyQyxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSy9ELElBQU0s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