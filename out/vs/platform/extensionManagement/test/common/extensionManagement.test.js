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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUd0RSxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO0lBQzFDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQ2xFLDBCQUEwQixDQUMxQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxPQUFPLDZDQUEyQixDQUFDLFFBQVEsRUFBRSxFQUM1RiwwQkFBMEIsQ0FDMUIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsT0FBTyw2Q0FBMkIsQ0FBQyxRQUFRLEVBQUUsRUFDNUYsNEJBQTRCLDBDQUF3QixFQUFFLENBQ3RELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsWUFBWSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUMxRCwwQkFBMEIsQ0FDMUIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFlBQVksQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFDcEUsb0NBQW9DLENBQ3BDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=