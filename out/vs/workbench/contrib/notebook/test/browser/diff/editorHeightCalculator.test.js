/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { DiffEditorHeightCalculatorService } from '../../../browser/diff/editorHeightCalculator.js';
import { URI } from '../../../../../../base/common/uri.js';
import { createTextModel as createTextModelWithText } from '../../../../../../editor/test/common/testTextModel.js';
import { DefaultLinesDiffComputer } from '../../../../../../editor/common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer.js';
import { getEditorPadding } from '../../../browser/diff/diffCellEditorOptions.js';
import { HeightOfHiddenLinesRegionInDiffEditor } from '../../../browser/diff/diffElementViewModel.js';
suite('NotebookDiff EditorHeightCalculator', () => {
    ;
    ['Hide Unchanged Regions', 'Show Unchanged Regions'].forEach((suiteTitle) => {
        suite(suiteTitle, () => {
            const fontInfo = { lineHeight: 18, fontSize: 18 };
            let disposables;
            let textModelResolver;
            let editorWorkerService;
            const original = URI.parse('original');
            const modified = URI.parse('modified');
            let originalModel;
            let modifiedModel;
            const diffComputer = new DefaultLinesDiffComputer();
            let calculator;
            const hideUnchangedRegions = suiteTitle.startsWith('Hide');
            const configurationService = new TestConfigurationService({
                notebook: { diff: { ignoreMetadata: true } },
                diffEditor: {
                    hideUnchangedRegions: {
                        enabled: hideUnchangedRegions,
                        minimumLineCount: 3,
                        contextLineCount: 3,
                    },
                },
            });
            function createTextModel(lines) {
                return createTextModelWithText(lines.join('\n'));
            }
            teardown(() => disposables.dispose());
            ensureNoDisposablesAreLeakedInTestSuite();
            setup(() => {
                disposables = new DisposableStore();
                textModelResolver = new (class extends mock() {
                    async createModelReference(resource) {
                        return {
                            dispose: () => { },
                            object: {
                                textEditorModel: resource === original ? originalModel : modifiedModel,
                                getLanguageId: () => 'javascript',
                            },
                        };
                    }
                })();
                editorWorkerService = new (class extends mock() {
                    async computeDiff(_original, _modified, options, _algorithm) {
                        const originalLines = new Array(originalModel.getLineCount())
                            .fill(0)
                            .map((_, i) => originalModel.getLineContent(i + 1));
                        const modifiedLines = new Array(modifiedModel.getLineCount())
                            .fill(0)
                            .map((_, i) => modifiedModel.getLineContent(i + 1));
                        const result = diffComputer.computeDiff(originalLines, modifiedLines, options);
                        const identical = originalLines.join('') === modifiedLines.join('');
                        return {
                            identical,
                            quitEarly: result.hitTimeout,
                            changes: result.changes,
                            moves: result.moves,
                        };
                    }
                })();
                calculator = new DiffEditorHeightCalculatorService(fontInfo.lineHeight, textModelResolver, editorWorkerService, configurationService);
            });
            test('1 original line with change in same line', async () => {
                originalModel = disposables.add(createTextModel(['Hello World']));
                modifiedModel = disposables.add(createTextModel(['Foo Bar']));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(1, 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('1 original line with insertion of a new line', async () => {
                originalModel = disposables.add(createTextModel(['Hello World']));
                modifiedModel = disposables.add(createTextModel(['Hello World', 'Foo Bar']));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(2, 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('1 line with update to a line and insert of a new line', async () => {
                originalModel = disposables.add(createTextModel(['Hello World']));
                modifiedModel = disposables.add(createTextModel(['Foo Bar', 'Bar Baz']));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(2, 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('10 line with update to a line and insert of a new line', async () => {
                originalModel = disposables.add(createTextModel(createLines(10)));
                modifiedModel = disposables.add(createTextModel(createLines(10).concat('Foo Bar')));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(hideUnchangedRegions ? 4 : 11, hideUnchangedRegions ? 1 : 0);
                assert.strictEqual(height, expectedHeight);
            });
            test('50 lines with updates, deletions and inserts', async () => {
                originalModel = disposables.add(createTextModel(createLines(60)));
                const modifiedLines = createLines(60);
                modifiedLines[3] = 'Foo Bar';
                modifiedLines.splice(7, 3);
                modifiedLines.splice(10, 0, 'Foo Bar1', 'Foo Bar2', 'Foo Bar3');
                modifiedLines.splice(30, 0, '', '');
                modifiedLines.splice(40, 4);
                modifiedLines.splice(50, 0, '1', '2', '3', '4', '5');
                modifiedModel = disposables.add(createTextModel(modifiedLines));
                const height = await calculator.diffAndComputeHeight(original, modified);
                const expectedHeight = getExpectedHeight(hideUnchangedRegions ? 50 : 70, hideUnchangedRegions ? 3 : 0);
                assert.strictEqual(height, expectedHeight);
            });
            function getExpectedHeight(visibleLineCount, unchangeRegionsHeight) {
                return (visibleLineCount * fontInfo.lineHeight +
                    getEditorPadding(visibleLineCount).top +
                    getEditorPadding(visibleLineCount).bottom +
                    unchangeRegionsHeight * HeightOfHiddenLinesRegionInDiffEditor);
            }
            function createLines(count, linePrefix = 'Hello World') {
                return new Array(count).fill(0).map((_, i) => `${linePrefix} ${i}`);
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvZGlmZi9lZGl0b3JIZWlnaHRDYWxjdWxhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQWMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFNbkcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLElBQUksdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVsSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyRkFBMkYsQ0FBQTtBQVNwSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVyRyxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELENBQUM7SUFBQSxDQUFDLHdCQUF3QixFQUFFLHdCQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7UUFDNUUsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFH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