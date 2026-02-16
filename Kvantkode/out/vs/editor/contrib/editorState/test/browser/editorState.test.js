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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZWRpdG9yU3RhdGUvdGVzdC9icm93c2VyL2VkaXRvclN0YXRlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBdUIsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFTL0UsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN4Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sUUFBUSxHQUNiOzZDQUM2Qjs0Q0FDRDswQ0FDRixDQUFBO0lBRTNCLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0MsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDbkQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUN0QixFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUs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