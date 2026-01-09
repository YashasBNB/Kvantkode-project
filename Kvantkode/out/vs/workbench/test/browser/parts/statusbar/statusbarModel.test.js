/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { StatusbarViewModel, } from '../../../../browser/parts/statusbar/statusbarModel.js';
import { TestStorageService } from '../../../common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Workbench status bar model', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('basics', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        assert.strictEqual(model.entries.length, 0);
        const entry1 = {
            id: '3',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: { primary: 3, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry1);
        const entry2 = {
            id: '2',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: 2, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry2);
        const entry3 = {
            id: '1',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry3);
        const entry4 = {
            id: '1-right',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '1-right',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry4);
        assert.strictEqual(model.entries.length, 4);
        const leftEntries = model.getEntries(0 /* StatusbarAlignment.LEFT */);
        assert.strictEqual(leftEntries.length, 3);
        assert.strictEqual(model.getEntries(1 /* StatusbarAlignment.RIGHT */).length, 1);
        assert.strictEqual(leftEntries[0].id, '3');
        assert.strictEqual(leftEntries[1].id, '2');
        assert.strictEqual(leftEntries[2].id, '1');
        const entries = model.entries;
        assert.strictEqual(entries[0].id, '3');
        assert.strictEqual(entries[1].id, '2');
        assert.strictEqual(entries[2].id, '1');
        assert.strictEqual(entries[3].id, '1-right');
        assert.ok(model.findEntry(container));
        let didChangeEntryVisibility = { id: '', visible: false };
        disposables.add(model.onDidChangeEntryVisibility((e) => {
            didChangeEntryVisibility = e;
        }));
        assert.strictEqual(model.isHidden('1'), false);
        model.hide('1');
        assert.strictEqual(didChangeEntryVisibility.id, '1');
        assert.strictEqual(didChangeEntryVisibility.visible, false);
        assert.strictEqual(model.isHidden('1'), true);
        didChangeEntryVisibility = { id: '', visible: false };
        model.show('1');
        assert.strictEqual(didChangeEntryVisibility.id, '1');
        assert.strictEqual(didChangeEntryVisibility.visible, true);
        assert.strictEqual(model.isHidden('1'), false);
        model.remove(entry1);
        model.remove(entry4);
        assert.strictEqual(model.entries.length, 2);
        model.remove(entry2);
        model.remove(entry3);
        assert.strictEqual(model.entries.length, 0);
    });
    test('sorting with infinity and max number', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        assert.strictEqual(model.entries.length, 0);
        model.add({
            id: '3',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: { primary: Number.MAX_VALUE, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '2',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: Number.MIN_VALUE, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '1',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: Number.POSITIVE_INFINITY, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '0',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '0',
            priority: { primary: Number.NEGATIVE_INFINITY, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '4',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '4',
            priority: { primary: 100, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        const entries = model.entries;
        assert.strictEqual(entries[0].id, '1');
        assert.strictEqual(entries[1].id, '3');
        assert.strictEqual(entries[2].id, '4');
        assert.strictEqual(entries[3].id, '2');
        assert.strictEqual(entries[4].id, '0');
    });
    test('secondary priority used when primary is same', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        assert.strictEqual(model.entries.length, 0);
        model.add({
            id: '1',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '2',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: 1, secondary: 2 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '3',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: { primary: 1, secondary: 3 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        const entries = model.entries;
        assert.strictEqual(entries[0].id, '3');
        assert.strictEqual(entries[1].id, '2');
        assert.strictEqual(entries[2].id, '1');
    });
    test('insertion order preserved when priorites are the same', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        assert.strictEqual(model.entries.length, 0);
        model.add({
            id: '1',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '2',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '3',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        const entries = model.entries;
        assert.strictEqual(entries[0].id, '1');
        assert.strictEqual(entries[1].id, '2');
        assert.strictEqual(entries[2].id, '3');
    });
    test('entry with reference to other entry (existing)', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        // Existing reference, Alignment: left
        model.add({
            id: 'a',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: 2, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'b',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        let entry = {
            id: 'c',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: {
                primary: { location: { id: 'a', priority: 2 }, alignment: 0 /* StatusbarAlignment.LEFT */ },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry);
        let entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'c');
        assert.strictEqual(entries[1].id, 'a');
        assert.strictEqual(entries[2].id, 'b');
        model.remove(entry);
        // Existing reference, Alignment: right
        entry = {
            id: 'c',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '3',
            priority: {
                primary: { location: { id: 'a', priority: 2 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry);
        entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'a');
        assert.strictEqual(entries[1].id, 'c');
        assert.strictEqual(entries[2].id, 'b');
    });
    test('entry with reference to other entry (nonexistent)', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        // Nonexistent reference, Alignment: left
        model.add({
            id: 'a',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: 2, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'b',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        let entry = {
            id: 'c',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: {
                primary: {
                    location: { id: 'not-existing', priority: 0 },
                    alignment: 0 /* StatusbarAlignment.LEFT */,
                },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry);
        let entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'a');
        assert.strictEqual(entries[1].id, 'b');
        assert.strictEqual(entries[2].id, 'c');
        model.remove(entry);
        // Nonexistent reference, Alignment: different fallback priority
        entry = {
            id: 'c',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: {
                primary: {
                    location: { id: 'not-existing', priority: 3 },
                    alignment: 0 /* StatusbarAlignment.LEFT */,
                },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry);
        entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'c');
        assert.strictEqual(entries[1].id, 'a');
        assert.strictEqual(entries[2].id, 'b');
        model.remove(entry);
        // Nonexistent reference, Alignment: right
        entry = {
            id: 'c',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '3',
            priority: {
                primary: {
                    location: { id: 'not-existing', priority: 3 },
                    alignment: 1 /* StatusbarAlignment.RIGHT */,
                },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry);
        entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'a');
        assert.strictEqual(entries[1].id, 'b');
        assert.strictEqual(entries[2].id, 'c');
    });
    test('entry with reference to other entry resorts based on other entry being there or not', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        model.add({
            id: 'a',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1',
            priority: { primary: 2, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'b',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'c',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '3',
            priority: {
                primary: {
                    location: { id: 'not-existing', priority: 0 },
                    alignment: 0 /* StatusbarAlignment.LEFT */,
                },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        let entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'a');
        assert.strictEqual(entries[1].id, 'b');
        assert.strictEqual(entries[2].id, 'c');
        const entry = {
            id: 'not-existing',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: 'not-existing',
            priority: { primary: 3, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(entry);
        entries = model.entries;
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, 'c');
        assert.strictEqual(entries[1].id, 'not-existing');
        assert.strictEqual(entries[2].id, 'a');
        assert.strictEqual(entries[3].id, 'b');
        model.remove(entry);
        entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'a');
        assert.strictEqual(entries[1].id, 'b');
        assert.strictEqual(entries[2].id, 'c');
    });
    test('entry with reference to other entry but different alignment does not explode', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        model.add({
            id: '1-left',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '1-left',
            priority: { primary: 2, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '2-left',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: '2-left',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '1-right',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '1-right',
            priority: { primary: 2, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: '2-right',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '2-right',
            priority: { primary: 1, secondary: 1 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        assert.strictEqual(model.getEntries(0 /* StatusbarAlignment.LEFT */).length, 2);
        assert.strictEqual(model.getEntries(1 /* StatusbarAlignment.RIGHT */).length, 2);
        const relativeEntryLeft = {
            id: 'relative',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: 'relative',
            priority: {
                primary: { location: { id: '1-right', priority: 2 }, alignment: 0 /* StatusbarAlignment.LEFT */ },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(relativeEntryLeft);
        assert.strictEqual(model.getEntries(0 /* StatusbarAlignment.LEFT */).length, 3);
        assert.strictEqual(model.getEntries(0 /* StatusbarAlignment.LEFT */)[2], relativeEntryLeft);
        assert.strictEqual(model.getEntries(1 /* StatusbarAlignment.RIGHT */).length, 2);
        model.remove(relativeEntryLeft);
        const relativeEntryRight = {
            id: 'relative',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: 'relative',
            priority: {
                primary: { location: { id: '1-right', priority: 2 }, alignment: 0 /* StatusbarAlignment.LEFT */ },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        };
        model.add(relativeEntryRight);
        assert.strictEqual(model.getEntries(0 /* StatusbarAlignment.LEFT */).length, 2);
        assert.strictEqual(model.getEntries(1 /* StatusbarAlignment.RIGHT */).length, 3);
    });
    test('entry with reference to other entry respects secondary sorting (existent)', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        model.add({
            id: 'ref',
            alignment: 0 /* StatusbarAlignment.LEFT */,
            name: 'ref',
            priority: { primary: 0, secondary: 0 },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'entry2',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '2',
            priority: {
                primary: { location: { id: 'ref', priority: 0 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 2,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'entry1',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '1',
            priority: {
                primary: { location: { id: 'ref', priority: 0 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'entry3',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '3',
            priority: {
                primary: { location: { id: 'ref', priority: 0 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 3,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        const entries = model.entries;
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, 'ref');
        assert.strictEqual(entries[1].id, 'entry3');
        assert.strictEqual(entries[2].id, 'entry2');
        assert.strictEqual(entries[3].id, 'entry1');
    });
    test('entry with reference to other entry respects secondary sorting (nonexistent)', () => {
        const container = document.createElement('div');
        const model = disposables.add(new StatusbarViewModel(disposables.add(new TestStorageService())));
        model.add({
            id: 'entry2',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '2',
            priority: {
                primary: { location: { id: 'ref', priority: 1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 2,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'entry1',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '1',
            priority: {
                primary: { location: { id: 'ref', priority: 1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 1,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        model.add({
            id: 'entry3',
            alignment: 1 /* StatusbarAlignment.RIGHT */,
            name: '3',
            priority: {
                primary: { location: { id: 'ref', priority: 1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ },
                secondary: 3,
            },
            container,
            labelContainer: container,
            hasCommand: false,
            extensionId: undefined,
        });
        const entries = model.entries;
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].id, 'entry3');
        assert.strictEqual(entries[1].id, 'entry2');
        assert.strictEqual(entries[2].id, 'entry1');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9zdGF0dXNiYXIvc3RhdHVzYmFyTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV6RSxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDL0MsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWhHLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0MsTUFBTSxN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QUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXJDLElBQUksd0JBQXdCLEdBQXFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDM0YsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0Qyx3QkFBd0IsR0FBRyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTdDLHdCQUF3QixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFFckQsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFELE1B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