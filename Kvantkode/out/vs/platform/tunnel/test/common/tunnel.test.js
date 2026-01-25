/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { extractLocalHostUriMetaDataForPortMapping, extractQueryLocalHostUriMetaDataForPortMapping, } from '../../common/tunnel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('Tunnel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function portMappingDoTest(uri, func, expectedAddress, expectedPort) {
        const res = func(URI.parse(uri));
        assert.strictEqual(!expectedAddress, !res);
        assert.strictEqual(res?.address, expectedAddress);
        assert.strictEqual(res?.port, expectedPort);
    }
    function portMappingTest(uri, expectedAddress, expectedPort) {
        portMappingDoTest(uri, extractLocalHostUriMetaDataForPortMapping, expectedAddress, expectedPort);
    }
    function portMappingTestQuery(uri, expectedAddress, expectedPort) {
        portMappingDoTest(uri, extractQueryLocalHostUriMetaDataForPortMapping, expectedAddress, expectedPort);
    }
    test('portMapping', () => {
        portMappingTest('file:///foo.bar/baz');
        portMappingTest('http://foo.bar:1234');
        portMappingTest('http://localhost:8080', 'localhost', 8080);
        portMappingTest('https://localhost:443', 'localhost', 443);
        portMappingTest('http://127.0.0.1:3456', '127.0.0.1', 3456);
        portMappingTest('http://0.0.0.0:7654', '0.0.0.0', 7654);
        portMappingTest('http://localhost:8080/path?foo=bar', 'localhost', 8080);
        portMappingTest('http://localhost:8080/path?foo=http%3A%2F%2Flocalhost%3A8081', 'localhost', 8080);
        portMappingTestQuery('http://foo.bar/path?url=http%3A%2F%2Flocalhost%3A8081', 'localhost', 8081);
        portMappingTestQuery('http://foo.bar/path?url=http%3A%2F%2Flocalhost%3A8081&url2=http%3A%2F%2Flocalhost%3A8082', 'localhost', 8081);
        portMappingTestQuery('http://foo.bar/path?url=http%3A%2F%2Fmicrosoft.com%2Fbad&url2=http%3A%2F%2Flocalhost%3A8081', 'localhost', 8081);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3R1bm5lbC90ZXN0L2NvbW1vbi90dW5uZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTix5Q0FBeUMsRUFDekMsOENBQThDLEdBQzlDLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGlCQUFpQixDQUN6QixHQUFXLEVBQ1gsSUFBaUUsRUFDakUsZUFBd0IsRUFDeEIsWUFBcUI7UUFFckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsR0FBVyxFQUFFLGVBQXdCLEVBQUUsWUFBcUI7UUFDcEYsaUJBQWlCLENBQUMsR0FBRyxFQUFFLHlDQUF5QyxFQUFFLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxHQUFXLEVBQUUsZUFBd0IsRUFBRSxZQUFxQjtRQUN6RixpQkFBaUIsQ0FDaEIsR0FBRyxFQUNILDhDQUE4QyxFQUM5QyxlQUFlLEVBQ2YsWUFBWSxDQUNaLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsZUFBZSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDdEMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDdEMsZUFBZSxDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzRCxlQUFlLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzFELGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsZUFBZSxDQUFDLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxlQUFlLENBQUMsb0NBQW9DLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hFLGVBQWUsQ0FDZCw4REFBOEQsRUFDOUQsV0FBVyxFQUNYLElBQUksQ0FDSixDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsdURBQXVELEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hHLG9CQUFvQixDQUNuQiwwRkFBMEYsRUFDMUYsV0FBVyxFQUNYLElBQUksQ0FDSixDQUFBO1FBQ0Qsb0JBQW9CLENBQ25CLDZGQUE2RixFQUM3RixXQUFXLEVBQ1gsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=