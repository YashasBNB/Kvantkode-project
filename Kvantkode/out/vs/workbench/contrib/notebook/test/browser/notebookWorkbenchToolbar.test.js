/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workbenchCalculateActions, workbenchDynamicCalculateActions, } from '../../browser/viewParts/notebookEditorToolbar.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
/**
 * Calculate the visible actions in the toolbar.
 * @param action The action to measure.
 * @param container The container the action will be placed in.
 * @returns The primary and secondary actions to be rendered
 *
 * NOTE: every action requires space for ACTION_PADDING +8 to the right.
 *
 * ex: action with size 50 requires 58px of space
 */
suite('Workbench Toolbar calculateActions (strategy always + never)', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const defaultSecondaryActionModels = [
        {
            action: new Action('secondaryAction0', 'Secondary Action 0'),
            size: 50,
            visible: true,
            renderLabel: true,
        },
        {
            action: new Action('secondaryAction1', 'Secondary Action 1'),
            size: 50,
            visible: true,
            renderLabel: true,
        },
        {
            action: new Action('secondaryAction2', 'Secondary Action 2'),
            size: 50,
            visible: true,
            renderLabel: true,
        },
    ];
    const defaultSecondaryActions = defaultSecondaryActionModels.map((action) => action.action);
    const separator = {
        action: new Separator(),
        size: 1,
        visible: true,
        renderLabel: true,
    };
    setup(function () {
        defaultSecondaryActionModels.forEach((action) => disposables.add(action.action));
    });
    test('should return empty primary and secondary actions when given empty initial actions', () => {
        const result = workbenchCalculateActions([], [], 100);
        assert.deepEqual(result.primaryActions, []);
        assert.deepEqual(result.secondaryActions, []);
    });
    test('should return all primary actions when they fit within the container width', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action2', 'Action 2')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 200);
        assert.deepEqual(result.primaryActions, actions);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should move actions to secondary when they do not fit within the container width', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action2', 'Action 2')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 100);
        assert.deepEqual(result.primaryActions, [actions[0]]);
        assert.deepEqual(result.secondaryActions, [actions[1], actions[2], separator, ...defaultSecondaryActionModels].map((action) => action.action));
    });
    test('should ignore second separator when two separators are in a row', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 125);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[3]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should ignore separators when they are at the end of the resulting primary actions', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 200);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[2]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should keep actions with size 0 in primary actions', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action2', 'Action 2')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action3', 'Action 3')),
                size: 0,
                visible: true,
                renderLabel: true,
            },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 116);
        assert.deepEqual(result.primaryActions, [actions[0], actions[1], actions[3]]);
        assert.deepEqual(result.secondaryActions, [actions[2], separator, ...defaultSecondaryActionModels].map((action) => action.action));
    });
    test('should not render separator if preceeded by size 0 action(s).', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 0,
                visible: true,
                renderLabel: true,
            },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 116);
        assert.deepEqual(result.primaryActions, [actions[0], actions[2]]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should not render second separator if space between is hidden (size 0) actions.', () => {
        const actions = [
            {
                action: disposables.add(new Action('action0', 'Action 0')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            {
                action: disposables.add(new Action('action1', 'Action 1')),
                size: 0,
                visible: true,
                renderLabel: true,
            },
            {
                action: disposables.add(new Action('action2', 'Action 2')),
                size: 0,
                visible: true,
                renderLabel: true,
            },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            {
                action: disposables.add(new Action('action3', 'Action 3')),
                size: 50,
                visible: true,
                renderLabel: true,
            },
        ];
        const result = workbenchCalculateActions(actions, defaultSecondaryActions, 300);
        assert.deepEqual(result.primaryActions, [
            actions[0],
            actions[1],
            actions[2],
            actions[3],
            actions[5],
        ]);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
});
suite('Workbench Toolbar Dynamic calculateActions (strategy dynamic)', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const actionTemplate = [
        new Action('action0', 'Action 0'),
        new Action('action1', 'Action 1'),
        new Action('action2', 'Action 2'),
        new Action('action3', 'Action 3'),
    ];
    const defaultSecondaryActionModels = [
        {
            action: new Action('secondaryAction0', 'Secondary Action 0'),
            size: 50,
            visible: true,
            renderLabel: true,
        },
        {
            action: new Action('secondaryAction1', 'Secondary Action 1'),
            size: 50,
            visible: true,
            renderLabel: true,
        },
        {
            action: new Action('secondaryAction2', 'Secondary Action 2'),
            size: 50,
            visible: true,
            renderLabel: true,
        },
    ];
    const defaultSecondaryActions = defaultSecondaryActionModels.map((action) => action.action);
    setup(function () {
        defaultSecondaryActionModels.forEach((action) => disposables.add(action.action));
    });
    test('should return empty primary and secondary actions when given empty initial actions', () => {
        const result = workbenchDynamicCalculateActions([], [], 100);
        assert.deepEqual(result.primaryActions, []);
        assert.deepEqual(result.secondaryActions, []);
    });
    test('should return all primary actions as visiblewhen they fit within the container width', () => {
        const constainerSize = 200;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, constainerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('actions all within a group that cannot all fit, will all be icon only', () => {
        const containerSize = 150;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: false },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, [...defaultSecondaryActionModels].map((action) => action.action));
    });
    test('should ignore second separator when two separators are in a row', () => {
        const containerSize = 200;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('check label visibility in different groupings', () => {
        const containerSize = 150;
        const actions = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
        ];
        const expectedOutputActions = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: false },
        ];
        const result = workbenchDynamicCalculateActions(actions, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expectedOutputActions);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should ignore separators when they are at the end of the resulting primary actions', () => {
        const containerSize = 200;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should keep actions with size 0 in primary actions', () => {
        const containerSize = 170;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[3], size: 0, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 50, visible: true, renderLabel: false },
            { action: actionTemplate[3], size: 0, visible: true, renderLabel: false },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should not render separator if preceeded by size 0 action(s), but keep size 0 action in primary.', () => {
        const containerSize = 116;
        const input = [
            { action: actionTemplate[0], size: 0, visible: true, renderLabel: true }, // hidden
            { action: new Separator(), size: 1, visible: true, renderLabel: true }, // sep
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true }, // visible
        ];
        const expected = [
            { action: actionTemplate[0], size: 0, visible: true, renderLabel: true }, // hidden
            { action: actionTemplate[1], size: 50, visible: true, renderLabel: true }, // visible
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
    test('should not render second separator if space between is hidden (size 0) actions.', () => {
        const containerSize = 300;
        const input = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 0, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 0, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[3], size: 50, visible: true, renderLabel: true },
        ];
        const expected = [
            { action: actionTemplate[0], size: 50, visible: true, renderLabel: true },
            { action: new Separator(), size: 1, visible: true, renderLabel: true },
            { action: actionTemplate[1], size: 0, visible: true, renderLabel: true },
            { action: actionTemplate[2], size: 0, visible: true, renderLabel: true },
            // remove separator here
            { action: actionTemplate[3], size: 50, visible: true, renderLabel: true },
        ];
        const result = workbenchDynamicCalculateActions(input, defaultSecondaryActions, containerSize);
        assert.deepEqual(result.primaryActions, expected);
        assert.deepEqual(result.secondaryActions, defaultSecondaryActions);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXb3JrYmVuY2hUb29sYmFyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va1dvcmtiZW5jaFRvb2xiYXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGdDQUFnQyxHQUNoQyxNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEYsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBU2xHOzs7Ozs7Ozs7R0FTRztBQUNILEtBQUssQ0FBQyw4REFBOEQsRUFBRSxHQUFHLEVBQUU7SUFDMUUsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxNQUFNLDRCQUE0QixHQUFtQjtRQUNwRDtZQUNDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLElBQUk7U0FDakI7UUFDRDtZQUNDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLElBQUk7U0FDakI7UUFDRDtZQUNDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLElBQUk7U0FDakI7S0FDRCxDQUFBO0lBQ0QsTUFBTSx1QkFBdUIsR0FBYyw0QkFBNEIsQ0FBQyxHQUFHLENBQzFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUN6QixDQUFBO0lBQ0QsTUFBTSxTQUFTLEdBQWlCO1FBQy9CLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRTtRQUN2QixJQUFJLEVBQUUsQ0FBQztRQUNQLE9BQU8sRUFBRSxJQUFJO1FBQ2IsV0FBVyxFQUFFLElBQUk7S0FDakIsQ0FBQTtJQUVELEtBQUssQ0FBQztRQUNMLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBUyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUN6RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvRkFBb0YsRUFBRSxHQUFHLEVBQUU7UUFDL0YsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEVBQTRFLEVBQUUsR0FBRyxFQUFFO1FBQ3ZGLE1BQU0sT0FBTyxHQUFtQjtZQUMvQjtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsRUFBRTtnQkFDUixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLElBQUk7YUFDakI7U0FDRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtGQUFrRixFQUFFLEdBQUcsRUFBRTtRQUM3RixNQUFNLE9BQU8sR0FBbUI7WUFDL0I7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsRUFBRTtnQkFDUixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRDtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1NBQ0QsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxTQUFTLENBQ2YsTUFBTSxDQUFDLGdCQUFnQixFQUN2QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsNEJBQTRCLENBQUMsQ0FBQyxHQUFHLENBQ3ZFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUN6QixDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxHQUFHLEVBQUU7UUFDNUUsTUFBTSxPQUFPLEdBQW1CO1lBQy9CO2dCQUNDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRCxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEU7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsRUFBRTtnQkFDUixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtTQUNELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0ZBQW9GLEVBQUUsR0FBRyxFQUFFO1FBQy9GLE1BQU0sT0FBTyxHQUFtQjtZQUMvQjtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1lBQ0QsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RTtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1lBQ0QsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN0RSxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUMvRCxNQUFNLE9BQU8sR0FBbUI7WUFDL0I7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsRUFBRTtnQkFDUixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRDtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtTQUNELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxTQUFTLENBQ2YsTUFBTSxDQUFDLGdCQUFnQixFQUN2QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUN2RixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQzFFLE1BQU0sT0FBTyxHQUFtQjtZQUMvQjtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1lBQ0QsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RTtnQkFDQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksRUFBRSxFQUFFO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1NBQ0QsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlGQUFpRixFQUFFLEdBQUcsRUFBRTtRQUM1RixNQUFNLE9BQU8sR0FBbUI7WUFDL0I7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsRUFBRTtnQkFDUixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtZQUNELEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEU7Z0JBQ0MsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsSUFBSTthQUNqQjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRCxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFO2dCQUNDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLElBQUk7YUFDakI7U0FDRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtZQUN2QyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1YsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNWLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDVixPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1YsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNWLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQywrREFBK0QsRUFBRSxHQUFHLEVBQUU7SUFDM0UsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxNQUFNLGNBQWMsR0FBRztRQUN0QixJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQ2pDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7UUFDakMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztRQUNqQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO0tBQ2pDLENBQUE7SUFFRCxNQUFNLDRCQUE0QixHQUFtQjtRQUNwRDtZQUNDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLElBQUk7U0FDakI7UUFDRDtZQUNDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLElBQUk7U0FDakI7UUFDRDtZQUNDLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLElBQUk7U0FDakI7S0FDRCxDQUFBO0lBQ0QsTUFBTSx1QkFBdUIsR0FBYyw0QkFBNEIsQ0FBQyxHQUFHLENBQzFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUN6QixDQUFBO0lBRUQsS0FBSyxDQUFDO1FBQ0wsNEJBQTRCLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFTLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3pGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9GQUFvRixFQUFFLEdBQUcsRUFBRTtRQUMvRixNQUFNLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzRkFBc0YsRUFBRSxHQUFHLEVBQUU7UUFDakcsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFBO1FBQzFCLE1BQU0sS0FBSyxHQUFtQjtZQUM3QixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN6RSxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQW1CO1lBQ2hDLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pFLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1FBQ2xGLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQTtRQUN6QixNQUFNLEtBQUssR0FBbUI7WUFDN0IsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUU7WUFDMUUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFO1lBQzFFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRTtTQUMxRSxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsU0FBUyxDQUNmLE1BQU0sQ0FBQyxnQkFBZ0IsRUFDdkIsQ0FBQyxHQUFHLDRCQUE0QixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQ2hFLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxHQUFHLEVBQUU7UUFDNUUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFBO1FBQ3pCLE1BQU0sS0FBSyxHQUFtQjtZQUM3QixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN6RSxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQW1CO1lBQ2hDLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtTQUN6RSxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtRQUMxRCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUE7UUFDekIsTUFBTSxPQUFPLEdBQW1CO1lBQy9CLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQTtRQUNELE1BQU0scUJBQXFCLEdBQW1CO1lBQzdDLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRTtZQUMxRSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUU7U0FDMUUsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNoRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9GQUFvRixFQUFFLEdBQUcsRUFBRTtRQUMvRixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUE7UUFDekIsTUFBTSxLQUFLLEdBQW1CO1lBQzdCLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3RFLENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBbUI7WUFDaEMsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1NBQ3pFLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDOUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBQy9ELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQTtRQUN6QixNQUFNLEtBQUssR0FBbUI7WUFDN0IsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDeEUsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3pFLEVBQUUsTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDdEUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFO1lBQzFFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRTtTQUN6RSxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtHQUFrRyxFQUFFLEdBQUcsRUFBRTtRQUM3RyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUE7UUFDekIsTUFBTSxLQUFLLEdBQW1CO1lBQzdCLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVM7WUFDbkYsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU07WUFDOUUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVTtTQUNyRixDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQW1CO1lBQ2hDLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVM7WUFDbkYsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVTtTQUNyRixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlGQUFpRixFQUFFLEdBQUcsRUFBRTtRQUM1RixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUE7UUFDekIsTUFBTSxLQUFLLEdBQW1CO1lBQzdCLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN6RSxFQUFFLE1BQU0sRUFBRSxJQUFJLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3RFLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN4RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDeEUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDekUsRUFBRSxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtZQUN0RSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7WUFDeEUsRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ3hFLHdCQUF3QjtZQUN4QixFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7U0FDekUsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM5RixNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=