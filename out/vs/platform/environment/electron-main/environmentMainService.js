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
import { memoize } from '../../../base/common/decorators.js';
import { join } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { createStaticIPCHandle } from '../../../base/parts/ipc/node/ipc.net.js';
import { IEnvironmentService } from '../common/environment.js';
import { NativeEnvironmentService } from '../node/environmentService.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
export const IEnvironmentMainService = refineServiceDecorator(IEnvironmentService);
export class EnvironmentMainService extends NativeEnvironmentService {
    constructor() {
        super(...arguments);
        this._snapEnv = {};
    }
    get backupHome() {
        return join(this.userDataPath, 'Backups');
    }
    get mainIPCHandle() {
        return createStaticIPCHandle(this.userDataPath, 'main', this.productService.version);
    }
    get mainLockfile() {
        return join(this.userDataPath, 'code.lock');
    }
    get disableUpdates() {
        return !!this.args['disable-updates'];
    }
    get crossOriginIsolated() {
        return !!this.args['enable-coi'];
    }
    get codeCachePath() {
        return process.env['VSCODE_CODE_CACHE_PATH'] || undefined;
    }
    get useCodeCache() {
        return !!this.codeCachePath;
    }
    unsetSnapExportedVariables() {
        if (!isLinux) {
            return;
        }
        for (const key in process.env) {
            if (key.endsWith('_VSCODE_SNAP_ORIG')) {
                const originalKey = key.slice(0, -17); // Remove the _VSCODE_SNAP_ORIG suffix
                if (this._snapEnv[originalKey]) {
                    continue;
                }
                // Preserve the original value in case the snap env is re-entered
                if (process.env[originalKey]) {
                    this._snapEnv[originalKey] = process.env[originalKey];
                }
                // Copy the original value from before entering the snap env if available,
                // if not delete the env variable.
                if (process.env[key]) {
                    process.env[originalKey] = process.env[key];
                }
                else {
                    delete process.env[originalKey];
                }
            }
        }
    }
    restoreSnapExportedVariables() {
        if (!isLinux) {
            return;
        }
        for (const key in this._snapEnv) {
            process.env[key] = this._snapEnv[key];
            delete this._snapEnv[key];
        }
    }
}
__decorate([
    memoize
], EnvironmentMainService.prototype, "backupHome", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "mainIPCHandle", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "mainLockfile", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "disableUpdates", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "crossOriginIsolated", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "codeCachePath", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "useCodeCache", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L2VsZWN0cm9uLW1haW4vZW52aXJvbm1lbnRNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQTZCLE1BQU0sMEJBQTBCLENBQUE7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFcEYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsc0JBQXNCLENBRzNELG1CQUFtQixDQUFDLENBQUE7QUF5QnRCLE1BQU0sT0FBTyxzQkFDWixTQUFRLHdCQUF3QjtJQURqQzs7UUFJUyxhQUFRLEdBQTJCLEVBQUUsQ0FBQTtJQXVFOUMsQ0FBQztJQXBFQSxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFHRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFHRCxJQUFJLFlBQVk7UUFDZixP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