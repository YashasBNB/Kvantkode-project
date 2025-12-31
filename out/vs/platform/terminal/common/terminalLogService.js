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
import { Disposable } from '../../../base/common/lifecycle.js';
import { Event } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { ILoggerService, LogLevel } from '../../log/common/log.js';
import { IWorkspaceContextService } from '../../workspace/common/workspace.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { joinPath } from '../../../base/common/resources.js';
let TerminalLogService = class TerminalLogService extends Disposable {
    get onDidChangeLogLevel() {
        return this._logger.onDidChangeLogLevel;
    }
    constructor(_loggerService, workspaceContextService, environmentService) {
        super();
        this._loggerService = _loggerService;
        this._logger = this._loggerService.createLogger(joinPath(environmentService.logsHome, 'terminal.log'), { id: 'terminal', name: localize('terminalLoggerName', 'Terminal') });
        this._register(Event.runAndSubscribe(workspaceContextService.onDidChangeWorkspaceFolders, () => {
            this._workspaceId = workspaceContextService.getWorkspace().id.substring(0, 7);
        }));
    }
    getLevel() {
        return this._logger.getLevel();
    }
    setLevel(level) {
        this._logger.setLevel(level);
    }
    flush() {
        this._logger.flush();
    }
    trace(message, ...args) {
        this._logger.trace(this._formatMessage(message), args);
    }
    debug(message, ...args) {
        this._logger.debug(this._formatMessage(message), args);
    }
    info(message, ...args) {
        this._logger.info(this._formatMessage(message), args);
    }
    warn(message, ...args) {
        this._logger.warn(this._formatMessage(message), args);
    }
    error(message, ...args) {
        if (message instanceof Error) {
            this._logger.error(this._formatMessage(''), message, args);
            return;
        }
        this._logger.error(this._formatMessage(message), args);
    }
    _formatMessage(message) {
        if (this._logger.getLevel() === LogLevel.Trace) {
            return `[${this._workspaceId}] ${message}`;
        }
        return message;
    }
};
TerminalLogService = __decorate([
    __param(0, ILoggerService),
    __param(1, IWorkspaceContextService),
    __param(2, IEnvironmentService)
], TerminalLogService);
export { TerminalLogService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2dTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsTG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQVcsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFRakQsSUFBSSxtQkFBbUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFBO0lBQ3hDLENBQUM7SUFFRCxZQUNrQyxjQUE4QixFQUNyQyx1QkFBaUQsRUFDdEQsa0JBQXVDO1FBRTVELEtBQUssRUFBRSxDQUFBO1FBSjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUsvRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUM5QyxRQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxFQUNyRCxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFB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