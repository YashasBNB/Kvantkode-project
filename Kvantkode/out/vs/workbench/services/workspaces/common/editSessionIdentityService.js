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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25JZGVudGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2NvbW1vbi9lZGl0U2Vzc2lvbklkZW50aXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFMUQsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUlOLDJCQUEyQixHQUMzQixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWxFLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTBCO0lBS3RDLFlBQ29CLGlCQUFxRCxFQUMzRCxXQUF5QztRQURsQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzFDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBSi9DLG9DQUErQixHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFBO1FBcUVqRixrQkFBYSxHQUE0QyxFQUFFLENBQUE7SUFoRWhFLENBQUM7SUFFSixtQ0FBbUMsQ0FBQyxRQUFzQztRQUN6RSxJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDL0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBcUQsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFD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