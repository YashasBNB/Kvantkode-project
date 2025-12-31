/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { OS } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { collapseTildePath, sanitizeCwd } from '../../common/terminalEnvironment.js';
suite('terminalEnvironment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('collapseTildePath', () => {
        test('should return empty string for a falsy path', () => {
            strictEqual(collapseTildePath('', '/foo', '/'), '');
            strictEqual(collapseTildePath(undefined, '/foo', '/'), '');
        });
        test('should return path for a falsy user home', () => {
            strictEqual(collapseTildePath('/foo', '', '/'), '/foo');
            strictEqual(collapseTildePath('/foo', undefined, '/'), '/foo');
        });
        test("should not collapse when user home isn't present", () => {
            strictEqual(collapseTildePath('/foo', '/bar', '/'), '/foo');
            strictEqual(collapseTildePath('C:\\foo', 'C:\\bar', '\\'), 'C:\\foo');
        });
        test('should collapse with Windows separators', () => {
            strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo\\', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo\\', '\\'), '~\\bar\\baz');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo', '\\'), '~\\bar\\baz');
        });
        test('should collapse mixed case with Windows separators', () => {
            strictEqual(collapseTildePath('c:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'c:\\foo', '\\'), '~\\bar\\baz');
        });
        test('should collapse with Posix separators', () => {
            strictEqual(collapseTildePath('/foo/bar', '/foo', '/'), '~/bar');
            strictEqual(collapseTildePath('/foo/bar', '/foo/', '/'), '~/bar');
            strictEqual(collapseTildePath('/foo/bar/baz', '/foo', '/'), '~/bar/baz');
            strictEqual(collapseTildePath('/foo/bar/baz', '/foo/', '/'), '~/bar/baz');
        });
    });
    suite('sanitizeCwd', () => {
        if (OS === 1 /* OperatingSystem.Windows */) {
            test('should make the Windows drive letter uppercase', () => {
                strictEqual(sanitizeCwd('c:\\foo\\bar'), 'C:\\foo\\bar');
            });
        }
        test('should remove any wrapping quotes', () => {
            strictEqual(sanitizeCwd("'/foo/bar'"), '/foo/bar');
            strictEqual(sanitizeCwd('"/foo/bar"'), '/foo/bar');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vdGVybWluYWxFbnZpcm9ubWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFcEYsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtZQUN4RCxXQUFXLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNuRCxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzRCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7WUFDckQsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdkQsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0QsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1lBQzdELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzNELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3RFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtZQUNwRCxXQUFXLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN6RSxXQUFXLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUMzRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3JGLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDcEYsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1lBQy9ELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3pFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDcEYsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1lBQ2xELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2hFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2pFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3hFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzFFLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDRixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN6QixJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO2dCQUMzRCxXQUFXLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ3pELENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7WUFDOUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNsRCxXQUFXLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9