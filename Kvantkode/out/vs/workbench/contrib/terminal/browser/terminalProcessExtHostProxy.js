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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITerminalService } from './terminal.js';
let TerminalProcessExtHostProxy = class TerminalProcessExtHostProxy extends Disposable {
    get onProcessReady() {
        return this._onProcessReady.event;
    }
    constructor(instanceId, _cols, _rows, _terminalService) {
        super();
        this.instanceId = instanceId;
        this._cols = _cols;
        this._rows = _rows;
        this._terminalService = _terminalService;
        this.id = 0;
        this.shouldPersist = false;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = this._register(new Emitter());
        this._onStart = this._register(new Emitter());
        this.onStart = this._onStart.event;
        this._onInput = this._register(new Emitter());
        this.onInput = this._onInput.event;
        this._onBinary = this._register(new Emitter());
        this.onBinary = this._onBinary.event;
        this._onResize = this._register(new Emitter());
        this.onResize = this._onResize.event;
        this._onAcknowledgeDataEvent = this._register(new Emitter());
        this.onAcknowledgeDataEvent = this._onAcknowledgeDataEvent.event;
        this._onShutdown = this._register(new Emitter());
        this.onShutdown = this._onShutdown.event;
        this._onRequestInitialCwd = this._register(new Emitter());
        this.onRequestInitialCwd = this._onRequestInitialCwd.event;
        this._onRequestCwd = this._register(new Emitter());
        this.onRequestCwd = this._onRequestCwd.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._pendingInitialCwdRequests = [];
        this._pendingCwdRequests = [];
    }
    emitData(data) {
        this._onProcessData.fire(data);
    }
    emitTitle(title) {
        this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: title });
    }
    emitReady(pid, cwd) {
        this._onProcessReady.fire({ pid, cwd, windowsPty: undefined });
    }
    emitProcessProperty({ type, value }) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */:
                this.emitCwd(value);
                break;
            case "initialCwd" /* ProcessPropertyType.InitialCwd */:
                this.emitInitialCwd(value);
                break;
            case "title" /* ProcessPropertyType.Title */:
                this.emitTitle(value);
                break;
            case "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */:
                this.emitOverrideDimensions(value);
                break;
            case "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */:
                this.emitResolvedShellLaunchConfig(value);
                break;
        }
    }
    emitExit(exitCode) {
        this._onProcessExit.fire(exitCode);
        this.dispose();
    }
    emitOverrideDimensions(dimensions) {
        this._onDidChangeProperty.fire({
            type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */,
            value: dimensions,
        });
    }
    emitResolvedShellLaunchConfig(shellLaunchConfig) {
        this._onDidChangeProperty.fire({
            type: "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */,
            value: shellLaunchConfig,
        });
    }
    emitInitialCwd(initialCwd) {
        while (this._pendingInitialCwdRequests.length > 0) {
            this._pendingInitialCwdRequests.pop()(initialCwd);
        }
    }
    emitCwd(cwd) {
        while (this._pendingCwdRequests.length > 0) {
            this._pendingCwdRequests.pop()(cwd);
        }
    }
    async start() {
        return this._terminalService.requestStartExtensionTerminal(this, this._cols, this._rows);
    }
    shutdown(immediate) {
        this._onShutdown.fire(immediate);
    }
    input(data) {
        this._onInput.fire(data);
    }
    resize(cols, rows) {
        this._onResize.fire({ cols, rows });
    }
    clearBuffer() {
        // no-op
    }
    acknowledgeDataEvent() {
        // Flow control is disabled for extension terminals
    }
    async setUnicodeVersion(version) {
        // No-op
    }
    async processBinary(data) {
        // Disabled for extension terminals
        this._onBinary.fire(data);
    }
    getInitialCwd() {
        return new Promise((resolve) => {
            this._onRequestInitialCwd.fire();
            this._pendingInitialCwdRequests.push(resolve);
        });
    }
    getCwd() {
        return new Promise((resolve) => {
            this._onRequestCwd.fire();
            this._pendingCwdRequests.push(resolve);
        });
    }
    async refreshProperty(type) {
        // throws if called in extHostTerminalService
    }
    async updateProperty(type, value) {
        // throws if called in extHostTerminalService
    }
};
TerminalProcessExtHostProxy = __decorate([
    __param(3, ITerminalService)
], TerminalProcessExtHostProxy);
export { TerminalProcessExtHostProxy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzRXh0SG9zdFByb3h5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsUHJvY2Vzc0V4dEhvc3RQcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBV2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUd6QyxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUNaLFNBQVEsVUFBVTtJQVNsQixJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQTtJQUNsQyxDQUFDO0lBNEJELFlBQ1EsVUFBa0IsRUFDakIsS0FBYSxFQUNiLEtBQWEsRUFDSCxnQkFBbUQ7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFMQSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2pCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQXhDN0QsT0FBRSxHQUFHLENBQUMsQ0FBQTtRQUNOLGtCQUFhLEdBQUcsS0FBSyxDQUFBO1FBRWIsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUM5RCxrQkFBYSxHQUFrQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtRQUNoRCxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNC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