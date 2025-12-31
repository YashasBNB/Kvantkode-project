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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldE1hdGNoaW5nLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9icmFja2V0TWF0Y2hpbmcvdGVzdC9icm93c2VyL2JyYWNrZXRNYXRjaGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIseUJBQXlCLEdBQ3pCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSw0QkFBMkQsQ0FBQTtJQUMvRCxJQUFJLGVBQWlDLENBQUE7SUFFckMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ25DLG9CQUFvQixHQUFHLHdCQUF3QixDQUFDLFdBQVcsQ0FB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QUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0Qyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6RSw2REFBNkQ7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2Qyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV6RSxrQ0FBa0M7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2Qyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFT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