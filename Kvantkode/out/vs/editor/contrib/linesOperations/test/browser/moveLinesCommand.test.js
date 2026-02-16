var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { MoveLinesCommand } from '../../browser/moveLinesCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
var MoveLinesDirection;
(function (MoveLinesDirection) {
    MoveLinesDirection[MoveLinesDirection["Up"] = 0] = "Up";
    MoveLinesDirection[MoveLinesDirection["Down"] = 1] = "Down";
})(MoveLinesDirection || (MoveLinesDirection = {}));
function testMoveLinesDownCommand(lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownCommand(1 /* MoveLinesDirection.Down */, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesUpCommand(lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownCommand(0 /* MoveLinesDirection.Up */, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesDownWithIndentCommand(languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownWithIndentCommand(1 /* MoveLinesDirection.Down */, languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesUpWithIndentCommand(languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownWithIndentCommand(0 /* MoveLinesDirection.Up */, languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesUpOrDownCommand(direction, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    const disposables = new DisposableStore();
    if (!languageConfigurationService) {
        languageConfigurationService = disposables.add(new TestLanguageConfigurationService());
    }
    testCommand(lines, null, selection, (accessor, sel) => new MoveLinesCommand(sel, direction === 0 /* MoveLinesDirection.Up */ ? false : true, 3 /* EditorAutoIndentStrategy.Advanced */, languageConfigurationService), expectedLines, expectedSelection);
    disposables.dispose();
}
function testMoveLinesUpOrDownWithIndentCommand(direction, languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    const disposables = new DisposableStore();
    if (!languageConfigurationService) {
        languageConfigurationService = disposables.add(new TestLanguageConfigurationService());
    }
    testCommand(lines, languageId, selection, (accessor, sel) => new MoveLinesCommand(sel, direction === 0 /* MoveLinesDirection.Up */ ? false : true, 4 /* EditorAutoIndentStrategy.Full */, languageConfigurationService), expectedLines, expectedSelection);
    disposables.dispose();
}
suite('Editor Contrib - Move Lines Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('move first up / last down disabled', function () {
        testMoveLinesUpCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1));
        testMoveLinesDownCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 1, 5, 1), ['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 1, 5, 1));
    });
    test('move first line down', function () {
        testMoveLinesDownCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 4, 1, 1), ['second line', 'first', 'third line', 'fourth line', 'fifth'], new Selection(2, 4, 2, 1));
    });
    test('move 2nd line up', function () {
        testMoveLinesUpCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 2, 1), ['second line', 'first', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1));
    });
    test('issue #1322a: move 2nd line up', function () {
        testMoveLinesUpCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(2, 12, 2, 12), ['second line', 'first', 'third line', 'fourth line', 'fifth'], new Selection(1, 12, 1, 12));
    });
    test('issue #1322b: move last line up', function () {
        testMoveLinesUpCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 6, 5, 6), ['first', 'second line', 'third line', 'fifth', 'fourth line'], new Selection(4, 6, 4, 6));
    });
    test('issue #1322c: move last line selected up', function () {
        testMoveLinesUpCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 6, 5, 1), ['first', 'second line', 'third line', 'fifth', 'fourth line'], new Selection(4, 6, 4, 1));
    });
    test('move last line up', function () {
        testMoveLinesUpCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 1, 5, 1), ['first', 'second line', 'third line', 'fifth', 'fourth line'], new Selection(4, 1, 4, 1));
    });
    test('move 4th line down', function () {
        testMoveLinesDownCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(4, 1, 4, 1), ['first', 'second line', 'third line', 'fifth', 'fourth line'], new Selection(5, 1, 5, 1));
    });
    test('move multiple lines down', function () {
        testMoveLinesDownCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(4, 4, 2, 2), ['first', 'fifth', 'second line', 'third line', 'fourth line'], new Selection(5, 4, 3, 2));
    });
    test('invisible selection is ignored', function () {
        testMoveLinesDownCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 1, 1), ['second line', 'first', 'third line', 'fourth line', 'fifth'], new Selection(3, 1, 2, 1));
    });
});
let IndentRulesMode = class IndentRulesMode extends Disposable {
    constructor(indentationRules, languageService, languageConfigurationService) {
        super();
        this.languageId = 'moveLinesIndentMode';
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(languageConfigurationService.register(this.languageId, {
            indentationRules: indentationRules,
        }));
    }
};
IndentRulesMode = __decorate([
    __param(1, ILanguageService),
    __param(2, ILanguageConfigurationService)
], IndentRulesMode);
suite('Editor contrib - Move Lines Command honors Indentation Rules', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const indentRules = {
        decreaseIndentPattern: /^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
        increaseIndentPattern: /(\{[^}"'`]*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
        indentNextLinePattern: /^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$)/,
        unIndentedLinePattern: /^(?!.*([;{}]|\S:)\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!.*(\{[^}"']*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$))/,
    };
    // https://github.com/microsoft/vscode/issues/28552#issuecomment-307862797
    test('first line indentation adjust to 0', () => {
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        const mode = new IndentRulesMode(indentRules, languageService, languageConfigurationService);
        testMoveLinesUpWithIndentCommand(mode.languageId, ['class X {', '\tz = 2', '}'], new Selection(2, 1, 2, 1), ['z = 2', 'class X {', '}'], new Selection(1, 1, 1, 1), languageConfigurationService);
        mode.dispose();
        languageService.dispose();
        languageConfigurationService.dispose();
    });
    // https://github.com/microsoft/vscode/issues/28552#issuecomment-307867717
    test('move lines across block', () => {
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        const mode = new IndentRulesMode(indentRules, languageService, languageConfigurationService);
        testMoveLinesDownWithIndentCommand(mode.languageId, [
            'const value = 2;',
            'const standardLanguageDescriptions = [',
            '    {',
            "        diagnosticSource: 'js',",
            '    }',
            '];',
        ], new Selection(1, 1, 1, 1), [
            'const standardLanguageDescriptions = [',
            '    const value = 2;',
            '    {',
            "        diagnosticSource: 'js',",
            '    }',
            '];',
        ], new Selection(2, 5, 2, 5), languageConfigurationService);
        mode.dispose();
        languageService.dispose();
        languageConfigurationService.dispose();
    });
    test('move line should still work as before if there is no indentation rules', () => {
        testMoveLinesUpWithIndentCommand(null, [
            'if (true) {',
            '    var task = new Task(() => {',
            '        var work = 1234;',
            '    });',
            '}',
        ], new Selection(3, 1, 3, 1), [
            'if (true) {',
            '        var work = 1234;',
            '    var task = new Task(() => {',
            '    });',
            '}',
        ], new Selection(2, 1, 2, 1));
    });
});
let EnterRulesMode = class EnterRulesMode extends Disposable {
    constructor(languageService, languageConfigurationService) {
        super();
        this.languageId = 'moveLinesEnterMode';
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(languageConfigurationService.register(this.languageId, {
            indentationRules: {
                decreaseIndentPattern: /^\s*\[$/,
                increaseIndentPattern: /^\s*\]$/,
            },
            brackets: [['{', '}']],
        }));
    }
};
EnterRulesMode = __decorate([
    __param(0, ILanguageService),
    __param(1, ILanguageConfigurationService)
], EnterRulesMode);
suite('Editor - contrib - Move Lines Command honors onEnter Rules', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #54829. move block across block', () => {
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        const mode = new EnterRulesMode(languageService, languageConfigurationService);
        testMoveLinesDownWithIndentCommand(mode.languageId, [
            'if (true) {',
            '    if (false) {',
            '        if (1) {',
            "            console.log('b');",
            '        }',
            "        console.log('a');",
            '    }',
            '}',
        ], new Selection(3, 9, 5, 10), [
            'if (true) {',
            '    if (false) {',
            "        console.log('a');",
            '        if (1) {',
            "            console.log('b');",
            '        }',
            '    }',
            '}',
        ], new Selection(4, 9, 6, 10), languageConfigurationService);
        mode.dispose();
        languageService.dispose();
        languageConfigurationService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUxpbmVzQ29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5lc09wZXJhdGlvbnMvdGVzdC9icm93c2VyL21vdmVMaW5lc0NvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRXBILElBQVcsa0JBR1Y7QUFIRCxXQUFXLGtCQUFrQjtJQUM1Qix1REFBRSxDQUFBO0lBQ0YsMkRBQUksQ0FBQTtBQUNMLENBQUMsRUFIVSxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRzVCO0FBRUQsU0FBUyx3QkFBd0IsQ0FDaEMsS0FBZSxFQUNmLFNBQW9CLEVBQ3BCLGFBQXVCLEVBQ3ZCLGlCQUE0QixFQUM1Qiw0QkFBNEQ7SUFFNUQsNEJBQTRCLGtDQUUzQixLQUFLLEVBQ0wsU0FBUyxFQUNULGFBQWEsRUFDYixpQkFBaUIsRUFDakIsNEJBQTRCLENBQzVCLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FDOUIsS0FBZSxFQUNmLFNBQW9CLEVBQ3BCLGFBQXVCLEVBQ3ZCLGlCQUE0QixFQUM1Qiw0QkFBNEQ7SUFFNUQsNEJBQTRCLGdDQUUzQixLQUFLLEVBQ0wsU0FBUyxFQUNULGFBQWEsRUFDYixpQkFBaUIsRUFDakIsNEJBQTRCLENBQzVCLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxrQ0FBa0MsQ0FDMUMsVUFBa0IsRUFDbEIsS0FBZSxFQUNmLFNBQW9CLEVBQ3BCLGFBQXVCLEVBQ3ZCLGlCQUE0QixFQUM1Qiw0QkFBNEQ7SUFFNUQsc0NBQXNDLGtDQUVyQyxVQUFVLEVBQ1YsS0FBSyxFQUNMLFNBQVMsRUFDVCxhQUFhLEVBQ2IsaUJBQWlCLEVBQ2pCLDRCQUE0QixDQUM1QixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsZ0NBQWdDLENBQ3hDLFVBQWtCLEVBQ2xCLEtBQWUsRUFDZixTQUFvQixFQUNwQixhQUF1QixFQUN2QixpQkFBNEIsRUFDNUIsNEJBQTREO0lBRTVELHNDQUFzQyxnQ0FFckMsVUFBVSxFQUNWLEtBQUssRUFDTCxTQUFTLEVBQ1QsYUFBYSxFQUNiLGlCQUFpQixFQUNqQiw0QkFBNEIsQ0FDNUIsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUNwQyxTQUE2QixFQUM3QixLQUFlLEVBQ2YsU0FBb0IsRUFDcEIsYUFBdUIsRUFDdkIsaUJBQTRCLEVBQzVCLDRCQUE0RDtJQUU1RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1FBQ25DLDRCQUE0QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUNELFdBQVcsQ0FDVixLQUFLLEVBQ0wsSUFBSSxFQUNKLFNBQVMsRUFDVCxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUNqQixJQUFJLGdCQUFnQixDQUNuQixHQUFHLEVBQ0gsU0FBUyxrQ0FBMEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLDZDQUVsRCw0QkFBNEIsQ0FDNUIsRUFDRixhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7SUFDRCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsc0NBQXNDLENBQzlDLFNBQTZCLEVBQzdCLFVBQWtCLEVBQ2xCLEtBQWUsRUFDZixTQUFvQixFQUNwQixhQUF1QixFQUN2QixpQkFBNEIsRUFDNUIsNEJBQTREO0lBRTVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDekMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7UUFDbkMsNEJBQTRCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBQ0QsV0FBVyxDQUNWLEtBQUssRUFDTCxVQUFVLEVBQ1YsU0FBUyxFQUNULENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQ2pCLElBQUksZ0JBQWdCLENBQ25CLEdBQUcsRUFDSCxTQUFTLGtDQUEwQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUkseUNBRWxELDRCQUE0QixDQUM1QixFQUNGLGFBQWEsRUFDYixpQkFBaUIsQ0FDakIsQ0FBQTtJQUNELFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUN0QixDQUFDO0FBRUQsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRTtRQUMxQyxzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCx3QkFBd0IsQ0FDdkIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtRQUM1Qix3QkFBd0IsQ0FDdkIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtRQUN4QixzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtRQUN0QyxzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUMzQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQzNCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRTtRQUN2QyxzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRTtRQUNoRCxzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtRQUN6QixzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtRQUMxQix3QkFBd0IsQ0FDdkIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUNoQyx3QkFBd0IsQ0FDdkIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtRQUN0Qyx3QkFBd0IsQ0FDdkIsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzlELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDOUQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVO0lBRXZDLFlBQ0MsZ0JBQWlDLEVBQ2YsZUFBaUMsRUFDcEIsNEJBQTJEO1FBRTFGLEtBQUssRUFBRSxDQUFBO1FBTlEsZUFBVSxHQUFHLHFCQUFxQixDQUFBO1FBT2pELElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLFNBQVMsQ0FDYiw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUN0RCxnQkFBZ0IsRUFBRSxnQkFBZ0I7U0FDbEMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWZLLGVBQWU7SUFJbEIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLDZCQUE2QixDQUFBO0dBTDFCLGVBQWUsQ0FlcEI7QUFFRCxLQUFLLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO0lBQzFFLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxXQUFXLEdBQUc7UUFDbkIscUJBQXFCLEVBQ3BCLDJGQUEyRjtRQUM1RixxQkFBcUIsRUFDcEIseUdBQXlHO1FBQzFHLHFCQUFxQixFQUFFLG1FQUFtRTtRQUMxRixxQkFBcUIsRUFDcEIsK1RBQStUO0tBQ2hVLENBQUE7SUFFRCwwRUFBMEU7SUFDMUUsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFBO1FBQzNFLE1BQU0sSUFBSSxHQUFHLElBQUksZUFBZSxDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUU1RixnQ0FBZ0MsQ0FDL0IsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQzdCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6Qiw0QkFBNEIsQ0FDNUIsQ0FBQTtRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN6Qiw0QkFBNEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLDBFQUEwRTtJQUMxRSxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDN0MsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLGdDQUFnQyxFQUFFLENBQUE7UUFDM0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxlQUFlLENBQUMsV0FBVyxFQUFFLGVBQWUsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1FBRTVGLGtDQUFrQyxDQUNqQyxJQUFJLENBQUMsVUFBVSxFQUNmO1lBQ0Msa0JBQWtCO1lBQ2xCLHdDQUF3QztZQUN4QyxPQUFPO1lBQ1AsaUNBQWlDO1lBQ2pDLE9BQU87WUFDUCxJQUFJO1NBQ0osRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyx3Q0FBd0M7WUFDeEMsc0JBQXNCO1lBQ3RCLE9BQU87WUFDUCxpQ0FBaUM7WUFDakMsT0FBTztZQUNQLElBQUk7U0FDSixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6Qiw0QkFBNEIsQ0FDNUIsQ0FBQTtRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN6Qiw0QkFBNEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3RUFBd0UsRUFBRSxHQUFHLEVBQUU7UUFDbkYsZ0NBQWdDLENBQy9CLElBQUssRUFDTDtZQUNDLGFBQWE7WUFDYixpQ0FBaUM7WUFDakMsMEJBQTBCO1lBQzFCLFNBQVM7WUFDVCxHQUFHO1NBQ0gsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxhQUFhO1lBQ2IsMEJBQTBCO1lBQzFCLGlDQUFpQztZQUNqQyxTQUFTO1lBQ1QsR0FBRztTQUNILEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFFdEMsWUFDbUIsZUFBaUMsRUFDcEIsNEJBQTJEO1FBRTFGLEtBQUssRUFBRSxDQUFBO1FBTFEsZUFBVSxHQUFHLG9CQUFvQixDQUFBO1FBTWhELElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLFNBQVMsQ0FDYiw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUN0RCxnQkFBZ0IsRUFBRTtnQkFDakIscUJBQXFCLEVBQUUsU0FBUztnQkFDaEMscUJBQXFCLEVBQUUsU0FBUzthQUNoQztZQUNELFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3RCLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFsQkssY0FBYztJQUdqQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsNkJBQTZCLENBQUE7R0FKMUIsY0FBYyxDQWtCbkI7QUFFRCxLQUFLLENBQUMsNERBQTRELEVBQUUsR0FBRyxFQUFFO0lBQ3hFLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFBO1FBQzNFLE1BQU0sSUFBSSxHQUFHLElBQUksY0FBYyxDQUFDLGVBQWUsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1FBRTlFLGtDQUFrQyxDQUNqQyxJQUFJLENBQUMsVUFBVSxFQUVmO1lBQ0MsYUFBYTtZQUNiLGtCQUFrQjtZQUNsQixrQkFBa0I7WUFDbEIsK0JBQStCO1lBQy9CLFdBQVc7WUFDWCwyQkFBMkI7WUFDM0IsT0FBTztZQUNQLEdBQUc7U0FDSCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUMxQjtZQUNDLGFBQWE7WUFDYixrQkFBa0I7WUFDbEIsMkJBQTJCO1lBQzNCLGtCQUFrQjtZQUNsQiwrQkFBK0I7WUFDL0IsV0FBVztZQUNYLE9BQU87WUFDUCxHQUFHO1NBQ0gsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDMUIsNEJBQTRCLENBQzVCLENBQUE7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZCxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDekIsNEJBQTRCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9