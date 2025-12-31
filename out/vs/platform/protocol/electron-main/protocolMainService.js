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
import { session } from 'electron';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { COI, FileAccess, Schemas, CacheControlheaders, DocumentPolicyheaders, } from '../../../base/common/network.js';
import { basename, extname, normalize } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
let ProtocolMainService = class ProtocolMainService extends Disposable {
    constructor(environmentService, userDataProfilesService, logService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.validRoots = TernarySearchTree.forPaths(!isLinux);
        this.validExtensions = new Set([
            '.svg',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.bmp',
            '.webp',
            '.mp4',
            '.otf',
            '.ttf',
        ]); // https://github.com/microsoft/vscode/issues/119384
        // Define an initial set of roots we allow loading from
        // - appRoot	: all files installed as part of the app
        // - extensions : all files shipped from extensions
        // - storage    : all files in global and workspace storage (https://github.com/microsoft/vscode/issues/116735)
        this.addValidFileRoot(environmentService.appRoot);
        this.addValidFileRoot(environmentService.extensionsPath);
        this.addValidFileRoot(userDataProfilesService.defaultProfile.globalStorageHome.with({ scheme: Schemas.file })
            .fsPath);
        this.addValidFileRoot(environmentService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath);
        // Handle protocols
        this.handleProtocols();
    }
    handleProtocols() {
        const { defaultSession } = session;
        // Register vscode-file:// handler
        defaultSession.protocol.registerFileProtocol(Schemas.vscodeFileResource, (request, callback) => this.handleResourceRequest(request, callback));
        // Block any file:// access
        defaultSession.protocol.interceptFileProtocol(Schemas.file, (request, callback) => this.handleFileRequest(request, callback));
        // Cleanup
        this._register(toDisposable(() => {
            defaultSession.protocol.unregisterProtocol(Schemas.vscodeFileResource);
            defaultSession.protocol.uninterceptProtocol(Schemas.file);
        }));
    }
    addValidFileRoot(root) {
        // Pass to `normalize` because we later also do the
        // same for all paths to check against.
        const normalizedRoot = normalize(root);
        if (!this.validRoots.get(normalizedRoot)) {
            this.validRoots.set(normalizedRoot, true);
            return toDisposable(() => this.validRoots.delete(normalizedRoot));
        }
        return Disposable.None;
    }
    //#region file://
    handleFileRequest(request, callback) {
        const uri = URI.parse(request.url);
        this.logService.error(`Refused to load resource ${uri.fsPath} from ${Schemas.file}: protocol (original URL: ${request.url})`);
        return callback({ error: -3 /* ABORTED */ });
    }
    //#endregion
    //#region vscode-file://
    handleResourceRequest(request, callback) {
        const path = this.requestToNormalizedFilePath(request);
        const pathBasename = basename(path);
        let headers;
        if (this.environmentService.crossOriginIsolated) {
            if (pathBasename === 'workbench.html' || pathBasename === 'workbench-dev.html') {
                headers = COI.CoopAndCoep;
            }
            else {
                headers = COI.getHeadersFromQuery(request.url);
            }
        }
        // In OSS, evict resources from the memory cache in the renderer process
        // Refs https://github.com/microsoft/vscode/issues/148541#issuecomment-2670891511
        if (!this.environmentService.isBuilt) {
            headers = {
                ...headers,
                ...CacheControlheaders,
            };
        }
        // Document-policy header is needed for collecting
        // JavaScript callstacks via https://www.electronjs.org/docs/latest/api/web-frame-main#framecollectjavascriptcallstack-experimental
        // until https://github.com/electron/electron/issues/45356 is resolved.
        if (pathBasename === 'workbench.html' || pathBasename === 'workbench-dev.html') {
            headers = {
                ...headers,
                ...DocumentPolicyheaders,
            };
        }
        // first check by validRoots
        if (this.validRoots.findSubstr(path)) {
            return callback({ path, headers });
        }
        // then check by validExtensions
        if (this.validExtensions.has(extname(path).toLowerCase())) {
            return callback({ path, headers });
        }
        // finally block to load the resource
        this.logService.error(`${Schemas.vscodeFileResource}: Refused to load resource ${path} from ${Schemas.vscodeFileResource}: protocol (original URL: ${request.url})`);
        return callback({ error: -3 /* ABORTED */ });
    }
    requestToNormalizedFilePath(request) {
        // 1.) Use `URI.parse()` util from us to convert the raw
        //     URL into our URI.
        const requestUri = URI.parse(request.url);
        // 2.) Use `FileAccess.asFileUri` to convert back from a
        //     `vscode-file:` URI to a `file:` URI.
        const unnormalizedFileUri = FileAccess.uriToFileUri(requestUri);
        // 3.) Strip anything from the URI that could result in
        //     relative paths (such as "..") by using `normalize`
        return normalize(unnormalizedFileUri.fsPath);
    }
    //#endregion
    //#region IPC Object URLs
    createIPCObjectUrl() {
        let obj = undefined;
        // Create unique URI
        const resource = URI.from({
            scheme: 'vscode', // used for all our IPC communication (vscode:<channel>)
            path: generateUuid(),
        });
        // Install IPC handler
        const channel = resource.toString();
        const handler = async () => obj;
        validatedIpcMain.handle(channel, handler);
        this.logService.trace(`IPC Object URL: Registered new channel ${channel}.`);
        return {
            resource,
            update: (updatedObj) => (obj = updatedObj),
            dispose: () => {
                this.logService.trace(`IPC Object URL: Removed channel ${channel}.`);
                validatedIpcMain.removeHandler(channel);
            },
        };
    }
};
ProtocolMainService = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, IUserDataProfilesService),
    __param(2, ILogService)
], ProtocolMainService);
export { ProtocolMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG9jb2xNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb3RvY29sL2VsZWN0cm9uLW1haW4vcHJvdG9jb2xNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUNOLEdBQUcsRUFDSCxVQUFVLEVBQ1YsT0FBTyxFQUNQLG1CQUFtQixFQUNuQixxQkFBcUIsR0FDckIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFckQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFNbkYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBaUJsRCxZQUM0QixrQkFBOEQsRUFDL0QsdUJBQWlE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