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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci9pY29uTGFiZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQy9ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFBO0lBQzVGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBRTdELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUN4QiwyREFBMkQsQ0FDM0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRXZELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUN4Qix3RkFBd0YsQ0FDeEYsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQ3hCLGlFQUFpRSxDQUNqRSxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsUUFBcUMsRUFBVSxFQUFFO1FBQzFFLE9BQU8sUUFBUTthQUNiLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVELE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDOUIsQ0FBQyxDQUFBO0lBRUQsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9