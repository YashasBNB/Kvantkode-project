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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlSWRlbnRpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvY29tbW9uL3dvcmtzcGFjZUlkZW50aXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFNUYsT0FBTyxFQUNOLHdCQUF3QixFQUN4QiwyQkFBMkIsR0FDM0IsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUN2RCwyQkFBMkIsQ0FDM0IsQ0FBQTtBQVVNLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCO0lBR3BDLFlBQzRDLHVCQUFpRCxFQUUzRSwwQkFBdUQ7UUFGN0IsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUUzRSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO0lBQ3RFLENBQUM7SUFFSixLQUFLLENBQUMsd0JBQXdCLENBQzdCLGlCQUFvQztRQUVwQyxNQUFNLHFCQUFxQixHQUE0QixFQUFFLENBQUE7UUFFekQsS0FBSyxNQUFNLGVBQWUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENB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