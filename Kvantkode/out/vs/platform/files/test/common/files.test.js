/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isEqual, isEqualOrParent } from '../../../../base/common/extpath.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../base/test/common/utils.js';
import { FileChangesEvent, isParent } from '../../common/files.js';
suite('Files', () => {
    test('FileChangesEvent - basics', function () {
        const changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */ },
            { resource: toResource.call(this, '/bar/deleted.txt'), type: 2 /* FileChangeType.DELETED */ },
            { resource: toResource.call(this, '/bar/folder'), type: 2 /* FileChangeType.DELETED */ },
            { resource: toResource.call(this, '/BAR/FOLDER'), type: 2 /* FileChangeType.DELETED */ },
        ];
        for (const ignorePathCasing of [false, true]) {
            const event = new FileChangesEvent(changes, ignorePathCasing);
            assert(!event.contains(toResource.call(this, '/foo'), 0 /* FileChangeType.UPDATED */));
            assert(event.affects(toResource.call(this, '/foo'), 0 /* FileChangeType.UPDATED */));
            assert(event.contains(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */));
            assert(event.affects(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */));
            assert(event.contains(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */));
            assert(event.affects(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */));
            assert(event.contains(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */, 2 /* FileChangeType.DELETED */));
            assert(!event.contains(toResource.call(this, '/foo/updated.txt'), 1 /* FileChangeType.ADDED */, 2 /* FileChangeType.DELETED */));
            assert(!event.contains(toResource.call(this, '/foo/updated.txt'), 1 /* FileChangeType.ADDED */));
            assert(!event.contains(toResource.call(this, '/foo/updated.txt'), 2 /* FileChangeType.DELETED */));
            assert(!event.affects(toResource.call(this, '/foo/updated.txt'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/bar/folder'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/BAR/FOLDER'), 2 /* FileChangeType.DELETED */));
            assert(event.affects(toResource.call(this, '/BAR'), 2 /* FileChangeType.DELETED */));
            if (ignorePathCasing) {
                assert(event.contains(toResource.call(this, '/BAR/folder'), 2 /* FileChangeType.DELETED */));
                assert(event.affects(toResource.call(this, '/bar'), 2 /* FileChangeType.DELETED */));
            }
            else {
                assert(!event.contains(toResource.call(this, '/BAR/folder'), 2 /* FileChangeType.DELETED */));
                assert(event.affects(toResource.call(this, '/bar'), 2 /* FileChangeType.DELETED */));
            }
            assert(event.contains(toResource.call(this, '/bar/folder/somefile'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/bar/folder/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/BAR/FOLDER/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            if (ignorePathCasing) {
                assert(event.contains(toResource.call(this, '/BAR/folder/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            }
            else {
                assert(!event.contains(toResource.call(this, '/BAR/folder/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            }
            assert(!event.contains(toResource.call(this, '/bar/folder2/somefile'), 2 /* FileChangeType.DELETED */));
            assert.strictEqual(1, event.rawAdded.length);
            assert.strictEqual(2, event.rawUpdated.length);
            assert.strictEqual(3, event.rawDeleted.length);
            assert.strictEqual(true, event.gotAdded());
            assert.strictEqual(true, event.gotUpdated());
            assert.strictEqual(true, event.gotDeleted());
        }
    });
    test('FileChangesEvent - supports multiple changes on file tree', function () {
        for (const type of [1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */, 2 /* FileChangeType.DELETED */]) {
            const changes = [
                { resource: toResource.call(this, '/foo/bar/updated.txt'), type },
                { resource: toResource.call(this, '/foo/bar/otherupdated.txt'), type },
                { resource: toResource.call(this, '/foo/bar'), type },
                { resource: toResource.call(this, '/foo'), type },
                { resource: toResource.call(this, '/bar'), type },
                { resource: toResource.call(this, '/bar/foo'), type },
                { resource: toResource.call(this, '/bar/foo/updated.txt'), type },
                { resource: toResource.call(this, '/bar/foo/otherupdated.txt'), type },
            ];
            for (const ignorePathCasing of [false, true]) {
                const event = new FileChangesEvent(changes, ignorePathCasing);
                for (const change of changes) {
                    assert(event.contains(change.resource, type));
                    assert(event.affects(change.resource, type));
                }
                assert(event.affects(toResource.call(this, '/foo'), type));
                assert(event.affects(toResource.call(this, '/bar'), type));
                assert(event.affects(toResource.call(this, '/'), type));
                assert(!event.affects(toResource.call(this, '/foobar'), type));
                assert(!event.contains(toResource.call(this, '/some/foo/bar'), type));
                assert(!event.affects(toResource.call(this, '/some/foo/bar'), type));
                assert(!event.contains(toResource.call(this, '/some/bar'), type));
                assert(!event.affects(toResource.call(this, '/some/bar'), type));
                switch (type) {
                    case 1 /* FileChangeType.ADDED */:
                        assert.strictEqual(8, event.rawAdded.length);
                        break;
                    case 2 /* FileChangeType.DELETED */:
                        assert.strictEqual(8, event.rawDeleted.length);
                        break;
                }
            }
        }
    });
    test('FileChangesEvent - correlation', function () {
        let changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */ },
        ];
        let event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), false);
        assert.strictEqual(event.correlates(100), false);
        changes = [
            {
                resource: toResource.call(this, '/foo/updated.txt'),
                type: 0 /* FileChangeType.UPDATED */,
                cId: 100,
            },
            {
                resource: toResource.call(this, '/foo/otherupdated.txt'),
                type: 0 /* FileChangeType.UPDATED */,
                cId: 100,
            },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ];
        event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), true);
        assert.strictEqual(event.correlates(100), true);
        assert.strictEqual(event.correlates(120), false);
        changes = [
            {
                resource: toResource.call(this, '/foo/updated.txt'),
                type: 0 /* FileChangeType.UPDATED */,
                cId: 100,
            },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ];
        event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), false);
        assert.strictEqual(event.correlates(100), false);
        assert.strictEqual(event.correlates(120), false);
        changes = [
            {
                resource: toResource.call(this, '/foo/updated.txt'),
                type: 0 /* FileChangeType.UPDATED */,
                cId: 100,
            },
            {
                resource: toResource.call(this, '/foo/otherupdated.txt'),
                type: 0 /* FileChangeType.UPDATED */,
                cId: 120,
            },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ];
        event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), false);
        assert.strictEqual(event.correlates(100), false);
        assert.strictEqual(event.correlates(120), false);
    });
    function testIsEqual(testMethod) {
        // corner cases
        assert(testMethod('', '', true));
        assert(!testMethod(null, '', true));
        assert(!testMethod(undefined, '', true));
        // basics (string)
        assert(testMethod('/', '/', true));
        assert(testMethod('/some', '/some', true));
        assert(testMethod('/some/path', '/some/path', true));
        assert(testMethod('c:\\', 'c:\\', true));
        assert(testMethod('c:\\some', 'c:\\some', true));
        assert(testMethod('c:\\some\\path', 'c:\\some\\path', true));
        assert(testMethod('/someöäü/path', '/someöäü/path', true));
        assert(testMethod('c:\\someöäü\\path', 'c:\\someöäü\\path', true));
        assert(!testMethod('/some/path', '/some/other/path', true));
        assert(!testMethod('c:\\some\\path', 'c:\\some\\other\\path', true));
        assert(!testMethod('c:\\some\\path', 'd:\\some\\path', true));
        assert(testMethod('/some/path', '/some/PATH', true));
        assert(testMethod('/someöäü/path', '/someÖÄÜ/PATH', true));
        assert(testMethod('c:\\some\\path', 'c:\\some\\PATH', true));
        assert(testMethod('c:\\someöäü\\path', 'c:\\someÖÄÜ\\PATH', true));
        assert(testMethod('c:\\some\\path', 'C:\\some\\PATH', true));
    }
    test('isEqual (ignoreCase)', function () {
        testIsEqual(isEqual);
        // basics (uris)
        assert(isEqual(URI.file('/some/path').fsPath, URI.file('/some/path').fsPath, true));
        assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\path').fsPath, true));
        assert(isEqual(URI.file('/someöäü/path').fsPath, URI.file('/someöäü/path').fsPath, true));
        assert(isEqual(URI.file('c:\\someöäü\\path').fsPath, URI.file('c:\\someöäü\\path').fsPath, true));
        assert(!isEqual(URI.file('/some/path').fsPath, URI.file('/some/other/path').fsPath, true));
        assert(!isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\other\\path').fsPath, true));
        assert(isEqual(URI.file('/some/path').fsPath, URI.file('/some/PATH').fsPath, true));
        assert(isEqual(URI.file('/someöäü/path').fsPath, URI.file('/someÖÄÜ/PATH').fsPath, true));
        assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\PATH').fsPath, true));
        assert(isEqual(URI.file('c:\\someöäü\\path').fsPath, URI.file('c:\\someÖÄÜ\\PATH').fsPath, true));
        assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('C:\\some\\PATH').fsPath, true));
    });
    test('isParent (ignorecase)', function () {
        if (isWindows) {
            assert(isParent('c:\\some\\path', 'c:\\', true));
            assert(isParent('c:\\some\\path', 'c:\\some', true));
            assert(isParent('c:\\some\\path', 'c:\\some\\', true));
            assert(isParent('c:\\someöäü\\path', 'c:\\someöäü', true));
            assert(isParent('c:\\someöäü\\path', 'c:\\someöäü\\', true));
            assert(isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar', true));
            assert(isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\', true));
            assert(isParent('c:\\some\\path', 'C:\\', true));
            assert(isParent('c:\\some\\path', 'c:\\SOME', true));
            assert(isParent('c:\\some\\path', 'c:\\SOME\\', true));
            assert(!isParent('c:\\some\\path', 'd:\\', true));
            assert(!isParent('c:\\some\\path', 'c:\\some\\path', true));
            assert(!isParent('c:\\some\\path', 'd:\\some\\path', true));
            assert(!isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\barr', true));
            assert(!isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test', true));
        }
        if (isMacintosh || isLinux) {
            assert(isParent('/some/path', '/', true));
            assert(isParent('/some/path', '/some', true));
            assert(isParent('/some/path', '/some/', true));
            assert(isParent('/someöäü/path', '/someöäü', true));
            assert(isParent('/someöäü/path', '/someöäü/', true));
            assert(isParent('/foo/bar/test.ts', '/foo/bar', true));
            assert(isParent('/foo/bar/test.ts', '/foo/bar/', true));
            assert(isParent('/some/path', '/SOME', true));
            assert(isParent('/some/path', '/SOME/', true));
            assert(isParent('/someöäü/path', '/SOMEÖÄÜ', true));
            assert(isParent('/someöäü/path', '/SOMEÖÄÜ/', true));
            assert(!isParent('/some/path', '/some/path', true));
            assert(!isParent('/foo/bar/test.ts', '/foo/barr', true));
            assert(!isParent('/foo/bar/test.ts', '/foo/bar/test', true));
        }
    });
    test('isEqualOrParent (ignorecase)', function () {
        // same assertions apply as with isEqual()
        testIsEqual(isEqualOrParent); //
        if (isWindows) {
            assert(isEqualOrParent('c:\\some\\path', 'c:\\', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\some', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\some\\', true));
            assert(isEqualOrParent('c:\\someöäü\\path', 'c:\\someöäü', true));
            assert(isEqualOrParent('c:\\someöäü\\path', 'c:\\someöäü\\', true));
            assert(isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar', true));
            assert(isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\some\\path', true));
            assert(isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test.ts', true));
            assert(isEqualOrParent('c:\\some\\path', 'C:\\', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\SOME', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\SOME\\', true));
            assert(!isEqualOrParent('c:\\some\\path', 'd:\\', true));
            assert(!isEqualOrParent('c:\\some\\path', 'd:\\some\\path', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\barr', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test.', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\BAR\\test.', true));
        }
        if (isMacintosh || isLinux) {
            assert(isEqualOrParent('/some/path', '/', true));
            assert(isEqualOrParent('/some/path', '/some', true));
            assert(isEqualOrParent('/some/path', '/some/', true));
            assert(isEqualOrParent('/someöäü/path', '/someöäü', true));
            assert(isEqualOrParent('/someöäü/path', '/someöäü/', true));
            assert(isEqualOrParent('/foo/bar/test.ts', '/foo/bar', true));
            assert(isEqualOrParent('/foo/bar/test.ts', '/foo/bar/', true));
            assert(isEqualOrParent('/some/path', '/some/path', true));
            assert(isEqualOrParent('/some/path', '/SOME', true));
            assert(isEqualOrParent('/some/path', '/SOME/', true));
            assert(isEqualOrParent('/someöäü/path', '/SOMEÖÄÜ', true));
            assert(isEqualOrParent('/someöäü/path', '/SOMEÖÄÜ/', true));
            assert(!isEqualOrParent('/foo/bar/test.ts', '/foo/barr', true));
            assert(!isEqualOrParent('/foo/bar/test.ts', '/foo/bar/test', true));
            assert(!isEqualOrParent('foo/bar/test.ts', 'foo/bar/test.', true));
            assert(!isEqualOrParent('foo/bar/test.ts', 'foo/BAR/test.', true));
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9jb21tb24vZmlsZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxVQUFVLEdBQ1YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQStCLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRS9GLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO0lBQ25CLElBQUksQ0FBQywyQkFBMkIsRUFBRTtRQUNqQyxNQUFNLE9BQU8sR0FBRztZQUNmLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxnQ0FBd0IsRUFBRTtZQUNyRixFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLElBQUksZ0NBQXdCLEVBQUU7WUFDMUYsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLEVBQUUsSUFBSSw4QkFBc0IsRUFBRTtZQUM3RSxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxF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QyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFcEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVsRSxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFN0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxDQUFD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