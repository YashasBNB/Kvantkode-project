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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kZWNvcmF0aW9ucy90ZXN0L2Jyb3dzZXIvZGVjb3JhdGlvbnNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sS0FBSyxTQUFTLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxvQkFBb0IsRUFBRTtJQUMzQixJQUFJLE9BQTJCLENBQUE7SUFFL0IsS0FBSyxDQUFDO1FBQ0wsT0FBTyxHQUFHLElBQUksa0JBQWtCLENBQy9CLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUF1QjtZQUF6Qzs7Z0JBQ0ssV0FBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUE7WUFDbkMsQ0FBQztTQUFBLENBQUMsRUFBRSxFQUNKLElBQUksZ0JBQWdCLEVBQUUsQ0FDdEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDO1FBQ1Is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