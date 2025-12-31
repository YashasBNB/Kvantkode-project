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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3QvY29tbW9uL2ZpbGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLGdCQUFnQixFQUErQixRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUUvRixLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQixJQUFJLENBQUMsMkJBQTJCLEVBQUU7UUFDakMsTUFBTSxPQUFPLEdBQUc7WUFDZixFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLElBQUksZ0NBQXdCLEVBQUU7WUFDckYsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsRUFBRSxJQUFJLGdDQUF3QixFQUFFO1lBQzFGLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUU7WUFDN0UsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxJ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