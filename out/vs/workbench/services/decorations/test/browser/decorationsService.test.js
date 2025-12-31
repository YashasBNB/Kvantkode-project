/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DecorationsService } from '../../browser/decorationsService.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import * as resources from '../../../../../base/common/resources.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('DecorationsService', function () {
    let service;
    setup(function () {
        service = new DecorationsService(new (class extends mock() {
            constructor() {
                super(...arguments);
                this.extUri = resources.extUri;
            }
        })(), new TestThemeService());
    });
    teardown(function () {
        service.dispose();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Async provider, async/evented result', function () {
        return runWithFakedTimers({}, async function () {
            const uri = URI.parse('foo:bar');
            let callCounter = 0;
            const reg = service.registerDecorationsProvider(new (class {
                constructor() {
                    this.label = 'Test';
                    this.onDidChange = Event.None;
                }
                provideDecorations(uri) {
                    callCounter += 1;
                    return new Promise((resolve) => {
                        setTimeout(() => resolve({
                            color: 'someBlue',
                            tooltip: 'T',
                            strikethrough: true,
                        }));
                    });
                }
            })());
            // trigger -> async
            assert.strictEqual(service.getDecoration(uri, false), undefined);
            assert.strictEqual(callCounter, 1);
            // event when result is computed
            const e = await Event.toPromise(service.onDidChangeDecorations);
            assert.strictEqual(e.affectsResource(uri), true);
            // sync result
            assert.deepStrictEqual(service.getDecoration(uri, false).tooltip, 'T');
            assert.deepStrictEqual(service.getDecoration(uri, false).strikethrough, true);
            assert.strictEqual(callCounter, 1);
            reg.dispose();
        });
    });
    test('Sync provider, sync result', function () {
        const uri = URI.parse('foo:bar');
        let callCounter = 0;
        const reg = service.registerDecorationsProvider(new (class {
            constructor() {
                this.label = 'Test';
                this.onDidChange = Event.None;
            }
            provideDecorations(uri) {
                callCounter += 1;
                return { color: 'someBlue', tooltip: 'Z' };
            }
        })());
        // trigger -> sync
        assert.deepStrictEqual(service.getDecoration(uri, false).tooltip, 'Z');
        assert.deepStrictEqual(service.getDecoration(uri, false).strikethrough, false);
        assert.strictEqual(callCounter, 1);
        reg.dispose();
    });
    test('Clear decorations on provider dispose', async function () {
        return runWithFakedTimers({}, async function () {
            const uri = URI.parse('foo:bar');
            let callCounter = 0;
            const reg = service.registerDecorationsProvider(new (class {
                constructor() {
                    this.label = 'Test';
                    this.onDidChange = Event.None;
                }
                provideDecorations(uri) {
                    callCounter += 1;
                    return { color: 'someBlue', tooltip: 'J' };
                }
            })());
            // trigger -> sync
            assert.deepStrictEqual(service.getDecoration(uri, false).tooltip, 'J');
            assert.strictEqual(callCounter, 1);
            // un-register -> ensure good event
            let didSeeEvent = false;
            const p = new Promise((resolve) => {
                const l = service.onDidChangeDecorations((e) => {
                    assert.strictEqual(e.affectsResource(uri), true);
                    assert.deepStrictEqual(service.getDecoration(uri, false), undefined);
                    assert.strictEqual(callCounter, 1);
                    didSeeEvent = true;
                    l.dispose();
                    resolve();
                });
            });
            reg.dispose(); // will clear all data
            await p;
            assert.strictEqual(didSeeEvent, true);
        });
    });
    test('No default bubbling', function () {
        let reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: Event.None,
            provideDecorations(uri) {
                return uri.path.match(/\.txt/) ? { tooltip: '.txt', weight: 17 } : undefined;
            },
        });
        const childUri = URI.parse('file:///some/path/some/file.txt');
        let deco = service.getDecoration(childUri, false);
        assert.strictEqual(deco.tooltip, '.txt');
        deco = service.getDecoration(childUri.with({ path: 'some/path/' }), true);
        assert.strictEqual(deco, undefined);
        reg.dispose();
        // bubble
        reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: Event.None,
            provideDecorations(uri) {
                return uri.path.match(/\.txt/)
                    ? { tooltip: '.txt.bubble', weight: 71, bubble: true }
                    : undefined;
            },
        });
        deco = service.getDecoration(childUri, false);
        assert.strictEqual(deco.tooltip, '.txt.bubble');
        deco = service.getDecoration(childUri.with({ path: 'some/path/' }), true);
        assert.strictEqual(typeof deco.tooltip, 'string');
        reg.dispose();
    });
    test('Decorations not showing up for second root folder #48502', async function () {
        let cancelCount = 0;
        let callCount = 0;
        const provider = new (class {
            constructor() {
                this._onDidChange = new Emitter();
                this.onDidChange = this._onDidChange.event;
                this.label = 'foo';
            }
            provideDecorations(uri, token) {
                store.add(token.onCancellationRequested(() => {
                    cancelCount += 1;
                }));
                return new Promise((resolve) => {
                    callCount += 1;
                    setTimeout(() => {
                        resolve({ letter: 'foo' });
                    }, 10);
                });
            }
        })();
        const reg = service.registerDecorationsProvider(provider);
        const uri = URI.parse('foo://bar');
        const d1 = service.getDecoration(uri, false);
        provider._onDidChange.fire([uri]);
        const d2 = service.getDecoration(uri, false);
        assert.strictEqual(cancelCount, 1);
        assert.strictEqual(callCount, 2);
        d1?.dispose();
        d2?.dispose();
        reg.dispose();
    });
    test('Decorations not bubbling... #48745', function () {
        const reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: Event.None,
            provideDecorations(uri) {
                if (uri.path.match(/hello$/)) {
                    return { tooltip: 'FOO', weight: 17, bubble: true };
                }
                else {
                    return new Promise((_resolve) => { });
                }
            },
        });
        const data1 = service.getDecoration(URI.parse('a:b/'), true);
        assert.ok(!data1);
        const data2 = service.getDecoration(URI.parse('a:b/c.hello'), false);
        assert.ok(data2.tooltip);
        const data3 = service.getDecoration(URI.parse('a:b/'), true);
        assert.ok(data3);
        reg.dispose();
    });
    test("Folder decorations don't go away when file with problems is deleted #61919 (part1)", function () {
        const emitter = new Emitter();
        let gone = false;
        const reg = service.registerDecorationsProvider({
            label: 'Test',
            onDidChange: emitter.event,
            provideDecorations(uri) {
                if (!gone && uri.path.match(/file.ts$/)) {
                    return { tooltip: 'FOO', weight: 17, bubble: true };
                }
                return undefined;
            },
        });
        const uri = URI.parse('foo:/folder/file.ts');
        const uri2 = URI.parse('foo:/folder/');
        let data = service.getDecoration(uri, true);
        assert.strictEqual(data.tooltip, 'FOO');
        data = service.getDecoration(uri2, true);
        assert.ok(data.tooltip); // emphazied items...
        gone = true;
        emitter.fire([uri]);
        data = service.getDecoration(uri, true);
        assert.strictEqual(data, undefined);
        data = service.getDecoration(uri2, true);
        assert.strictEqual(data, undefined);
        reg.dispose();
    });
    test("Folder decorations don't go away when file with problems is deleted #61919 (part2)", function () {
        return runWithFakedTimers({}, async function () {
            const emitter = new Emitter();
            let gone = false;
            const reg = service.registerDecorationsProvider({
                label: 'Test',
                onDidChange: emitter.event,
                provideDecorations(uri) {
                    if (!gone && uri.path.match(/file.ts$/)) {
                        return { tooltip: 'FOO', weight: 17, bubble: true };
                    }
                    return undefined;
                },
            });
            const uri = URI.parse('foo:/folder/file.ts');
            const uri2 = URI.parse('foo:/folder/');
            let data = service.getDecoration(uri, true);
            assert.strictEqual(data.tooltip, 'FOO');
            data = service.getDecoration(uri2, true);
            assert.ok(data.tooltip); // emphazied items...
            return new Promise((resolve, reject) => {
                const l = service.onDidChangeDecorations((e) => {
                    l.dispose();
                    try {
                        assert.ok(e.affectsResource(uri));
                        assert.ok(e.affectsResource(uri2));
                        resolve();
                        reg.dispose();
                    }
                    catch (err) {
                        reject(err);
                        reg.dispose();
                    }
                });
                gone = true;
                emitter.fire([uri]);
            });
        });
    });
    test('FileDecorationProvider intermittently fails #133210', async function () {
        const invokeOrder = [];
        store.add(service.registerDecorationsProvider(new (class {
            constructor() {
                this.label = 'Provider-1';
                this.onDidChange = Event.None;
            }
            provideDecorations() {
                invokeOrder.push(this.label);
                return undefined;
            }
        })()));
        store.add(service.registerDecorationsProvider(new (class {
            constructor() {
                this.label = 'Provider-2';
                this.onDidChange = Event.None;
            }
            provideDecorations() {
                invokeOrder.push(this.label);
                return undefined;
            }
        })()));
        service.getDecoration(URI.parse('test://me/path'), false);
        assert.deepStrictEqual(invokeOrder, ['Provider-2', 'Provider-1']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGVjb3JhdGlvbnMvdGVzdC9icm93c2VyL2RlY29yYXRpb25zU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEtBQUssU0FBUyxNQUFNLHlDQUF5QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsb0JBQW9CLEVBQUU7SUFDM0IsSUFBSSxPQUEyQixDQUFBO0lBRS9CLEtBQUssQ0FBQztRQUNMLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixDQUMvQixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBdUI7WUFBekM7O2dCQUNLLFdBQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFBO1lBQ25DLENBQUM7U0FBQSxDQUFDLEVBQUUsRUFDSixJQUFJLGdCQUFnQixFQUFFLENBQ3RCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQztRQUNSLE9BQU8s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