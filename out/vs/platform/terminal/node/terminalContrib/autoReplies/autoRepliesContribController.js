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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b1JlcGxpZXNDb250cmliQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvdGVybWluYWxDb250cmliL2F1dG9SZXBsaWVzL2F1dG9SZXBsaWVzQ29udHJpYkNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTNELElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWlDO0lBSzdDLFlBQXlCLFdBQXlDO1FBQXhCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBSmpELGlCQUFZLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUE7UUFDN0MsdUJBQWtCLEdBQXVDLElBQUksR0FBRyxFQUFFLENBQUE7UUFDbEUsb0JBQWUsR0FBb0QsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUV4QixDQUFDO0lBRXRFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFhLEVBQUUsS0FBYTtRQUNsRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkMsMkVBQTJFO1FBQzNFLEtBQUssTUFBTSxtQkFBbUIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBQ2hFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFBO2dCQUMv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