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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eUNyZWF0ZUV4dGVuc2lvbkhvc3RNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2xhenlDcmVhdGVFeHRlbnNpb25Ib3N0TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU1qRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFaEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFLckYsT0FBTyxFQUdOLHVCQUF1QixHQUl2QixNQUFNLGlCQUFpQixDQUFBO0FBR3hCOztHQUVHO0FBQ0ksSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBYTdELElBQVcsR0FBRztRQUNiLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUE7UUFDeEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFBO0lBQ2hELENBQUM7SUFFRCxJQUFXLE9BQU87UUFD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