/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../common/descriptors.js';
import { InstantiationService, Trace } from '../../common/instantiationService.js';
import { ServiceCollection } from '../../common/serviceCollection.js';
const isSinonSpyLike = (fn) => fn && 'callCount' in fn;
export class TestInstantiationService extends InstantiationService {
    constructor(_serviceCollection = new ServiceCollection(), strict = false, parent, _properDispose) {
        super(_serviceCollection, strict, parent);
        this._serviceCollection = _serviceCollection;
        this._properDispose = _properDispose;
        this._servciesMap = new Map();
    }
    get(service) {
        return super._getOrCreateServiceInstance(service, Trace.traceCreation(false, TestInstantiationService));
    }
    set(service, instance) {
        return this._serviceCollection.set(service, instance);
    }
    mock(service) {
        return this._create(service, { mock: true });
    }
    stub(serviceIdentifier, arg2, arg3, arg4) {
        const service = typeof arg2 !== 'string' ? arg2 : undefined;
        const serviceMock = { id: serviceIdentifier, service: service };
        const property = typeof arg2 === 'string' ? arg2 : arg3;
        const value = typeof arg2 === 'string' ? arg3 : arg4;
        const stubObject = this._create(serviceMock, { stub: true }, service && !property);
        if (property) {
            if (stubObject[property]) {
                if (stubObject[property].hasOwnProperty('restore')) {
                    stubObject[property].restore();
                }
                if (typeof value === 'function') {
                    const spy = isSinonSpyLike(value) ? value : sinon.spy(value);
                    stubObject[property] = spy;
                    return spy;
                }
                else {
                    const stub = value ? sinon.stub().returns(value) : sinon.stub();
                    stubObject[property] = stub;
                    return stub;
                }
            }
            else {
                stubObject[property] = value;
            }
        }
        return stubObject;
    }
    stubPromise(arg1, arg2, arg3, arg4) {
        arg3 = typeof arg2 === 'string' ? Promise.resolve(arg3) : arg3;
        arg4 = typeof arg2 !== 'string' && typeof arg3 === 'string' ? Promise.resolve(arg4) : arg4;
        return this.stub(arg1, arg2, arg3, arg4);
    }
    spy(service, fnProperty) {
        const spy = sinon.spy();
        this.stub(service, fnProperty, spy);
        return spy;
    }
    _create(arg1, options, reset = false) {
        if (this.isServiceMock(arg1)) {
            const service = this._getOrCreateService(arg1, options, reset);
            this._serviceCollection.set(arg1.id, service);
            return service;
        }
        return options.mock ? sinon.mock(arg1) : this._createStub(arg1);
    }
    _getOrCreateService(serviceMock, opts, reset) {
        const service = this._serviceCollection.get(serviceMock.id);
        if (!reset && service) {
            if (opts.mock && service['sinonOptions'] && !!service['sinonOptions'].mock) {
                return service;
            }
            if (opts.stub && service['sinonOptions'] && !!service['sinonOptions'].stub) {
                return service;
            }
        }
        return this._createService(serviceMock, opts);
    }
    _createService(serviceMock, opts) {
        serviceMock.service = serviceMock.service
            ? serviceMock.service
            : this._servciesMap.get(serviceMock.id);
        const service = opts.mock
            ? sinon.mock(serviceMock.service)
            : this._createStub(serviceMock.service);
        service['sinonOptions'] = opts;
        return service;
    }
    _createStub(arg) {
        return typeof arg === 'object' ? arg : sinon.createStubInstance(arg);
    }
    isServiceMock(arg1) {
        return typeof arg1 === 'object' && arg1.hasOwnProperty('id');
    }
    createChild(services) {
        return new TestInstantiationService(services, false, this);
    }
    dispose() {
        sinon.restore();
        if (this._properDispose) {
            super.dispose();
        }
    }
}
export function createServices(disposables, services) {
    const serviceIdentifiers = [];
    const serviceCollection = new ServiceCollection();
    const define = (id, ctorOrInstance) => {
        if (!serviceCollection.has(id)) {
            if (typeof ctorOrInstance === 'function') {
                serviceCollection.set(id, new SyncDescriptor(ctorOrInstance));
            }
            else {
                serviceCollection.set(id, ctorOrInstance);
            }
        }
        serviceIdentifiers.push(id);
    };
    for (const [id, ctor] of services) {
        define(id, ctor);
    }
    const instantiationService = disposables.add(new TestInstantiationService(serviceCollection, true));
    disposables.add(toDisposable(() => {
        for (const id of serviceIdentifiers) {
            const instanceOrDescriptor = serviceCollection.get(id);
            if (typeof instanceOrDescriptor.dispose === 'function') {
                instanceOrDescriptor.dispose();
            }
        }
    }));
    return instantiationService;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2VNb2NrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi90ZXN0L2NvbW1vbi9pbnN0YW50aWF0aW9uU2VydmljZU1vY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFnQyxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFNUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBT3JFLE1BQU0sY0FBYyxHQUFHLENBQUMsRUFBWSxFQUF3QixFQUFFLENBQUMsRUFBRSxJQUFJLFdBQVcsSUFBSSxFQUFFLENBQUE7QUFFdEYsTUFBTSxPQUFPLHdCQUF5QixTQUFRLG9CQUFvQjtJQUdqRSxZQUNTLHFCQUF3QyxJQUFJLGlCQUFpQixFQUFFLEVBQ3ZFLFNBQWtCLEtBQUssRUFDdkIsTUFBaUMsRUFDekIsY0FBd0I7UUFFaEMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUxqQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTZDO1FBRy9ELG1CQUFjLEdBQWQsY0FBYyxDQUFVO1FBSWhDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7SUFDM0QsQ0FBQztJQUVNLEdBQUcsQ0FBSSxPQUE2QjtRQUMxQyxPQUFPLEtBQUssQ0FBQywyQkFBMkIsQ0FDdkMsT0FBTyxFQUNQLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxF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