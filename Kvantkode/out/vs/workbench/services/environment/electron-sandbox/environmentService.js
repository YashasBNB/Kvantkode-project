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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZW52aXJvbm1lbnQvZWxlY3Ryb24tc2FuZGJveC9lbnZpcm9ubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFXaEcsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2hILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRy9ELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLHNCQUFzQixDQUd0RSxtQkFBbUIsQ0FBQyxDQUFBO0FBd0N0QixNQUFNLE9BQU8saUNBQ1osU0FBUSxnQ0FBZ0M7SUFJeEMsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtJQUNsQyxDQUFDO0lBR0QsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQTtJQUNwQyxDQUFDO0lBR0QsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtJQUNoQyxDQUFDO0lBR0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQTtJQUN0QyxDQUFDO0lBR0QsSUFBSSxlQUFl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