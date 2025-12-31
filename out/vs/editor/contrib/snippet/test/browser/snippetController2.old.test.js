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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLm9sZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC90ZXN0L2Jyb3dzZXIvc25pcHBldENvbnRyb2xsZXIyLm9sZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQW1CLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDcEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLGtCQUFrQjtJ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