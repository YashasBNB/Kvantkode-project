/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import { InternalModelContentChangeEvent, LineInjectedText, } from '../../../common/textModelEvents.js';
import { createTextModel } from '../testTextModel.js';
suite('Editor Model - Injected Text Events', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Basic', () => {
        const thisModel = store.add(createTextModel('First Line\nSecond Line'));
        const recordedChanges = new Array();
        store.add(thisModel.onDidChangeContentOrInjectedText((e) => {
            const changes = e instanceof InternalModelContentChangeEvent
                ? e.rawContentChangedEvent.changes
                : e.changes;
            for (const change of changes) {
                recordedChanges.push(mapChange(change));
            }
        }));
        // Initial decoration
        let decorations = thisModel.deltaDecorations([], [
            {
                options: {
                    after: { content: 'injected1' },
                    description: 'test1',
                    showIfCollapsed: true,
                },
                range: new Range(1, 1, 1, 1),
            },
        ]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]First Line',
                lineNumber: 1,
            },
        ]);
        // Decoration change
        decorations = thisModel.deltaDecorations(decorations, [
            {
                options: {
                    after: { content: 'injected1' },
                    description: 'test1',
                    showIfCollapsed: true,
                },
                range: new Range(2, 1, 2, 1),
            },
            {
                options: {
                    after: { content: 'injected2' },
                    description: 'test2',
                    showIfCollapsed: true,
                },
                range: new Range(2, 2, 2, 2),
            },
        ]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: 'First Line',
                lineNumber: 1,
            },
            {
                kind: 'lineChanged',
                line: '[injected1]S[injected2]econd Line',
                lineNumber: 2,
            },
        ]);
        // Simple Insert
        thisModel.applyEdits([EditOperation.replace(new Range(2, 2, 2, 2), 'Hello')]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]SHello[injected2]econd Line',
                lineNumber: 2,
            },
        ]);
        // Multi-Line Insert
        thisModel.pushEditOperations(null, [EditOperation.replace(new Range(2, 2, 2, 2), '\n\n\n')], null);
        assert.deepStrictEqual(thisModel
            .getAllDecorations(undefined)
            .map((d) => ({ description: d.options.description, range: d.range.toString() })), [
            {
                description: 'test1',
                range: '[2,1 -> 2,1]',
            },
            {
                description: 'test2',
                range: '[2,2 -> 5,6]',
            },
        ]);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]S',
                lineNumber: 2,
            },
            {
                fromLineNumber: 3,
                kind: 'linesInserted',
                lines: ['', '', 'Hello[injected2]econd Line'],
            },
        ]);
        // Multi-Line Replace
        thisModel.pushEditOperations(null, [EditOperation.replace(new Range(3, 1, 5, 1), '\n\n\n\n\n\n\n\n\n\n\n\n\n')], null);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '',
                lineNumber: 5,
            },
            {
                kind: 'lineChanged',
                line: '',
                lineNumber: 4,
            },
            {
                kind: 'lineChanged',
                line: '',
                lineNumber: 3,
            },
            {
                fromLineNumber: 6,
                kind: 'linesInserted',
                lines: ['', '', '', '', '', '', '', '', '', '', 'Hello[injected2]econd Line'],
            },
        ]);
        // Multi-Line Replace undo
        assert.strictEqual(thisModel.undo(), undefined);
        assert.deepStrictEqual(recordedChanges.splice(0), [
            {
                kind: 'lineChanged',
                line: '[injected1]SHello[injected2]econd Line',
                lineNumber: 2,
            },
            {
                kind: 'linesDeleted',
            },
        ]);
    });
});
function mapChange(change) {
    if (change.changeType === 2 /* RawContentChangedType.LineChanged */) {
        ;
        (change.injectedText || []).every((e) => {
            assert.deepStrictEqual(e.lineNumber, change.lineNumber);
        });
        return {
            kind: 'lineChanged',
            line: getDetail(change.detail, change.injectedText),
            lineNumber: change.lineNumber,
        };
    }
    else if (change.changeType === 4 /* RawContentChangedType.LinesInserted */) {
        return {
            kind: 'linesInserted',
            lines: change.detail.map((e, idx) => getDetail(e, change.injectedTexts[idx])),
            fromLineNumber: change.fromLineNumber,
        };
    }
    else if (change.changeType === 3 /* RawContentChangedType.LinesDeleted */) {
        return {
            kind: 'linesDeleted',
        };
    }
    else if (change.changeType === 5 /* RawContentChangedType.EOLChanged */) {
        return {
            kind: 'eolChanged',
        };
    }
    else if (change.changeType === 1 /* RawContentChangedType.Flush */) {
        return {
            kind: 'flush',
        };
    }
    return { kind: 'unknown' };
}
function getDetail(line, injectedTexts) {
    return LineInjectedText.applyInjectedText(line, (injectedTexts || []).map((t) => t.withText(`[${t.options.content}]`)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxJbmplY3RlZFRleHQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9tb2RlbEluamVjdGVkVGV4dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsZ0JBQWdCLEdBR2hCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUE7UUFFdkUsTUFBTSxlQUFlLEdBQUcsSUFBSSxLQUFLLEVBQVcsQ0FBQTtRQUU1QyxLQUFLLENBQUMsR0FBRyxDQUNSLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2hELE1BQU0sT0FBTyxHQUNaLENBQUMsWUFBWSwrQkFBK0I7Z0JBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsT0FBTztnQkFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7WUFDYixLQUFL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