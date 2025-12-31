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
import { toLocalISOString } from '../../../base/common/date.js';
import { memoize } from '../../../base/common/decorators.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { dirname, join, normalize, resolve } from '../../../base/common/path.js';
import { env } from '../../../base/common/process.js';
import { joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
export const EXTENSION_IDENTIFIER_WITH_LOG_REGEX = /^([^.]+\..+)[:=](.+)$/;
export class AbstractNativeEnvironmentService {
    get appRoot() {
        return dirname(FileAccess.asFileUri('').fsPath);
    }
    get userHome() {
        return URI.file(this.paths.homeDir);
    }
    get userDataPath() {
        return this.paths.userDataDir;
    }
    get appSettingsHome() {
        return URI.file(join(this.userDataPath, 'User'));
    }
    get tmpDir() {
        return URI.file(this.paths.tmpDir);
    }
    get cacheHome() {
        return URI.file(this.userDataPath);
    }
    get stateResource() {
        return joinPath(this.appSettingsHome, 'globalStorage', 'storage.json');
    }
    get userRoamingDataHome() {
        return this.appSettingsHome.with({ scheme: Schemas.vscodeUserData });
    }
    get userDataSyncHome() {
        return joinPath(this.appSettingsHome, 'sync');
    }
    get logsHome() {
        if (!this.args.logsPath) {
            const key = toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '');
            this.args.logsPath = join(this.userDataPath, 'logs', key);
        }
        return URI.file(this.args.logsPath);
    }
    get sync() {
        return this.args.sync;
    }
    get machineSettingsResource() {
        return joinPath(URI.file(join(this.userDataPath, 'Machine')), 'settings.json');
    }
    get workspaceStorageHome() {
        return joinPath(this.appSettingsHome, 'workspaceStorage');
    }
    get localHistoryHome() {
        return joinPath(this.appSettingsHome, 'History');
    }
    get keyboardLayoutResource() {
        return joinPath(this.userRoamingDataHome, 'keyboardLayout.json');
    }
    get argvResource() {
        const vscodePortable = env['VSCODE_PORTABLE'];
        if (vscodePortable) {
            return URI.file(join(vscodePortable, 'argv.json'));
        }
        return joinPath(this.userHome, this.productService.dataFolderName, 'argv.json');
    }
    get isExtensionDevelopment() {
        return !!this.args.extensionDevelopmentPath;
    }
    get untitledWorkspacesHome() {
        return URI.file(join(this.userDataPath, 'Workspaces'));
    }
    get builtinExtensionsPath() {
        const cliBuiltinExtensionsDir = this.args['builtin-extensions-dir'];
        if (cliBuiltinExtensionsDir) {
            return resolve(cliBuiltinExtensionsDir);
        }
        return normalize(join(FileAccess.asFileUri('').fsPath, '..', 'extensions'));
    }
    get extensionsDownloadLocation() {
        const cliExtensionsDownloadDir = this.args['extensions-download-dir'];
        if (cliExtensionsDownloadDir) {
            return URI.file(resolve(cliExtensionsDownloadDir));
        }
        return URI.file(join(this.userDataPath, 'CachedExtensionVSIXs'));
    }
    get extensionsPath() {
        const cliExtensionsDir = this.args['extensions-dir'];
        if (cliExtensionsDir) {
            return resolve(cliExtensionsDir);
        }
        const vscodeExtensions = env['VSCODE_EXTENSIONS'];
        if (vscodeExtensions) {
            return vscodeExtensions;
        }
        const vscodePortable = env['VSCODE_PORTABLE'];
        if (vscodePortable) {
            return join(vscodePortable, 'extensions');
        }
        return joinPath(this.userHome, this.productService.dataFolderName, 'extensions').fsPath;
    }
    get extensionDevelopmentLocationURI() {
        const extensionDevelopmentPaths = this.args.extensionDevelopmentPath;
        if (Array.isArray(extensionDevelopmentPaths)) {
            return extensionDevelopmentPaths.map((extensionDevelopmentPath) => {
                if (/^[^:/?#]+?:\/\//.test(extensionDevelopmentPath)) {
                    return URI.parse(extensionDevelopmentPath);
                }
                return URI.file(normalize(extensionDevelopmentPath));
            });
        }
        return undefined;
    }
    get extensionDevelopmentKind() {
        return this.args.extensionDevelopmentKind?.map((kind) => kind === 'ui' || kind === 'workspace' || kind === 'web' ? kind : 'workspace');
    }
    get extensionTestsLocationURI() {
        const extensionTestsPath = this.args.extensionTestsPath;
        if (extensionTestsPath) {
            if (/^[^:/?#]+?:\/\//.test(extensionTestsPath)) {
                return URI.parse(extensionTestsPath);
            }
            return URI.file(normalize(extensionTestsPath));
        }
        return undefined;
    }
    get disableExtensions() {
        if (this.args['disable-extensions']) {
            return true;
        }
        const disableExtensions = this.args['disable-extension'];
        if (disableExtensions) {
            if (typeof disableExtensions === 'string') {
                return [disableExtensions];
            }
            if (Array.isArray(disableExtensions) && disableExtensions.length > 0) {
                return disableExtensions;
            }
        }
        return false;
    }
    get debugExtensionHost() {
        return parseExtensionHostDebugPort(this.args, this.isBuilt);
    }
    get debugRenderer() {
        return !!this.args.debugRenderer;
    }
    get isBuilt() {
        return !env['VSCODE_DEV'];
    }
    get verbose() {
        return !!this.args.verbose;
    }
    get logLevel() {
        return this.args.log?.find((entry) => !EXTENSION_IDENTIFIER_WITH_LOG_REGEX.test(entry));
    }
    get extensionLogLevel() {
        const result = [];
        for (const entry of this.args.log || []) {
            const matches = EXTENSION_IDENTIFIER_WITH_LOG_REGEX.exec(entry);
            if (matches && matches[1] && matches[2]) {
                result.push([matches[1], matches[2]]);
            }
        }
        return result.length ? result : undefined;
    }
    get serviceMachineIdResource() {
        return joinPath(URI.file(this.userDataPath), 'machineid');
    }
    get crashReporterId() {
        return this.args['crash-reporter-id'];
    }
    get crashReporterDirectory() {
        return this.args['crash-reporter-directory'];
    }
    get disableTelemetry() {
        return !!this.args['disable-telemetry'];
    }
    get disableWorkspaceTrust() {
        return !!this.args['disable-workspace-trust'];
    }
    get useInMemorySecretStorage() {
        return !!this.args['use-inmemory-secretstorage'];
    }
    get policyFile() {
        if (this.args['__enable-file-policy']) {
            const vscodePortable = env['VSCODE_PORTABLE'];
            if (vscodePortable) {
                return URI.file(join(vscodePortable, 'policy.json'));
            }
            return joinPath(this.userHome, this.productService.dataFolderName, 'policy.json');
        }
        return undefined;
    }
    get editSessionId() {
        return this.args['editSessionId'];
    }
    get continueOn() {
        return this.args['continueOn'];
    }
    set continueOn(value) {
        this.args['continueOn'] = value;
    }
    get args() {
        return this._args;
    }
    constructor(_args, paths, productService) {
        this._args = _args;
        this.paths = paths;
        this.productService = productService;
    }
}
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "appRoot", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userDataPath", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "appSettingsHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "tmpDir", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "cacheHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "stateResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userRoamingDataHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userDataSyncHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "sync", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "machineSettingsResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "workspaceStorageHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "localHistoryHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "keyboardLayoutResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "argvResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "isExtensionDevelopment", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "untitledWorkspacesHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "builtinExtensionsPath", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionsPath", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionDevelopmentLocationURI", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionDevelopmentKind", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionTestsLocationURI", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "debugExtensionHost", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "logLevel", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionLogLevel", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "serviceMachineIdResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "disableTelemetry", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "disableWorkspaceTrust", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "useInMemorySecretStorage", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "policyFile", null);
export function parseExtensionHostDebugPort(args, isBuilt) {
    return parseDebugParams(args['inspect-extensions'], args['inspect-brk-extensions'], 5870, isBuilt, args.debugId, args.extensionEnvironment);
}
export function parseDebugParams(debugArg, debugBrkArg, defaultBuildPort, isBuilt, debugId, environmentString) {
    const portStr = debugBrkArg || debugArg;
    const port = Number(portStr) || (!isBuilt ? defaultBuildPort : null);
    const brk = port ? Boolean(!!debugBrkArg) : false;
    let env;
    if (environmentString) {
        try {
            env = JSON.parse(environmentString);
        }
        catch {
            // ignore
        }
    }
    return { port, break: brk, debugId, env };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvY29tbW9uL2Vudmlyb25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFTakQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsdUJBQXVCLENBQUE7QUF3QjFFLE1BQU0sT0FBZ0IsZ0NBQWdDO0lBSXJELElBQUksT0FBTztRQUNWLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUdELElBQUksUUFBUTtRQUNYLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFHRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFBO0lBQzlCLENBQUM7SUFHRCxJQUFJLGVBQWU7UUFD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