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
import { parse } from '../../../base/common/path.js';
import { debounce, throttle } from '../../../base/common/decorators.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { listProcesses } from '../../../base/node/ps.js';
import { ILogService } from '../../log/common/log.js';
var Constants;
(function (Constants) {
    /**
     * The amount of time to throttle checks when the process receives output.
     */
    Constants[Constants["InactiveThrottleDuration"] = 5000] = "InactiveThrottleDuration";
    /**
     * The amount of time to debounce check when the process receives input.
     */
    Constants[Constants["ActiveDebounceDuration"] = 1000] = "ActiveDebounceDuration";
})(Constants || (Constants = {}));
export const ignoreProcessNames = [];
/**
 * Monitors a process for child processes, checking at differing times depending on input and output
 * calls into the monitor.
 */
let ChildProcessMonitor = class ChildProcessMonitor extends Disposable {
    set hasChildProcesses(value) {
        if (this._hasChildProcesses !== value) {
            this._hasChildProcesses = value;
            this._logService.debug('ChildProcessMonitor: Has child processes changed', value);
            this._onDidChangeHasChildProcesses.fire(value);
        }
    }
    /**
     * Whether the process has child processes.
     */
    get hasChildProcesses() {
        return this._hasChildProcesses;
    }
    constructor(_pid, _logService) {
        super();
        this._pid = _pid;
        this._logService = _logService;
        this._hasChildProcesses = false;
        this._onDidChangeHasChildProcesses = this._register(new Emitter());
        /**
         * An event that fires when whether the process has child processes changes.
         */
        this.onDidChangeHasChildProcesses = this._onDidChangeHasChildProcesses.event;
    }
    /**
     * Input was triggered on the process.
     */
    handleInput() {
        this._refreshActive();
    }
    /**
     * Output was triggered on the process.
     */
    handleOutput() {
        this._refreshInactive();
    }
    async _refreshActive() {
        if (this._store.isDisposed) {
            return;
        }
        try {
            const processItem = await listProcesses(this._pid);
            this.hasChildProcesses = this._processContainsChildren(processItem);
        }
        catch (e) {
            this._logService.debug('ChildProcessMonitor: Fetching process tree failed', e);
        }
    }
    _refreshInactive() {
        this._refreshActive();
    }
    _processContainsChildren(processItem) {
        // No child processes
        if (!processItem.children) {
            return false;
        }
        // A single child process, handle special cases
        if (processItem.children.length === 1) {
            const item = processItem.children[0];
            let cmd;
            if (item.cmd.startsWith(`"`)) {
                cmd = item.cmd.substring(1, item.cmd.indexOf(`"`, 1));
            }
            else {
                const spaceIndex = item.cmd.indexOf(` `);
                if (spaceIndex === -1) {
                    cmd = item.cmd;
                }
                else {
                    cmd = item.cmd.substring(0, spaceIndex);
                }
            }
            return ignoreProcessNames.indexOf(parse(cmd).name) === -1;
        }
        // Fallback, count child processes
        return processItem.children.length > 0;
    }
};
__decorate([
    debounce(1000 /* Constants.ActiveDebounceDuration */)
], ChildProcessMonitor.prototype, "_refreshActive", null);
__decorate([
    throttle(5000 /* Constants.InactiveThrottleDuration */)
], ChildProcessMonitor.prototype, "_refreshInactive", null);
ChildProcessMonitor = __decorate([
    __param(1, ILogService)
], ChildProcessMonitor);
export { ChildProcessMonitor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hpbGRQcm9jZXNzTW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvY2hpbGRQcm9jZXNzTW9uaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFckQsSUFBVyxTQVNWO0FBVEQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsb0ZBQStCLENBQUE7SUFDL0I7O09BRUc7SUFDSCxnRkFBNkIsQ0FBQTtBQUM5QixDQUFDLEVBVFUsU0FBUyxLQUFULFNBQVMsUUFTbkI7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBYSxFQUFFLENBQUE7QUFFOUM7OztHQUdHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBRWxELElBQVksaUJBQWlCLENBQUMsS0FBYztRQUMzQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1lBQy9CLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2pGLElBQUksQ0FB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