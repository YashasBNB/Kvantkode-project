/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import product from '../../../product/common/product.js';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, } from '../../common/remoteAuthorityResolver.js';
import { RemoteAuthorityResolverService } from '../../electron-sandbox/remoteAuthorityResolverService.js';
suite('RemoteAuthorityResolverService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #147318: RemoteAuthorityResolverError keeps the same type', async () => {
        const productService = { _serviceBrand: undefined, ...product };
        const service = new RemoteAuthorityResolverService(productService, undefined);
        const result = service.resolveAuthority('test+x');
        service._setResolvedAuthorityError('test+x', new RemoteAuthorityResolverError('something', RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable));
        try {
            await result;
            assert.fail();
        }
        catch (err) {
            assert.strictEqual(RemoteAuthorityResolverError.isTemporarilyNotAvailable(err), true);
        }
        service.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS90ZXN0L2VsZWN0cm9uLXNhbmRib3gvcmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRXhELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsZ0NBQWdDLEdBQ2hDLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFekcsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRixNQUFNLGNBQWMsR0FBb0IsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUE7UUFDaEYsTUFBTSxPQUFPLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxjQUFjLEVBQUUsU0FBZ0IsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxPQUFPLENBQUMsMEJBQTBCLENBQ2pDLFFBQVEsRUFDUixJQUFJLDRCQUE0QixDQUMvQixXQUFXLEVBQ1gsZ0NBQWdDLENBQUMsdUJBQXVCLENBQ3hELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxDQUFBO1lBQ1osTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxNQUFNLENBQUMsV0FBVyxDQUFDLDRCQUE0QixDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RGLENBQUM7UUFDRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9