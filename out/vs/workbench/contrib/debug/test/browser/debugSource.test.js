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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTb3VyY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnU291cmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFNUQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQ3hCO1lBQ0MsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsV0FBVztZQUNqQixlQUFlLEVBQUUsQ0FBQztZQUNsQixnQkFBZ0IsRUFBRSxXQUFXO1NBQzdCLEVBQ0QsaUJBQWlCLEVBQ2pCLHNCQUFzQixFQUN0QixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENB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