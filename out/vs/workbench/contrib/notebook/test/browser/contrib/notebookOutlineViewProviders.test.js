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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lVmlld1Byb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tPdXRsaW5lVmlld1Byb3ZpZGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVqRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFNckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbkcsT0FBTyxFQUNOLDJCQUEyQixFQUUzQiwyQkFBMkIsRUFDM0IseUJBQXlCLEdBQ3pCLE1BQU0scURBQXFELENBQUE7QUFHNUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBU3pFLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRTtJQUN4QyxnQkFBZ0I7SUFFaEIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxNQUFNLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtJQUMzRCxNQUFNLFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7SUFFM0MsTUFBTSxtQkFBbUIsR0FBeUMsRUFBRSxDQUFBO0lBQ3BFLFNBQVMsc0JBQXNCLENBQUMsT0FBNkIsRUFBRSxXQUFXLEdBQUcsUUFBUTtRQUNwRixtQkFBbUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxPQUFPLENBQUE7SUFDM0MsQ0FBQztJQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWtDO1FBQ3hFLGdCQUFnQjtZQUN4QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0tBQ0QsQ0FBQyxFQUFFLENBQUE7SUFFSixNQUFNLGdCQUFnQjtRQUNyQixZQUFvQixNQUFjO1lBQWQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFdEMsa0JBQWtCO1lBQ2pCLE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLENBQUM7S0FDRDtJQUNELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQXdCO1FBQ2pFLFdBQVcsQ0FBQyxLQUFpQixFQUFFLElBQVM7WUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUE0QixDQUFBO1lBQ3pFLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBQ1EsZ0JBQWdCLENBQUMsSUFBUztZQUNsQyxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUNKLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQXFCO1FBQzNELG9CQUFvQixDQUFDLEdBQVE7WUFDckMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUN0QixNQUFNLEVBQUU7b0JBQ1AsZUFBZSxFQUFFO3dCQUNoQixFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRTt3QkFDbEIsWUFBWTs0QkFDWCxPQUFPLENBQUMsQ0FBQTt3QkFDVCxDQUFDO3FCQUNEO2lCQUNEO2dCQUNELE9BQU8sS0FBSSxDQUFDO2FBQzRCLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0tBQ0QsQ0FBQyxFQUFFLENBQUE7SUFFSixhQUFhO0lBQ2Isa0JBQWtCO0lBRWxCLFNBQVMsdUJBQXVCLENBQUMsVUFBa0IsQ0FBQyxFQUFFLE1BQU0sR0FBRyxRQUFRLEVBQUUsV0FBVyxHQUFHLFFBQVE7UUFDOUYsT0FBTztZQUNOLEdBQUcsRUFBRTtnQkFDSixRQUFRO29CQUNQLE9BQU8sV0FBVyxDQUFBO2dCQUNuQixDQUFDO2FBQ0Q7WUFDRCxFQUFFLEVBQUUsV0FBVztZQUNmLFVBQVUsRUFBRTtnQkFDWCxZQUFZO29CQUNYLE9BQU8sQ0FBQyxDQUFBO2dCQUNULENBQUM7YUFDRDtZQUNELE9BQU87Z0JBQ04sT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1lBQ0QsS0FBSyxFQUFFO2dCQUNOLFNBQVMsRUFBRTtvQkFDVixFQUFFLEVBQUUsV0FBVztvQkFDZixZQUFZO3dCQUNYLE9BQU8sT0FBTyxDQUFBO29CQUNmLENBQUM7aUJBQ0Q7YUFDRDtZQUNELGdCQUFnQjtnQkFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBb0IsQ0FBQTtZQUN2QyxDQUFDO1lBQ0QsUUFBUSxFQUFFLENBQUM7U0FDTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxTQUFTLDJCQUEyQixDQUNuQyxPQUF1QixFQUN2QixnQkFBMEMsU0FBUztRQUVuRCxPQUFPLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUE4QztZQUFoRTs7Z0JBQ0YsV0FBTSxHQUFtQztvQkFDakQsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLGFBQWEsRUFBRSxhQUFhO2lCQUM1QixDQUFBO1lBQ0YsQ0FBQztTQUFBLENBQUMsRUFBRSxDQUFBO0lBQ0wsQ0FBQztJQUVELFNBQVMseUJBQXlCLENBQ2pDLFVBQWtCLENBQUMsRUFDbkIsTUFBTSxHQUFHLFFBQVEsRUFDakIsV0FBVyxHQUFHLFFBQVEsRUFDdEIsYUFBYSxHQUFHLENBQUM7UUFFakIsT0FBTztZQUNOLFVBQVUsRUFBRTtnQkFDWCxZQUFZO29CQUNYLE9BQU8sQ0FBQyxDQUFBO2dCQUNULENBQUM7YUFDRDtZQUNELE9BQU87Z0JBQ04sT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1lBQ0QsZ0JBQWdCO2dCQUNmLE9BQU8sYUFBYSxDQUFBO1lBQ3JCLENBQUM7WUFDRCxLQUFLLEVBQUU7Z0JBQ04sU0FBUyxFQUFFO29CQUNWLEVBQUUsRUFBRSxXQUFXO29CQUNmLFlBQVk7d0JBQ1gsT0FBTyxPQUFPLENBQUE7b0JBQ2YsQ0FBQztpQkFDRDthQUNEO1lBQ0QsZ0JBQWdCO2dCQUNmLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFvQixDQUFBO1lBQ3ZDLENBQUM7WUFDRCxRQUFRLEVBQUUsQ0FBQztTQUNPLENBQUE7SUFDcEIsQ0FBQztJQUVELFNBQVMsT0FBTyxDQUNmLE9BQXFCLEVBQ3JCLFVBQTBEO1FBRTFELE1BQU0sUUFBUSxHQUFtQixFQUFFLENBQUE7UUFFbkMsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoRCxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUMsT0FBdUI7UUFDaEQsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sTUFBTSxHQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sV0FBVyxHQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWhELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFeEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztvQkFDYixNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO29CQUM5QixJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDZixZQUFZO3dCQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQ2xCLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQ3ZCLE1BQUs7b0JBQ04sQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7d0JBQzVDLElBQUksZUFBZSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7NEJBQ3pDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7NEJBQy9CLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7NEJBQ3ZCLE1BQUs7d0JBQ04sQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTt3QkFDbEIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxVQUFVLDJCQUEyQixDQUFDLE1BTTFDO1FBQ0EsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FDOUMsMENBQTBDLEVBQzFDLE1BQU0sQ0FBQyw4QkFBOEIsQ0FDckMsQ0FBQTtRQUNELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQzlDLGdDQUFnQyxFQUNoQyxNQUFNLENBQUMsb0JBQW9CLENBQzNCLENBQUE7UUFDRCxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUM5QyxzQ0FBc0MsRUFDdEMsTUFBTSxDQUFDLDBCQUEwQixDQUNqQyxDQUFBO1FBQ0QsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FDOUMscUNBQXFDLEVBQ3JDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDOUIsQ0FBQTtRQUNELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQzlDLG9DQUFvQyxFQUNwQyxNQUFNLENBQUMsd0JBQXdCLENBQy9CLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYTtJQUNiLHNCQUFzQjtJQUV0QixJQUFJLENBQUMsK0VBQStFLEVBQUUsS0FBSztRQUMxRixNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLElBQUk7WUFDcEMsb0JBQW9CLEVBQUUsS0FBSztZQUMzQiwwQkFBMEIsRUFBRSxJQUFJO1lBQ2hDLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNELGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHVCQUF1QixFQUFFLEVBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUUxRCxXQUFXO1FBQ1gsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSztRQUN4QyxNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLEtBQUs7WUFDckMsb0JBQW9CLEVBQUUsS0FBSztZQUMzQiwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNELGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHVCQUF1QixFQUFFLEVBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUUxRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUs7UUFDeEMsTUFBTSwyQkFBMkIsQ0FBQztZQUNqQyw4QkFBOEIsRUFBRSxJQUFJO1lBQ3BDLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsMEJBQTBCLEVBQUUsS0FBSztZQUNqQyx1QkFBdUIsRUFBRSxLQUFLO1lBQzlCLHdCQUF3QixFQUFFLEtBQUs7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IseUJBQXlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztZQUNqRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztTQUNqRCxDQUFBO1FBQ0Qsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzRCxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUzRCxnQkFBZ0I7UUFDaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQkFBMkIsQ0FDbkQsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUNwQyxDQUFDLENBQUMsRUFDRixDQUFDLENBQUMsRUFDRix1QkFBdUIsRUFBRSxFQUN6QixVQUFVLEVBQ1YsS0FBSyxFQUNMLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxDQUNULENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3BDLElBQUksMkJBQTJCLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQ2hFLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBWSxFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFFMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSztRQUNyRCxNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLElBQUk7WUFDcEMsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQiwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNELGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHVCQUF1QixFQUFFLEVBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUUxRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsS0FBSztRQUMvRCxNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLElBQUk7WUFDcEMsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQiwwQkFBMEIsRUFBRSxJQUFJO1lBQ2hDLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTNELGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHVCQUF1QixFQUFFLEVBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSwyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUUxRCxXQUFXO1FBQ1gsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLGFBQWE7SUFDYixvQkFBb0I7SUFFcEIsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUs7UUFDM0QsTUFBTSwyQkFBMkIsQ0FBQztZQUNqQyw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsMEJBQTBCLEVBQUUsS0FBSztZQUNqQyx1QkFBdUIsRUFBRSxJQUFJO1lBQzdCLHdCQUF3QixFQUFFLEtBQUs7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IseUJBQXlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztZQUNqRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztTQUNqRCxDQUFBO1FBQ0Qsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JFLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckUsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNsQyxJQUFJLHlCQUF5QixDQUM1QiwyQkFBMkIsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQ3ZELG9CQUFvQixFQUNwQixZQUFZLENBQ1osQ0FDRCxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUV4RCxXQUFXO1FBQ1gsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0VBQXNFLEVBQUUsS0FBSztRQUNqRixNQUFNLDJCQUEyQixDQUFDO1lBQ2pDLDhCQUE4QixFQUFFLEtBQUs7WUFDckMsb0JBQW9CLEVBQUUsS0FBSztZQUMzQiwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLHVCQUF1QixFQUFFLElBQUk7WUFDN0Isd0JBQXdCLEVBQUUsS0FBSztTQUMvQixDQUFDLENBQUE7UUFFRiwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYix5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDN0MseUJBQXlCLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ2pELHVCQUF1QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDO1NBQ2pELENBQUE7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXJFLGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHVCQUF1QixFQUFFLEVBQ3pCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDbEMsSUFBSSx5QkFBeUIsQ0FDNUIsMkJBQTJCLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUN2RCxvQkFBb0IsRUFDcEIsWUFBWSxDQUNaLENBQ0QsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFFeEQsV0FBVztRQUNYLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEtBQUs7UUFDckMsTUFBTSwyQkFBMkIsQ0FBQztZQUNqQyw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsMEJBQTBCLEVBQUUsS0FBSztZQUNqQyx1QkFBdUIsRUFBRSxLQUFLO1lBQzlCLHdCQUF3QixFQUFFLEtBQUs7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLE1BQU0sS0FBSyxHQUFHO1lBQ2IseUJBQXlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztZQUNqRCx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQztTQUNqRCxDQUFBO1FBQ0Qsc0JBQXNCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JFLHNCQUFzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckUsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLENBQ25ELGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLEVBQ0YsdUJBQXVCLEVBQUUsRUFDekIsVUFBVSxFQUNWLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNsQyxJQUFJLHlCQUF5QixDQUM1QiwyQkFBMkIsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQ3ZELG9CQUFvQixFQUNwQixZQUFZLENBQ1osQ0FDRCxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUV4RCxXQUFXO1FBQ1gsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6QyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixhQUFhO0lBQ2Isc0JBQXNCO0lBRXRCLElBQUksQ0FBQywrQkFBK0IsRUFBRSxLQUFLO1FBQzFDLE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsS0FBSztZQUNyQyxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLDBCQUEwQixFQUFFLEtBQUs7WUFDakMsdUJBQXVCLEVBQUUsS0FBSztZQUM5Qix3QkFBd0IsRUFBRSxJQUFJO1NBQzlCLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRSxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXJFLGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHlCQUF5QixFQUFFLEVBQzNCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRWhFLHlDQUF5QztRQUN6QyxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3BDLElBQUksMkJBQTJCLENBQzlCLDJCQUEyQixDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsV0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pFLG9CQUFvQixDQUNwQixDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBRTNELFdBQVc7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLO1FBQzNDLE1BQU0sMkJBQTJCLENBQUM7WUFDakMsOEJBQThCLEVBQUUsS0FBSztZQUNyQyxvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLDBCQUEwQixFQUFFLEtBQUs7WUFDakMsdUJBQXVCLEVBQUUsS0FBSztZQUM5Qix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRztZQUNiLHlCQUF5QixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3Qyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7WUFDakQsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7U0FDakQsQ0FBQTtRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRSxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXJFLGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixDQUNuRCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ3BDLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxFQUNGLHlCQUF5QixFQUFFLEVBQzNCLFVBQVUsRUFDVixLQUFLLEVBQ0wsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRWhFLHlDQUF5QztRQUN6QyxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3BDLElBQUksMkJBQTJCLENBQzlCLDJCQUEyQixDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsV0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2pFLG9CQUFvQixDQUNwQixDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBRTNELFdBQVc7UUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixhQUFhO0FBQ2QsQ0FBQyxDQUFDLENBQUEifQ==