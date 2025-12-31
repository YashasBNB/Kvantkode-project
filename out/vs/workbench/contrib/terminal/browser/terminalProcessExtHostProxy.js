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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzRXh0SG9zdFByb3h5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFByb2Nlc3NFeHRIb3N0UHJveHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVdqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFHekMsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFDWixTQUFRLFVBQVU7SUFTbEIsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7SUFDbEMsQ0FBQztJQTRCRCxZQUNRLFVBQWtCLEVBQ2pCLEtBQWEsRUFDYixLQUFhLEVBQ0gsZ0JBQW1EO1FBRXJFLEtBQUssRUFBRSxDQUFBO1FBTEEsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNqQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNjLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUF4QzdELE9BQUUsR0FBRyxDQUFDLENBQUE7UUFDTixrQkFBYSxHQUFHLEtBQUssQ0FBQTtRQUViLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUE7UUFDOUQsa0JBQWEsR0FBa0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUE7UUFDaEQsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUE7UUFLbkUsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3RELFlBQU8sR0FBZ0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7UUFDbEMsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQ3hELFlBQU8sR0FBa0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7UUFDcEMsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQ3pELGFBQVEsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUE7UUFDdEMsY0FBUyxHQUE0QyxJQUFJLENBQUMsU0FBUyxDQUNuRixJQUFJLE9BQU8sRUFBa0MsQ0FDN0MsQ0FBQTtRQUNRLGFBQVEsR0FBMEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUE7UUFDOUQsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUE7UUFDdkUsMkJBQXNCLEdBQWtCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7UUFDbEUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUM1RCxlQUFVLEdBQW1CLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO1FBQzNDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ2xFLHdCQUFtQixHQUFnQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBQzFELGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDM0QsaUJBQVksR0FBZ0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUFDNUMseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUIsQ0FBQyxDQUFBO1FBQ25GLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFDN0MsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUE7UUFDMUUsa0JBQWEsR0FBOEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUE7UUFFckUsK0JBQTBCLEdBQXNELEVBQUUsQ0FBQTtRQUNsRix3QkFBbUIsR0FBc0QsRUFBRSxDQUFBO0lBU25GLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBWTtRQUNwQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQWE7UUFDdEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUkseUNBQTJCLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFXLEVBQUUsR0FBVztRQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBeUI7UUFDekQsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkO2dCQUNDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ25CLE1BQUs7WUFDTjtnQkFDQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMxQixNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDckIsTUFBSztZQUNOO2dCQUNDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDbEMsTUFBSztZQUNOO2dCQUNDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDekMsTUFBSztRQUNQLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUSxDQUFDLFFBQTRCO1FBQ3BDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNmLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxVQUEyQztRQUNqRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO1lBQzlCLElBQUksbUVBQXdDO1lBQzVDLEtBQUssRUFBRSxVQUFVO1NBQ2pCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxpQkFBcUM7UUFDbEUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztZQUM5QixJQUFJLGlGQUErQztZQUNuRCxLQUFLLEVBQUUsaUJBQWlCO1NBQ3hCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxjQUFjLENBQUMsVUFBa0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25ELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLEVBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFXO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSztRQUNWLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLDZCQUE2QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRUQsUUFBUSxDQUFDLFNBQWtCO1FBQzFCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBWTtRQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVksRUFBRSxJQUFZO1FBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFdBQVc7UUFDVixRQUFRO0lBQ1QsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixtREFBbUQ7SUFDcEQsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFtQjtRQUMxQyxRQUFRO0lBQ1QsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWTtRQUMvQixtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLElBQUksT0FBTyxDQUFTLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFBO1lBQ2hDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDOUMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU8sSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN0QyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBZ0MsSUFBTztRQUMzRCw2Q0FBNkM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQ25CLElBQU8sRUFDUCxLQUE2QjtRQUU3Qiw2Q0FBNkM7SUFDOUMsQ0FBQztDQUNELENBQUE7QUF6S1ksMkJBQTJCO0lBNENyQyxXQUFBLGdCQUFnQixDQUFBO0dBNUNOLDJCQUEyQixDQXlLdkMifQ==