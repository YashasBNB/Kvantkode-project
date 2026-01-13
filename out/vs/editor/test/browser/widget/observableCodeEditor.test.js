/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { derivedHandleChanges } from '../../../../base/common/observable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { observableCodeEditor, } from '../../../browser/observableCodeEditor.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { withTestCodeEditor } from '../testCodeEditor.js';
suite('CodeEditorWidget', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function withTestFixture(cb) {
        withEditorSetupTestFixture(undefined, cb);
    }
    function withEditorSetupTestFixture(preSetupCallback, cb) {
        withTestCodeEditor('hello world', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            preSetupCallback?.(editor, disposables);
            const obsEditor = observableCodeEditor(editor);
            const log = new Log();
            const derived = derivedHandleChanges({
                createEmptyChangeSummary: () => undefined,
                handleChange: (context) => {
                    const obsName = observableName(context.changedObservable, obsEditor);
                    log.log(`handle change: ${obsName} ${formatChange(context.change)}`);
                    return true;
                },
            }, (reader) => {
                const versionId = obsEditor.versionId.read(reader);
                const selection = obsEditor.selections
                    .read(reader)
                    ?.map((s) => s.toString())
                    .join(', ');
                obsEditor.onDidType.read(reader);
                const str = `running derived: selection: ${selection}, value: ${versionId}`;
                log.log(str);
                return str;
            });
            derived.recomputeInitiallyAndOnChange(disposables);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'running derived: selection: [1,1 -> 1,1], value: 1',
            ]);
            cb({ editor, viewModel, log, derived });
            disposables.dispose();
        });
    }
    test('setPosition', () => withTestFixture(({ editor, log }) => {
        editor.setPosition(new Position(1, 2));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":1,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"api","reason":0}',
            'running derived: selection: [1,2 -> 1,2], value: 1',
        ]);
    }));
    test('keyboard.type', () => withTestFixture(({ editor, log }) => {
        editor.trigger('keyboard', 'type', { text: 'abc' });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.onDidType "abc"',
            'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
            'handle change: editor.versionId {"changes":[{"range":"[1,2 -> 1,2]","rangeLength":0,"text":"b","rangeOffset":1}],"eol":"\\n","versionId":3}',
            'handle change: editor.versionId {"changes":[{"range":"[1,3 -> 1,3]","rangeLength":0,"text":"c","rangeOffset":2}],"eol":"\\n","versionId":4}',
            'handle change: editor.selections {"selection":"[1,4 -> 1,4]","modelVersionId":4,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
            'running derived: selection: [1,4 -> 1,4], value: 4',
        ]);
    }));
    test('keyboard.type and set position', () => withTestFixture(({ editor, log }) => {
        editor.trigger('keyboard', 'type', { text: 'abc' });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.onDidType "abc"',
            'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
            'handle change: editor.versionId {"changes":[{"range":"[1,2 -> 1,2]","rangeLength":0,"text":"b","rangeOffset":1}],"eol":"\\n","versionId":3}',
            'handle change: editor.versionId {"changes":[{"range":"[1,3 -> 1,3]","rangeLength":0,"text":"c","rangeOffset":2}],"eol":"\\n","versionId":4}',
            'handle change: editor.selections {"selection":"[1,4 -> 1,4]","modelVersionId":4,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
            'running derived: selection: [1,4 -> 1,4], value: 4',
        ]);
        editor.setPosition(new Position(1, 5), 'test');
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'handle change: editor.selections {"selection":"[1,5 -> 1,5]","modelVersionId":4,"oldSelections":["[1,4 -> 1,4]"],"oldModelVersionId":4,"source":"test","reason":0}',
            'running derived: selection: [1,5 -> 1,5], value: 4',
        ]);
    }));
    test('listener interaction (unforced)', () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log('>>> before get');
                derived.get();
                log.log('<<< after get');
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger('keyboard', 'type', { text: 'a' });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                '>>> before get',
                '<<< after get',
                'handle change: editor.onDidType "a"',
                'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
                'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":2,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
                'running derived: selection: [1,2 -> 1,2], value: 2',
            ]);
        });
    });
    test('listener interaction ()', () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log('>>> before forceUpdate');
                observableCodeEditor(editor).forceUpdate();
                log.log('>>> before get');
                derived.get();
                log.log('<<< after get');
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger('keyboard', 'type', { text: 'a' });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                '>>> before forceUpdate',
                '>>> before get',
                'handle change: editor.versionId undefined',
                'running derived: selection: [1,2 -> 1,2], value: 2',
                '<<< after get',
                'handle change: editor.onDidType "a"',
                'handle change: editor.versionId {"changes":[{"range":"[1,1 -> 1,1]","rangeLength":0,"text":"a","rangeOffset":0}],"eol":"\\n","versionId":2}',
                'handle change: editor.selections {"selection":"[1,2 -> 1,2]","modelVersionId":2,"oldSelections":["[1,1 -> 1,1]"],"oldModelVersionId":1,"source":"keyboard","reason":0}',
                'running derived: selection: [1,2 -> 1,2], value: 2',
            ]);
        });
    });
});
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
function formatChange(change) {
    return JSON.stringify(change, (key, value) => {
        if (value instanceof Range) {
            return value.toString();
        }
        if (value === false || (Array.isArray(value) && value.length === 0)) {
            return undefined;
        }
        return value;
    });
}
function observableName(obs, obsEditor) {
    switch (obs) {
        case obsEditor.selections:
            return 'editor.selections';
        case obsEditor.versionId:
            return 'editor.versionId';
        case obsEditor.onDidType:
            return 'editor.onDidType';
        default:
            return 'unknown';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci93aWRnZXQvb2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFlLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFekQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsZUFBZSxDQUN2QixFQUtVO1FBRVYsMEJBQTBCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxTQUFTLDBCQUEwQixDQUNsQyxnQkFBMkYsRUFDM0YsRUFLVTtRQUVWLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDM0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUN6QyxnQkFBZ0IsRUFBRSxD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