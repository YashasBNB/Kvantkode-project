/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { parseAuthorityWithOptionalPort, parseAuthorityWithPort } from '../../common/remoteHosts.js';
suite('remoteHosts', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parseAuthority hostname', () => {
        assert.deepStrictEqual(parseAuthorityWithPort('localhost:8080'), {
            host: 'localhost',
            port: 8080,
        });
    });
    test('parseAuthority ipv4', () => {
        assert.deepStrictEqual(parseAuthorityWithPort('127.0.0.1:8080'), {
            host: '127.0.0.1',
            port: 8080,
        });
    });
    test('parseAuthority ipv6', () => {
        assert.deepStrictEqual(parseAuthorityWithPort('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080'), { host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', port: 8080 });
    });
    test('parseAuthorityWithOptionalPort hostname', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('localhost:8080', 123), {
            host: 'localhost',
            port: 8080,
        });
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('localhost', 123), {
            host: 'localhost',
            port: 123,
        });
    });
    test('parseAuthorityWithOptionalPort ipv4', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('127.0.0.1:8080', 123), {
            host: '127.0.0.1',
            port: 8080,
        });
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('127.0.0.1', 123), {
            host: '127.0.0.1',
            port: 123,
        });
    });
    test('parseAuthorityWithOptionalPort ipv6', () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080', 123), { host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', port: 8080 });
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', 123), { host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]', port: 123 });
    });
    test("issue #151748: Error: Remote authorities containing '+' need to be resolved!", () => {
        assert.deepStrictEqual(parseAuthorityWithOptionalPort('codespaces+aaaaa-aaaaa-aaaa-aaaaa-a111aa111', 123), { host: 'codespaces+aaaaa-aaaaa-aaaa-aaaaa-a111aa111', port: 123 });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSG9zdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS90ZXN0L2NvbW1vbi9yZW1vdGVIb3N0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwRyxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ2hFLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxJQUFJO1NBQ1YsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNoRSxJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLENBQUMsZUFBZSxDQUNyQixzQkFBc0IsQ0FBQyxnREFBZ0QsQ0FBQyxFQUN4RSxFQUFFLElBQUksRUFBRSwyQ0FBMkMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQ2pFLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUM3RSxJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsOEJBQThCLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3hFLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxHQUFHO1NBQ1QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDN0UsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFLElBQUk7U0FDVixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUN4RSxJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsR0FBRztTQUNULENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLENBQUMsRUFDckYsRUFBRSxJQUFJLEVBQUUsMkNBQTJDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUNqRSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxDQUFDLEVBQ2hGLEVBQUUsSUFBSSxFQUFFLDJDQUEyQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FDaEUsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLEdBQUcsRUFBRTtRQUN6RixNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLENBQUMsRUFDbEYsRUFBRSxJQUFJLEVBQUUsNkNBQTZDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUNsRSxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9