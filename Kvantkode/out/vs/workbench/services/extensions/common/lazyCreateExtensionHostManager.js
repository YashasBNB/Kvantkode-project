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
import { Barrier } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { RemoteAuthorityResolverErrorCode } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ExtensionHostManager, friendlyExtHostName } from './extensionHostManager.js';
import { ExtensionHostExtensions, } from './extensions.js';
/**
 * Waits until `start()` and only if it has extensions proceeds to really start.
 */
let LazyCreateExtensionHostManager = class LazyCreateExtensionHostManager extends Disposable {
    get pid() {
        if (this._actual) {
            return this._actual.pid;
        }
        return null;
    }
    get kind() {
        return this._extensionHost.runningLocation.kind;
    }
    get startup() {
        return this._extensionHost.startup;
    }
    get friendyName() {
        return friendlyExtHostName(this.kind, this.pid);
    }
    constructor(extensionHost, _internalExtensionService, _instantiationService, _logService) {
        super();
        this._internalExtensionService = _internalExtensionService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._onDidChangeResponsiveState = this._register(new Emitter());
        this.onDidChangeResponsiveState = this._onDidChangeResponsiveState.event;
        this._extensionHost = extensionHost;
        this.onDidExit = extensionHost.onExit;
        this._startCalled = new Barrier();
        this._actual = null;
        this._lazyStartExtensions = null;
    }
    _createActual(reason) {
        this._logService.info(`Creating lazy extension host (${this.friendyName}). Reason: ${reason}`);
        this._actual = this._register(this._instantiationService.createInstance(ExtensionHostManager, this._extensionHost, [], this._internalExtensionService));
        this._register(this._actual.onDidChangeResponsiveState((e) => this._onDidChangeResponsiveState.fire(e)));
        return this._actual;
    }
    async _getOrCreateActualAndStart(reason) {
        if (this._actual) {
            // already created/started
            return this._actual;
        }
        const actual = this._createActual(reason);
        await actual.start(this._lazyStartExtensions.versionId, this._lazyStartExtensions.allExtensions, this._lazyStartExtensions.myExtensions);
        return actual;
    }
    async ready() {
        await this._startCalled.wait();
        if (this._actual) {
            await this._actual.ready();
        }
    }
    async disconnect() {
        await this._actual?.disconnect();
    }
    representsRunningLocation(runningLocation) {
        return this._extensionHost.runningLocation.equals(runningLocation);
    }
    async deltaExtensions(extensionsDelta) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.deltaExtensions(extensionsDelta);
        }
        this._lazyStartExtensions.delta(extensionsDelta);
        if (extensionsDelta.myToAdd.length > 0) {
            const actual = this._createActual(`contains ${extensionsDelta.myToAdd.length} new extension(s) (installed or enabled): ${extensionsDelta.myToAdd.map((extId) => extId.value)}`);
            await actual.start(this._lazyStartExtensions.versionId, this._lazyStartExtensions.allExtensions, this._lazyStartExtensions.myExtensions);
            return;
        }
    }
    containsExtension(extensionId) {
        return this._extensionHost.extensions?.containsExtension(extensionId) ?? false;
    }
    async activate(extension, reason) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.activate(extension, reason);
        }
        return false;
    }
    async activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */) {
            // this is an immediate request, so we cannot wait for start to be called
            if (this._actual) {
                return this._actual.activateByEvent(activationEvent, activationKind);
            }
            return;
        }
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.activateByEvent(activationEvent, activationKind);
        }
    }
    activationEventIsDone(activationEvent) {
        if (!this._startCalled.isOpen()) {
            return false;
        }
        if (this._actual) {
            return this._actual.activationEventIsDone(activationEvent);
        }
        return true;
    }
    async getInspectPort(tryEnableInspector) {
        await this._startCalled.wait();
        return this._actual?.getInspectPort(tryEnableInspector);
    }
    async resolveAuthority(remoteAuthority, resolveAttempt) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.resolveAuthority(remoteAuthority, resolveAttempt);
        }
        return {
            type: 'error',
            error: {
                message: `Cannot resolve authority`,
                code: RemoteAuthorityResolverErrorCode.Unknown,
                detail: undefined,
            },
        };
    }
    async getCanonicalURI(remoteAuthority, uri) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.getCanonicalURI(remoteAuthority, uri);
        }
        throw new Error(`Cannot resolve canonical URI`);
    }
    async start(extensionRegistryVersionId, allExtensions, myExtensions) {
        if (myExtensions.length > 0) {
            // there are actual extensions, so let's launch the extension host
            const actual = this._createActual(`contains ${myExtensions.length} extension(s): ${myExtensions.map((extId) => extId.value)}.`);
            const result = actual.start(extensionRegistryVersionId, allExtensions, myExtensions);
            this._startCalled.open();
            return result;
        }
        // there are no actual extensions running, store extensions in `this._lazyStartExtensions`
        this._lazyStartExtensions = new ExtensionHostExtensions(extensionRegistryVersionId, allExtensions, myExtensions);
        this._startCalled.open();
    }
    async extensionTestsExecute() {
        await this._startCalled.wait();
        const actual = await this._getOrCreateActualAndStart(`execute tests.`);
        return actual.extensionTestsExecute();
    }
    async setRemoteEnvironment(env) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.setRemoteEnvironment(env);
        }
    }
};
LazyCreateExtensionHostManager = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], LazyCreateExtensionHostManager);
export { LazyCreateExtensionHostManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eUNyZWF0ZUV4dGVuc2lvbkhvc3RNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vbGF6eUNyZWF0ZUV4dGVuc2lvbkhvc3RNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBTWpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVoSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUtyRixPQUFPLEVBR04sdUJBQXVCLEdBSXZCLE1BQU0saUJBQWlCLENBQUE7QUFHeEI7O0dBRUc7QUFDSSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7SUFhN0QsSUFBVyxHQUFHO1FBQ2IsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQTtRQUN4QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUE7SUFDaEQsQ0FBQztJQUVELElBQVcsT0FB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