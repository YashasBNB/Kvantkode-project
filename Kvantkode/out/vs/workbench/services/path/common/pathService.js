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
var AbstractPathService_1;
import { isValidBasename } from '../../../../base/common/extpath.js';
import { Schemas } from '../../../../base/common/network.js';
import { win32, posix } from '../../../../base/common/path.js';
import { OS } from '../../../../base/common/platform.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getVirtualWorkspaceScheme } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
export const IPathService = createDecorator('pathService');
let AbstractPathService = AbstractPathService_1 = class AbstractPathService {
    constructor(localUserHome, remoteAgentService, environmentService, contextService) {
        this.localUserHome = localUserHome;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        // OS
        this.resolveOS = (async () => {
            const env = await this.remoteAgentService.getEnvironment();
            return env?.os || OS;
        })();
        // User Home
        this.resolveUserHome = (async () => {
            const env = await this.remoteAgentService.getEnvironment();
            const userHome = (this.maybeUnresolvedUserHome = env?.userHome ?? localUserHome);
            return userHome;
        })();
    }
    hasValidBasename(resource, arg2, basename) {
        // async version
        if (typeof arg2 === 'string' || typeof arg2 === 'undefined') {
            return this.resolveOS.then((os) => this.doHasValidBasename(resource, os, arg2));
        }
        // sync version
        return this.doHasValidBasename(resource, arg2, basename);
    }
    doHasValidBasename(resource, os, name) {
        // Our `isValidBasename` method only works with our
        // standard schemes for files on disk, either locally
        // or remote.
        if (resource.scheme === Schemas.file || resource.scheme === Schemas.vscodeRemote) {
            return isValidBasename(name ?? basename(resource), os === 1 /* OperatingSystem.Windows */);
        }
        return true;
    }
    get defaultUriScheme() {
        return AbstractPathService_1.findDefaultUriScheme(this.environmentService, this.contextService);
    }
    static findDefaultUriScheme(environmentService, contextService) {
        if (environmentService.remoteAuthority) {
            return Schemas.vscodeRemote;
        }
        const virtualWorkspace = getVirtualWorkspaceScheme(contextService.getWorkspace());
        if (virtualWorkspace) {
            return virtualWorkspace;
        }
        const firstFolder = contextService.getWorkspace().folders[0];
        if (firstFolder) {
            return firstFolder.uri.scheme;
        }
        const configuration = contextService.getWorkspace().configuration;
        if (configuration) {
            return configuration.scheme;
        }
        return Schemas.file;
    }
    userHome(options) {
        return options?.preferLocal ? this.localUserHome : this.resolveUserHome;
    }
    get resolvedUserHome() {
        return this.maybeUnresolvedUserHome;
    }
    get path() {
        return this.resolveOS.then((os) => {
            return os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
        });
    }
    async fileURI(_path) {
        let authority = '';
        // normalize to fwd-slashes on windows,
        // on other systems bwd-slashes are valid
        // filename character, eg /f\oo/ba\r.txt
        const os = await this.resolveOS;
        if (os === 1 /* OperatingSystem.Windows */) {
            _path = _path.replace(/\\/g, '/');
        }
        // check for authority as used in UNC shares
        // or use the path as given
        if (_path[0] === '/' && _path[1] === '/') {
            const idx = _path.indexOf('/', 2);
            if (idx === -1) {
                authority = _path.substring(2);
                _path = '/';
            }
            else {
                authority = _path.substring(2, idx);
                _path = _path.substring(idx) || '/';
            }
        }
        return URI.from({
            scheme: Schemas.file,
            authority,
            path: _path,
            query: '',
            fragment: '',
        });
    }
};
AbstractPathService = AbstractPathService_1 = __decorate([
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkspaceContextService)
], AbstractPathService);
export { AbstractPathService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wYXRoL2NvbW1vbi9wYXRoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQVMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JFLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFL0UsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBZSxhQUFhLENBQUMsQ0FBQTtBQThEakUsSUFBZSxtQkFBbUIsMkJBQWxDLE1BQWUsbUJBQW1CO0lBUXhDLFlBQ1MsYUFBa0IsRUFDWSxrQkFBdUMsRUFDOUIsa0JBQWdELEVBQzdELGNBQXdDO1FBSGxFLGtCQUFhLEdBQWIsYUFBYSxDQUFLO1FBQ1ksdUJBQWtCLEdBQWxCLGtC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