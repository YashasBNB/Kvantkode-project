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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RGlhZ25vc3RpY3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RixPQUFPLEVBQ04sVUFBVSxFQUNWLGtCQUFrQixFQUNsQixLQUFLLEVBQ0wsNEJBQTRCLEVBQzVCLFFBQVEsR0FDUixNQUFNLDhCQUE4QixDQUFBO0FBRXJDLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sZ0JBQWlCLFNBQVEsSUFBSSxFQUE4QjtRQUN2RCxXQUFXLENBQUMsS0FBYSxFQUFFLE9BQXlDO1lBQzVFLEVBQUU7UUFDSCxDQUFDO1FBQ1EsTUFBTSxDQUFDLEtBQWE7WUFDNUIsRUFBRTtRQUNILENBQUM7S0FDRDtJQUVELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQTBCO1FBQTVDOztZQUNoQixXQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ2xDLENBQUM7S0FBQSxDQUFDLEVBQUUsQ0FBQTtJQUVKLE1BQU0sZUFBZSxHQUFHLENBQUMsR0FBUSxFQUFzQixFQUFFO1FBQ3hELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUMsQ0FBQTtJQUVELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxvQkFBb0IsQ0FDMUMsTUFBTSxFQUNOLE1BQU0sRUFDTixHQUFHLEVBQ0gsR0FBRyxFQUNILGVBQWUsRUFDZixNQUFNLEVBQ04sSUFBSSxnQkFBZ0IsRUFBRSxFQUN0QixJQUFJLE9BQU8sRUFBRSxDQUNiLENBQUE7UUFFRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBLENBQUMsWUFBWTtRQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBVSxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRTtRQUNsRCxJQUFJLFVBQVUsR0FBRyxJQUFJLG9CQUFvQixDQUN4QyxNQUFNLEVBQ04sTUFBTSxFQUNOLEdBQUcsRUFDSCxHQUFHLEVBQ0gsZUFBZSxFQUNmLE1BQU0sRUFDTixJQUFJLGdCQUFnQixFQUFFLEVBQ3RCLElBQUksT0FBTyxFQUFFLENBQ2IsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQ3BDLE1BQU0sRUFDTixNQUFNLEVBQ04sR0FBRyxFQUNILEdBQUcsRUFDSCxlQUFlLEVBQ2YsTUFBTSxFQUNOLElBQUksZ0JBQWdCLEVBQUUsRUFDdEIsSUFBSSxPQUFPLEVBQUUsQ0FDYixDQUFBO1FBQ0QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhCLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNwQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUM7WUFDbEQsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1NBQ2xELENBQUMsQ0FBQTtRQUNGLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4QixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ0wsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2xCLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV4QixVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDckMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1lBQ2xELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDckMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDO1lBQ2xELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFeEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqRCxVQUFV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LENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQy9FLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUMzRCxDQUFDLENBQUE7UUFFRixJQUFJLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRS9DLFFBQVE7UUFDUixVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFL0IsdUJBQXVCO1FBQ3ZCLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDZCxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxD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QUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0IsQ0FBQyxDQUFDLENBQUE7UUFDRixVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLENBQUE7UUFFUCxDQUFDLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNkLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNwQyxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsQ0FBQTtRQUVQLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9B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