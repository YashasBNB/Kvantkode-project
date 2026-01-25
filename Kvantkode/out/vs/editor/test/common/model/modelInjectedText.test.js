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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxJbmplY3RlZFRleHQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL21vZGVsSW5qZWN0ZWRUZXh0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUNOLCtCQUErQixFQUMvQixnQkFBZ0IsR0FHaEIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQTtRQUV2RSxNQUFNLGVBQWUsR0FBRyxJQUFJLEtBQUssRUFBVyxDQUFBO1FBRTVDLEtBQUssQ0FBQyxHQUFHLENBQ1IsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEQsTUFBTSxPQUFPLEdBQ1osQ0FBQyxZQUFZLCtCQUErQjtnQkFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPO2dCQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtZQUNi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