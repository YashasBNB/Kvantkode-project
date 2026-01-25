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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvY29tbW9uL2xvZ3NBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFDTixjQUFjLEVBQ2QsUUFBUSxFQUNSLHlCQUF5QixFQUN6QixVQUFVLEdBQ1YsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBRU4sa0JBQWtCLEdBR2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUVOLGNBQWMsRUFDZCxvQ0FBb0MsRUFDcEMscUNBQXFDLEdBQ3JDLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLL0Qs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