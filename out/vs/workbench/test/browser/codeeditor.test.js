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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWVkaXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9jb2RlZWRpdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWhGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7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