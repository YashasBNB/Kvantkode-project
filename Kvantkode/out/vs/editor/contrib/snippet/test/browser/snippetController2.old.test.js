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
import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { SnippetController2 } from '../../browser/snippetController2.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
let TestSnippetController = class TestSnippetController extends SnippetController2 {
    constructor(editor, _contextKeyService) {
        const testLanguageConfigurationService = new TestLanguageConfigurationService();
        super(editor, new NullLogService(), new LanguageFeaturesService(), _contextKeyService, testLanguageConfigurationService);
        this._contextKeyService = _contextKeyService;
        this._testLanguageConfigurationService = testLanguageConfigurationService;
    }
    dispose() {
        super.dispose();
        this._testLanguageConfigurationService.dispose();
    }
    isInSnippetMode() {
        return SnippetController2.InSnippetMode.getValue(this._contextKeyService);
    }
};
TestSnippetController = __decorate([
    __param(1, IContextKeyService)
], TestSnippetController);
suite('SnippetController', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function snippetTest(cb, lines) {
        if (!lines) {
            lines = ['function test() {', '\tvar x = 3;', '\tvar arr = [];', '\t', '}'];
        }
        const serviceCollection = new ServiceCollection([ILabelService, new (class extends mock() {
            })()], [IWorkspaceContextService, new (class extends mock() {
            })()]);
        withTestCodeEditor(lines, { serviceCollection }, (editor) => {
            editor.getModel().updateOptions({
                insertSpaces: false,
            });
            const snippetController = editor.registerAndInstantiateContribution(TestSnippetController.ID, TestSnippetController);
            const template = [
                'for (var ${1:index}; $1 < ${2:array}.length; $1++) {',
                '\tvar element = $2[$1];',
                '\t$0',
                '}',
            ].join('\n');
            cb(editor, template, snippetController);
            snippetController.dispose();
        });
    }
    test('Simple accepted', () => {
        snippetTest((editor, template, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(template);
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var index; index < array.length; index++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = array[index];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            editor.trigger('test', 'type', { text: 'i' });
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var i; i < array.length; i++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = array[i];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.next();
            editor.trigger('test', 'type', { text: 'arr' });
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var i; i < arr.length; i++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = arr[i];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.prev();
            editor.trigger('test', 'type', { text: 'j' });
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var j; j < arr.length; j++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = arr[j];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.next();
            snippetController.next();
            assert.deepStrictEqual(editor.getPosition(), new Position(6, 3));
        });
    });
    test('Simple canceled', () => {
        snippetTest((editor, template, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(template);
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var index; index < array.length; index++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = array[index];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.cancel();
            assert.deepStrictEqual(editor.getPosition(), new Position(4, 16));
        });
    });
    // test('Stops when deleting lines above', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.insert(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(1, 1, 3, 1),
    // 			text: null
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    // test('Stops when deleting lines below', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.run(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(8, 1, 8, 100),
    // 			text: null
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    // test('Stops when inserting lines above', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.run(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(1, 100, 1, 100),
    // 			text: '\nHello'
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    // test('Stops when inserting lines below', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.run(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(8, 100, 8, 100),
    // 			text: '\nHello'
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    test('Stops when calling model.setValue()', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.getModel().setValue('goodbye');
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when undoing', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.getModel().undo();
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when moving cursor outside', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.setPosition({ lineNumber: 1, column: 1 });
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when disconnecting editor model', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.setModel(null);
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when disposing editor', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            snippetController.dispose();
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Final tabstop with multiple selections', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            codeSnippet = 'foo$0';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 2, startColumn: 4, endLineNumber: 2, endColumn: 4 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            codeSnippet = 'foo$0bar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 2, startColumn: 4, endLineNumber: 2, endColumn: 4 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(1, 5, 1, 5)]);
            codeSnippet = 'foo$0bar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
            assert.ok(second.equalsRange({
                startLineNumber: 1,
                startColumn: 14,
                endLineNumber: 1,
                endColumn: 14,
            }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(1, 5, 1, 5)]);
            codeSnippet = 'foo\n$0\nbar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 4, startColumn: 1, endLineNumber: 4, endColumn: 1 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(1, 5, 1, 5)]);
            codeSnippet = 'foo\n$0\nbar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 4, startColumn: 1, endLineNumber: 4, endColumn: 1 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([new Selection(2, 7, 2, 7)]);
            codeSnippet = 'xo$0r';
            snippetController.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor
                .getSelection()
                .equalsRange({ startLineNumber: 2, startColumn: 8, endColumn: 8, endLineNumber: 2 }));
        });
    });
    test('Final tabstop, #11742 simple', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 19, 1, 19));
            codeSnippet = '{{% url_**$1** %}}';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor
                .getSelection()
                .equalsRange({ startLineNumber: 1, startColumn: 27, endLineNumber: 1, endColumn: 27 }));
            assert.strictEqual(editor.getModel().getValue(), 'example example {{% url_**** %}}');
        }, ['example example sc']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 3, 1, 3));
            codeSnippet = ['afterEach((done) => {', '\t${1}test', '});'].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor
                .getSelection()
                .equalsRange({ startLineNumber: 2, startColumn: 2, endLineNumber: 2, endColumn: 2 }), editor.getSelection().toString());
            assert.strictEqual(editor.getModel().getValue(), 'afterEach((done) => {\n\ttest\n});');
        }, ['af']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 3, 1, 3));
            codeSnippet = ['afterEach((done) => {', '${1}\ttest', '});'].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor
                .getSelection()
                .equalsRange({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }), editor.getSelection().toString());
            assert.strictEqual(editor.getModel().getValue(), 'afterEach((done) => {\n\ttest\n});');
        }, ['af']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 9, 1, 9));
            codeSnippet = ['aft${1}er'].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 8 });
            assert.strictEqual(editor.getModel().getValue(), 'after');
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor
                .getSelection()
                .equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), editor.getSelection().toString());
        }, ['afterone']);
    });
    test('Final tabstop, #11742 different indents', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(2, 4, 2, 4), new Selection(1, 3, 1, 3)]);
            codeSnippet = ['afterEach((done) => {', '\t${0}test', '});'].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 5, startColumn: 3, endLineNumber: 5, endColumn: 3 }), first.toString());
            assert.ok(second.equalsRange({
                startLineNumber: 2,
                startColumn: 2,
                endLineNumber: 2,
                endColumn: 2,
            }), second.toString());
        }, ['af', '\taf']);
    });
    test('Final tabstop, #11890 stay at the beginning', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 5, 1, 5)]);
            codeSnippet = ['afterEach((done) => {', '${1}\ttest', '});'].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            const [first] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 3 }), first.toString());
        }, ['  af']);
    });
    test('Final tabstop, no tabstop', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 3, 1, 3)]);
            codeSnippet = 'afterEach';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.ok(editor
                .getSelection()
                .equalsRange({ startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 10 }));
        }, ['af', '\taf']);
    });
    test('Multiple cursor and overwriteBefore/After, issue #11060', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 7, 1, 7), new Selection(2, 4, 2, 4)]);
            codeSnippet = '_foo';
            controller.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc_foo');
        }, ['this._', 'abc']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 7, 1, 7), new Selection(2, 4, 2, 4)]);
            codeSnippet = 'XX';
            controller.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getModel().getValue(), 'this.XX\nabcXX');
        }, ['this._', 'abc']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7),
                new Selection(2, 4, 2, 4),
                new Selection(3, 5, 3, 5),
            ]);
            codeSnippet = '_foo';
            controller.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc_foo\ndef_foo');
        }, ['this._', 'abc', 'def_']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7), // primary at `this._`
                new Selection(2, 4, 2, 4),
                new Selection(3, 6, 3, 6),
            ]);
            codeSnippet = '._foo';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc._foo\ndef._foo');
        }, ['this._', 'abc', 'def._']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(3, 6, 3, 6), // primary at `def._`
                new Selection(1, 7, 1, 7),
                new Selection(2, 4, 2, 4),
            ]);
            codeSnippet = '._foo';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc._foo\ndef._foo');
        }, ['this._', 'abc', 'def._']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(2, 4, 2, 4), // primary at `abc`
                new Selection(3, 6, 3, 6),
                new Selection(1, 7, 1, 7),
            ]);
            codeSnippet = '._foo';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getModel().getValue(), 'this._._foo\na._foo\ndef._._foo');
        }, ['this._', 'abc', 'def._']);
    });
    test('Multiple cursor and overwriteBefore/After, #16277', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 5, 1, 5), new Selection(2, 5, 2, 5)]);
            codeSnippet = 'document';
            controller.insert(codeSnippet, { overwriteBefore: 3 });
            assert.strictEqual(editor.getModel().getValue(), '{document}\n{document && true}');
        }, ['{foo}', '{foo && true}']);
    });
    test('Insert snippet twice, #19449', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 1, 1, 1)]);
            codeSnippet = 'for (var ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
            controller.insert(codeSnippet);
            assert.strictEqual(editor.getModel().getValue(), 'for (var i=0; i<len; i++) {  }for (var i=0; i<len; i++) {  }');
        }, ['for (var i=0; i<len; i++) {  }']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([new Selection(1, 1, 1, 1)]);
            codeSnippet = 'for (let ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
            controller.insert(codeSnippet);
            assert.strictEqual(editor.getModel().getValue(), 'for (let i=0; i<len; i++) {  }for (var i=0; i<len; i++) {  }');
        }, ['for (var i=0; i<len; i++) {  }']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLm9sZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L3Rlc3QvYnJvd3Nlci9zbmlwcGV0Q29udHJvbGxlcjIub2xkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBbUIsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNwSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRWhHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsa0JB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