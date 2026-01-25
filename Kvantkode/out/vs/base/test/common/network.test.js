/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess, Schemas } from '../../common/network.js';
import { isWeb } from '../../common/platform.js';
import { isEqual } from '../../common/resources.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('network', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    (isWeb ? test.skip : test)('FileAccess: URI (native)', () => {
        // asCodeUri() & asFileUri(): simple, without authority
        let originalFileUri = URI.file('network.test.ts');
        let browserUri = FileAccess.uriToBrowserUri(originalFileUri);
        assert.ok(browserUri.authority.length > 0);
        let fileUri = FileAccess.uriToFileUri(browserUri);
        assert.strictEqual(fileUri.authority.length, 0);
        assert(isEqual(originalFileUri, fileUri));
        // asCodeUri() & asFileUri(): with authority
        originalFileUri = URI.file('network.test.ts').with({ authority: 'test-authority' });
        browserUri = FileAccess.uriToBrowserUri(originalFileUri);
        assert.strictEqual(browserUri.authority, originalFileUri.authority);
        fileUri = FileAccess.uriToFileUri(browserUri);
        assert(isEqual(originalFileUri, fileUri));
    });
    (isWeb ? test.skip : test)('FileAccess: moduleId (native)', () => {
        const browserUri = FileAccess.asBrowserUri('vs/base/test/node/network.test');
        assert.strictEqual(browserUri.scheme, Schemas.vscodeFileResource);
        const fileUri = FileAccess.asFileUri('vs/base/test/node/network.test');
        assert.strictEqual(fileUri.scheme, Schemas.file);
    });
    (isWeb ? test.skip : test)('FileAccess: query and fragment is dropped (native)', () => {
        const originalFileUri = URI.file('network.test.ts').with({
            query: 'foo=bar',
            fragment: 'something',
        });
        const browserUri = FileAccess.uriToBrowserUri(originalFileUri);
        assert.strictEqual(browserUri.query, '');
        assert.strictEqual(browserUri.fragment, '');
    });
    (isWeb ? test.skip : test)('FileAccess: query and fragment is kept if URI is already of same scheme (native)', () => {
        const originalFileUri = URI.file('network.test.ts').with({
            query: 'foo=bar',
            fragment: 'something',
        });
        const browserUri = FileAccess.uriToBrowserUri(originalFileUri.with({ scheme: Schemas.vscodeFileResource }));
        assert.strictEqual(browserUri.query, 'foo=bar');
        assert.strictEqual(browserUri.fragment, 'something');
        const fileUri = FileAccess.uriToFileUri(originalFileUri);
        assert.strictEqual(fileUri.query, 'foo=bar');
        assert.strictEqual(fileUri.fragment, 'something');
    });
    (isWeb ? test.skip : test)('FileAccess: web', () => {
        const originalHttpsUri = URI.file('network.test.ts').with({ scheme: 'https' });
        const browserUri = FileAccess.uriToBrowserUri(originalHttpsUri);
        assert.strictEqual(originalHttpsUri.toString(), browserUri.toString());
    });
    test('FileAccess: remote URIs', () => {
        const originalRemoteUri = URI.file('network.test.ts').with({ scheme: Schemas.vscodeRemote });
        const browserUri = FileAccess.uriToBrowserUri(originalRemoteUri);
        assert.notStrictEqual(originalRemoteUri.scheme, browserUri.scheme);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL25ldHdvcmsudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsdUNBQXVDLEVBQUUsQ0FFeEM7SUFBQSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQzVELHVEQUF1RDtRQUN2RCxJQUFJLGVBQWUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDakQsSUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzFDLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxD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