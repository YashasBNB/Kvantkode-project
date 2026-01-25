/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { DiagnosticCollection, ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import { Diagnostic, DiagnosticSeverity, Range, DiagnosticRelatedInformation, Location, } from '../../common/extHostTypes.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { mock } from '../../../../base/test/common/mock.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { ExtUri, extUri } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostDiagnostics', () => {
    class DiagnosticsShape extends mock() {
        $changeMany(owner, entries) {
            //
        }
        $clear(owner) {
            //
        }
    }
    const fileSystemInfoService = new (class extends mock() {
        constructor() {
            super(...arguments);
            this.extUri = extUri;
        }
    })();
    const versionProvider = (uri) => {
        return undefined;
    };
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('disposeCheck', () => {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        collection.dispose();
        collection.dispose(); // that's OK
        assert.throws(() => collection.name);
        assert.throws(() => collection.clear());
        assert.throws(() => collection.delete(URI.parse('aa:bb')));
        assert.throws(() => collection.forEach(() => { }));
        assert.throws(() => collection.get(URI.parse('aa:bb')));
        assert.throws(() => collection.has(URI.parse('aa:bb')));
        assert.throws(() => collection.set(URI.parse('aa:bb'), []));
        assert.throws(() => collection.set(URI.parse('aa:bb'), undefined));
    });
    test('diagnostic collection, forEach, clear, has', function () {
        let collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        assert.strictEqual(collection.name, 'test');
        collection.dispose();
        assert.throws(() => collection.name);
        let c = 0;
        collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        collection.forEach(() => c++);
        assert.strictEqual(c, 0);
        collection.set(URI.parse('foo:bar'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2'),
        ]);
        collection.forEach(() => c++);
        assert.strictEqual(c, 1);
        c = 0;
        collection.clear();
        collection.forEach(() => c++);
        assert.strictEqual(c, 0);
        collection.set(URI.parse('foo:bar1'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2'),
        ]);
        collection.set(URI.parse('foo:bar2'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2'),
        ]);
        collection.forEach(() => c++);
        assert.strictEqual(c, 2);
        assert.ok(collection.has(URI.parse('foo:bar1')));
        assert.ok(collection.has(URI.parse('foo:bar2')));
        assert.ok(!collection.has(URI.parse('foo:bar3')));
        collection.delete(URI.parse('foo:bar1'));
        assert.ok(!collection.has(URI.parse('foo:bar1')));
        collection.dispose();
    });
    test('diagnostic collection, immutable read', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        collection.set(URI.parse('foo:bar'), [
            new Diagnostic(new Range(0, 0, 1, 1), 'message-1'),
            new Diagnostic(new Range(0, 0, 1, 1), 'message-2'),
        ]);
        let array = collection.get(URI.parse('foo:bar'));
        assert.throws(() => (array.length = 0));
        assert.throws(() => array.pop());
        assert.throws(() => (array[0] = new Diagnostic(new Range(0, 0, 0, 0), 'evil')));
        collection.forEach((uri, array) => {
            assert.throws(() => (array.length = 0));
            assert.throws(() => array.pop());
            assert.throws(() => (array[0] = new Diagnostic(new Range(0, 0, 0, 0), 'evil')));
        });
        array = collection.get(URI.parse('foo:bar'));
        assert.strictEqual(array.length, 2);
        collection.dispose();
    });
    test('diagnostics collection, set with dupliclated tuples', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        const uri = URI.parse('sc:hightower');
        collection.set([
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-1')]],
            [URI.parse('some:thing'), [new Diagnostic(new Range(0, 0, 1, 1), 'something')]],
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-2')]],
        ]);
        let array = collection.get(uri);
        assert.strictEqual(array.length, 2);
        let [first, second] = array;
        assert.strictEqual(first.message, 'message-1');
        assert.strictEqual(second.message, 'message-2');
        // clear
        collection.delete(uri);
        assert.ok(!collection.has(uri));
        // bad tuple clears 1/2
        collection.set([
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-1')]],
            [URI.parse('some:thing'), [new Diagnostic(new Range(0, 0, 1, 1), 'something')]],
            [uri, undefined],
        ]);
        assert.ok(!collection.has(uri));
        // clear
        collection.delete(uri);
        assert.ok(!collection.has(uri));
        // bad tuple clears 2/2
        collection.set([
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-1')]],
            [URI.parse('some:thing'), [new Diagnostic(new Range(0, 0, 1, 1), 'something')]],
            [uri, undefined],
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-2')]],
            [uri, [new Diagnostic(new Range(0, 0, 0, 1), 'message-3')]],
        ]);
        array = collection.get(uri);
        assert.strictEqual(array.length, 2);
        [first, second] = array;
        assert.strictEqual(first.message, 'message-2');
        assert.strictEqual(second.message, 'message-3');
        collection.dispose();
    });
    test('diagnostics collection, set tuple overrides, #11547', function () {
        let lastEntries;
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new (class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                lastEntries = entries;
                return super.$changeMany(owner, entries);
            }
        })(), new Emitter());
        const uri = URI.parse('sc:hightower');
        collection.set([[uri, [new Diagnostic(new Range(0, 0, 1, 1), 'error')]]]);
        assert.strictEqual(collection.get(uri).length, 1);
        assert.strictEqual(collection.get(uri)[0].message, 'error');
        assert.strictEqual(lastEntries.length, 1);
        const [[, data1]] = lastEntries;
        assert.strictEqual(data1.length, 1);
        assert.strictEqual(data1[0].message, 'error');
        lastEntries = undefined;
        collection.set([[uri, [new Diagnostic(new Range(0, 0, 1, 1), 'warning')]]]);
        assert.strictEqual(collection.get(uri).length, 1);
        assert.strictEqual(collection.get(uri)[0].message, 'warning');
        assert.strictEqual(lastEntries.length, 1);
        const [[, data2]] = lastEntries;
        assert.strictEqual(data2.length, 1);
        assert.strictEqual(data2[0].message, 'warning');
        lastEntries = undefined;
    });
    test('do send message when not making a change', function () {
        let changeCount = 0;
        let eventCount = 0;
        const emitter = new Emitter();
        store.add(emitter.event((_) => (eventCount += 1)));
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new (class extends DiagnosticsShape {
            $changeMany() {
                changeCount += 1;
            }
        })(), emitter);
        const uri = URI.parse('sc:hightower');
        const diag = new Diagnostic(new Range(0, 0, 0, 1), 'ffff');
        collection.set(uri, [diag]);
        assert.strictEqual(changeCount, 1);
        assert.strictEqual(eventCount, 1);
        collection.set(uri, [diag]);
        assert.strictEqual(changeCount, 2);
        assert.strictEqual(eventCount, 2);
    });
    test('diagnostics collection, tuples and undefined (small array), #15585', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        const uri = URI.parse('sc:hightower');
        const uri2 = URI.parse('sc:nomad');
        const diag = new Diagnostic(new Range(0, 0, 0, 1), 'ffff');
        collection.set([
            [uri, [diag, diag, diag]],
            [uri, undefined],
            [uri, [diag]],
            [uri2, [diag, diag]],
            [uri2, undefined],
            [uri2, [diag]],
        ]);
        assert.strictEqual(collection.get(uri).length, 1);
        assert.strictEqual(collection.get(uri2).length, 1);
    });
    test('diagnostics collection, tuples and undefined (large array), #15585', function () {
        const collection = new DiagnosticCollection('test', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), new Emitter());
        const tuples = [];
        for (let i = 0; i < 500; i++) {
            const uri = URI.parse('sc:hightower#' + i);
            const diag = new Diagnostic(new Range(0, 0, 0, 1), i.toString());
            tuples.push([uri, [diag, diag, diag]]);
            tuples.push([uri, undefined]);
            tuples.push([uri, [diag]]);
        }
        collection.set(tuples);
        for (let i = 0; i < 500; i++) {
            const uri = URI.parse('sc:hightower#' + i);
            assert.strictEqual(collection.has(uri), true);
            assert.strictEqual(collection.get(uri).length, 1);
        }
    });
    test('diagnostic capping (max per file)', function () {
        let lastEntries;
        const collection = new DiagnosticCollection('test', 'test', 100, 250, versionProvider, extUri, new (class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                lastEntries = entries;
                return super.$changeMany(owner, entries);
            }
        })(), new Emitter());
        const uri = URI.parse('aa:bb');
        const diagnostics = [];
        for (let i = 0; i < 500; i++) {
            diagnostics.push(new Diagnostic(new Range(i, 0, i + 1, 0), `error#${i}`, i < 300 ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error));
        }
        collection.set(uri, diagnostics);
        assert.strictEqual(collection.get(uri).length, 500);
        assert.strictEqual(lastEntries.length, 1);
        assert.strictEqual(lastEntries[0][1].length, 251);
        assert.strictEqual(lastEntries[0][1][0].severity, MarkerSeverity.Error);
        assert.strictEqual(lastEntries[0][1][200].severity, MarkerSeverity.Warning);
        assert.strictEqual(lastEntries[0][1][250].severity, MarkerSeverity.Info);
    });
    test('diagnostic capping (max files)', function () {
        let lastEntries;
        const collection = new DiagnosticCollection('test', 'test', 2, 1, versionProvider, extUri, new (class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                lastEntries = entries;
                return super.$changeMany(owner, entries);
            }
        })(), new Emitter());
        const diag = new Diagnostic(new Range(0, 0, 1, 1), 'Hello');
        collection.set([
            [URI.parse('aa:bb1'), [diag]],
            [URI.parse('aa:bb2'), [diag]],
            [URI.parse('aa:bb3'), [diag]],
            [URI.parse('aa:bb4'), [diag]],
        ]);
        assert.strictEqual(lastEntries.length, 3); // goes above the limit and then stops
    });
    test('diagnostic eventing', async function () {
        const emitter = new Emitter();
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), emitter);
        const diag1 = new Diagnostic(new Range(1, 1, 2, 3), 'diag1');
        const diag2 = new Diagnostic(new Range(1, 1, 2, 3), 'diag2');
        const diag3 = new Diagnostic(new Range(1, 1, 2, 3), 'diag3');
        let p = Event.toPromise(emitter.event).then((a) => {
            assert.strictEqual(a.length, 1);
            assert.strictEqual(a[0].toString(), 'aa:bb');
            assert.ok(URI.isUri(a[0]));
        });
        collection.set(URI.parse('aa:bb'), []);
        await p;
        p = Event.toPromise(emitter.event).then((e) => {
            assert.strictEqual(e.length, 2);
            assert.ok(URI.isUri(e[0]));
            assert.ok(URI.isUri(e[1]));
            assert.strictEqual(e[0].toString(), 'aa:bb');
            assert.strictEqual(e[1].toString(), 'aa:cc');
        });
        collection.set([
            [URI.parse('aa:bb'), [diag1]],
            [URI.parse('aa:cc'), [diag2, diag3]],
        ]);
        await p;
        p = Event.toPromise(emitter.event).then((e) => {
            assert.strictEqual(e.length, 2);
            assert.ok(URI.isUri(e[0]));
            assert.ok(URI.isUri(e[1]));
        });
        collection.clear();
        await p;
    });
    test('vscode.languages.onDidChangeDiagnostics Does Not Provide Document URI #49582', async function () {
        const emitter = new Emitter();
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new DiagnosticsShape(), emitter);
        const diag1 = new Diagnostic(new Range(1, 1, 2, 3), 'diag1');
        // delete
        collection.set(URI.parse('aa:bb'), [diag1]);
        let p = Event.toPromise(emitter.event).then((e) => {
            assert.strictEqual(e[0].toString(), 'aa:bb');
        });
        collection.delete(URI.parse('aa:bb'));
        await p;
        // set->undefined (as delete)
        collection.set(URI.parse('aa:bb'), [diag1]);
        p = Event.toPromise(emitter.event).then((e) => {
            assert.strictEqual(e[0].toString(), 'aa:bb');
        });
        collection.set(URI.parse('aa:bb'), undefined);
        await p;
    });
    test('diagnostics with related information', function (done) {
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new (class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                const [[, data]] = entries;
                assert.strictEqual(entries.length, 1);
                assert.strictEqual(data.length, 1);
                const [diag] = data;
                assert.strictEqual(diag.relatedInformation.length, 2);
                assert.strictEqual(diag.relatedInformation[0].message, 'more1');
                assert.strictEqual(diag.relatedInformation[1].message, 'more2');
                done();
            }
        })(), new Emitter());
        const diag = new Diagnostic(new Range(0, 0, 1, 1), 'Foo');
        diag.relatedInformation = [
            new DiagnosticRelatedInformation(new Location(URI.parse('cc:dd'), new Range(0, 0, 0, 0)), 'more1'),
            new DiagnosticRelatedInformation(new Location(URI.parse('cc:ee'), new Range(0, 0, 0, 0)), 'more2'),
        ];
        collection.set(URI.parse('aa:bb'), [diag]);
    });
    test('vscode.languages.getDiagnostics appears to return old diagnostics in some circumstances #54359', function () {
        const ownerHistory = [];
        const diags = new ExtHostDiagnostics(new (class {
            getProxy(id) {
                return new (class DiagnosticsShape {
                    $clear(owner) {
                        ownerHistory.push(owner);
                    }
                })();
            }
            set() {
                return null;
            }
            dispose() { }
            assertRegistered() { }
            drain() {
                return undefined;
            }
        })(), new NullLogService(), fileSystemInfoService, new (class extends mock() {
            getDocument() {
                return undefined;
            }
        })());
        const collection1 = diags.createDiagnosticCollection(nullExtensionDescription.identifier, 'foo');
        const collection2 = diags.createDiagnosticCollection(nullExtensionDescription.identifier, 'foo'); // warns, uses a different owner
        collection1.clear();
        collection2.clear();
        assert.strictEqual(ownerHistory.length, 2);
        assert.strictEqual(ownerHistory[0], 'foo');
        assert.strictEqual(ownerHistory[1], 'foo0');
    });
    test('Error updating diagnostics from extension #60394', function () {
        let callCount = 0;
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, versionProvider, extUri, new (class extends DiagnosticsShape {
            $changeMany(owner, entries) {
                callCount += 1;
            }
        })(), new Emitter());
        const array = [];
        const diag1 = new Diagnostic(new Range(0, 0, 1, 1), 'Foo');
        const diag2 = new Diagnostic(new Range(0, 0, 1, 1), 'Bar');
        array.push(diag1, diag2);
        collection.set(URI.parse('test:me'), array);
        assert.strictEqual(callCount, 1);
        collection.set(URI.parse('test:me'), array);
        assert.strictEqual(callCount, 2); // equal array
        array.push(diag2);
        collection.set(URI.parse('test:me'), array);
        assert.strictEqual(callCount, 3); // same but un-equal array
    });
    test('Version id is set whenever possible', function () {
        const all = [];
        const collection = new DiagnosticCollection('ddd', 'test', 100, 100, (uri) => {
            return 7;
        }, extUri, new (class extends DiagnosticsShape {
            $changeMany(_owner, entries) {
                all.push(...entries);
            }
        })(), new Emitter());
        const array = [];
        const diag1 = new Diagnostic(new Range(0, 0, 1, 1), 'Foo');
        const diag2 = new Diagnostic(new Range(0, 0, 1, 1), 'Bar');
        array.push(diag1, diag2);
        collection.set(URI.parse('test:one'), array);
        collection.set(URI.parse('test:two'), [diag1]);
        collection.set(URI.parse('test:three'), [diag2]);
        const allVersions = all.map((tuple) => tuple[1].map((t) => t.modelVersionId)).flat();
        assert.deepStrictEqual(allVersions, [7, 7, 7, 7]);
    });
    test("Diagnostics created by tasks aren't accessible to extensions #47292", async function () {
        return runWithFakedTimers({}, async function () {
            const diags = new ExtHostDiagnostics(new (class {
                getProxy(id) {
                    return {};
                }
                set() {
                    return null;
                }
                dispose() { }
                assertRegistered() { }
                drain() {
                    return undefined;
                }
            })(), new NullLogService(), fileSystemInfoService, new (class extends mock() {
                getDocument() {
                    return undefined;
                }
            })());
            //
            const uri = URI.parse('foo:bar');
            const data = [
                {
                    message: 'message',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                    severity: MarkerSeverity.Info,
                },
            ];
            const p1 = Event.toPromise(diags.onDidChangeDiagnostics);
            diags.$acceptMarkersChange([[uri, data]]);
            await p1;
            assert.strictEqual(diags.getDiagnostics(uri).length, 1);
            const p2 = Event.toPromise(diags.onDidChangeDiagnostics);
            diags.$acceptMarkersChange([[uri, []]]);
            await p2;
            assert.strictEqual(diags.getDiagnostics(uri).length, 0);
        });
    });
    test("languages.getDiagnostics doesn't handle case insensitivity correctly #128198", function () {
        const diags = new ExtHostDiagnostics(new (class {
            getProxy(id) {
                return new DiagnosticsShape();
            }
            set() {
                return null;
            }
            dispose() { }
            assertRegistered() { }
            drain() {
                return undefined;
            }
        })(), new NullLogService(), new (class extends mock() {
            constructor() {
                super(...arguments);
                this.extUri = new ExtUri((uri) => uri.scheme === 'insensitive');
            }
        })(), new (class extends mock() {
            getDocument() {
                return undefined;
            }
        })());
        const col = diags.createDiagnosticCollection(nullExtensionDescription.identifier);
        const uriSensitive = URI.from({ scheme: 'foo', path: '/SOME/path' });
        const uriSensitiveCaseB = uriSensitive.with({ path: uriSensitive.path.toUpperCase() });
        const uriInSensitive = URI.from({ scheme: 'insensitive', path: '/SOME/path' });
        const uriInSensitiveUpper = uriInSensitive.with({ path: uriInSensitive.path.toUpperCase() });
        col.set(uriSensitive, [new Diagnostic(new Range(0, 0, 0, 0), 'sensitive')]);
        col.set(uriInSensitive, [new Diagnostic(new Range(0, 0, 0, 0), 'insensitive')]);
        // collection itself honours casing
        assert.strictEqual(col.get(uriSensitive)?.length, 1);
        assert.strictEqual(col.get(uriSensitiveCaseB)?.length, 0);
        assert.strictEqual(col.get(uriInSensitive)?.length, 1);
        assert.strictEqual(col.get(uriInSensitiveUpper)?.length, 1);
        // languages.getDiagnostics honours casing
        assert.strictEqual(diags.getDiagnostics(uriSensitive)?.length, 1);
        assert.strictEqual(diags.getDiagnostics(uriSensitiveCaseB)?.length, 0);
        assert.strictEqual(diags.getDiagnostics(uriInSensitive)?.length, 1);
        assert.strictEqual(diags.getDiagnostics(uriInSensitiveUpper)?.length, 1);
        const fromForEach = [];
        col.forEach((uri) => fromForEach.push(uri));
        assert.strictEqual(fromForEach.length, 2);
        assert.strictEqual(fromForEach[0].toString(), uriSensitive.toString());
        assert.strictEqual(fromForEach[1].toString(), uriInSensitive.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REaWFnbm9zdGljcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdGLE9BQU8sRUFDTixVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLEtBQUssRUFDTCw0QkFBNEIsRUFDNUIsUUFBUSxHQUNSLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXhGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsTUFBTSxnQkFBaUIsU0FBUSxJQUFJLEVBQThCO1FBQ3ZELFdBQVcsQ0FB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SUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1NBQ2xELENBQUMsQ0FBQTtRQUNGLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNyQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUM7WUFDbEQsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1NBQ2xELENBQUMsQ0FBQTtRQUNGLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4QixNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWpE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QUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQy9FLENBQUMsR0FBRyxFQUFFLFNBQVUsQ0FBQztTQUNqQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRS9CLFFBQVE7UUFDUixVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFL0IsdUJBQXVCO1FBQ3ZCLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDZCxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMvRSxDQUFDLEdBQUcsRUFBRSxTQUFVLENBQUM7WUFDakIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUMzRCxDQUFDLENBQUE7UUFFRixLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQ2xDO1FBQUEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFL0MsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFO1FBQzNELElBQUksV0FBOEMsQ0FBQTtRQUNsRCxNQUFNLFVBQVUsR0FBRyxJQUFJLG9CQUFvQixDQUMxQyxNQUFNLEVBQ04sTUFBTSxFQUNOLEdBQUcsRUFDSCxHQUFHLEVBQ0gsZUFBZSxFQUNmLE1BQU0sRUFDTixJQUFJLENBQUMsS0FBTSxTQUFRLGdCQUFnQjtZQUN6QixXQUFXLENBQUMsS0FBYSxFQUFFLE9BQXlDO2dCQUM1RSxXQUFXLEdBQUcsT0FBTyxDQUFBO2dCQUNyQixPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3pDLENBQUM7U0FDRCxDQUFDLEVBQUUsRUFDSixJQUFJLE9BQU8sRUFBRSxDQUNiLENBQUE7UUFDRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRXJDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0MsV0FBVyxHQUFHLFNBQVUsQ0FBQTtRQUV4QixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FB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QUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzQixDQUFDLENBQUMsQ0FBQTtRQUNGLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsQ0FBQTtRQUVQLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0MsQ0FBQyxDQUFDLENBQUE7UUFDRixVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ2QsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3BDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxDQUFBO1FBRVAsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENB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