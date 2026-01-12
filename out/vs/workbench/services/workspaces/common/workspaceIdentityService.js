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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { isEqualOrParent, joinPath, relativePath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { EditSessionIdentityMatch, IEditSessionIdentityService, } from '../../../../platform/workspace/common/editSessions.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
export const IWorkspaceIdentityService = createDecorator('IWorkspaceIdentityService');
let WorkspaceIdentityService = class WorkspaceIdentityService {
    constructor(workspaceContextService, editSessionIdentityService) {
        this.workspaceContextService = workspaceContextService;
        this.editSessionIdentityService = editSessionIdentityService;
    }
    async getWorkspaceStateFolders(cancellationToken) {
        const workspaceStateFolders = [];
        for (const workspaceFolder of this.workspaceContextService.getWorkspace().folders) {
            const workspaceFolderIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            if (!workspaceFolderIdentity) {
                continue;
            }
            workspaceStateFolders.push({
                resourceUri: workspaceFolder.uri.toString(),
                workspaceFolderIdentity,
            });
        }
        return workspaceStateFolders;
    }
    async matches(incomingWorkspaceFolders, cancellationToken) {
        const incomingToCurrentWorkspaceFolderUris = {};
        const incomingIdentitiesToIncomingWorkspaceFolders = {};
        for (const workspaceFolder of incomingWorkspaceFolders) {
            incomingIdentitiesToIncomingWorkspaceFolders[workspaceFolder.workspaceFolderIdentity] =
                workspaceFolder.resourceUri;
        }
        // Precompute the identities of the current workspace folders
        const currentWorkspaceFoldersToIdentities = new Map();
        for (const workspaceFolder of this.workspaceContextService.getWorkspace().folders) {
            const workspaceFolderIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            if (!workspaceFolderIdentity) {
                continue;
            }
            currentWorkspaceFoldersToIdentities.set(workspaceFolder, workspaceFolderIdentity);
        }
        // Match the current workspace folders to the incoming workspace folders
        for (const [currentWorkspaceFolder, currentWorkspaceFolderIdentity,] of currentWorkspaceFoldersToIdentities.entries()) {
            // Happy case: identities do not need further disambiguation
            const incomingWorkspaceFolder = incomingIdentitiesToIncomingWorkspaceFolders[currentWorkspaceFolderIdentity];
            if (incomingWorkspaceFolder) {
                // There is an incoming workspace folder with the exact same identity as the current workspace folder
                incomingToCurrentWorkspaceFolderUris[incomingWorkspaceFolder] =
                    currentWorkspaceFolder.uri.toString();
                continue;
            }
            // Unhappy case: compare the identity of the current workspace folder to all incoming workspace folder identities
            let hasCompleteMatch = false;
            for (const [incomingIdentity, incomingFolder] of Object.entries(incomingIdentitiesToIncomingWorkspaceFolders)) {
                if ((await this.editSessionIdentityService.provideEditSessionIdentityMatch(currentWorkspaceFolder, currentWorkspaceFolderIdentity, incomingIdentity, cancellationToken)) === EditSessionIdentityMatch.Complete) {
                    incomingToCurrentWorkspaceFolderUris[incomingFolder] =
                        currentWorkspaceFolder.uri.toString();
                    hasCompleteMatch = true;
                    break;
                }
            }
            if (hasCompleteMatch) {
                continue;
            }
            return false;
        }
        const convertUri = (uriToConvert) => {
            // Figure out which current folder the incoming URI is a child of
            for (const incomingFolderUriKey of Object.keys(incomingToCurrentWorkspaceFolderUris)) {
                const incomingFolderUri = URI.parse(incomingFolderUriKey);
                if (isEqualOrParent(incomingFolderUri, uriToConvert)) {
                    const currentWorkspaceFolderUri = incomingToCurrentWorkspaceFolderUris[incomingFolderUriKey];
                    // Compute the relative file path section of the uri to convert relative to the folder it came from
                    const relativeFilePath = relativePath(incomingFolderUri, uriToConvert);
                    // Reparent the relative file path under the current workspace folder it belongs to
                    if (relativeFilePath) {
                        return joinPath(URI.parse(currentWorkspaceFolderUri), relativeFilePath);
                    }
                }
            }
            // No conversion was possible; return the original URI
            return uriToConvert;
        };
        // Recursively look for any URIs in the provided object and
        // replace them with the URIs of the current workspace folders
        const uriReplacer = (obj, depth = 0) => {
            if (!obj || depth > 200) {
                return obj;
            }
            if (obj instanceof VSBuffer || obj instanceof Uint8Array) {
                return obj;
            }
            if (URI.isUri(obj)) {
                return convertUri(obj);
            }
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; ++i) {
                    obj[i] = uriReplacer(obj[i], depth + 1);
                }
            }
            else {
                // walk object
                for (const key in obj) {
                    if (Object.hasOwnProperty.call(obj, key)) {
                        obj[key] = uriReplacer(obj[key], depth + 1);
                    }
                }
            }
            return obj;
        };
        return uriReplacer;
    }
};
WorkspaceIdentityService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IEditSessionIdentityService)
], WorkspaceIdentityService);
export { WorkspaceIdentityService };
registerSingleton(IWorkspaceIdentityService, WorkspaceIdentityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlSWRlbnRpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9jb21tb24vd29ya3NwYWNlSWRlbnRpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUMzQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDJCQUEyQixDQUMzQixDQUFBO0FBVU0sSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFHcEMsWUFDNEMsdUJBQWlELEVBRTNFLDBCQUF1RDtRQUY3Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBRTNFLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7SUFDdEUsQ0FBQztJQUVKLEtBQUssQ0FBQyx3QkFBd0IsQ0FDN0IsaUJBQW9DO1FBRXBDLE1BQU0scUJBQXFCLEdBQTRCLEVBQUUsQ0FBQTtRQUV6RCxLQUFLLE1BQU0sZUFBZSxJQUFJLElBQUksQ0FBQyx1QkFB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