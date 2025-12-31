/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { FileChangesEvent, } from '../../common/files.js';
import { coalesceEvents, reviveFileChanges, parseWatcherPatterns, isFiltered, } from '../../common/watcher.js';
class TestFileWatcher extends Disposable {
    constructor() {
        super();
        this._onDidFilesChange = this._register(new Emitter());
    }
    get onDidFilesChange() {
        return this._onDidFilesChange.event;
    }
    report(changes) {
        this.onRawFileEvents(changes);
    }
    onRawFileEvents(events) {
        // Coalesce
        const coalescedEvents = coalesceEvents(events);
        // Emit through event emitter
        if (coalescedEvents.length > 0) {
            this._onDidFilesChange.fire({
                raw: reviveFileChanges(coalescedEvents),
                event: this.toFileChangesEvent(coalescedEvents),
            });
        }
    }
    toFileChangesEvent(changes) {
        return new FileChangesEvent(reviveFileChanges(changes), !isLinux);
    }
}
var Path;
(function (Path) {
    Path[Path["UNIX"] = 0] = "UNIX";
    Path[Path["WINDOWS"] = 1] = "WINDOWS";
    Path[Path["UNC"] = 2] = "UNC";
})(Path || (Path = {}));
suite('Watcher', () => {
    ;
    (isWindows ? test.skip : test)('parseWatcherPatterns - posix', () => {
        const path = '/users/data/src';
        let parsedPattern = parseWatcherPatterns(path, ['*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['/users/data/src/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['/users/data/src/bar/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), false);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), true);
        parsedPattern = parseWatcherPatterns(path, ['**/*.js'])[0];
        assert.strictEqual(parsedPattern('/users/data/src/foo.js'), true);
        assert.strictEqual(parsedPattern('/users/data/src/foo.ts'), false);
        assert.strictEqual(parsedPattern('/users/data/src/bar/foo.js'), true);
    });
    (!isWindows ? test.skip : test)('parseWatcherPatterns - windows', () => {
        const path = 'c:\\users\\data\\src';
        let parsedPattern = parseWatcherPatterns(path, ['*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar/foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['c:\\users\\data\\src\\*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), false);
        parsedPattern = parseWatcherPatterns(path, ['c:\\users\\data\\src\\bar/*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), true);
        parsedPattern = parseWatcherPatterns(path, ['**/*.js'])[0];
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.js'), true);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\foo.ts'), false);
        assert.strictEqual(parsedPattern('c:\\users\\data\\src\\bar\\foo.js'), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('Watcher Events Normalizer', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('simple add/update/delete', (done) => {
        const watch = disposables.add(new TestFileWatcher());
        const added = URI.file('/users/data/src/added.txt');
        const updated = URI.file('/users/data/src/updated.txt');
        const deleted = URI.file('/users/data/src/deleted.txt');
        const raw = [
            { resource: added, type: 1 /* FileChangeType.ADDED */ },
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 3);
            assert.ok(event.contains(added, 1 /* FileChangeType.ADDED */));
            assert.ok(event.contains(updated, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(deleted, 2 /* FileChangeType.DELETED */));
            done();
        }));
        watch.report(raw);
    });
    (isWindows ? [Path.WINDOWS, Path.UNC] : [Path.UNIX]).forEach((path) => {
        test(`delete only reported for top level folder (${path})`, (done) => {
            const watch = disposables.add(new TestFileWatcher());
            const deletedFolderA = URI.file(path === Path.UNIX
                ? '/users/data/src/todelete1'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\todelete1'
                    : '\\\\localhost\\users\\data\\src\\todelete1');
            const deletedFolderB = URI.file(path === Path.UNIX
                ? '/users/data/src/todelete2'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\todelete2'
                    : '\\\\localhost\\users\\data\\src\\todelete2');
            const deletedFolderBF1 = URI.file(path === Path.UNIX
                ? '/users/data/src/todelete2/file.txt'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\todelete2\\file.txt'
                    : '\\\\localhost\\users\\data\\src\\todelete2\\file.txt');
            const deletedFolderBF2 = URI.file(path === Path.UNIX
                ? '/users/data/src/todelete2/more/test.txt'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\todelete2\\more\\test.txt'
                    : '\\\\localhost\\users\\data\\src\\todelete2\\more\\test.txt');
            const deletedFolderBF3 = URI.file(path === Path.UNIX
                ? '/users/data/src/todelete2/super/bar/foo.txt'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\todelete2\\super\\bar\\foo.txt'
                    : '\\\\localhost\\users\\data\\src\\todelete2\\super\\bar\\foo.txt');
            const deletedFileA = URI.file(path === Path.UNIX
                ? '/users/data/src/deleteme.txt'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\deleteme.txt'
                    : '\\\\localhost\\users\\data\\src\\deleteme.txt');
            const addedFile = URI.file(path === Path.UNIX
                ? '/users/data/src/added.txt'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\added.txt'
                    : '\\\\localhost\\users\\data\\src\\added.txt');
            const updatedFile = URI.file(path === Path.UNIX
                ? '/users/data/src/updated.txt'
                : path === Path.WINDOWS
                    ? 'C:\\users\\data\\src\\updated.txt'
                    : '\\\\localhost\\users\\data\\src\\updated.txt');
            const raw = [
                { resource: deletedFolderA, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderB, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF1, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF2, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFolderBF3, type: 2 /* FileChangeType.DELETED */ },
                { resource: deletedFileA, type: 2 /* FileChangeType.DELETED */ },
                { resource: addedFile, type: 1 /* FileChangeType.ADDED */ },
                { resource: updatedFile, type: 0 /* FileChangeType.UPDATED */ },
            ];
            disposables.add(watch.onDidFilesChange(({ event, raw }) => {
                assert.ok(event);
                assert.strictEqual(raw.length, 5);
                assert.ok(event.contains(deletedFolderA, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(deletedFolderB, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(deletedFileA, 2 /* FileChangeType.DELETED */));
                assert.ok(event.contains(addedFile, 1 /* FileChangeType.ADDED */));
                assert.ok(event.contains(updatedFile, 0 /* FileChangeType.UPDATED */));
                done();
            }));
            watch.report(raw);
        });
    });
    test('event coalescer: ignore CREATE followed by DELETE', (done) => {
        const watch = disposables.add(new TestFileWatcher());
        const created = URI.file('/users/data/src/related');
        const deleted = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 1);
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: flatten DELETE followed by CREATE into CHANGE', (done) => {
        const watch = disposables.add(new TestFileWatcher());
        const deleted = URI.file('/users/data/src/related');
        const created = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: deleted, type: 2 /* FileChangeType.DELETED */ },
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(deleted, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: ignore UPDATE when CREATE received', (done) => {
        const watch = disposables.add(new TestFileWatcher());
        const created = URI.file('/users/data/src/related');
        const updated = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: created, type: 1 /* FileChangeType.ADDED */ },
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(created, 1 /* FileChangeType.ADDED */));
            assert.ok(!event.contains(created, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: apply DELETE', (done) => {
        const watch = disposables.add(new TestFileWatcher());
        const updated = URI.file('/users/data/src/related');
        const updated2 = URI.file('/users/data/src/related');
        const deleted = URI.file('/users/data/src/related');
        const unrelated = URI.file('/users/data/src/unrelated');
        const raw = [
            { resource: updated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: updated2, type: 0 /* FileChangeType.UPDATED */ },
            { resource: unrelated, type: 0 /* FileChangeType.UPDATED */ },
            { resource: updated, type: 2 /* FileChangeType.DELETED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            assert.ok(event.contains(deleted, 2 /* FileChangeType.DELETED */));
            assert.ok(!event.contains(updated, 0 /* FileChangeType.UPDATED */));
            assert.ok(event.contains(unrelated, 0 /* FileChangeType.UPDATED */));
            done();
        }));
        watch.report(raw);
    });
    test('event coalescer: track case renames', (done) => {
        const watch = disposables.add(new TestFileWatcher());
        const oldPath = URI.file('/users/data/src/added');
        const newPath = URI.file('/users/data/src/ADDED');
        const raw = [
            { resource: newPath, type: 1 /* FileChangeType.ADDED */ },
            { resource: oldPath, type: 2 /* FileChangeType.DELETED */ },
        ];
        disposables.add(watch.onDidFilesChange(({ event, raw }) => {
            assert.ok(event);
            assert.strictEqual(raw.length, 2);
            for (const r of raw) {
                if (isEqual(r.resource, oldPath)) {
                    assert.strictEqual(r.type, 2 /* FileChangeType.DELETED */);
                }
                else if (isEqual(r.resource, newPath)) {
                    assert.strictEqual(r.type, 1 /* FileChangeType.ADDED */);
                }
                else {
                    assert.fail();
                }
            }
            done();
        }));
        watch.report(raw);
    });
    test('event type filter', () => {
        const resource = URI.file('/users/data/src/related');
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, undefined), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 2 /* FileChangeFilter.UPDATED */), true);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */), true);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 1 /* FileChangeType.ADDED */ }, 4 /* FileChangeFilter.ADDED */ | 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 2 /* FileChangeFilter.UPDATED */), true);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 2 /* FileChangeFilter.UPDATED */ | 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 8 /* FileChangeFilter.DELETED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 2 /* FileChangeType.DELETED */ }, 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 8 /* FileChangeFilter.DELETED */ | 4 /* FileChangeFilter.ADDED */), true);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
        assert.strictEqual(isFiltered({ resource, type: 0 /* FileChangeType.UPDATED */ }, 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */ | 2 /* FileChangeFilter.UPDATED */), false);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9jb21tb24vd2F0Y2hlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUVOLGdCQUFnQixHQUdoQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFDTixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixVQUFVLEdBQ1YsTUFBTSx5QkFBeUIsQ0FBQTtBQUVoQyxNQUFNLGVBQWdCLFNBQVEsVUFBVTtJQUd2QztRQUNDLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RDLElBQUksT0FBTyxFQUFtRCxDQUM5RCxDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtJQUNwQyxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQXNCO1FBQzVCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENB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