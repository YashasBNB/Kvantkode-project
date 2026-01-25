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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG9jb2xNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvdG9jb2wvZWxlY3Ryb24tbWFpbi9wcm90b2NvbE1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDbEMsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQ04sR0FBRyxFQUNILFVBQVUsRUFDVixPQUFPLEVBQ1AsbUJBQW1CLEVBQ25CLHFCQUFxQixHQUNyQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQU1uRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFpQmxELFlBQzRCLGtCQUE4RCxFQUMvRCx1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