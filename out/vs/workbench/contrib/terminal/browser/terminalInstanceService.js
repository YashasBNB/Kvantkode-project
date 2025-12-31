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
import { ITerminalInstanceService } from './terminal.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { TerminalExtensions, } from '../../../../platform/terminal/common/terminal.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalInstance } from './terminalInstance.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
let TerminalInstanceService = class TerminalInstanceService extends Disposable {
    get onDidCreateInstance() {
        return this._onDidCreateInstance.event;
    }
    get onDidRegisterBackend() {
        return this._onDidRegisterBackend.event;
    }
    constructor(_instantiationService, _contextKeyService, environmentService) {
        super();
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._backendRegistration = new Map();
        this._onDidCreateInstance = this._register(new Emitter());
        this._onDidRegisterBackend = this._register(new Emitter());
        this._terminalShellTypeContextKey = TerminalContextKeys.shellType.bindTo(this._contextKeyService);
        for (const remoteAuthority of [undefined, environmentService.remoteAuthority]) {
            const { promise, resolve } = promiseWithResolvers();
            this._backendRegistration.set(remoteAuthority, { promise, resolve });
        }
    }
    createInstance(config, target) {
        const shellLaunchConfig = this.convertProfileToShellLaunchConfig(config);
        const instance = this._instantiationService.createInstance(TerminalInstance, this._terminalShellTypeContextKey, shellLaunchConfig);
        instance.target = target;
        this._onDidCreateInstance.fire(instance);
        return instance;
    }
    convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile, cwd) {
        // Profile was provided
        if (shellLaunchConfigOrProfile && 'profileName' in shellLaunchConfigOrProfile) {
            const profile = shellLaunchConfigOrProfile;
            if (!profile.path) {
                return shellLaunchConfigOrProfile;
            }
            return {
                executable: profile.path,
                args: profile.args,
                env: profile.env,
                icon: profile.icon,
                color: profile.color,
                name: profile.overrideName ? profile.profileName : undefined,
                cwd,
            };
        }
        // A shell launch config was provided
        if (shellLaunchConfigOrProfile) {
            if (cwd) {
                shellLaunchConfigOrProfile.cwd = cwd;
            }
            return shellLaunchConfigOrProfile;
        }
        // Return empty shell launch config
        return {};
    }
    async getBackend(remoteAuthority) {
        let backend = Registry.as(TerminalExtensions.Backend).getTerminalBackend(remoteAuthority);
        if (!backend) {
            // Ensure backend is initialized and try again
            await this._backendRegistration.get(remoteAuthority)?.promise;
            backend = Registry.as(TerminalExtensions.Backend).getTerminalBackend(remoteAuthority);
        }
        return backend;
    }
    getRegisteredBackends() {
        return Registry.as(TerminalExtensions.Backend).backends.values();
    }
    didRegisterBackend(backend) {
        this._backendRegistration.get(backend.remoteAuthority)?.resolve();
        this._onDidRegisterBackend.fire(backend);
    }
};
TerminalInstanceService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IWorkbenchEnvironmentService)
], TerminalInstanceService);
export { TerminalInstanceService };
registerSingleton(ITerminalInstanceService, TerminalInstanceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsSW5zdGFuY2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDM0UsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBS04sa0JBQWtCLEdBRWxCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFaEUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBU3RELElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtJQUN2QyxDQUFDO0lBR0QsSUFBSSxv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