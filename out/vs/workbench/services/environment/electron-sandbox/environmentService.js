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
import { IEnvironmentService, } from '../../../../platform/environment/common/environment.js';
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AbstractNativeEnvironmentService } from '../../../../platform/environment/common/environmentService.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
export const INativeWorkbenchEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class NativeWorkbenchEnvironmentService extends AbstractNativeEnvironmentService {
    get mainPid() {
        return this.configuration.mainPid;
    }
    get machineId() {
        return this.configuration.machineId;
    }
    get sqmId() {
        return this.configuration.sqmId;
    }
    get devDeviceId() {
        return this.configuration.devDeviceId;
    }
    get remoteAuthority() {
        return this.configuration.remoteAuthority;
    }
    get expectsResolverExtension() {
        return !!this.configuration.remoteAuthority?.includes('+');
    }
    get execPath() {
        return this.configuration.execPath;
    }
    get backupPath() {
        return this.configuration.backupPath;
    }
    get window() {
        return {
            id: this.configuration.windowId,
            handle: this.configuration.handle,
            colorScheme: this.configuration.colorScheme,
            maximized: this.configuration.maximized,
            accessibilitySupport: this.configuration.accessibilitySupport,
            perfMarks: this.configuration.perfMarks,
            isInitialStartup: this.configuration.isInitialStartup,
            isCodeCaching: typeof this.configuration.codeCachePath === 'string',
        };
    }
    get windowLogsPath() {
        return joinPath(this.logsHome, `window${this.configuration.windowId}`);
    }
    get logFile() {
        return joinPath(this.windowLogsPath, `renderer.log`);
    }
    get extHostLogsPath() {
        return joinPath(this.windowLogsPath, 'exthost');
    }
    get webviewExternalEndpoint() {
        return `${Schemas.vscodeWebview}://{{uuid}}`;
    }
    get skipReleaseNotes() {
        return !!this.args['skip-release-notes'];
    }
    get skipWelcome() {
        return !!this.args['skip-welcome'];
    }
    get logExtensionHostCommunication() {
        return !!this.args.logExtensionHostCommunication;
    }
    get enableSmokeTestDriver() {
        return !!this.args['enable-smoke-test-driver'];
    }
    get extensionEnabledProposedApi() {
        if (Array.isArray(this.args['enable-proposed-api'])) {
            return this.args['enable-proposed-api'];
        }
        if ('enable-proposed-api' in this.args) {
            return [];
        }
        return undefined;
    }
    get os() {
        return this.configuration.os;
    }
    get filesToOpenOrCreate() {
        return this.configuration.filesToOpenOrCreate;
    }
    get filesToDiff() {
        return this.configuration.filesToDiff;
    }
    get filesToMerge() {
        return this.configuration.filesToMerge;
    }
    get filesToWait() {
        return this.configuration.filesToWait;
    }
    constructor(configuration, productService) {
        super(configuration, {
            homeDir: configuration.homeDir,
            tmpDir: configuration.tmpDir,
            userDataDir: configuration.userDataDir,
        }, productService);
        this.configuration = configuration;
    }
}
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "mainPid", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "machineId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "sqmId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "devDeviceId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "remoteAuthority", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "expectsResolverExtension", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "execPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "backupPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "window", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "windowLogsPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "logFile", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "extHostLogsPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "webviewExternalEndpoint", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "skipReleaseNotes", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "skipWelcome", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "logExtensionHostCommunication", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "enableSmokeTestDriver", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "extensionEnabledProposedApi", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "os", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToOpenOrCreate", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToDiff", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToMerge", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToWait", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Vudmlyb25tZW50L2VsZWN0cm9uLXNhbmRib3gvZW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBV2hHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNoSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUcvRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxzQkFBc0IsQ0FHdEUsbUJBQW1CLENBQUMsQ0FBQTtBQXdDdEIsTUFBTSxPQUFPLGlDQUNaLFNBQVEsZ0NBQWdDO0lBSXhDLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7SUFDbEMsQ0FBQztJQUdELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUE7SUFDcEMsQ0FBQztJQUdELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7SUFDaEMsQ0FBQztJQUdELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUE7SUFDdEMsQ0FBQztJQUdELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxh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