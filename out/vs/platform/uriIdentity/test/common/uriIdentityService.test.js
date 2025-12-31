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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSWRlbnRpdHlTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cmlJZGVudGl0eS90ZXN0L2NvbW1vbi91cmlJZGVudGl0eVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLGNBQWMsRUFBRTtJQUNyQixNQUFNLGVBQWdCLFNBQVEsSUFBSSxFQUFnQjtRQUlqRCxZQUFxQixJQUFpRDtZQUNyRSxLQUFLLEVBQUUsQ0FBQTtZQURhLFNBQUksR0FBSixJQUFJLENBQTZDO1lBSDdELDhDQUF5QyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFDdEQsK0NBQTBDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUloRSxDQUFDO1FBQ1EsV0FBVyxDQUFDLEdBQVE7WUFDNUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNRLGFBQWEsQ0FBQyxHQUFRLEVBQUUsSUFBb0M7WUFDcEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDNUIsQ0FBQztLQUNEO0lBRUQsSUFBSSxRQUE0QixDQUFBO0lBRWhDLEtBQUssQ0FBQztRQUNMLFFBQVEsR0FBRyxJQUFJLGtCQUFrQixDQUNoQyxJQUFJLGVBQWUsQ0FDbEIsSUFBSSxHQUFHLENBQUM7WUFDUCxDQUFDLEtBQUssOERBQW1EO1lBQ3pELENBQUMsS0FBSyw4Q0FBc0M7U0FDNUMsQ0FBQyxDQUNGLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDO1FBQ1IsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ25CLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGVBQWUsQ0FBQyxLQUFVLEVBQUUsUUFBYSxFQUFFLFVBQThCLFFBQVE7UUFDekYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxJQUFJLENBQUMsa0JBQWtCLEVBQUU7UUFDeEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDckMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXhELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQy9CLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUNyQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUV0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLGVBQWUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEIsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQixlQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsaUJBQWlCO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFO1FBQ3RDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUNyQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUVyQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQzFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsd0NBQXdDO0lBQ3ZILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRTtRQUN4RCxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdkMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUV6QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=