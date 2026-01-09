/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ListView } from '../../../../browser/ui/list/listView.js';
import { range } from '../../../../common/arrays.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
suite('ListView', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('all rows get disposed', function () {
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
        const listView = new ListView(element, delegate, [renderer]);
        listView.layout(200);
        assert.strictEqual(templatesCount, 0, 'no templates have been allocated');
        listView.splice(0, 0, range(100));
        assert.strictEqual(templatesCount, 10, 'some templates have been allocated');
        listView.dispose();
        assert.strictEqual(templatesCount, 0, 'all templates have been disposed');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvbGlzdC9saXN0Vmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWxGLEtBQUssQ0FBQyxVQUFVLEVBQUU7SUFDakIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsdUJBQXVCLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUE7UUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFBO1FBRTdCLE1BQU0sUUFBUSxHQUFpQztZQUM5QyxTQUFTO2dCQUNSLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztZQUNELGFBQWE7Z0JBQ1osT0FBTyxVQUFVLENBQUE7WUFDbEIsQ0FBQztTQUNELENBQUE7UUFFRCxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUE7UUFFdEIsTUFBTSxRQUFRLEdBQWdDO1lBQzdDLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLGNBQWM7Z0JBQ2IsY0FBYyxFQUFFLENBQUE7WUFDakIsQ0FBQztZQUNELGFBQWEsS0FBSSxDQUFDO1lBQ2xCLGVBQWU7Z0JBQ2QsY0FBYyxFQUFFLENBQUE7WUFDakIsQ0FBQztTQUNELENBQUE7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBUyxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXBCLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO1FBQ3pFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxFQUFFLEVBQUUsb0NBQW9DLENBQUMsQ0FBQTtRQUM1RSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLGtDQUFrQyxDQUFDLENBQUE7SUFDMUUsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9