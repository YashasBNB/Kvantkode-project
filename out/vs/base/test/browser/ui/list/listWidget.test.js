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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFdpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvbGlzdC9saXN0V2lkZ2V0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWxGLEtBQUssQ0FBQyxZQUFZLEVBQUU7SUFDbkIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSztRQUM3QixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQTtRQUM5QixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUE7UUFFN0IsTUFBTSxRQUFRLEdBQWlDO1lBQzlDLFNBQVM7Z0JBQ1IsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1lBQ0QsYUFBYTtnQkFDWixPQUFPLFVBQVUsQ0FBQTtZQUNsQixDQUFDO1NBQ0QsQ0FBQTtRQUVELElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQTtRQUV0QixNQUFNLFFBQVEsR0FBZ0M7WUFDN0MsVUFBVSxFQUFFLFVBQVU7WUFDdEIsY0FBYztnQkFDYixjQUFjLEVBQUUsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsYUFBYSxLQUFJLENB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