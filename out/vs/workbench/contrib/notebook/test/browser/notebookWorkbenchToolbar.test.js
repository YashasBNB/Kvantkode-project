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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXb3JrYmVuY2hUb29sYmFyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tXb3JrYmVuY2hUb29sYmFyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixnQ0FBZ0MsR0FDaEMsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xGLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQVNsRzs7Ozs7Ozs7O0dBU0c7QUFDSCxLQUFLLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO0lBQzFFLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsTUFBTSw0QkFBNEIsR0FBbUI7UUFDcEQ7WUFDQyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUM7WUFDNUQsSUFBSSxFQUFFLEVBQUU7WUFDUixPQUFPLEVBQUUsSUFBSTtZQUNiLFdBQVcsRUFBRSxJQUFJO1NBQ2pCO1FBQ0Q7WUFDQyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUM7WUFDNUQsSUFBSSxFQUFFLEVBQUU7WUFDUixPQUFPLEVBQUUsSUFBSTtZQUNiLFdBQVcsRUFBRSxJQUFJO1NBQ2pCO1FBQ0Q7WUFDQyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUM7WUFDNUQsSUFBSSxFQUFFLEVBQUU7WUFDUixPQUFPLEVBQUUsSUFB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