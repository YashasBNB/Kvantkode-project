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
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../common/descriptors.js';
import { createDecorator, IInstantiationService, } from '../../common/instantiation.js';
import { InstantiationService } from '../../common/instantiationService.js';
import { ServiceCollection } from '../../common/serviceCollection.js';
const IService1 = createDecorator('service1');
class Service1 {
    constructor() {
        this.c = 1;
    }
}
const IService2 = createDecorator('service2');
class Service2 {
    constructor() {
        this.d = true;
    }
}
const IService3 = createDecorator('service3');
class Service3 {
    constructor() {
        this.s = 'farboo';
    }
}
const IDependentService = createDecorator('dependentService');
let DependentService = class DependentService {
    constructor(service) {
        this.name = 'farboo';
        assert.strictEqual(service.c, 1);
    }
};
DependentService = __decorate([
    __param(0, IService1)
], DependentService);
let Service1Consumer = class Service1Consumer {
    constructor(service1) {
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
};
Service1Consumer = __decorate([
    __param(0, IService1)
], Service1Consumer);
let Target2Dep = class Target2Dep {
    constructor(service1, service2) {
        assert.ok(service1 instanceof Service1);
        assert.ok(service2 instanceof Service2);
    }
};
Target2Dep = __decorate([
    __param(0, IService1),
    __param(1, IService2)
], Target2Dep);
let TargetWithStaticParam = class TargetWithStaticParam {
    constructor(v, service1) {
        assert.ok(v);
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
};
TargetWithStaticParam = __decorate([
    __param(1, IService1)
], TargetWithStaticParam);
let DependentServiceTarget = class DependentServiceTarget {
    constructor(d) {
        assert.ok(d);
        assert.strictEqual(d.name, 'farboo');
    }
};
DependentServiceTarget = __decorate([
    __param(0, IDependentService)
], DependentServiceTarget);
let DependentServiceTarget2 = class DependentServiceTarget2 {
    constructor(d, s) {
        assert.ok(d);
        assert.strictEqual(d.name, 'farboo');
        assert.ok(s);
        assert.strictEqual(s.c, 1);
    }
};
DependentServiceTarget2 = __decorate([
    __param(0, IDependentService),
    __param(1, IService1)
], DependentServiceTarget2);
let ServiceLoop1 = class ServiceLoop1 {
    constructor(s) {
        this.c = 1;
    }
};
ServiceLoop1 = __decorate([
    __param(0, IService2)
], ServiceLoop1);
let ServiceLoop2 = class ServiceLoop2 {
    constructor(s) {
        this.d = true;
    }
};
ServiceLoop2 = __decorate([
    __param(0, IService1)
], ServiceLoop2);
suite('Instantiation Service', () => {
    test('service collection, cannot overwrite', function () {
        const collection = new ServiceCollection();
        let result = collection.set(IService1, null);
        assert.strictEqual(result, undefined);
        result = collection.set(IService1, new Service1());
        assert.strictEqual(result, null);
    });
    test('service collection, add/has', function () {
        const collection = new ServiceCollection();
        collection.set(IService1, null);
        assert.ok(collection.has(IService1));
        collection.set(IService2, null);
        assert.ok(collection.has(IService1));
        assert.ok(collection.has(IService2));
    });
    test('@Param - simple clase', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        collection.set(IService3, new Service3());
        service.createInstance(Service1Consumer);
    });
    test('@Param - fixed args', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        collection.set(IService3, new Service3());
        service.createInstance(TargetWithStaticParam, true);
    });
    test('service collection is live', function () {
        const collection = new ServiceCollection();
        collection.set(IService1, new Service1());
        const service = new InstantiationService(collection);
        service.createInstance(Service1Consumer);
        collection.set(IService2, new Service2());
        service.createInstance(Target2Dep);
        service.invokeFunction(function (a) {
            assert.ok(a.get(IService1));
            assert.ok(a.get(IService2));
        });
    });
    // we made this a warning
    // test('@Param - too many args', function () {
    // 	let service = instantiationService.create(Object.create(null));
    // 	service.addSingleton(IService1, new Service1());
    // 	service.addSingleton(IService2, new Service2());
    // 	service.addSingleton(IService3, new Service3());
    // 	assert.throws(() => service.createInstance(ParameterTarget2, true, 2));
    // });
    // test('@Param - too few args', function () {
    // 	let service = instantiationService.create(Object.create(null));
    // 	service.addSingleton(IService1, new Service1());
    // 	service.addSingleton(IService2, new Service2());
    // 	service.addSingleton(IService3, new Service3());
    // 	assert.throws(() => service.createInstance(ParameterTarget2));
    // });
    test('SyncDesc - no dependencies', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(Service1));
        service.invokeFunction((accessor) => {
            const service1 = accessor.get(IService1);
            assert.ok(service1);
            assert.strictEqual(service1.c, 1);
            const service2 = accessor.get(IService1);
            assert.ok(service1 === service2);
        });
    });
    test('SyncDesc - service with service dependency', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(Service1));
        collection.set(IDependentService, new SyncDescriptor(DependentService));
        service.invokeFunction((accessor) => {
            const d = accessor.get(IDependentService);
            assert.ok(d);
            assert.strictEqual(d.name, 'farboo');
        });
    });
    test('SyncDesc - target depends on service future', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(Service1));
        collection.set(IDependentService, new SyncDescriptor(DependentService));
        const d = service.createInstance(DependentServiceTarget);
        assert.ok(d instanceof DependentServiceTarget);
        const d2 = service.createInstance(DependentServiceTarget2);
        assert.ok(d2 instanceof DependentServiceTarget2);
    });
    test('SyncDesc - explode on loop', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(ServiceLoop1));
        collection.set(IService2, new SyncDescriptor(ServiceLoop2));
        assert.throws(() => {
            service.invokeFunction((accessor) => {
                accessor.get(IService1);
            });
        });
        assert.throws(() => {
            service.invokeFunction((accessor) => {
                accessor.get(IService2);
            });
        });
        try {
            service.invokeFunction((accessor) => {
                accessor.get(IService1);
            });
        }
        catch (err) {
            assert.ok(err.name);
            assert.ok(err.message);
        }
    });
    test('Invoke - get services', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        function test(accessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.strictEqual(accessor.get(IService1).c, 1);
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
    });
    test('Invoke - get service, optional', function () {
        const collection = new ServiceCollection([IService1, new Service1()]);
        const service = new InstantiationService(collection);
        function test(accessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.throws(() => accessor.get(IService2));
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
    });
    test('Invoke - keeping accessor NOT allowed', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        let cached;
        function test(accessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.strictEqual(accessor.get(IService1).c, 1);
            cached = accessor;
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
        assert.throws(() => cached.get(IService2));
    });
    test('Invoke - throw error', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        function test(accessor) {
            throw new Error();
        }
        assert.throws(() => service.invokeFunction(test));
    });
    test('Create child', function () {
        let serviceInstanceCount = 0;
        const CtorCounter = class {
            constructor() {
                this.c = 1;
                serviceInstanceCount += 1;
            }
        };
        // creating the service instance BEFORE the child service
        let service = new InstantiationService(new ServiceCollection([IService1, new SyncDescriptor(CtorCounter)]));
        service.createInstance(Service1Consumer);
        // second instance must be earlier ONE
        let child = service.createChild(new ServiceCollection([IService2, new Service2()]));
        child.createInstance(Service1Consumer);
        assert.strictEqual(serviceInstanceCount, 1);
        // creating the service instance AFTER the child service
        serviceInstanceCount = 0;
        service = new InstantiationService(new ServiceCollection([IService1, new SyncDescriptor(CtorCounter)]));
        child = service.createChild(new ServiceCollection([IService2, new Service2()]));
        // second instance must be earlier ONE
        service.createInstance(Service1Consumer);
        child.createInstance(Service1Consumer);
        assert.strictEqual(serviceInstanceCount, 1);
    });
    test('Remote window / integration tests is broken #105562', function () {
        const Service1 = createDecorator('service1');
        let Service1Impl = class Service1Impl {
            constructor(insta) {
                const c = insta.invokeFunction((accessor) => accessor.get(Service2)); // THIS is the recursive call
                assert.ok(c);
            }
        };
        Service1Impl = __decorate([
            __param(0, IInstantiationService)
        ], Service1Impl);
        const Service2 = createDecorator('service2');
        class Service2Impl {
            constructor() { }
        }
        // This service depends on Service1 and Service2 BUT creating Service1 creates Service2 (via recursive invocation)
        // and then Servce2 should not be created a second time
        const Service21 = createDecorator('service21');
        let Service21Impl = class Service21Impl {
            constructor(service2, service1) {
                this.service2 = service2;
                this.service1 = service1;
            }
        };
        Service21Impl = __decorate([
            __param(0, Service2),
            __param(1, Service1)
        ], Service21Impl);
        const insta = new InstantiationService(new ServiceCollection([Service1, new SyncDescriptor(Service1Impl)], [Service2, new SyncDescriptor(Service2Impl)], [Service21, new SyncDescriptor(Service21Impl)]));
        const obj = insta.invokeFunction((accessor) => accessor.get(Service21));
        assert.ok(obj);
    });
    test('Sync/Async dependency loop', async function () {
        const A = createDecorator('A');
        const B = createDecorator('B');
        let BConsumer = class BConsumer {
            constructor(b) {
                this.b = b;
            }
            doIt() {
                return this.b.b();
            }
        };
        BConsumer = __decorate([
            __param(0, B)
        ], BConsumer);
        let AService = class AService {
            constructor(insta) {
                this.prop = insta.createInstance(BConsumer);
            }
            doIt() {
                return this.prop.doIt();
            }
        };
        AService = __decorate([
            __param(0, IInstantiationService)
        ], AService);
        let BService = class BService {
            constructor(a) {
                assert.ok(a);
            }
            b() {
                return true;
            }
        };
        BService = __decorate([
            __param(0, A)
        ], BService);
        // SYNC -> explodes AImpl -> [insta:BConsumer] -> BImpl -> AImpl
        {
            const insta1 = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AService)], [B, new SyncDescriptor(BService)]), true, undefined, true);
            try {
                insta1.invokeFunction((accessor) => accessor.get(A));
                assert.ok(false);
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('RECURSIVELY'));
            }
        }
        // ASYNC -> doesn't explode but cycle is tracked
        {
            const insta2 = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AService, undefined, true)], [B, new SyncDescriptor(BService, undefined)]), true, undefined, true);
            const a = insta2.invokeFunction((accessor) => accessor.get(A));
            a.doIt();
            const cycle = insta2._globalGraph?.findCycleSlow();
            assert.strictEqual(cycle, 'A -> B -> A');
        }
    });
    test('Delayed and events', function () {
        const A = createDecorator('A');
        let created = false;
        class AImpl {
            constructor() {
                this._doIt = 0;
                this._onDidDoIt = new Emitter();
                this.onDidDoIt = this._onDidDoIt.event;
                created = true;
            }
            doIt() {
                this._doIt += 1;
                this._onDidDoIt.fire(this);
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a) {
                this.a = a;
                // eager subscribe -> NO service instance
            }
        };
        Consumer = __decorate([
            __param(0, A)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        let eventCount = 0;
        // subscribing to event doesn't trigger instantiation
        const listener = (e) => {
            assert.ok(e instanceof AImpl);
            eventCount++;
        };
        const d1 = c.a.onDidDoIt(listener);
        const d2 = c.a.onDidDoIt(listener);
        assert.strictEqual(created, false);
        assert.strictEqual(eventCount, 0);
        d2.dispose();
        // instantiation happens on first call
        c.a.doIt();
        assert.strictEqual(created, true);
        assert.strictEqual(eventCount, 1);
        const d3 = c.a.onDidDoIt(listener);
        c.a.doIt();
        assert.strictEqual(eventCount, 3);
        dispose([d1, d3]);
    });
    test('Capture event before init, use after init', function () {
        const A = createDecorator('A');
        let created = false;
        class AImpl {
            constructor() {
                this._doIt = 0;
                this._onDidDoIt = new Emitter();
                this.onDidDoIt = this._onDidDoIt.event;
                created = true;
            }
            doIt() {
                this._doIt += 1;
                this._onDidDoIt.fire(this);
            }
            noop() { }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a) {
                this.a = a;
                // eager subscribe -> NO service instance
            }
        };
        Consumer = __decorate([
            __param(0, A)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        let eventCount = 0;
        // subscribing to event doesn't trigger instantiation
        const listener = (e) => {
            assert.ok(e instanceof AImpl);
            eventCount++;
        };
        const event = c.a.onDidDoIt;
        // const d1 = c.a.onDidDoIt(listener);
        assert.strictEqual(created, false);
        c.a.noop();
        assert.strictEqual(created, true);
        const d1 = event(listener);
        c.a.doIt();
        // instantiation happens on first call
        assert.strictEqual(eventCount, 1);
        dispose(d1);
    });
    test('Dispose early event listener', function () {
        const A = createDecorator('A');
        let created = false;
        class AImpl {
            constructor() {
                this._doIt = 0;
                this._onDidDoIt = new Emitter();
                this.onDidDoIt = this._onDidDoIt.event;
                created = true;
            }
            doIt() {
                this._doIt += 1;
                this._onDidDoIt.fire(this);
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a) {
                this.a = a;
                // eager subscribe -> NO service instance
            }
        };
        Consumer = __decorate([
            __param(0, A)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        let eventCount = 0;
        // subscribing to event doesn't trigger instantiation
        const listener = (e) => {
            assert.ok(e instanceof AImpl);
            eventCount++;
        };
        const d1 = c.a.onDidDoIt(listener);
        assert.strictEqual(created, false);
        assert.strictEqual(eventCount, 0);
        c.a.doIt();
        // instantiation happens on first call
        assert.strictEqual(created, true);
        assert.strictEqual(eventCount, 1);
        dispose(d1);
        c.a.doIt();
        assert.strictEqual(eventCount, 1);
    });
    test('Dispose services it created', function () {
        let disposedA = false;
        let disposedB = false;
        const A = createDecorator('A');
        class AImpl {
            constructor() {
                this.value = 1;
            }
            dispose() {
                disposedA = true;
            }
        }
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
            dispose() {
                disposedB = true;
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)], [B, new BImpl()]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a, b) {
                this.a = a;
                this.b = b;
                assert.strictEqual(a.value, b.value);
            }
        };
        Consumer = __decorate([
            __param(0, A),
            __param(1, B)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        insta.dispose();
        assert.ok(c);
        assert.strictEqual(disposedA, true);
        assert.strictEqual(disposedB, false);
    });
    test('Disposed service cannot be used anymore', function () {
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
        }
        const insta = new InstantiationService(new ServiceCollection([B, new BImpl()]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(b) {
                this.b = b;
                assert.strictEqual(b.value, 1);
            }
        };
        Consumer = __decorate([
            __param(0, B)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        assert.ok(c);
        insta.dispose();
        assert.throws(() => insta.createInstance(Consumer));
        assert.throws(() => insta.invokeFunction((accessor) => { }));
        assert.throws(() => insta.createChild(new ServiceCollection()));
    });
    test('Child does not dispose parent', function () {
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
        }
        const insta1 = new InstantiationService(new ServiceCollection([B, new BImpl()]), true, undefined, true);
        const insta2 = insta1.createChild(new ServiceCollection());
        let Consumer = class Consumer {
            constructor(b) {
                this.b = b;
                assert.strictEqual(b.value, 1);
            }
        };
        Consumer = __decorate([
            __param(0, B)
        ], Consumer);
        assert.ok(insta1.createInstance(Consumer));
        assert.ok(insta2.createInstance(Consumer));
        insta2.dispose();
        assert.ok(insta1.createInstance(Consumer)); // parent NOT disposed by child
        assert.throws(() => insta2.createInstance(Consumer));
    });
    test('Parent does dispose children', function () {
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
        }
        const insta1 = new InstantiationService(new ServiceCollection([B, new BImpl()]), true, undefined, true);
        const insta2 = insta1.createChild(new ServiceCollection());
        let Consumer = class Consumer {
            constructor(b) {
                this.b = b;
                assert.strictEqual(b.value, 1);
            }
        };
        Consumer = __decorate([
            __param(0, B)
        ], Consumer);
        assert.ok(insta1.createInstance(Consumer));
        assert.ok(insta2.createInstance(Consumer));
        insta1.dispose();
        assert.throws(() => insta2.createInstance(Consumer)); // child is disposed by parent
        assert.throws(() => insta1.createInstance(Consumer));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi90ZXN0L2NvbW1vbi9pbnN0YW50aWF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUVyQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBWSxVQUFVLENBQUMsQ0FBQTtBQU94RCxNQUFNLFFBQVE7SUFBZDtRQUVDLE1BQUMsR0FBRyxDQUFDLENBQUE7SUFDTixDQUFDO0NBQUE7QUFFRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQVksVUFBVSxDQUFDLENBQUE7QUFPeEQsTUFBTSxRQUFRO0lBQWQ7UUFFQyxNQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ1QsQ0FBQztDQUFBO0FBRUQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFZLFVBQVUsQ0FBQyxDQUFBO0FBT3hELE1BQU0sUUFBUTtJQUFkO1FBRUMsTUFBQyxHQUFHLFFBQVEsQ0FBQTtJ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