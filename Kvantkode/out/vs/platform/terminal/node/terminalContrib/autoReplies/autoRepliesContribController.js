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
import { ILogService } from '../../../../log/common/log.js';
import { TerminalAutoResponder } from './terminalAutoResponder.js';
let AutoRepliesPtyServiceContribution = class AutoRepliesPtyServiceContribution {
    constructor(_logService) {
        this._logService = _logService;
        this._autoReplies = new Map();
        this._terminalProcesses = new Map();
        this._autoResponders = new Map();
    }
    async installAutoReply(match, reply) {
        this._autoReplies.set(match, reply);
        // If the auto reply exists on any existing terminals it will be overridden
        for (const persistentProcessId of this._autoResponders.keys()) {
            const process = this._terminalProcesses.get(persistentProcessId);
            if (!process) {
                this._logService.error('Could not find terminal process to install auto reply');
                continue;
            }
            this._processInstallAutoReply(persistentProcessId, process, match, reply);
        }
    }
    async uninstallAllAutoReplies() {
        for (const match of this._autoReplies.keys()) {
            for (const processAutoResponders of this._autoResponders.values()) {
                processAutoResponders.get(match)?.dispose();
                processAutoResponders.delete(match);
            }
        }
    }
    handleProcessReady(persistentProcessId, process) {
        this._terminalProcesses.set(persistentProcessId, process);
        this._autoResponders.set(persistentProcessId, new Map());
        for (const [match, reply] of this._autoReplies.entries()) {
            this._processInstallAutoReply(persistentProcessId, process, match, reply);
        }
    }
    handleProcessDispose(persistentProcessId) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            for (const e of processAutoResponders.values()) {
                e.dispose();
            }
            processAutoResponders.clear();
        }
    }
    handleProcessInput(persistentProcessId, data) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            for (const listener of processAutoResponders.values()) {
                listener.handleInput();
            }
        }
    }
    handleProcessResize(persistentProcessId, cols, rows) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            for (const listener of processAutoResponders.values()) {
                listener.handleResize();
            }
        }
    }
    _processInstallAutoReply(persistentProcessId, terminalProcess, match, reply) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            processAutoResponders.get(match)?.dispose();
            processAutoResponders.set(match, new TerminalAutoResponder(terminalProcess, match, reply, this._logService));
        }
    }
};
AutoRepliesPtyServiceContribution = __decorate([
    __param(0, ILogService)
], AutoRepliesPtyServiceContribution);
export { AutoRepliesPtyServiceContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b1JlcGxpZXNDb250cmliQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbENvbnRyaWIvYXV0b1JlcGxpZXMvYXV0b1JlcGxpZXNDb250cmliQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFM0QsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBaUM7SUFLN0MsWUFBeUIsV0FBeUM7UUFBeEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFKakQsaUJBQVksR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUM3Qyx1QkFBa0IsR0FBdUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNsRSxvQkFBZSxHQUFvRCxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBRXhCLENBQUM7SUFFdEUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQWEsRUFBRSxLQUFhO1FBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuQywyRUFBMkU7UUFDM0UsS0FBSyxNQUFNLG1CQUFtQixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUMvRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7WUFDaEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7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