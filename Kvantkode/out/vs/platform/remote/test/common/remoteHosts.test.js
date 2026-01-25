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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSG9zdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL3Rlc3QvY29tbW9uL3JlbW90ZUhvc3RzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXBHLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDaEUsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFLElBQUk7U0FDVixDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ2hFLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxJQUFJO1NBQ1YsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLHNCQUFzQixDQUFDLGdEQUFnRCxDQUFDLEVBQ3hFLEVBQUUsSUFBSSxFQUFFLDJDQUEyQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FDakUsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxNQUFNLENBQUMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQzdFLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxJQUFJO1NBQ1YsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDeEUsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFLEdBQUc7U0FDVCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUM3RSxJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsOEJBQThCLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3hFLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxHQUFHO1NBQ1QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLGdEQUFnRCxFQUFFLEdBQUcsQ0FBQyxFQUNyRixFQUFFLElBQUksRUFBRSwyQ0FBMkMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQ2pFLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLENBQUMsRUFDaEYsRUFBRSxJQUFJLEVBQUUsMkNBQTJDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUNoRSxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEVBQThFLEVBQUUsR0FBRyxFQUFFO1FBQ3pGLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLDZDQUE2QyxFQUFFLEdBQUcsQ0FBQyxFQUNsRixFQUFFLElBQUksRUFBRSw2Q0FBNkMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQ2xFLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=