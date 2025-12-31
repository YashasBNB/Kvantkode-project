/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestDialogService } from '../../../dialogs/test/common/testDialogService.js';
import { TestNotificationService } from '../../../notification/test/common/testNotificationService.js';
import { UndoRedoGroup } from '../../common/undoRedo.js';
import { UndoRedoService } from '../../common/undoRedoService.js';
suite('UndoRedoService', () => {
    function createUndoRedoService(dialogService = new TestDialogService()) {
        const notificationService = new TestNotificationService();
        return new UndoRedoService(dialogService, notificationService);
    }
    test('simple single resource elements', () => {
        const resource = URI.file('test.txt');
        const service = createUndoRedoService();
        assert.strictEqual(service.canUndo(resource), false);
        assert.strictEqual(service.canRedo(resource), false);
        assert.strictEqual(service.hasElements(resource), false);
        assert.ok(service.getLastElement(resource) === null);
        let undoCall1 = 0;
        let redoCall1 = 0;
        const element1 = {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: resource,
            label: 'typing 1',
            code: 'typing',
            undo: () => {
                undoCall1++;
            },
            redo: () => {
                redoCall1++;
            },
        };
        service.pushElement(element1);
        assert.strictEqual(undoCall1, 0);
        assert.strictEqual(redoCall1, 0);
        assert.strictEqual(service.canUndo(resource), true);
        assert.strictEqual(service.canRedo(resource), false);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === element1);
        service.undo(resource);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 0);
        assert.strictEqual(service.canUndo(resource), false);
        assert.strictEqual(service.canRedo(resource), true);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === null);
        service.redo(resource);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 1);
        assert.strictEqual(service.canUndo(resource), true);
        assert.strictEqual(service.canRedo(resource), false);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === element1);
        let undoCall2 = 0;
        let redoCall2 = 0;
        const element2 = {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: resource,
            label: 'typing 2',
            code: 'typing',
            undo: () => {
                undoCall2++;
            },
            redo: () => {
                redoCall2++;
            },
        };
        service.pushElement(element2);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 1);
        assert.strictEqual(undoCall2, 0);
        assert.strictEqual(redoCall2, 0);
        assert.strictEqual(service.canUndo(resource), true);
        assert.strictEqual(service.canRedo(resource), false);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === element2);
        service.undo(resource);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 1);
        assert.strictEqual(undoCall2, 1);
        assert.strictEqual(redoCall2, 0);
        assert.strictEqual(service.canUndo(resource), true);
        assert.strictEqual(service.canRedo(resource), true);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === null);
        let undoCall3 = 0;
        let redoCall3 = 0;
        const element3 = {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: resource,
            label: 'typing 2',
            code: 'typing',
            undo: () => {
                undoCall3++;
            },
            redo: () => {
                redoCall3++;
            },
        };
        service.pushElement(element3);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 1);
        assert.strictEqual(undoCall2, 1);
        assert.strictEqual(redoCall2, 0);
        assert.strictEqual(undoCall3, 0);
        assert.strictEqual(redoCall3, 0);
        assert.strictEqual(service.canUndo(resource), true);
        assert.strictEqual(service.canRedo(resource), false);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === element3);
        service.undo(resource);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 1);
        assert.strictEqual(undoCall2, 1);
        assert.strictEqual(redoCall2, 0);
        assert.strictEqual(undoCall3, 1);
        assert.strictEqual(redoCall3, 0);
        assert.strictEqual(service.canUndo(resource), true);
        assert.strictEqual(service.canRedo(resource), true);
        assert.strictEqual(service.hasElements(resource), true);
        assert.ok(service.getLastElement(resource) === null);
    });
    test('multi resource elements', async () => {
        const resource1 = URI.file('test1.txt');
        const resource2 = URI.file('test2.txt');
        const service = createUndoRedoService(new (class extends mock() {
            async prompt(prompt) {
                const result = prompt.buttons?.[0].run({ checkboxChecked: false });
                return { result };
            }
            async confirm() {
                return {
                    confirmed: true, // confirm!
                };
            }
        })());
        let undoCall1 = 0, undoCall11 = 0, undoCall12 = 0;
        let redoCall1 = 0, redoCall11 = 0, redoCall12 = 0;
        const element1 = {
            type: 1 /* UndoRedoElementType.Workspace */,
            resources: [resource1, resource2],
            label: 'typing 1',
            code: 'typing',
            undo: () => {
                undoCall1++;
            },
            redo: () => {
                redoCall1++;
            },
            split: () => {
                return [
                    {
                        type: 0 /* UndoRedoElementType.Resource */,
                        resource: resource1,
                        label: 'typing 1.1',
                        code: 'typing',
                        undo: () => {
                            undoCall11++;
                        },
                        redo: () => {
                            redoCall11++;
                        },
                    },
                    {
                        type: 0 /* UndoRedoElementType.Resource */,
                        resource: resource2,
                        label: 'typing 1.2',
                        code: 'typing',
                        undo: () => {
                            undoCall12++;
                        },
                        redo: () => {
                            redoCall12++;
                        },
                    },
                ];
            },
        };
        service.pushElement(element1);
        assert.strictEqual(service.canUndo(resource1), true);
        assert.strictEqual(service.canRedo(resource1), false);
        assert.strictEqual(service.hasElements(resource1), true);
        assert.ok(service.getLastElement(resource1) === element1);
        assert.strictEqual(service.canUndo(resource2), true);
        assert.strictEqual(service.canRedo(resource2), false);
        assert.strictEqual(service.hasElements(resource2), true);
        assert.ok(service.getLastElement(resource2) === element1);
        await service.undo(resource1);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 0);
        assert.strictEqual(service.canUndo(resource1), false);
        assert.strictEqual(service.canRedo(resource1), true);
        assert.strictEqual(service.hasElements(resource1), true);
        assert.ok(service.getLastElement(resource1) === null);
        assert.strictEqual(service.canUndo(resource2), false);
        assert.strictEqual(service.canRedo(resource2), true);
        assert.strictEqual(service.hasElements(resource2), true);
        assert.ok(service.getLastElement(resource2) === null);
        await service.redo(resource2);
        assert.strictEqual(undoCall1, 1);
        assert.strictEqual(redoCall1, 1);
        assert.strictEqual(undoCall11, 0);
        assert.strictEqual(redoCall11, 0);
        assert.strictEqual(undoCall12, 0);
        assert.strictEqual(redoCall12, 0);
        assert.strictEqual(service.canUndo(resource1), true);
        assert.strictEqual(service.canRedo(resource1), false);
        assert.strictEqual(service.hasElements(resource1), true);
        assert.ok(service.getLastElement(resource1) === element1);
        assert.strictEqual(service.canUndo(resource2), true);
        assert.strictEqual(service.canRedo(resource2), false);
        assert.strictEqual(service.hasElements(resource2), true);
        assert.ok(service.getLastElement(resource2) === element1);
    });
    test('UndoRedoGroup.None uses id 0', () => {
        assert.strictEqual(UndoRedoGroup.None.id, 0);
        assert.strictEqual(UndoRedoGroup.None.nextOrder(), 0);
        assert.strictEqual(UndoRedoGroup.None.nextOrder(), 0);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kb1JlZG9TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91bmRvUmVkby90ZXN0L2NvbW1vbi91bmRvUmVkb1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN0RyxPQUFPLEVBQXlDLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVqRSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLFNBQVMscUJBQXFCLENBQzdCLGdCQUFnQyxJQUFJLGlCQUFpQixFQUFFO1FBRXZELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBQ3pELE9BQU8sSUFBSSxlQUFlLENBQUMsYUFBYSxFQUFFLG1CQUFtQixDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxxQkFBcUIsRUFBRSxDQUFBO1FBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQTtRQUVwRCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDakIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sUUFBUSxHQUFxQjtZQUNsQyxJQUFJLHNDQUE4QjtZQUNsQyxRQUFRLEVBQUUsUUFBUTtZQUNsQixLQUFLLEVBQUUsVUFBVTtZQUNqQixJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ1YsU0FBUyxFQUFFLENBQUE7WUFDWixDQUFDO1lBQ0QsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDVixTQUFTLEVBQUUsQ0FBQTtZQUNaLENBQUM7U0FDRCxDQUFBO1FBQ0QsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU3QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUE7UUFFeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUE7UUFFcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcs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VyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQTtRQUV4RCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXRCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENB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