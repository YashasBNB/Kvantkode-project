/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { NotebookBreadcrumbsProvider, NotebookOutlinePaneProvider, NotebookQuickPickProvider, } from '../../../browser/contrib/outline/notebookOutline.js';
import { NotebookOutlineEntryFactory } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
import { OutlineEntry } from '../../../browser/viewModel/OutlineEntry.js';
suite('Notebook Outline View Providers', function () {
    // #region Setup
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService();
    const themeService = new TestThemeService();
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
    // #endregion
    // #region Helpers
    function createCodeCellViewModel(version = 1, source = '# code', textmodelId = 'textId') {
        return {
            uri: {
                toString() {
                    return textmodelId;
                },
            },
            id: textmodelId,
            textBuffer: {
                getLineCount() {
                    return 0;
                },
            },
            getText() {
                return source;
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
            cellKind: 2,
        };
    }
    function createMockOutlineDataSource(entries, activeElement = undefined) {
        return new (class extends mock() {
            constructor() {
                super(...arguments);
                this.object = {
                    entries: entries,
                    activeElement: activeElement,
                };
            }
        })();
    }
    function createMarkupCellViewModel(version = 1, source = 'markup', textmodelId = 'textId', alternativeId = 1) {
        return {
            textBuffer: {
                getLineCount() {
                    return 0;
                },
            },
            getText() {
                return source;
            },
            getAlternativeId() {
                return alternativeId;
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
            cellKind: 1,
        };
    }
    function flatten(element, dataSource) {
        const elements = [];
        const children = dataSource.getChildren(element);
        for (const child of children) {
            elements.push(child);
            elements.push(...flatten(child, dataSource));
        }
        return elements;
    }
    function buildOutlineTree(entries) {
        if (entries.length > 0) {
            const result = [entries[0]];
            const parentStack = [entries[0]];
            for (let i = 1; i < entries.length; i++) {
                const entry = entries[i];
                while (true) {
                    const len = parentStack.length;
                    if (len === 0) {
                        // root node
                        result.push(entry);
                        parentStack.push(entry);
                        break;
                    }
                    else {
                        const parentCandidate = parentStack[len - 1];
                        if (parentCandidate.level < entry.level) {
                            parentCandidate.addChild(entry);
                            parentStack.push(entry);
                            break;
                        }
                        else {
                            parentStack.pop();
                        }
                    }
                }
            }
            return result;
        }
        return undefined;
    }
    /**
     * Set the configuration settings relevant to various outline views (OutlinePane, QuickPick, Breadcrumbs)
     *
     * @param outlineShowMarkdownHeadersOnly: boolean 	(notebook.outline.showMarkdownHeadersOnly)
     * @param outlineShowCodeCells: boolean 			(notebook.outline.showCodeCells)
     * @param outlineShowCodeCellSymbols: boolean 		(notebook.outline.showCodeCellSymbols)
     * @param quickPickShowAllSymbols: boolean 			(notebook.gotoSymbols.showAllSymbols)
     * @param breadcrumbsShowCodeCells: boolean 		(notebook.breadcrumbs.showCodeCells)
     */
    async function setOutlineViewConfiguration(config) {
        await configurationService.setUserConfiguration('notebook.outline.showMarkdownHeadersOnly', config.outlineShowMarkdownHeadersOnly);
        await configurationService.setUserConfiguration('notebook.outline.showCodeCells', config.outlineShowCodeCells);
        await configurationService.setUserConfiguration('notebook.outline.showCodeCellSymbols', config.outlineShowCodeCellSymbols);
        await configurationService.setUserConfiguration('notebook.gotoSymbols.showAllSymbols', config.quickPickShowAllSymbols);
        await configurationService.setUserConfiguration('notebook.breadcrumbs.showCodeCells', config.breadcrumbsShowCodeCells);
    }
    // #endregion
    // #region OutlinePane
    test('OutlinePane 0: Default Settings (Headers Only ON, Code cells OFF, Symbols ON)', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: true,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        // Validate
        assert.equal(results.length, 1);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
    });
    test('OutlinePane 1: ALL Markdown', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        assert.equal(results.length, 2);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
        assert.equal(results[1].label, 'plaintext');
        assert.equal(results[1].level, 7);
    });
    test('OutlinePane 2: Only Headers', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        assert.equal(results.length, 1);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
    });
    test('OutlinePane 3: Only Headers + Code Cells', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: true,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        assert.equal(results.length, 3);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
        assert.equal(results[1].label, '# code cell 2');
        assert.equal(results[1].level, 7);
        assert.equal(results[2].label, '# code cell 3');
        assert.equal(results[2].level, 7);
    });
    test('OutlinePane 4: Only Headers + Code Cells + Symbols', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: true,
            outlineShowCodeCellSymbols: true,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        // validate
        assert.equal(results.length, 5);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
        assert.equal(results[1].label, '# code cell 2');
        assert.equal(results[1].level, 7);
        assert.equal(results[2].label, 'var2');
        assert.equal(results[2].level, 8);
        assert.equal(results[3].label, '# code cell 3');
        assert.equal(results[3].level, 7);
        assert.equal(results[4].label, 'var3');
        assert.equal(results[4].level, 8);
    });
    // #endregion
    // #region QuickPick
    test('QuickPick 0: Symbols On + 2 cells WITH symbols', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: true,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const quickPickProvider = store.add(new NotebookQuickPickProvider(createMockOutlineDataSource([...outlineModel.children]), configurationService, themeService));
        const results = quickPickProvider.getQuickPickElements();
        // Validate
        assert.equal(results.length, 4);
        assert.equal(results[0].label, '$(markdown) h1');
        assert.equal(results[0].element.level, 1);
        assert.equal(results[1].label, '$(markdown) plaintext');
        assert.equal(results[1].element.level, 7);
        assert.equal(results[2].label, '$(symbol-variable) var2');
        assert.equal(results[2].element.level, 8);
        assert.equal(results[3].label, '$(symbol-variable) var3');
        assert.equal(results[3].element.level, 8);
    });
    test('QuickPick 1: Symbols On + 1 cell WITH symbol + 1 cell WITHOUT symbol', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: true,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const quickPickProvider = store.add(new NotebookQuickPickProvider(createMockOutlineDataSource([...outlineModel.children]), configurationService, themeService));
        const results = quickPickProvider.getQuickPickElements();
        // Validate
        assert.equal(results.length, 4);
        assert.equal(results[0].label, '$(markdown) h1');
        assert.equal(results[0].element.level, 1);
        assert.equal(results[1].label, '$(markdown) plaintext');
        assert.equal(results[1].element.level, 7);
        assert.equal(results[2].label, '$(code) # code cell 2');
        assert.equal(results[2].element.level, 7);
        assert.equal(results[3].label, '$(symbol-variable) var3');
        assert.equal(results[3].element.level, 8);
    });
    test('QuickPick 3: Symbols Off', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const quickPickProvider = store.add(new NotebookQuickPickProvider(createMockOutlineDataSource([...outlineModel.children]), configurationService, themeService));
        const results = quickPickProvider.getQuickPickElements();
        // Validate
        assert.equal(results.length, 4);
        assert.equal(results[0].label, '$(markdown) h1');
        assert.equal(results[0].element.level, 1);
        assert.equal(results[1].label, '$(markdown) plaintext');
        assert.equal(results[1].element.level, 7);
        assert.equal(results[2].label, '$(code) # code cell 2');
        assert.equal(results[2].element.level, 7);
        assert.equal(results[3].label, '$(code) # code cell 3');
        assert.equal(results[3].element.level, 7);
    });
    // #endregion
    // #region Breadcrumbs
    test('Breadcrumbs 0: Code Cells On ', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: true,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createMarkupCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        const outlineTree = buildOutlineTree([...outlineModel.children]);
        // Generate filtered outline (view model)
        const breadcrumbsProvider = store.add(new NotebookBreadcrumbsProvider(createMockOutlineDataSource([], [...outlineTree[0].children][1]), configurationService));
        const results = breadcrumbsProvider.getBreadcrumbElements();
        // Validate
        assert.equal(results.length, 3);
        assert.equal(results[0].label, 'fakeRoot');
        assert.equal(results[0].level, -1);
        assert.equal(results[1].label, 'h1');
        assert.equal(results[1].level, 1);
        assert.equal(results[2].label, '# code cell 2');
        assert.equal(results[2].level, 7);
    });
    test('Breadcrumbs 1: Code Cells Off ', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false,
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3'),
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createMarkupCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach((entry) => outlineModel.addChild(entry));
        }
        const outlineTree = buildOutlineTree([...outlineModel.children]);
        // Generate filtered outline (view model)
        const breadcrumbsProvider = store.add(new NotebookBreadcrumbsProvider(createMockOutlineDataSource([], [...outlineTree[0].children][1]), configurationService));
        const results = breadcrumbsProvider.getBreadcrumbElements();
        // Validate
        assert.equal(results.length, 2);
        assert.equal(results[0].label, 'fakeRoot');
        assert.equal(results[0].level, -1);
        assert.equal(results[1].label, 'h1');
        assert.equal(results[1].level, 1);
    });
    // #endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lVmlld1Byb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va091dGxpbmVWaWV3UHJvdmlkZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQU1yRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQ04sMkJBQTJCLEVBRTNCLDJCQUEyQixFQUMzQix5QkFBeUIsR0FDekIsTUFBTSxxREFBcUQsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFTekUsS0FBSyxDQUFDLGlDQUFpQyxFQUFFO0lBQ3hDLGdCQUFnQjtJQUVoQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO0lBQzNELE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtJQUUzQyxNQUFNLG1CQUFtQixHQUF5QyxFQUFFLENBQUE7SUFDcEUsU0FBUyxzQkFBc0IsQ0FBQyxPQUE2QixFQUFFLFdBQVcsR0FBRyxRQUFRO1FBQ3BGLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxHQUFHLE9BQU8sQ0FBQTtJQUMzQyxDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBa0M7UUFDeEUsZ0JBQWdCO1lBQ3hCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUVKLE1BQU0sZ0JBQWdCO1FBQ3JCLFlBQW9CLE1BQWM7WUFBZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQUcsQ0FBQztRQUV0QyxrQkFBa0I7WUFDakIsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQztLQUNEO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBd0I7UUFDakUsV0FBVyxDQUFDLEtBQWlCLEVBQUUsSUFBUztZQUNoRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQTRCLENBQUE7WUFDekUsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFDUSxnQkFBZ0IsQ0FBQyxJQUFTO1lBQ2xDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztLQUNELENBQUMsRUFBRSxDQUFBO0lBQ0osTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBcUI7UUFDM0Qsb0JBQW9CLENBQUMsR0FBUTtZQUNyQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ3RCLE1BQU0sRUFBRTtvQkFDUCxlQUFlLEVBQUU7d0JBQ2hCLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO3dCQUNsQixZQUFZOzRCQUNYLE9BQU8sQ0FBQyxDQUFBO3dCQUNULENBQUM7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsT0FBTyxLQUFJLENBQUM7YUFDNEIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUVKLGFBQWE7SUFDYixrQkFBa0I7SUFFbEIsU0FBUyx1QkFBdUIsQ0FBQyxVQUFrQixDQUFDLEVBQUUsTUFBTSxHQUFHLFFBQVEsRUFBRSxXQUFXLEdBQUcsUUFBUTtRQUM5RixPQUFPO1lBQ04sR0FBRyxFQUFFO2dCQUNKLFFBQVE7b0JBQ1AsT0FBTyxXQUFXLENBQUE7Z0JBQ25CLENBQUM7YUFDRDtZQUNELEVBQUUsRUFBRSxXQUFXO1lBQ2YsVUFBVSxFQUFFO2dCQUNYLFlBQVk7b0JBQ1gsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQzthQUNEO1lBQ0QsT0FBTztnQkFDTixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRCxLQUFLLEVBQUU7Z0JBQ04sU0FBUyxFQUFFO29CQUNWLEVBQUUsRUFBRSxXQUFXO29CQUNmLFlBQVk7d0JBQ1gsT0FBTyxPQUFPLENBQUE7b0JBQ2YsQ0FBQztpQkFDRDthQUNEO1lBQ0QsZ0JBQWdCO2dCQUNmLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFvQixDQUFBO1lBQ3ZDLENBQUM7WUFDRCxRQUFRLEVBQUUsQ0FBQztTQUNPLENBQUE7SUFDcEIsQ0FBQztJQUVELFNBQVMsMkJBQTJCLENBQ25DLE9BQXVCLEVBQ3ZCLGdCQUEwQyxTQUFTO1FBRW5ELE9BQU8sSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQThDO1lBQWhFOztnQkFDRixXQUFNLEdBQW1DO29CQUNqRCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsYUFBYSxFQUFFLGFBQWE7aUJBQzVCLENBQUE7WUFDRixDQUFDO1NBQUEsQ0FBQyxFQUFFLENBQUE7SUFDTCxDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FDakMsVUFBa0IsQ0FBQyxFQUNuQixNQUFNLEdBQUcsUUFBUSxFQUNqQixXQUFXLEdBQUcsUUFBUSxFQUN0QixhQUFhLEdBQUcsQ0FBQztRQUVqQixPQUFPO1lBQ04sVUFBVSxFQUFFO2dCQUNYLFlBQVk7b0JBQ1gsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQzthQUNEO1lBQ0QsT0FBTztnQkFDTixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRCxnQkFBZ0I7Z0JBQ2YsT0FBTyxhQUFhLENBQUE7WUFDckIsQ0FBQztZQUNELEtBQUssRUFBRTtnQkFDTixTQUFTLEVBQUU7b0JBQ1YsRUFBRSxFQUFFLFdBQVc7b0JBQ2YsWUFBWTt3QkFDWCxPQUFPLE9BQU8sQ0FBQTtvQkFDZixDQUFDO2lCQUNEO2FBQ0Q7WUFDRCxnQkFBZ0I7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQW9CLENBQUE7WUFDdkMsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFDO1NBQ08sQ0FBQTtJQUNwQixDQUFDO0lBRUQsU0FBUyxPQUFPLENBQ2YsT0FBcUIsRUFDckIsVUFBMEQ7UUFFMUQsTUFBTSxRQUFRLEdBQW1CLEVBQUUsQ0FBQTtRQUVuQyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2hELEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxFQUFFLENBQUM7WUFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNwQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxPQUF1QjtRQUNoRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEIsTUFBTSxNQUFNLEdBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsTUFBTSxXQUFXLEdBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUV4QixPQUFPLElBQUksRUFBRSxDQUFDO29CQUNiLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUE7b0JBQzlCLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNmLFlBQVk7d0JBQ1osTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDbEIsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDdkIsTUFBSztvQkFDTixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTt3QkFDNUMsSUFBSSxlQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDekMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTs0QkFDL0IsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTs0QkFDdkIsTUFBSzt3QkFDTixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFBO3dCQUNsQixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxLQUFLLFVBQVUsMkJBQTJCLENBQUMsTUFNMUM7UUFDQSxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUM5QywwQ0FBMEMsRUFDMUMsTUFBTSxDQUFDLDhCQUE4QixDQUNyQyxDQUFBO1FBQ0QsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FDOUMsZ0NBQWdDLEVBQ2hDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDM0IsQ0FBQTtRQUNELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQzlDLHNDQUFzQyxFQUN0QyxNQUFNLENBQUMsMEJBQTBCLENBQ2pDLENBQUE7UUFDRCxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUM5QyxxQ0FBcUMsRUFDckMsTUFBTSxDQUFDLHVCQUF1QixDQUM5QixDQUFBO1FBQ0QsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FDOUMsb0NBQW9DLEVBQ3BDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFRCxhQUFhO0lBQ2Isc0JBQXNCO0lBRXRCLElBQUksQ0FBQywrRUFBK0UsRUFBRSxLQUFLO1FBQzFGLE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsSUFBSTtZQUNwQyxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLDBCQUEwQixFQUFFLElBQUk7WUFDaEMsdUJBQXVCLEVBQUUsS0FBSztZQUM5Qix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Qsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0QsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxJQUFJLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTFELFdBQVc7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxLQUFLO1FBQ3hDLE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsS0FBSztZQUNyQyxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLDBCQUEwQixFQUFFLEtBQUs7WUFDakMsdUJBQXVCLEVBQUUsS0FBSztZQUM5Qix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Qsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0QsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxJQUFJLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTFELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSztRQUN4QyxNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLElBQUk7WUFDcEMsb0JBQW9CLEVBQUUsS0FBSztZQUMzQiwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNELGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHVCQUF1QixFQUFFLEVBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUUxRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLO1FBQ3JELE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsSUFBSTtZQUNwQyxvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLDBCQUEwQixFQUFFLEtBQUs7WUFDakMsdUJBQXVCLEVBQUUsS0FBSztZQUM5Qix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Qsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0QsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxJQUFJLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTFELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxLQUFLO1FBQy9ELE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsSUFBSTtZQUNwQyxvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLDBCQUEwQixFQUFFLElBQUk7WUFDaEMsdUJBQXVCLEVBQUUsS0FBSztZQUM5Qix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Qsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0QsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxJQUFJLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTFELFdBQVc7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0lBRUYsYUFBYTtJQUNiLG9CQUFvQjtJQUVwQixJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSztRQUMzRCxNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLEtBQUs7WUFDckMsb0JBQW9CLEVBQUUsS0FBSztZQUMzQiwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLHVCQUF1QixFQUFFLElBQUk7WUFDN0Isd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckUsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRSxnQkFBZ0I7UUFDaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQkFBMkIsQ0FDbkQsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUNwQyxDQUFDLENBQUMsRUFDRixDQUFDLENBQUMsRUFDRix1QkFBdUIsRUFBRSxFQUN6QixVQUFVLEVBQ1YsS0FBSyxFQUNMLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxDQUNULENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ2xDLElBQUkseUJBQXlCLENBQzVCLDJCQUEyQixDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDdkQsb0JBQW9CLEVBQ3BCLFlBQVksQ0FDWixDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBRXhELFdBQVc7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHlCQUF5QixDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzRUFBc0UsRUFBRSxLQUFLO1FBQ2pGLE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsS0FBSztZQUNyQyxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLDBCQUEwQixFQUFFLEtBQUs7WUFDakMsdUJBQXVCLEVBQUUsSUFBSTtZQUM3Qix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckUsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNsQyxJQUFJLHlCQUF5QixDQUM1QiwyQkFBMkIsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQ3ZELG9CQUFvQixFQUNwQixZQUFZLENBQ1osQ0FDRCxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUV4RCxXQUFXO1FBQ1gsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSztRQUNyQyxNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLEtBQUs7WUFDckMsb0JBQW9CLEVBQUUsS0FBSztZQUMzQiwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckUsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRSxnQkFBZ0I7UUFDaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQkFBMkIsQ0FDbkQsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUNwQyxDQUFDLENBQUMsRUFDRixDQUFDLENBQUMsRUFDRix1QkFBdUIsRUFBRSxFQUN6QixVQUFVLEVBQ1YsS0FBSyxFQUNMLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxDQUNULENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ2xDLElBQUkseUJBQXlCLENBQzVCLDJCQUEyQixDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDdkQsb0JBQW9CLEVBQ3BCLFlBQVksQ0FDWixDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBRXhELFdBQVc7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLGFBQWE7SUFDYixzQkFBc0I7SUFFdEIsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUs7UUFDMUMsTUFBTSwyQkFBMkIsQ0FBQztZQUNqQyw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsMEJBQTBCLEVBQUUsS0FBSztZQUNqQyx1QkFBdUIsRUFBRSxLQUFLO1lBQzlCLHdCQUF3QixFQUFFLElBQUk7U0FDOUIsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IseUJBQXlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztZQUNqRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztTQUNqRCxDQUFBO1FBQ0Qsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JFLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckUsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YseUJBQXlCLEVBQUUsRUFDM0IsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFaEUseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FDOUIsMkJBQTJCLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxXQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakUsb0JBQW9CLENBQ3BCLENBQ0QsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFFM0QsV0FBVztRQUNYLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUs7UUFDM0MsTUFBTSwyQkFBMkIsQ0FBQztZQUNqQyw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsMEJBQTBCLEVBQUUsS0FBSztZQUNqQyx1QkFBdUIsRUFBRSxLQUFLO1lBQzlCLHdCQUF3QixFQUFFLEtBQUs7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IseUJBQXlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztZQUNqRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztTQUNqRCxDQUFBO1FBQ0Qsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JFLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckUsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YseUJBQXlCLEVBQUUsRUFDM0IsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFaEUseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FDOUIsMkJBQTJCLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxXQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDakUsb0JBQW9CLENBQ3BCLENBQ0QsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFFM0QsV0FBVztRQUNYLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLGFBQWE7QUFDZCxDQUFDLENBQUMsQ0FBQSJ9