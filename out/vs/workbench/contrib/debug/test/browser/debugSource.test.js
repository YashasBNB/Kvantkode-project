/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Source } from '../../common/debugSource.js';
import { mockUriIdentityService } from './mockDebugModel.js';
suite('Debug - Source', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('from raw source', () => {
        const source = new Source({
            name: 'zz',
            path: '/xx/yy/zz',
            sourceReference: 0,
            presentationHint: 'emphasize',
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        assert.strictEqual(source.presentationHint, 'emphasize');
        assert.strictEqual(source.name, 'zz');
        assert.strictEqual(source.inMemory, false);
        assert.strictEqual(source.reference, 0);
        assert.strictEqual(source.uri.toString(), uri.file('/xx/yy/zz').toString());
    });
    test('from raw internal source', () => {
        const source = new Source({
            name: 'internalModule.js',
            sourceReference: 11,
            presentationHint: 'deemphasize',
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        assert.strictEqual(source.presentationHint, 'deemphasize');
        assert.strictEqual(source.name, 'internalModule.js');
        assert.strictEqual(source.inMemory, true);
        assert.strictEqual(source.reference, 11);
        assert.strictEqual(source.uri.toString(), 'debug:internalModule.js?session%3DaDebugSessionId%26ref%3D11');
    });
    test('get encoded debug data', () => {
        const checkData = (uri, expectedName, expectedPath, expectedSourceReference, expectedSessionId) => {
            const { name, path, sourceReference, sessionId } = Source.getEncodedDebugData(uri);
            assert.strictEqual(name, expectedName);
            assert.strictEqual(path, expectedPath);
            assert.strictEqual(sourceReference, expectedSourceReference);
            assert.strictEqual(sessionId, expectedSessionId);
        };
        checkData(uri.file('a/b/c/d'), 'd', isWindows ? '\\a\\b\\c\\d' : '/a/b/c/d', undefined, undefined);
        checkData(uri.from({ scheme: 'file', path: '/my/path/test.js', query: 'ref=1&session=2' }), 'test.js', isWindows ? '\\my\\path\\test.js' : '/my/path/test.js', undefined, undefined);
        checkData(uri.from({ scheme: 'http', authority: 'www.example.com', path: '/my/path' }), 'path', 'http://www.example.com/my/path', undefined, undefined);
        checkData(uri.from({
            scheme: 'debug',
            authority: 'www.example.com',
            path: '/my/path',
            query: 'ref=100',
        }), 'path', '/my/path', 100, undefined);
        checkData(uri.from({ scheme: 'debug', path: 'a/b/c/d.js', query: 'session=100' }), 'd.js', 'a/b/c/d.js', undefined, '100');
        checkData(uri.from({ scheme: 'debug', path: 'a/b/c/d/foo.txt', query: 'session=100&ref=10' }), 'foo.txt', 'a/b/c/d/foo.txt', 10, '100');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTb3VyY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z1NvdXJjZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTVELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUN4QjtZQUNDLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLFdBQVc7WUFDakIsZUFBZSxFQUFFLENBQUM7WUFDbEIsZ0JBQWdCLEVBQUUsV0FBVztTQUM3QixFQUNELGlCQUFpQixFQUNqQixzQkFBc0IsRUFDdEIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElB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