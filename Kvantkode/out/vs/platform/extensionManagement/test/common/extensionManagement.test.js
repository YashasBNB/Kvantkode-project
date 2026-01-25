/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../common/extensionManagement.js';
import { ExtensionKey } from '../../common/extensionManagementUtil.js';
suite('Extension Identifier Pattern', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('extension identifier pattern', () => {
        const regEx = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
        assert.strictEqual(true, regEx.test('publisher.name'));
        assert.strictEqual(true, regEx.test('publiSher.name'));
        assert.strictEqual(true, regEx.test('publisher.Name'));
        assert.strictEqual(true, regEx.test('PUBLISHER.NAME'));
        assert.strictEqual(true, regEx.test('PUBLISHEr.NAMe'));
        assert.strictEqual(true, regEx.test('PUBLISHEr.N-AMe'));
        assert.strictEqual(true, regEx.test('PUB-LISHEr.NAMe'));
        assert.strictEqual(true, regEx.test('PUB-LISHEr.N-AMe'));
        assert.strictEqual(true, regEx.test('PUBLISH12Er90.N-A54Me123'));
        assert.strictEqual(true, regEx.test('111PUBLISH12Er90.N-1111A54Me123'));
        assert.strictEqual(false, regEx.test('publishername'));
        assert.strictEqual(false, regEx.test('-publisher.name'));
        assert.strictEqual(false, regEx.test('publisher.-name'));
        assert.strictEqual(false, regEx.test('-publisher.-name'));
        assert.strictEqual(false, regEx.test('publ_isher.name'));
        assert.strictEqual(false, regEx.test('publisher._name'));
    });
    test('extension key', () => {
        assert.strictEqual(new ExtensionKey({ id: 'pub.extension-name' }, '1.0.1').toString(), 'pub.extension-name-1.0.1');
        assert.strictEqual(new ExtensionKey({ id: 'pub.extension-name' }, '1.0.1', "undefined" /* TargetPlatform.UNDEFINED */).toString(), 'pub.extension-name-1.0.1');
        assert.strictEqual(new ExtensionKey({ id: 'pub.extension-name' }, '1.0.1', "win32-x64" /* TargetPlatform.WIN32_X64 */).toString(), `pub.extension-name-1.0.1-${"win32-x64" /* TargetPlatform.WIN32_X64 */}`);
    });
    test('extension key parsing', () => {
        assert.strictEqual(ExtensionKey.parse('pub.extension-name'), null);
        assert.strictEqual(ExtensionKey.parse('pub.extension-name@1.2.3'), null);
        assert.strictEqual(ExtensionKey.parse('pub.extension-name-1.0.1')?.toString(), 'pub.extension-name-1.0.1');
        assert.strictEqual(ExtensionKey.parse('pub.extension-name-1.0.1-win32-x64')?.toString(), 'pub.extension-name-1.0.1-win32-x64');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3RFLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFDbEUsMEJBQTBCLENBQzFCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLE9BQU8sNkNBQTJCLENBQUMsUUFBUSxFQUFFLEVBQzVGLDBCQUEwQixDQUMxQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxPQUFPLDZDQUEyQixDQUFDLFFBQVEsRUFBRSxFQUM1Riw0QkFBNEIsMENBQXdCLEVBQUUsQ0FDdEQsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUNqQixZQUFZLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQzFELDBCQUEwQixDQUMxQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsWUFBWSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUNwRSxvQ0FBb0MsQ0FDcEMsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==