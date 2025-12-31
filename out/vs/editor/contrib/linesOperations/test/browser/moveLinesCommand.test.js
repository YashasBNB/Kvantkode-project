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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUxpbmVzQ29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGluZXNPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci9tb3ZlTGluZXNDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUVwSCxJQUFXLGtCQUdWO0FBSEQsV0FBVyxrQkFBa0I7SUFDNUIsdURBQUUsQ0FBQTtJQUNGLDJEQUFJLENBQUE7QUFDTCxDQUFDLEVBSFUsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc1QjtBQUVELFNBQVMsd0JBQXdCLENBQ2hDLEtBQWUsRUFDZixTQUFvQixFQUNwQixhQUF1QixFQUN2QixpQkFBNEIsRUFDNUIsNEJBQTREO0lBRTVELDRCQUE0QixrQ0FFM0IsS0FBSyxFQUNMLFNBQVMsRUFDVCxhQUFhLEVBQ2IsaUJBQWlCLEVBQ2pCLDRCQUE0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