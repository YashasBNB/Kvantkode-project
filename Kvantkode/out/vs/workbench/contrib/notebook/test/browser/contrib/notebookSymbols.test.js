/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NotebookOutlineEntryFactory } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
suite('Notebook Symbols', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    const symbolsPerTextModel = {};
    function setSymbolsForTextModel(symbols, textmodelId = 'textId') {
        symbolsPerTextModel[textmodelId] = symbols;
    }
    const executionService = new (class extends mock() {
        getCellExecution() {
            return undefined;
        }
    })();
    class OutlineModelStub {
        constructor(textId) {
            this.textId = textId;
        }
        getTopLevelSymbols() {
            return symbolsPerTextModel[this.textId];
        }
    }
    const outlineModelService = new (class extends mock() {
        getOrCreate(model, arg1) {
            const outline = new OutlineModelStub(model.id);
            return Promise.resolve(outline);
        }
        getDebounceValue(arg0) {
            return 0;
        }
    })();
    const textModelService = new (class extends mock() {
        createModelReference(uri) {
            return Promise.resolve({
                object: {
                    textEditorModel: {
                        id: uri.toString(),
                        getVersionId() {
                            return 1;
                        },
                    },
                },
                dispose() { },
            });
        }
    })();
    function createCellViewModel(version = 1, textmodelId = 'textId') {
        return {
            id: textmodelId,
            uri: {
                toString() {
                    return textmodelId;
                },
            },
            textBuffer: {
                getLineCount() {
                    return 0;
                },
            },
            getText() {
                return '# code';
            },
            model: {
                textModel: {
                    id: textmodelId,
                    getVersionId() {
                        return version;
                    },
                },
            },
            resolveTextModel() {
                return this.model.textModel;
            },
        };
    }
    test('Cell without symbols cache', function () {
        setSymbolsForTextModel([{ name: 'var', range: {} }]);
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const entries = entryFactory.getOutlineEntries(createCellViewModel(), 0);
        assert.equal(entries.length, 1, 'no entries created');
        assert.equal(entries[0].label, '# code', 'entry should fall back to first line of cell');
    });
    test('Cell with simple symbols', async function () {
        setSymbolsForTextModel([
            { name: 'var1', range: {} },
            { name: 'var2', range: {} },
        ]);
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const cell = createCellViewModel();
        await entryFactory.cacheSymbols(cell, CancellationToken.None);
        const entries = entryFactory.getOutlineEntries(cell, 0);
        assert.equal(entries.length, 3, 'wrong number of outline entries');
        assert.equal(entries[0].label, '# code');
        assert.equal(entries[1].label, 'var1');
        // 6 levels for markdown, all code symbols are greater than the max markdown level
        assert.equal(entries[1].level, 8);
        assert.equal(entries[1].index, 1);
        assert.equal(entries[2].label, 'var2');
        assert.equal(entries[2].level, 8);
        assert.equal(entries[2].index, 2);
    });
    test('Cell with nested symbols', async function () {
        setSymbolsForTextModel([
            {
                name: 'root1',
                range: {},
                children: [
                    { name: 'nested1', range: {} },
                    { name: 'nested2', range: {} },
                ],
            },
            { name: 'root2', range: {}, children: [{ name: 'nested1', range: {} }] },
        ]);
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const cell = createCellViewModel();
        await entryFactory.cacheSymbols(cell, CancellationToken.None);
        const entries = entryFactory.getOutlineEntries(createCellViewModel(), 0);
        assert.equal(entries.length, 6, 'wrong number of outline entries');
        assert.equal(entries[0].label, '# code');
        assert.equal(entries[1].label, 'root1');
        assert.equal(entries[1].level, 8);
        assert.equal(entries[2].label, 'nested1');
        assert.equal(entries[2].level, 9);
        assert.equal(entries[3].label, 'nested2');
        assert.equal(entries[3].level, 9);
        assert.equal(entries[4].label, 'root2');
        assert.equal(entries[4].level, 8);
        assert.equal(entries[5].label, 'nested1');
        assert.equal(entries[5].level, 9);
    });
    test('Multiple Cells with symbols', async function () {
        setSymbolsForTextModel([{ name: 'var1', range: {} }], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const cell1 = createCellViewModel(1, '$1');
        const cell2 = createCellViewModel(1, '$2');
        await entryFactory.cacheSymbols(cell1, CancellationToken.None);
        await entryFactory.cacheSymbols(cell2, CancellationToken.None);
        const entries1 = entryFactory.getOutlineEntries(createCellViewModel(1, '$1'), 0);
        const entries2 = entryFactory.getOutlineEntries(createCellViewModel(1, '$2'), 0);
        assert.equal(entries1.length, 2, 'wrong number of outline entries');
        assert.equal(entries1[0].label, '# code');
        assert.equal(entries1[1].label, 'var1');
        assert.equal(entries2.length, 2, 'wrong number of outline entries');
        assert.equal(entries2[0].label, '# code');
        assert.equal(entries2[1].label, 'var2');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTeW1ib2xzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL25vdGVib29rU3ltYm9scy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFPckcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFVdkcsS0FBSyxDQUFDLGtCQUFrQixFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxtQkFBbUIsR0FBeUMsRUFBRSxDQUFBO0lBQ3BFLFNBQVMsc0JBQXNCLENBQUMsT0FBNkIsRUFBRSxXQUFXLEdBQUcsUUFBUTtRQUNwRixtQkFBbUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxPQUFPLENBQUE7SUFDM0MsQ0FBQztJQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWtDO1FBQ3hFLGdCQUFnQjtZQUN4QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0tBQ0QsQ0FBQyxFQUFFLENBQUE7SUFFSixNQUFNLGdCQUFnQjtRQUNyQixZQUFvQixNQUFjO1lBQWQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFdEMsa0JBQWtCO1lBQ2pCLE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFB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