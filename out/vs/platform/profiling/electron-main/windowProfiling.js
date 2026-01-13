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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93UHJvZmlsaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvZWxlY3Ryb24tbWFpbi93aW5kb3dQcm9maWxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUc5QyxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBQzFCLFlBQ2tCLE9BQXNCLEVBQ3RCLFVBQWtCLEVBQ0wsV0FBd0I7UUFGckMsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQUN0QixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ0wsZ0JBQVcsR0FBWCxXQUFXLENBQWE7SUFDcEQsQ0FBQztJQUVKLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBZ0I7UUFDN0IsTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFBO1FBQ25ELE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNsRSxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2QixNQUFNLElBQUksR0FBa0IsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUvRCxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUFRO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQTtRQUNuRCxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDbEIsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQTtRQUNuRCxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMvQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDbkIsQ0FBQztDQUNELENBQUE7QUFoQ1ksY0FBYztJQUl4QixXQUFBLFdBQVcsQ0FBQTtHQUpELGNBQWMsQ0FnQzFCIn0=