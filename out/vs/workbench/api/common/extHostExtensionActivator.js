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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUMvRyxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUF3Q3ZELE1BQU0sT0FBTyx3QkFBd0I7YUFDYixTQUFJLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQU83RSxZQUNDLE9BQWdCLEVBQ2hCLGVBQXVCLEVBQ3ZCLGdCQUF3QixFQUN4QixvQkFBNEI7UUFFNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFDdEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFBO1FBQ3hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQTtJQUNqRCxDQUFDOztBQUdGLE1BQU0sT0FBTywrQkFBK0I7SUFTM0MsWUFB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