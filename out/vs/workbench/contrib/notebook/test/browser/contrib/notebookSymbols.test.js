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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTeW1ib2xzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1N5bWJvbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBT3JHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBVXZHLEtBQUssQ0FBQyxrQkFBa0IsRUFBRTtJQUN6Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sbUJBQW1CLEdBQXlDLEVBQUUsQ0FBQTtJQUNwRSxTQUFTLHNCQUFzQixDQUFDLE9BQTZCLEVBQUUsV0FBVyxHQUFHLFFBQVE7UUFDcEYsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEdBQUcsT0FBTyxDQUFBO0lBQzNDLENBQUM7SUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFrQztRQUN4RSxnQkFBZ0I7WUFDeEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztLQUNELENBQUMsRUFBRSxDQUFBO0lBRUosTUFBTSxnQkFBZ0I7UUFDckIsWUFBb0IsTUFBYztZQUFkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBRyxDQUFDO1FBRXRDLGtCQUFrQjtZQUNqQixPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxDQUFDO0tBQ0Q7SUFDRCxN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