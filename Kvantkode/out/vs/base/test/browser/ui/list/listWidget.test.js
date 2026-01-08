/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { List } from '../../../../browser/ui/list/listWidget.js';
import { range } from '../../../../common/arrays.js';
import { timeout } from '../../../../common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
suite('ListWidget', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Page up and down', async function () {
        const element = document.createElement('div');
        element.style.height = '200px';
        element.style.width = '200px';
        const delegate = {
            getHeight() {
                return 20;
            },
            getTemplateId() {
                return 'template';
            },
        };
        let templatesCount = 0;
        const renderer = {
            templateId: 'template',
            renderTemplate() {
                templatesCount++;
            },
            renderElement() { },
            disposeTemplate() {
                templatesCount--;
            },
        };
        const listWidget = store.add(new List('test', element, delegate, [renderer]));
        listWidget.layout(200);
        assert.strictEqual(templatesCount, 0, 'no templates have been allocated');
        listWidget.splice(0, 0, range(100));
        listWidget.focusFirst();
        listWidget.focusNextPage();
        assert.strictEqual(listWidget.getFocus()[0], 9, 'first page down moves focus to element at bottom');
        // scroll to next page is async
        listWidget.focusNextPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 19, 'page down to next page');
        listWidget.focusPreviousPage();
        assert.strictEqual(listWidget.getFocus()[0], 10, 'first page up moves focus to element at top');
        // scroll to previous page is async
        listWidget.focusPreviousPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 0, 'page down to previous page');
    });
    test('Page up and down with item taller than viewport #149502', async function () {
        const element = document.createElement('div');
        element.style.height = '200px';
        element.style.width = '200px';
        const delegate = {
            getHeight() {
                return 200;
            },
            getTemplateId() {
                return 'template';
            },
        };
        let templatesCount = 0;
        const renderer = {
            templateId: 'template',
            renderTemplate() {
                templatesCount++;
            },
            renderElement() { },
            disposeTemplate() {
                templatesCount--;
            },
        };
        const listWidget = store.add(new List('test', element, delegate, [renderer]));
        listWidget.layout(200);
        assert.strictEqual(templatesCount, 0, 'no templates have been allocated');
        listWidget.splice(0, 0, range(100));
        listWidget.focusFirst();
        assert.strictEqual(listWidget.getFocus()[0], 0, 'initial focus is first element');
        // scroll to next page is async
        listWidget.focusNextPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 1, 'page down to next page');
        // scroll to previous page is async
        listWidget.focusPreviousPage();
        await timeout(0);
        assert.strictEqual(listWidget.getFocus()[0], 0, 'page up to next page');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFdpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS9saXN0L2xpc3RXaWRnZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbEYsS0FBSyxDQUFDLFlBQVksRUFBRTtJQUNuQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLO1FBQzdCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFBO1FBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQTtRQUU3QixNQUFNLFFBQVEsR0FBaUM7WUFDOUMsU0FBUztnQkFDUixPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7WUFDRCxhQUFhO2dCQUNaLE9BQU8sVUFBVSxDQUFBO1lBQ2xCLENBQUM7U0FDRCxDQUFBO1FBRUQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBRXRCLE1BQU0sUUFBUSxHQUFnQztZQUM3QyxVQUFVLEVBQUUsVUFBVTtZQUN0QixjQUFjO2dCQUNiLGNBQWMsRUFBRSxDQUFBO1lBQ2pCLENBQUM7WUFDRCxhQUFhLEtB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