/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { EditorState } from '../../browser/editorState.js';
suite('Editor Core - Editor State', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const allFlags = 1 /* CodeEditorStateFlag.Value */ |
        2 /* CodeEditorStateFlag.Selection */ |
        4 /* CodeEditorStateFlag.Position */ |
        8 /* CodeEditorStateFlag.Scroll */;
    test('empty editor state should be valid', () => {
        const result = validate({}, {});
        assert.strictEqual(result, true);
    });
    test('different model URIs should be invalid', () => {
        const result = validate({ model: { uri: URI.parse('http://test1') } }, { model: { uri: URI.parse('http://test2') } });
        assert.strictEqual(result, false);
    });
    test('different model versions should be invalid', () => {
        const result = validate({ model: { version: 1 } }, { model: { version: 2 } });
        assert.strictEqual(result, false);
    });
    test('different positions should be invalid', () => {
        const result = validate({ position: new Position(1, 2) }, { position: new Position(2, 3) });
        assert.strictEqual(result, false);
    });
    test('different selections should be invalid', () => {
        const result = validate({ selection: new Selection(1, 2, 3, 4) }, { selection: new Selection(5, 2, 3, 4) });
        assert.strictEqual(result, false);
    });
    test('different scroll positions should be invalid', () => {
        const result = validate({ scroll: { left: 1, top: 2 } }, { scroll: { left: 3, top: 2 } });
        assert.strictEqual(result, false);
    });
    function validate(source, target) {
        const sourceEditor = createEditor(source), targetEditor = createEditor(target);
        const result = new EditorState(sourceEditor, allFlags).validate(targetEditor);
        return result;
    }
    function createEditor({ model, position, selection, scroll, } = {}) {
        const mappedModel = model
            ? {
                uri: model.uri ? model.uri : URI.parse('http://dummy.org'),
                getVersionId: () => model.version,
            }
            : null;
        return {
            getModel: () => mappedModel,
            getPosition: () => position,
            getSelection: () => selection,
            getScrollLeft: () => scroll && scroll.left,
            getScrollTop: () => scroll && scroll.top,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2VkaXRvclN0YXRlL3Rlc3QvYnJvd3Nlci9lZGl0b3JTdGF0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQXVCLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBUy9FLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLFFBQVEsR0FDYjs2Q0FDNkI7NENBQ0Q7MENBQ0YsQ0FBQTtJQUUzQixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FDdEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQzdDLEVBQUUsS0FBSyxFQUFFLEVB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