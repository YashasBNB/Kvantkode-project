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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2luc3RhbnRpYXRpb24vdGVzdC9jb21tb24vaW5zdGFudGlhdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FFckIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQVksVUFBVSxDQUFDLENBQUE7QUFPeEQsTUFBTSxRQUFRO0lBQWQ7UUFFQyxNQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ04sQ0FBQztDQUFBO0FBRUQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFZLFVBQVUsQ0FBQyxDQUFBO0FBT3hELE1BQU0sUUFBUTtJQUFkO1FBRUMsTUFBQyxHQUFHLElBQUksQ0FBQTtJQUNULENBQUM7Q0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBWSxVQUFVLENBQUMsQ0FBQTtBQU94RCxNQUFNLFFBQVE7SUFBZDtRQUVDLE1BQUMsR0FBRyxRQUFRLENBQUE7SUFDYixD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