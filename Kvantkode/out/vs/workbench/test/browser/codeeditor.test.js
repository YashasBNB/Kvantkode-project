/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../base/common/uri.js';
import { workbenchInstantiationService, TestEditorService } from './workbenchTestServices.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { RangeHighlightDecorations } from '../../browser/codeeditor.js';
import { createTestCodeEditor } from '../../../editor/test/browser/testCodeEditor.js';
import { Range } from '../../../editor/common/core/range.js';
import { Position } from '../../../editor/common/core/position.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { CoreNavigationCommands } from '../../../editor/browser/coreCommands.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { createTextModel } from '../../../editor/test/common/testTextModel.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('Editor - Range decorations', () => {
    let disposables;
    let instantiationService;
    let codeEditor;
    let model;
    let text;
    let testObject;
    const modelsToDispose = [];
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IEditorService, new TestEditorService());
        instantiationService.stub(ILanguageService, LanguageService);
        instantiationService.stub(IModelService, stubModelService(instantiationService));
        text = 'LINE1' + '\n' + 'LINE2' + '\n' + 'LINE3' + '\n' + 'LINE4' + '\r\n' + 'LINE5';
        model = disposables.add(aModel(URI.file('some_file')));
        codeEditor = disposables.add(createTestCodeEditor(model));
        instantiationService.stub(IEditorService, 'activeEditor', {
            get resource() {
                return codeEditor.getModel().uri;
            },
        });
        instantiationService.stub(IEditorService, 'activeTextEditorControl', codeEditor);
        testObject = disposables.add(instantiationService.createInstance(RangeHighlightDecorations));
    });
    teardown(() => {
        codeEditor.dispose();
        modelsToDispose.forEach((model) => model.dispose());
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('highlight range for the resource if it is an active editor', function () {
        const range = new Range(1, 1, 1, 1);
        testObject.highlightRange({ resource: model.uri, range });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, [range]);
    });
    test('remove highlight range', function () {
        testObject.highlightRange({
            resource: model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        });
        testObject.removeHighlightRange();
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('highlight range for the resource removes previous highlight', function () {
        testObject.highlightRange({
            resource: model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        });
        const range = new Range(2, 2, 4, 3);
        testObject.highlightRange({ resource: model.uri, range });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, [range]);
    });
    test('highlight range for a new resource removes highlight of previous resource', function () {
        testObject.highlightRange({
            resource: model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        });
        const anotherModel = prepareActiveEditor('anotherModel');
        const range = new Range(2, 2, 4, 3);
        testObject.highlightRange({ resource: anotherModel.uri, range });
        let actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
        actuals = rangeHighlightDecorations(anotherModel);
        assert.deepStrictEqual(actuals, [range]);
    });
    test('highlight is removed on model change', function () {
        testObject.highlightRange({
            resource: model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        });
        prepareActiveEditor('anotherModel');
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('highlight is removed on cursor position change', function () {
        testObject.highlightRange({
            resource: model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        });
        codeEditor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(2, 1),
        });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('range is not highlight if not active editor', function () {
        const model = aModel(URI.file('some model'));
        testObject.highlightRange({
            resource: model.uri,
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('previous highlight is not removed if not active editor', function () {
        const range = new Range(1, 1, 1, 1);
        testObject.highlightRange({ resource: model.uri, range });
        const model1 = aModel(URI.file('some model'));
        testObject.highlightRange({
            resource: model1.uri,
            range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 },
        });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, [range]);
    });
    function prepareActiveEditor(resource) {
        const model = aModel(URI.file(resource));
        codeEditor.setModel(model);
        return model;
    }
    function aModel(resource, content = text) {
        const model = createTextModel(content, undefined, undefined, resource);
        modelsToDispose.push(model);
        return model;
    }
    function rangeHighlightDecorations(m) {
        const rangeHighlights = [];
        for (const dec of m.getAllDecorations()) {
            if (dec.options.className === 'rangeHighlight') {
                rangeHighlights.push(dec.range);
            }
        }
        rangeHighlights.sort(Range.compareRangesUsingStarts);
        return rangeHighlights;
    }
    function stubModelService(instantiationService) {
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IThemeService, new TestThemeService());
        return instantiationService.createInstance(ModelService);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWVkaXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL2NvZGVlZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDcEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFl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