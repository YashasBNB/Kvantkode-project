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
import { timeout } from '../../../base/common/async.js';
import { ILogService } from '../../log/common/log.js';
let WindowProfiler = class WindowProfiler {
    constructor(_window, _sessionId, _logService) {
        this._window = _window;
        this._sessionId = _sessionId;
        this._logService = _logService;
    }
    async inspect(duration) {
        await this._connect();
        const inspector = this._window.webContents.debugger;
        await inspector.sendCommand('Profiler.start');
        this._logService.warn('[perf] profiling STARTED', this._sessionId);
        await timeout(duration);
        const data = await inspector.sendCommand('Profiler.stop');
        this._logService.warn('[perf] profiling DONE', this._sessionId);
        await this._disconnect();
        return data.profile;
    }
    async _connect() {
        const inspector = this._window.webContents.debugger;
        inspector.attach();
        await inspector.sendCommand('Profiler.enable');
    }
    async _disconnect() {
        const inspector = this._window.webContents.debugger;
        await inspector.sendCommand('Profiler.disable');
        inspector.detach();
    }
};
WindowProfiler = __decorate([
    __param(2, ILogService)
], WindowProfiler);
export { WindowProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93UHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZmlsaW5nL2VsZWN0cm9uLW1haW4vd2luZG93UHJvZmlsaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFHOUMsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYztJQUMxQixZQUNrQixPQUFzQixFQUN0QixVQUFrQixFQUNMLFdBQXdCO1FBRnJDLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFDdEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNMLGdCQUFXLEdBQVgsV0FBVyxDQUFhO0lBQ3BELENBQUM7SUFFSixLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWdCO1FBQzdCLE1BQU0sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRXJCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQTtRQUNuRCxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEUsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkIsTUFBTSxJQUFJLEdBQWtCLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN4RSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFL0QsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDeEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFTyxLQUFLLENBQUMsUUFBUTtRQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUE7UUFDbkQsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2xCLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVztRQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUE7UUFDbkQsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDL0MsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ25CLENBQUM7Q0FDRCxDQUFBO0FBaENZLGNBQWM7SUFJeEIsV0FBQSxXQUFXLENBQUE7R0FKRCxjQUFjLENBZ0MxQiJ9