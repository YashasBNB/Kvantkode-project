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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZUF1dGhvcml0eVJlc29sdmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLGdDQUFnQyxHQUNoQyxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXpHLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDNUMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsaUVBQWlFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEYsTUFBTSxjQUFjLEdBQW9CLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxHQUFHLE9BQU8sRUFBRSxDQUFBO1FBQ2hGLE1BQU0sT0FBTyxHQUFHLElBQUksOEJBQThCLENBQUMsY0FBYyxFQUFFLFNBQWdCLENBQUMsQ0FBQTtRQUNwRixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsT0FBTyxDQUFDLDBCQUEwQixDQUNqQyxRQUFRLEVBQ1IsSUFBSSw0QkFBNEIsQ0FDL0IsV0FBVyxFQUNYLGdDQUFnQyxDQUFDLHVCQUF1QixDQUN4RCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sQ0FBQTtZQUNaLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RixDQUFDO1FBQ0QsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==