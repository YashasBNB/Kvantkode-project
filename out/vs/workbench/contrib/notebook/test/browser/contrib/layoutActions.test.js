/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ToggleCellToolbarPositionAction } from '../../../browser/contrib/layout/layoutActions.js';
suite('Notebook Layout Actions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Toggle Cell Toolbar Position', async function () {
        const action = new ToggleCellToolbarPositionAction();
        // "notebook.cellToolbarLocation": "right"
        assert.deepStrictEqual(action.togglePosition('test-nb', 'right'), {
            default: 'right',
            'test-nb': 'left',
        });
        // "notebook.cellToolbarLocation": "left"
        assert.deepStrictEqual(action.togglePosition('test-nb', 'left'), {
            default: 'left',
            'test-nb': 'right',
        });
        // "notebook.cellToolbarLocation": "hidden"
        assert.deepStrictEqual(action.togglePosition('test-nb', 'hidden'), {
            default: 'hidden',
            'test-nb': 'right',
        });
        // invalid
        assert.deepStrictEqual(action.togglePosition('test-nb', ''), {
            default: 'right',
            'test-nb': 'left',
        });
        // no user config, default value
        assert.deepStrictEqual(action.togglePosition('test-nb', {
            default: 'right',
        }), {
            default: 'right',
            'test-nb': 'left',
        });
        // user config, default to left
        assert.deepStrictEqual(action.togglePosition('test-nb', {
            default: 'left',
        }), {
            default: 'left',
            'test-nb': 'right',
        });
        // user config, default to hidden
        assert.deepStrictEqual(action.togglePosition('test-nb', {
            default: 'hidden',
        }), {
            default: 'hidden',
            'test-nb': 'right',
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvbGF5b3V0QWN0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRyxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUs7UUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSwrQkFBK0IsRUFBRSxDQUFBO1FBRXBELDBDQUEwQztRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFO1lBQ2pFLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFNBQVMsRUFBRSxNQUFNO1NBQ2pCLENBQUMsQ0FBQTtRQUVGLHlDQUF5QztRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ2hFLE9BQU8sRUFBRSxNQUFNO1lBQ2YsU0FBUyxFQUFFLE9BQU87U0FDbEIsQ0FBQyxDQUFBO1FBRUYsMkNBQTJDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQUU7WUFDbEUsT0FBTyxFQUFFLFFBQVE7WUFDakIsU0FBUyxFQUFFLE9BQU87U0FDbEIsQ0FBQyxDQUFBO1FBRUYsVUFBVTtRQUNWLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDNUQsT0FBTyxFQUFFLE9BQU87WUFDaEIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFBO1FBRUYsZ0NBQWdDO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFO1lBQ2hDLE9BQU8sRUFBRSxPQUFPO1NBQ2hCLENBQUMsRUFDRjtZQUNDLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFNBQVMsRUFBRSxNQUFNO1NBQ2pCLENBQ0QsQ0FBQTtRQUVELCtCQUErQjtRQUMvQixNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTtZQUNoQyxPQUFPLEVBQUUsTUFBTTtTQUNmLENBQUMsRUFDRjtZQUNDLE9BQU8sRUFBRSxNQUFNO1lBQ2YsU0FBUyxFQUFFLE9BQU87U0FDbEIsQ0FDRCxDQUFBO1FBRUQsaUNBQWlDO1FBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFO1lBQ2hDLE9BQU8sRUFBRSxRQUFRO1NBQ2pCLENBQUMsRUFDRjtZQUNDLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLFNBQVMsRUFBRSxPQUFPO1NBQ2xCLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==