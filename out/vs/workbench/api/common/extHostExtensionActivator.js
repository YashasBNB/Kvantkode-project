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
import * as errors from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ExtensionDescriptionRegistry } from '../../services/extensions/common/extensionDescriptionRegistry.js';
import { ExtensionIdentifierMap, } from '../../../platform/extensions/common/extensions.js';
import { MissingExtensionDependency, } from '../../services/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Barrier } from '../../../base/common/async.js';
export class ExtensionActivationTimes {
    static { this.NONE = new ExtensionActivationTimes(false, -1, -1, -1); }
    constructor(startup, codeLoadingTime, activateCallTime, activateResolvedTime) {
        this.startup = startup;
        this.codeLoadingTime = codeLoadingTime;
        this.activateCallTime = activateCallTime;
        this.activateResolvedTime = activateResolvedTime;
    }
}
export class ExtensionActivationTimesBuilder {
    constructor(startup) {
        this._startup = startup;
        this._codeLoadingStart = -1;
        this._codeLoadingStop = -1;
        this._activateCallStart = -1;
        this._activateCallStop = -1;
        this._activateResolveStart = -1;
        this._activateResolveStop = -1;
    }
    _delta(start, stop) {
        if (start === -1 || stop === -1) {
            return -1;
        }
        return stop - start;
    }
    build() {
        return new ExtensionActivationTimes(this._startup, this._delta(this._codeLoadingStart, this._codeLoadingStop), this._delta(this._activateCallStart, this._activateCallStop), this._delta(this._activateResolveStart, this._activateResolveStop));
    }
    codeLoadingStart() {
        this._codeLoadingStart = Date.now();
    }
    codeLoadingStop() {
        this._codeLoadingStop = Date.now();
    }
    activateCallStart() {
        this._activateCallStart = Date.now();
    }
    activateCallStop() {
        this._activateCallStop = Date.now();
    }
    activateResolveStart() {
        this._activateResolveStart = Date.now();
    }
    activateResolveStop() {
        this._activateResolveStop = Date.now();
    }
}
export class ActivatedExtension {
    constructor(activationFailed, activationFailedError, activationTimes, module, exports, disposable) {
        this.activationFailed = activationFailed;
        this.activationFailedError = activationFailedError;
        this.activationTimes = activationTimes;
        this.module = module;
        this.exports = exports;
        this.disposable = disposable;
    }
}
export class EmptyExtension extends ActivatedExtension {
    constructor(activationTimes) {
        super(false, null, activationTimes, { activate: undefined, deactivate: undefined }, undefined, Disposable.None);
    }
}
export class HostExtension extends ActivatedExtension {
    constructor() {
        super(false, null, ExtensionActivationTimes.NONE, { activate: undefined, deactivate: undefined }, undefined, Disposable.None);
    }
}
class FailedExtension extends ActivatedExtension {
    constructor(activationError) {
        super(true, activationError, ExtensionActivationTimes.NONE, { activate: undefined, deactivate: undefined }, undefined, Disposable.None);
    }
}
let ExtensionsActivator = class ExtensionsActivator {
    constructor(registry, globalRegistry, host, _logService) {
        this._logService = _logService;
        this._registry = registry;
        this._globalRegistry = globalRegistry;
        this._host = host;
        this._operations = new ExtensionIdentifierMap();
        this._alreadyActivatedEvents = Object.create(null);
    }
    dispose() {
        for (const [_, op] of this._operations) {
            op.dispose();
        }
    }
    async waitForActivatingExtensions() {
        const res = [];
        for (const [_, op] of this._operations) {
            res.push(op.wait());
        }
        await Promise.all(res);
    }
    isActivated(extensionId) {
        const op = this._operations.get(extensionId);
        return Boolean(op && op.value);
    }
    getActivatedExtension(extensionId) {
        const op = this._operations.get(extensionId);
        if (!op || !op.value) {
            throw new Error(`Extension '${extensionId.value}' is not known or not activated`);
        }
        return op.value;
    }
    async activateByEvent(activationEvent, startup) {
        if (this._alreadyActivatedEvents[activationEvent]) {
            return;
        }
        const activateExtensions = this._registry.getExtensionDescriptionsForActivationEvent(activationEvent);
        await this._activateExtensions(activateExtensions.map((e) => ({
            id: e.identifier,
            reason: { startup, extensionId: e.identifier, activationEvent },
        })));
        this._alreadyActivatedEvents[activationEvent] = true;
    }
    activateById(extensionId, reason) {
        const desc = this._registry.getExtensionDescription(extensionId);
        if (!desc) {
            throw new Error(`Extension '${extensionId.value}' is not known`);
        }
        return this._activateExtensions([{ id: desc.identifier, reason }]);
    }
    async _activateExtensions(extensions) {
        const operations = extensions
            .filter((p) => !this.isActivated(p.id))
            .map((ext) => this._handleActivationRequest(ext));
        await Promise.all(operations.map((op) => op.wait()));
    }
    /**
     * Handle semantics related to dependencies for `currentExtension`.
     * We don't need to worry about dependency loops because they are handled by the registry.
     */
    _handleActivationRequest(currentActivation) {
        if (this._operations.has(currentActivation.id)) {
            return this._operations.get(currentActivation.id);
        }
        if (this._isHostExtension(currentActivation.id)) {
            return this._createAndSaveOperation(currentActivation, null, [], null);
        }
        const currentExtension = this._registry.getExtensionDescription(currentActivation.id);
        if (!currentExtension) {
            // Error condition 0: unknown extension
            const error = new Error(`Cannot activate unknown extension '${currentActivation.id.value}'`);
            const result = this._createAndSaveOperation(currentActivation, null, [], new FailedExtension(error));
            this._host.onExtensionActivationError(currentActivation.id, error, new MissingExtensionDependency(currentActivation.id.value));
            return result;
        }
        const deps = [];
        const depIds = typeof currentExtension.extensionDependencies === 'undefined'
            ? []
            : currentExtension.extensionDependencies;
        for (const depId of depIds) {
            if (this._isResolvedExtension(depId)) {
                // This dependency is already resolved
                continue;
            }
            const dep = this._operations.get(depId);
            if (dep) {
                deps.push(dep);
                continue;
            }
            if (this._isHostExtension(depId)) {
                // must first wait for the dependency to activate
                deps.push(this._handleActivationRequest({
                    id: this._globalRegistry.getExtensionDescription(depId).identifier,
                    reason: currentActivation.reason,
                }));
                continue;
            }
            const depDesc = this._registry.getExtensionDescription(depId);
            if (depDesc) {
                if (!depDesc.main && !depDesc.browser) {
                    // this dependency does not need to activate because it is descriptive only
                    continue;
                }
                // must first wait for the dependency to activate
                deps.push(this._handleActivationRequest({
                    id: depDesc.identifier,
                    reason: currentActivation.reason,
                }));
                continue;
            }
            // Error condition 1: unknown dependency
            const currentExtensionFriendlyName = currentExtension.displayName || currentExtension.identifier.value;
            const error = new Error(`Cannot activate the '${currentExtensionFriendlyName}' extension because it depends on unknown extension '${depId}'`);
            const result = this._createAndSaveOperation(currentActivation, currentExtension.displayName, [], new FailedExtension(error));
            this._host.onExtensionActivationError(currentExtension.identifier, error, new MissingExtensionDependency(depId));
            return result;
        }
        return this._createAndSaveOperation(currentActivation, currentExtension.displayName, deps, null);
    }
    _createAndSaveOperation(activation, displayName, deps, value) {
        const operation = new ActivationOperation(activation.id, displayName, activation.reason, deps, value, this._host, this._logService);
        this._operations.set(activation.id, operation);
        return operation;
    }
    _isHostExtension(extensionId) {
        return ExtensionDescriptionRegistry.isHostExtension(extensionId, this._registry, this._globalRegistry);
    }
    _isResolvedExtension(extensionId) {
        const extensionDescription = this._globalRegistry.getExtensionDescription(extensionId);
        if (!extensionDescription) {
            // unknown extension
            return false;
        }
        return !extensionDescription.main && !extensionDescription.browser;
    }
};
ExtensionsActivator = __decorate([
    __param(3, ILogService)
], ExtensionsActivator);
export { ExtensionsActivator };
let ActivationOperation = class ActivationOperation {
    get value() {
        return this._value;
    }
    get friendlyName() {
        return this._displayName || this._id.value;
    }
    constructor(_id, _displayName, _reason, _deps, _value, _host, _logService) {
        this._id = _id;
        this._displayName = _displayName;
        this._reason = _reason;
        this._deps = _deps;
        this._value = _value;
        this._host = _host;
        this._logService = _logService;
        this._barrier = new Barrier();
        this._isDisposed = false;
        this._initialize();
    }
    dispose() {
        this._isDisposed = true;
    }
    wait() {
        return this._barrier.wait();
    }
    async _initialize() {
        await this._waitForDepsThenActivate();
        this._barrier.open();
    }
    async _waitForDepsThenActivate() {
        if (this._value) {
            // this operation is already finished
            return;
        }
        while (this._deps.length > 0) {
            // remove completed deps
            for (let i = 0; i < this._deps.length; i++) {
                const dep = this._deps[i];
                if (dep.value && !dep.value.activationFailed) {
                    // the dependency is already activated OK
                    this._deps.splice(i, 1);
                    i--;
                    continue;
                }
                if (dep.value && dep.value.activationFailed) {
                    // Error condition 2: a dependency has already failed activation
                    const error = new Error(`Cannot activate the '${this.friendlyName}' extension because its dependency '${dep.friendlyName}' failed to activate`);
                    error.detail = dep.value.activationFailedError;
                    this._value = new FailedExtension(error);
                    this._host.onExtensionActivationError(this._id, error, null);
                    return;
                }
            }
            if (this._deps.length > 0) {
                // wait for one dependency
                await Promise.race(this._deps.map((dep) => dep.wait()));
            }
        }
        await this._activate();
    }
    async _activate() {
        try {
            this._value = await this._host.actualActivateExtension(this._id, this._reason);
        }
        catch (err) {
            const error = new Error();
            if (err && err.name) {
                error.name = err.name;
            }
            if (err && err.message) {
                error.message = `Activating extension '${this._id.value}' failed: ${err.message}.`;
            }
            else {
                error.message = `Activating extension '${this._id.value}' failed: ${err}.`;
            }
            if (err && err.stack) {
                error.stack = err.stack;
            }
            // Treat the extension as being empty
            this._value = new FailedExtension(error);
            if (this._isDisposed && errors.isCancellationError(err)) {
                // It is expected for ongoing activations to fail if the extension host is going down
                // So simply ignore and don't log canceled errors in this case
                return;
            }
            this._host.onExtensionActivationError(this._id, error, null);
            this._logService.error(`Activating extension ${this._id.value} failed due to an error:`);
            this._logService.error(err);
        }
    }
};
ActivationOperation = __decorate([
    __param(6, ILogService)
], ActivationOperation);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RFeHRlbnNpb25BY3RpdmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDL0csT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBd0N2RCxNQUFNLE9BQU8sd0JBQXdCO2FBQ2IsU0FBSSxHQUFHLElBQUksd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFPN0UsWUFDQyxPQUFnQixFQUNoQixlQUF1QixFQUN2QixnQkFBd0IsRUFDeEIsb0JBQTRCO1FBRTVCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQTtRQUN4QyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUE7SUFDakQsQ0FBQzs7QUFHRixNQUFNLE9BQU8sK0JBQStCO0lBUzNDLFlBQVksT0FB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