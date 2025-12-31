/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isHTMLElement } from '../../browser/dom.js';
import { renderLabelWithIcons } from '../../browser/ui/iconLabel/iconLabels.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('renderLabelWithIcons', () => {
    test('no icons', () => {
        const result = renderLabelWithIcons(' hello World .');
        assert.strictEqual(elementsToString(result), ' hello World .');
    });
    test('icons only', () => {
        const result = renderLabelWithIcons('$(alert)');
        assert.strictEqual(elementsToString(result), '<span class="codicon codicon-alert"></span>');
    });
    test('icon and non-icon strings', () => {
        const result = renderLabelWithIcons(` $(alert) Unresponsive`);
        assert.strictEqual(elementsToString(result), ' <span class="codicon codicon-alert"></span> Unresponsive');
    });
    test('multiple icons', () => {
        const result = renderLabelWithIcons('$(check)$(error)');
        assert.strictEqual(elementsToString(result), '<span class="codicon codicon-check"></span><span class="codicon codicon-error"></span>');
    });
    test('escaped icons', () => {
        const result = renderLabelWithIcons('\\$(escaped)');
        assert.strictEqual(elementsToString(result), '$(escaped)');
    });
    test('icon with animation', () => {
        const result = renderLabelWithIcons('$(zip~anim)');
        assert.strictEqual(elementsToString(result), '<span class="codicon codicon-zip codicon-modifier-anim"></span>');
    });
    const elementsToString = (elements) => {
        return elements
            .map((elem) => (isHTMLElement(elem) ? elem.outerHTML : elem))
            .reduce((a, b) => a + b, '');
    };
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvaWNvbkxhYmVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDcEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFNUUsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXJELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUMvRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsNkNBQTZDLENBQUMsQ0FBQTtJQUM1RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUU3RCxNQUFNLENBQUMsV0FBVyxDQUNqQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFDeEIsMkRBQTJELENBQzNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUV2RCxNQUFNLENBQUMsV0FBVyxDQUNqQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFDeEIsd0ZBQXdGLENBQ3hGLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDM0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRWxELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUN4QixpRUFBaUUsQ0FDakUsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFFBQXFDLEVBQVUsRUFBRTtRQUMxRSxPQUFPLFFBQVE7YUFDYixHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM1RCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzlCLENBQUMsQ0FBQTtJQUVELHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==