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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvc3RhdHVzYmFyL3N0YXR1c2Jhck1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN4QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTNDLE1BQU0sTUFBTSxHQUE2QjtZQUN4QyxFQUFFLEVB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