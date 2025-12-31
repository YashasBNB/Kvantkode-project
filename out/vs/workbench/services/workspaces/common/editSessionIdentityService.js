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
import { insert } from '../../../../base/common/arrays.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditSessionIdentityService, } from '../../../../platform/workspace/common/editSessions.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
let EditSessionIdentityService = class EditSessionIdentityService {
    constructor(_extensionService, _logService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._editSessionIdentifierProviders = new Map();
        this._participants = [];
    }
    registerEditSessionIdentityProvider(provider) {
        if (this._editSessionIdentifierProviders.get(provider.scheme)) {
            throw new Error(`A provider has already been registered for scheme ${provider.scheme}`);
        }
        this._editSessionIdentifierProviders.set(provider.scheme, provider);
        return toDisposable(() => {
            this._editSessionIdentifierProviders.delete(provider.scheme);
        });
    }
    async getEditSessionIdentifier(workspaceFolder, token) {
        const { scheme } = workspaceFolder.uri;
        const provider = await this.activateProvider(scheme);
        this._logService.trace(`EditSessionIdentityProvider for scheme ${scheme} available: ${!!provider}`);
        return provider?.getEditSessionIdentifier(workspaceFolder, token);
    }
    async provideEditSessionIdentityMatch(workspaceFolder, identity1, identity2, cancellationToken) {
        const { scheme } = workspaceFolder.uri;
        const provider = await this.activateProvider(scheme);
        this._logService.trace(`EditSessionIdentityProvider for scheme ${scheme} available: ${!!provider}`);
        return provider?.provideEditSessionIdentityMatch?.(workspaceFolder, identity1, identity2, cancellationToken);
    }
    async onWillCreateEditSessionIdentity(workspaceFolder, cancellationToken) {
        this._logService.debug('Running onWillCreateEditSessionIdentity participants...');
        // TODO@joyceerhl show progress notification?
        for (const participant of this._participants) {
            await participant.participate(workspaceFolder, cancellationToken);
        }
        this._logService.debug(`Done running ${this._participants.length} onWillCreateEditSessionIdentity participants.`);
    }
    addEditSessionIdentityCreateParticipant(participant) {
        const dispose = insert(this._participants, participant);
        return toDisposable(() => dispose());
    }
    async activateProvider(scheme) {
        const transformedScheme = scheme === 'vscode-remote' ? 'file' : scheme;
        const provider = this._editSessionIdentifierProviders.get(scheme);
        if (provider) {
            return provider;
        }
        await this._extensionService.activateByEvent(`onEditSession:${transformedScheme}`);
        return this._editSessionIdentifierProviders.get(scheme);
    }
};
EditSessionIdentityService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService)
], EditSessionIdentityService);
export { EditSessionIdentityService };
registerSingleton(IEditSessionIdentityService, EditSessionIdentityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25JZGVudGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9jb21tb24vZWRpdFNlc3Npb25JZGVudGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTFELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFJTiwyQkFBMkIsR0FDM0IsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVsRSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEwQjtJQUt0QyxZQUNvQixpQkFBcUQsRUFDM0QsV0FBeUM7UUFEbEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUMxQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUovQyxvQ0FBK0IsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQTtRQXFFakYsa0JBQWEsR0FBNEMsRUFBRSxDQUFBO0lBaEVoRSxDQUFDO0lBRUosbUNBQW1DLENBQUMsUUFBc0M7UUFDekUsSUFBSSxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMscURBQXFELFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFFRCxJQUFJLENBQUMs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