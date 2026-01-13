/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { BracketMatchingController } from '../../browser/bracketMatching.js';
import { createCodeEditorServices, instantiateTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('bracket matching', () => {
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createTextModelWithBrackets(text) {
        const languageId = 'bracketMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        return disposables.add(instantiateTextModel(instantiationService, text, languageId));
    }
    function createCodeEditorWithBrackets(text) {
        return disposables.add(instantiateTestCodeEditor(instantiationService, createTextModelWithBrackets(text)));
    }
    test('issue #183: jump to matching bracket position', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)) + ((5+3)+5);');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // start on closing bracket
        editor.setPosition(new Position(1, 20));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 19));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        // start on opening bracket
        editor.setPosition(new Position(1, 23));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 31));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 23));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 31));
    });
    test('Jump to next bracket', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)); y();');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // start position between brackets
        editor.setPosition(new Position(1, 16));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 18));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 14));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 18));
        // skip brackets in comments
        editor.setPosition(new Position(1, 21));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 23));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 24));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 23));
        // do not break if no brackets are available
        editor.setPosition(new Position(1, 26));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 26));
    });
    test('Select to next bracket', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)); y();');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // start position in open brackets
        editor.setPosition(new Position(1, 9));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 20));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 9, 1, 20));
        // start position in close brackets (should select backwards)
        editor.setPosition(new Position(1, 20));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 20, 1, 9));
        // start position between brackets
        editor.setPosition(new Position(1, 16));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 19));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 19));
        // start position outside brackets
        editor.setPosition(new Position(1, 21));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 25));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 23, 1, 25));
        // do not break if no brackets are available
        editor.setPosition(new Position(1, 26));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 26));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 26, 1, 26));
    });
    test('issue #1772: jump to enclosing brackets', () => {
        const text = [
            'const x = {',
            '    something: [0, 1, 2],',
            '    another: true,',
            '    somethingmore: [0, 2, 4]',
            '};',
        ].join('\n');
        const editor = createCodeEditorWithBrackets(text);
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        editor.setPosition(new Position(3, 5));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getSelection(), new Selection(5, 1, 5, 1));
    });
    test('issue #43371: argument to not select brackets', () => {
        const text = [
            'const x = {',
            '    something: [0, 1, 2],',
            '    another: true,',
            '    somethingmore: [0, 2, 4]',
            '};',
        ].join('\n');
        const editor = createCodeEditorWithBrackets(text);
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        editor.setPosition(new Position(3, 5));
        bracketMatchingController.selectToBracket(false);
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 12, 5, 1));
    });
    test('issue #45369: Select to Bracket with multicursor', () => {
        const editor = createCodeEditorWithBrackets('{  }   {   }   { }');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // cursors inside brackets become selections of the entire bracket contents
        editor.setSelections([
            new Selection(1, 3, 1, 3),
            new Selection(1, 10, 1, 10),
            new Selection(1, 17, 1, 17),
        ]);
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 1, 1, 5),
            new Selection(1, 8, 1, 13),
            new Selection(1, 16, 1, 19),
        ]);
        // cursors to the left of bracket pairs become selections of the entire pair
        editor.setSelections([
            new Selection(1, 1, 1, 1),
            new Selection(1, 6, 1, 6),
            new Selection(1, 14, 1, 14),
        ]);
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 1, 1, 5),
            new Selection(1, 8, 1, 13),
            new Selection(1, 16, 1, 19),
        ]);
        // cursors just right of a bracket pair become selections of the entire pair
        editor.setSelections([
            new Selection(1, 5, 1, 5),
            new Selection(1, 13, 1, 13),
            new Selection(1, 19, 1, 19),
        ]);
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 5, 1, 1),
            new Selection(1, 13, 1, 8),
            new Selection(1, 19, 1, 16),
        ]);
    });
    test('Removes brackets', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)); y();');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        function removeBrackets() {
            bracketMatchingController.removeBrackets();
        }
        // position before the bracket
        editor.setPosition(new Position(1, 9));
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = 3 + (5-7); y();');
        editor.getModel().setValue('var x = (3 + (5-7)); y();');
        // position between brackets
        editor.setPosition(new Position(1, 16));
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = (3 + 5-7); y();');
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = 3 + 5-7; y();');
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = 3 + 5-7; y();');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldE1hdGNoaW5nLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2JyYWNrZXRNYXRjaGluZy90ZXN0L2Jyb3dzZXIvYnJhY2tldE1hdGNoaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDN0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix5QkFBeUIsR0FDekIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLDRCQUEyRCxDQUFBO0lBQy9ELElBQUksZUFBaUMsQ0FBQTtJQUVyQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsb0JBQW9CLEdB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LElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpFLDZEQUE2RDtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXpFLGtDQUFrQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxZ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