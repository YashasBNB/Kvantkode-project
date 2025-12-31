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
import assert from 'assert';
import * as sinon from 'sinon';
import { memoize, throttle } from '../../common/decorators.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Decorators', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('memoize should memoize methods', () => {
        class Foo {
            constructor(_answer) {
                this._answer = _answer;
                this.count = 0;
            }
            answer() {
                this.count++;
                return this._answer;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo(42);
        assert.strictEqual(foo.count, 0);
        assert.strictEqual(foo.answer(), 42);
        assert.strictEqual(foo.count, 1);
        assert.strictEqual(foo.answer(), 42);
        assert.strictEqual(foo.count, 1);
        const foo2 = new Foo(1337);
        assert.strictEqual(foo2.count, 0);
        assert.strictEqual(foo2.answer(), 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo2.answer(), 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo.answer(), 42);
        assert.strictEqual(foo.count, 1);
        const foo3 = new Foo(null);
        assert.strictEqual(foo3.count, 0);
        assert.strictEqual(foo3.answer(), null);
        assert.strictEqual(foo3.count, 1);
        assert.strictEqual(foo3.answer(), null);
        assert.strictEqual(foo3.count, 1);
        const foo4 = new Foo(undefined);
        assert.strictEqual(foo4.count, 0);
        assert.strictEqual(foo4.answer(), undefined);
        assert.strictEqual(foo4.count, 1);
        assert.strictEqual(foo4.answer(), undefined);
        assert.strictEqual(foo4.count, 1);
    });
    test('memoize should memoize getters', () => {
        class Foo {
            constructor(_answer) {
                this._answer = _answer;
                this.count = 0;
            }
            get answer() {
                this.count++;
                return this._answer;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo(42);
        assert.strictEqual(foo.count, 0);
        assert.strictEqual(foo.answer, 42);
        assert.strictEqual(foo.count, 1);
        assert.strictEqual(foo.answer, 42);
        assert.strictEqual(foo.count, 1);
        const foo2 = new Foo(1337);
        assert.strictEqual(foo2.count, 0);
        assert.strictEqual(foo2.answer, 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo2.answer, 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo.answer, 42);
        assert.strictEqual(foo.count, 1);
        const foo3 = new Foo(null);
        assert.strictEqual(foo3.count, 0);
        assert.strictEqual(foo3.answer, null);
        assert.strictEqual(foo3.count, 1);
        assert.strictEqual(foo3.answer, null);
        assert.strictEqual(foo3.count, 1);
        const foo4 = new Foo(undefined);
        assert.strictEqual(foo4.count, 0);
        assert.strictEqual(foo4.answer, undefined);
        assert.strictEqual(foo4.count, 1);
        assert.strictEqual(foo4.answer, undefined);
        assert.strictEqual(foo4.count, 1);
    });
    test('memoized property should not be enumerable', () => {
        class Foo {
            get answer() {
                return 42;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo();
        assert.strictEqual(foo.answer, 42);
        assert(!Object.keys(foo).some((k) => /\$memoize\$/.test(k)));
    });
    test('memoized property should not be writable', () => {
        class Foo {
            get answer() {
                return 42;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo();
        assert.strictEqual(foo.answer, 42);
        try {
            ;
            foo['$memoize$answer'] = 1337;
            assert(false);
        }
        catch (e) {
            assert.strictEqual(foo.answer, 42);
        }
    });
    test('throttle', () => {
        const spy = sinon.spy();
        const clock = sinon.useFakeTimers();
        try {
            class ThrottleTest {
                constructor(fn) {
                    this._handle = fn;
                }
                report(p) {
                    this._handle(p);
                }
            }
            __decorate([
                throttle(100, (a, b) => a + b, () => 0)
            ], ThrottleTest.prototype, "report", null);
            const t = new ThrottleTest(spy);
            t.report(1);
            t.report(2);
            t.report(3);
            assert.deepStrictEqual(spy.args, [[1]]);
            clock.tick(200);
            assert.deepStrictEqual(spy.args, [[1], [5]]);
            spy.resetHistory();
            t.report(4);
            t.report(5);
            clock.tick(50);
            t.report(6);
            assert.deepStrictEqual(spy.args, [[4]]);
            clock.tick(60);
            assert.deepStrictEqual(spy.args, [[4], [11]]);
        }
        finally {
            clock.restore();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9kZWNvcmF0b3JzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLEdBQUc7WUFHUixZQUFvQixPQUFrQztnQkFBbEMsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7Z0JBRnRELFVBQUssR0FBRyxDQUFDLENBQUE7WUFFZ0QsQ0FBQztZQUcxRCxNQUFNO2dCQUNMLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDWixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7WUFDcEIsQ0FBQztTQUNEO1FBSkE7WUFEQyxPQUFPO3lDQUlQO1FBR0YsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLEdBQUc7WUFHUixZQUFvQixPQUFrQztnQkFBbEMsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7Z0JBRnRELFVBQUssR0FBRyxDQUFDLENBQUE7WUFFZ0QsQ0FBQztZQUcxRCxJQUFJLE1BQU07Z0JBQ1QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtZQUNwQixDQUFDO1NBQ0Q7UUFKQTtZQURDLE9BQU87eUNBSVA7UUFHRixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sR0FBRztZQUVSLElBQUksTUFBTTtnQkFDVCxPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7U0FDRDtRQUhBO1lBREMsT0FBTzt5Q0FHUDtRQUdGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDckQsTUFBTSxHQUFHO1lBRVIsSUFBSSxNQUFNO2dCQUNULE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztTQUNEO1FBSEE7WUFEQyxPQUFPO3lDQUdQO1FBR0YsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEMsSUFBSSxDQUFDO1lBQ0osQ0FBQztZQUFDLEdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLElBQUksQ0FBQTtZQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDZCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDdkIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQztZQUNKLE1BQU0sWUFBWTtnQkFHakIsWUFBWSxFQUFZO29CQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtnQkFDbEIsQ0FBQztnQkFHRCxNQUFNLENBQUMsQ0FBUztvQkFDZixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNoQixDQUFDO2FBQ0Q7WUFIQTtnQkFEQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7c0RBR3ZEO1lBR0YsTUFBTSxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNYLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDWCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdkMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFBO1lBRWxCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDWCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1gsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNkLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFWCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxDQUFDO2dCQUFTLENBQUM7WUFDVixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==