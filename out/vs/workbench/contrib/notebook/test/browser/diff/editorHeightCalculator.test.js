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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2RpZmYvZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFjLE1BQU0sNENBQTRDLENBQUE7QUFDeEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBTW5HLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxJQUFJLHVCQUF1QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFbEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkZBQTJGLENBQUE7QUFTcEksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFckcsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxDQUFDO0lBQUEsQ0FBQyx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1FBQzVFLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQ3RCLE1BQU0sUUFBUSxH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