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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9sYXlvdXRBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWxHLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUErQixFQUFFLENBQUE7UUFFcEQsMENBQTBDO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDakUsT0FBTyxFQUFFLE9BQU87WUFDaEIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFBO1FBRUYseUNBQXlDO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDaEUsT0FBTyxFQUFFLE1BQU07WUFDZixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUE7UUFFRiwyQ0FBMkM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBRTtZQUNsRSxPQUFPLEVBQUUsUUFBUTtZQUNqQixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUE7UUFFRixVQUFVO1FBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRTtZQUM1RCxPQUFPLEVBQUUsT0FBTztZQUNoQixTQUFTLEVBQUUsTUFBTTtTQUNqQixDQUFDLENBQUE7UUFFRixnQ0FBZ0M7UUFDaEMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUU7WUFDaEMsT0FBTyxFQUFFLE9BQU87U0FDaEIsQ0FBQyxFQUNGO1lBQ0MsT0FBTyxFQUFFLE9BQU87WUFDaEIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FDRCxDQUFBO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFO1lBQ2hDLE9BQU8sRUFBRSxNQUFNO1NBQ2YsQ0FBQyxFQUNGO1lBQ0MsT0FBTyxFQUFFLE1BQU07WUFDZixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUNELENBQUE7UUFFRCxpQ0FBaUM7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUU7WUFDaEMsT0FBTyxFQUFFLFFBQVE7U0FDakIsQ0FBQyxFQUNGO1lBQ0MsT0FBTyxFQUFFLFFBQVE7WUFDakIsU0FBUyxFQUFFLE9BQU87U0FDbEIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9