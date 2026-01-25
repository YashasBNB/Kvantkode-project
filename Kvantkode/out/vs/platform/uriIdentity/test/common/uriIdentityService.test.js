/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { UriIdentityService } from '../../common/uriIdentityService.js';
import { mock } from '../../../../base/test/common/mock.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('URI Identity', function () {
    class FakeFileService extends mock() {
        constructor(data) {
            super();
            this.data = data;
            this.onDidChangeFileSystemProviderCapabilities = Event.None;
            this.onDidChangeFileSystemProviderRegistrations = Event.None;
        }
        hasProvider(uri) {
            return this.data.has(uri.scheme);
        }
        hasCapability(uri, flag) {
            const mask = this.data.get(uri.scheme) ?? 0;
            return Boolean(mask & flag);
        }
    }
    let _service;
    setup(function () {
        _service = new UriIdentityService(new FakeFileService(new Map([
            ['bar', 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */],
            ['foo', 0 /* FileSystemProviderCapabilities.None */],
        ])));
    });
    teardown(function () {
        _service.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertCanonical(input, expected, service = _service) {
        const actual = service.asCanonicalUri(input);
        assert.strictEqual(actual.toString(), expected.toString());
        assert.ok(service.extUri.isEqual(actual, expected));
    }
    test('extUri (isEqual)', function () {
        const a = URI.parse('foo://bar/bang');
        const a1 = URI.parse('foo://bar/BANG');
        const b = URI.parse('bar://bar/bang');
        const b1 = URI.parse('bar://bar/BANG');
        assert.strictEqual(_service.extUri.isEqual(a, a1), true);
        assert.strictEqual(_service.extUri.isEqual(a1, a), true);
        assert.strictEqual(_service.extUri.isEqual(b, b1), false);
        assert.strictEqual(_service.extUri.isEqual(b1, b), false);
    });
    test('asCanonicalUri (casing)', function () {
        const a = URI.parse('foo://bar/bang');
        const a1 = URI.parse('foo://bar/BANG');
        const b = URI.parse('bar://bar/bang');
        const b1 = URI.parse('bar://bar/BANG');
        assertCanonical(a, a);
        assertCanonical(a1, a);
        assertCanonical(b, b);
        assertCanonical(b1, b1); // case sensitive
    });
    test('asCanonicalUri (normalization)', function () {
        const a = URI.parse('foo://bar/bang');
        assertCanonical(a, a);
        assertCanonical(URI.parse('foo://bar/./bang'), a);
        assertCanonical(URI.parse('foo://bar/./bang'), a);
        assertCanonical(URI.parse('foo://bar/./foo/../bang'), a);
    });
    test('asCanonicalUri (keep fragement)', function () {
        const a = URI.parse('foo://bar/bang');
        assertCanonical(a, a);
        assertCanonical(URI.parse('foo://bar/./bang#frag'), a.with({ fragment: 'frag' }));
        assertCanonical(URI.parse('foo://bar/./bang#frag'), a.with({ fragment: 'frag' }));
        assertCanonical(URI.parse('foo://bar/./bang#frag'), a.with({ fragment: 'frag' }));
        assertCanonical(URI.parse('foo://bar/./foo/../bang#frag'), a.with({ fragment: 'frag' }));
        const b = URI.parse('foo://bar/bazz#frag');
        assertCanonical(b, b);
        assertCanonical(URI.parse('foo://bar/bazz'), b.with({ fragment: '' }));
        assertCanonical(URI.parse('foo://bar/BAZZ#DDD'), b.with({ fragment: 'DDD' })); // lower-case path, but fragment is kept
    });
    test.skip('[perf] CPU pegged after some builds #194853', function () {
        const n = 100 + 2 ** 16;
        for (let i = 0; i < n; i++) {
            const uri = URI.parse(`foo://bar/${i}`);
            const uri2 = _service.asCanonicalUri(uri);
            assert.ok(uri2);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSWRlbnRpdHlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VyaUlkZW50aXR5L3Rlc3QvY29tbW9uL3VyaUlkZW50aXR5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsY0FBYyxFQUFFO0lBQ3JCLE1BQU0sZUFBZ0IsU0FBUSxJQUFJLEVBQWdCO1FBSWpELFlBQXFCLElBQWlEO1lBQ3JFLEtBQUssRUFBRSxDQUFBO1lBRGEsU0FBSSxHQUFKLElBQUksQ0FBNkM7WUFIN0QsOENBQXlDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUN0RCwrQ0FBMEMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBSWhFLENBQUM7UUFDUSxXQUFXLENBQUMsR0FBUTtZQUM1QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQ1EsYUFBYSxDQUFDLEdBQVEsRUFBRSxJQUFvQztZQUNwRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxD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