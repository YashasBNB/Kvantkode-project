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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL2xpc3QvbGlzdFZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVsRixLQUFLLENBQUMsVUFBVSxFQUFFO0lBQ2pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1FBQzdCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFBO1FBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQTtRQUU3QixNQUFNLFFBQVEsR0FBaUM7WUFDOUMsU0FBUztnQkFDUixPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7WUFDRCxhQUFhO2dCQUNaLE9BQU8sVUFBVSxDQUFBO1lBQ2xCLENBQUM7U0FDRCxDQUFBO1FBRUQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBRXRCLE1BQU0sUUFBUSxHQUFnQztZQUM3QyxVQUFVLEVBQUUsVUFBVTtZQUN0QixjQUFjO2dCQUNiLGNBQWMsRUFBRSxDQUFBO1lBQ2pCLENBQUM7WUFDRCxhQUFhLEtBQUksQ0FBQztZQUNsQixlQUFlO2dCQUNkLGNBQWMsRUFBRSxDQUFBO1lBQ2pCLENBQUM7U0FDRCxDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQVMsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDcEUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVwQixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsa0NBQWtDLENBQUMsQ0FBQTtRQUN6RSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLG9DQUFvQyxDQUFDLENBQUE7UUFDNUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO0lBQzFFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==