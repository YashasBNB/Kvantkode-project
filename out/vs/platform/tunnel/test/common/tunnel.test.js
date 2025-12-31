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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90dW5uZWwvdGVzdC9jb21tb24vdHVubmVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQ04seUNBQXlDLEVBQ3pDLDhDQUE4QyxHQUM5QyxNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxpQkFBaUIsQ0FDekIsR0FBVyxFQUNYLElBQWlFLEVBQ2pFLGVBQXdCLEVBQ3hCLFlBQXFCO1FBRXJCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLEdBQVcsRUFBRSxlQUF3QixFQUFFLFlBQXFCO1FBQ3BGLGlCQUFpQixDQUFDLEdBQUcsRUFBRSx5Q0FBeUMsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDakcsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUMsR0FBVyxFQUFFLGVBQXdCLEVBQUUsWUFBcUI7UUFDekYsaUJBQWlCLENBQ2hCLEdBQUcsRUFDSCw4Q0FBOEMsRUFDOUMsZUFBZSxFQUNmLFlBQVksQ0FDWixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsZUFBZSxDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRCxlQUFlLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsZUFBZSxDQUFDLG9DQUFvQyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxlQUFlLENBQ2QsOERBQThELEVBQzlELFdBQVcsRUFDWCxJQUFJLENBQ0osQ0FBQTtRQUNELG9CQUFvQixDQUFDLHVEQUF1RCxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRyxvQkFBb0IsQ0FDbkIsMEZBQTBGLEVBQzFGLFdBQVcsRUFDWCxJQUFJLENBQ0osQ0FBQTtRQUNELG9CQUFvQixDQUNuQiw2RkFBNkYsRUFDN0YsV0FBVyxFQUNYLElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9