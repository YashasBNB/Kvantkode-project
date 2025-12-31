/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { dispose } from '../../../../../base/common/lifecycle.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { createBreakpointDecorations } from '../../browser/breakpointEditorContribution.js';
import { getBreakpointMessageAndIcon, getExpandedBodySize } from '../../browser/breakpointsView.js';
import { IDebugService, } from '../../common/debug.js';
import { Breakpoint, DebugModel } from '../../common/debugModel.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel, mockUriIdentityService } from './mockDebugModel.js';
import { MockDebugService, MockDebugStorage } from '../common/mockDebug.js';
import { MockLabelService } from '../../../../services/label/test/common/mockLabelService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
function addBreakpointsAndCheckEvents(model, uri, data) {
    let eventCount = 0;
    const toDispose = model.onDidChangeBreakpoints((e) => {
        assert.strictEqual(e?.sessionOnly, false);
        assert.strictEqual(e?.changed, undefined);
        assert.strictEqual(e?.removed, undefined);
        const added = e?.added;
        assert.notStrictEqual(added, undefined);
        assert.strictEqual(added.length, data.length);
        eventCount++;
        dispose(toDispose);
        for (let i = 0; i < data.length; i++) {
            assert.strictEqual(e.added[i] instanceof Breakpoint, true);
            assert.strictEqual(e.added[i].lineNumber, data[i].lineNumber);
        }
    });
    const bps = model.addBreakpoints(uri, data);
    assert.strictEqual(eventCount, 1);
    return bps;
}
suite('Debug - Breakpoints', () => {
    let model;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        model = createMockDebugModel(disposables);
    });
    // Breakpoints
    test('simple', () => {
        const modelUri = uri.file('/myfolder/myfile.js');
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 5, enabled: true },
            { lineNumber: 10, enabled: false },
        ]);
        assert.strictEqual(model.areBreakpointsActivated(), true);
        assert.strictEqual(model.getBreakpoints().length, 2);
        let eventCount = 0;
        const toDispose = model.onDidChangeBreakpoints((e) => {
            eventCount++;
            assert.strictEqual(e?.added, undefined);
            assert.strictEqual(e?.sessionOnly, false);
            assert.strictEqual(e?.removed?.length, 2);
            assert.strictEqual(e?.changed, undefined);
            dispose(toDispose);
        });
        model.removeBreakpoints(model.getBreakpoints());
        assert.strictEqual(eventCount, 1);
        assert.strictEqual(model.getBreakpoints().length, 0);
    });
    test('toggling', () => {
        const modelUri = uri.file('/myfolder/myfile.js');
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 5, enabled: true },
            { lineNumber: 10, enabled: false },
        ]);
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 12, enabled: true, condition: 'fake condition' },
        ]);
        assert.strictEqual(model.getBreakpoints().length, 3);
        const bp = model.getBreakpoints().pop();
        if (bp) {
            model.removeBreakpoints([bp]);
        }
        assert.strictEqual(model.getBreakpoints().length, 2);
        model.setBreakpointsActivated(false);
        assert.strictEqual(model.areBreakpointsActivated(), false);
        model.setBreakpointsActivated(true);
        assert.strictEqual(model.areBreakpointsActivated(), true);
    });
    test('two files', () => {
        const modelUri1 = uri.file('/myfolder/my file first.js');
        const modelUri2 = uri.file('/secondfolder/second/second file.js');
        addBreakpointsAndCheckEvents(model, modelUri1, [
            { lineNumber: 5, enabled: true },
            { lineNumber: 10, enabled: false },
        ]);
        assert.strictEqual(getExpandedBodySize(model, undefined, 9), 44);
        addBreakpointsAndCheckEvents(model, modelUri2, [
            { lineNumber: 1, enabled: true },
            { lineNumber: 2, enabled: true },
            { lineNumber: 3, enabled: false },
        ]);
        assert.strictEqual(getExpandedBodySize(model, undefined, 9), 110);
        assert.strictEqual(model.getBreakpoints().length, 5);
        assert.strictEqual(model.getBreakpoints({ uri: modelUri1 }).length, 2);
        assert.strictEqual(model.getBreakpoints({ uri: modelUri2 }).length, 3);
        assert.strictEqual(model.getBreakpoints({ lineNumber: 5 }).length, 1);
        assert.strictEqual(model.getBreakpoints({ column: 5 }).length, 0);
        const bp = model.getBreakpoints()[0];
        const update = new Map();
        update.set(bp.getId(), { lineNumber: 100 });
        let eventFired = false;
        const toDispose = model.onDidChangeBreakpoints((e) => {
            eventFired = true;
            assert.strictEqual(e?.added, undefined);
            assert.strictEqual(e?.removed, undefined);
            assert.strictEqual(e?.changed?.length, 1);
            dispose(toDispose);
        });
        model.updateBreakpoints(update);
        assert.strictEqual(eventFired, true);
        assert.strictEqual(bp.lineNumber, 100);
        assert.strictEqual(model.getBreakpoints({ enabledOnly: true }).length, 3);
        model.enableOrDisableAllBreakpoints(false);
        model.getBreakpoints().forEach((bp) => {
            assert.strictEqual(bp.enabled, false);
        });
        assert.strictEqual(model.getBreakpoints({ enabledOnly: true }).length, 0);
        model.setEnablement(bp, true);
        assert.strictEqual(bp.enabled, true);
        model.removeBreakpoints(model.getBreakpoints({ uri: modelUri1 }));
        assert.strictEqual(getExpandedBodySize(model, undefined, 9), 66);
        assert.strictEqual(model.getBreakpoints().length, 3);
    });
    test('conditions', () => {
        const modelUri1 = uri.file('/myfolder/my file first.js');
        addBreakpointsAndCheckEvents(model, modelUri1, [
            { lineNumber: 5, condition: 'i < 5', hitCondition: '17' },
            { lineNumber: 10, condition: 'j < 3' },
        ]);
        const breakpoints = model.getBreakpoints();
        assert.strictEqual(breakpoints[0].condition, 'i < 5');
        assert.strictEqual(breakpoints[0].hitCondition, '17');
        assert.strictEqual(breakpoints[1].condition, 'j < 3');
        assert.strictEqual(!!breakpoints[1].hitCondition, false);
        assert.strictEqual(model.getBreakpoints().length, 2);
        model.removeBreakpoints(model.getBreakpoints());
        assert.strictEqual(model.getBreakpoints().length, 0);
    });
    test('function breakpoints', () => {
        model.addFunctionBreakpoint({ name: 'foo' }, '1');
        model.addFunctionBreakpoint({ name: 'bar' }, '2');
        model.updateFunctionBreakpoint('1', { name: 'fooUpdated' });
        model.updateFunctionBreakpoint('2', { name: 'barUpdated' });
        const functionBps = model.getFunctionBreakpoints();
        assert.strictEqual(functionBps[0].name, 'fooUpdated');
        assert.strictEqual(functionBps[1].name, 'barUpdated');
        model.removeFunctionBreakpoints();
        assert.strictEqual(model.getFunctionBreakpoints().length, 0);
    });
    test('multiple sessions', () => {
        const modelUri = uri.file('/myfolder/myfile.js');
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 5, enabled: true, condition: 'x > 5' },
            { lineNumber: 10, enabled: false },
        ]);
        const breakpoints = model.getBreakpoints();
        const session = disposables.add(createTestSession(model));
        const data = new Map();
        assert.strictEqual(breakpoints[0].lineNumber, 5);
        assert.strictEqual(breakpoints[1].lineNumber, 10);
        data.set(breakpoints[0].getId(), { verified: false, line: 10 });
        data.set(breakpoints[1].getId(), { verified: true, line: 50 });
        model.setBreakpointSessionData(session.getId(), {}, data);
        assert.strictEqual(breakpoints[0].lineNumber, 5);
        assert.strictEqual(breakpoints[1].lineNumber, 50);
        const session2 = disposables.add(createTestSession(model));
        const data2 = new Map();
        data2.set(breakpoints[0].getId(), { verified: true, line: 100 });
        data2.set(breakpoints[1].getId(), { verified: true, line: 500 });
        model.setBreakpointSessionData(session2.getId(), {}, data2);
        // Breakpoint is verified only once, show that line
        assert.strictEqual(breakpoints[0].lineNumber, 100);
        // Breakpoint is verified two times, show the original line
        assert.strictEqual(breakpoints[1].lineNumber, 10);
        model.setBreakpointSessionData(session.getId(), {}, undefined);
        // No more double session verification
        assert.strictEqual(breakpoints[0].lineNumber, 100);
        assert.strictEqual(breakpoints[1].lineNumber, 500);
        assert.strictEqual(breakpoints[0].supported, false);
        const data3 = new Map();
        data3.set(breakpoints[0].getId(), { verified: true, line: 500 });
        model.setBreakpointSessionData(session2.getId(), { supportsConditionalBreakpoints: true }, data2);
        assert.strictEqual(breakpoints[0].supported, true);
    });
    test('exception breakpoints', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        model.setExceptionBreakpointsForSession('session-id-1', [
            { filter: 'uncaught', label: 'UNCAUGHT', default: true },
        ]);
        assert.strictEqual(eventCount, 1);
        let exceptionBreakpoints = model.getExceptionBreakpointsForSession('session-id-1');
        assert.strictEqual(exceptionBreakpoints.length, 1);
        assert.strictEqual(exceptionBreakpoints[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpoints[0].enabled, true);
        model.setExceptionBreakpointsForSession('session-id-2', [
            { filter: 'uncaught', label: 'UNCAUGHT' },
            { filter: 'caught', label: 'CAUGHT' },
        ]);
        assert.strictEqual(eventCount, 2);
        exceptionBreakpoints = model.getExceptionBreakpointsForSession('session-id-2');
        assert.strictEqual(exceptionBreakpoints.length, 2);
        assert.strictEqual(exceptionBreakpoints[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpoints[0].enabled, true);
        assert.strictEqual(exceptionBreakpoints[1].filter, 'caught');
        assert.strictEqual(exceptionBreakpoints[1].label, 'CAUGHT');
        assert.strictEqual(exceptionBreakpoints[1].enabled, false);
        model.setExceptionBreakpointsForSession('session-id-3', [{ filter: 'all', label: 'ALL' }]);
        assert.strictEqual(eventCount, 3);
        assert.strictEqual(model.getExceptionBreakpointsForSession('session-id-3').length, 1);
        exceptionBreakpoints = model.getExceptionBreakpoints();
        assert.strictEqual(exceptionBreakpoints[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpoints[0].enabled, true);
        assert.strictEqual(exceptionBreakpoints[1].filter, 'caught');
        assert.strictEqual(exceptionBreakpoints[1].label, 'CAUGHT');
        assert.strictEqual(exceptionBreakpoints[1].enabled, false);
        assert.strictEqual(exceptionBreakpoints[2].filter, 'all');
        assert.strictEqual(exceptionBreakpoints[2].label, 'ALL');
    });
    test('exception breakpoints multiple sessions', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        model.setExceptionBreakpointsForSession('session-id-4', [
            { filter: 'uncaught', label: 'UNCAUGHT', default: true },
            { filter: 'caught', label: 'CAUGHT' },
        ]);
        model.setExceptionBreakpointFallbackSession('session-id-4');
        assert.strictEqual(eventCount, 1);
        let exceptionBreakpointsForSession = model.getExceptionBreakpointsForSession('session-id-4');
        assert.strictEqual(exceptionBreakpointsForSession.length, 2);
        assert.strictEqual(exceptionBreakpointsForSession[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpointsForSession[1].filter, 'caught');
        model.setExceptionBreakpointsForSession('session-id-5', [
            { filter: 'all', label: 'ALL' },
            { filter: 'caught', label: 'CAUGHT' },
        ]);
        assert.strictEqual(eventCount, 2);
        exceptionBreakpointsForSession = model.getExceptionBreakpointsForSession('session-id-5');
        let exceptionBreakpointsForUndefined = model.getExceptionBreakpointsForSession(undefined);
        assert.strictEqual(exceptionBreakpointsForSession.length, 2);
        assert.strictEqual(exceptionBreakpointsForSession[0].filter, 'caught');
        assert.strictEqual(exceptionBreakpointsForSession[1].filter, 'all');
        assert.strictEqual(exceptionBreakpointsForUndefined.length, 2);
        assert.strictEqual(exceptionBreakpointsForUndefined[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpointsForUndefined[1].filter, 'caught');
        model.removeExceptionBreakpointsForSession('session-id-4');
        assert.strictEqual(eventCount, 2);
        exceptionBreakpointsForUndefined = model.getExceptionBreakpointsForSession(undefined);
        assert.strictEqual(exceptionBreakpointsForUndefined.length, 2);
        assert.strictEqual(exceptionBreakpointsForUndefined[0].filter, 'uncaught');
        assert.strictEqual(exceptionBreakpointsForUndefined[1].filter, 'caught');
        model.setExceptionBreakpointFallbackSession('session-id-5');
        assert.strictEqual(eventCount, 2);
        exceptionBreakpointsForUndefined = model.getExceptionBreakpointsForSession(undefined);
        assert.strictEqual(exceptionBreakpointsForUndefined.length, 2);
        assert.strictEqual(exceptionBreakpointsForUndefined[0].filter, 'caught');
        assert.strictEqual(exceptionBreakpointsForUndefined[1].filter, 'all');
        const exceptionBreakpoints = model.getExceptionBreakpoints();
        assert.strictEqual(exceptionBreakpoints.length, 3);
    });
    test('instruction breakpoints', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        //address: string, offset: number, condition?: string, hitCondition?: string
        model.addInstructionBreakpoint({
            instructionReference: '0xCCCCFFFF',
            offset: 0,
            address: 0n,
            canPersist: false,
        });
        assert.strictEqual(eventCount, 1);
        let instructionBreakpoints = model.getInstructionBreakpoints();
        assert.strictEqual(instructionBreakpoints.length, 1);
        assert.strictEqual(instructionBreakpoints[0].instructionReference, '0xCCCCFFFF');
        assert.strictEqual(instructionBreakpoints[0].offset, 0);
        model.addInstructionBreakpoint({
            instructionReference: '0xCCCCEEEE',
            offset: 1,
            address: 0n,
            canPersist: false,
        });
        assert.strictEqual(eventCount, 2);
        instructionBreakpoints = model.getInstructionBreakpoints();
        assert.strictEqual(instructionBreakpoints.length, 2);
        assert.strictEqual(instructionBreakpoints[0].instructionReference, '0xCCCCFFFF');
        assert.strictEqual(instructionBreakpoints[0].offset, 0);
        assert.strictEqual(instructionBreakpoints[1].instructionReference, '0xCCCCEEEE');
        assert.strictEqual(instructionBreakpoints[1].offset, 1);
    });
    test('data breakpoints', () => {
        let eventCount = 0;
        disposables.add(model.onDidChangeBreakpoints(() => eventCount++));
        model.addDataBreakpoint({
            description: 'label',
            src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'id' },
            canPersist: true,
            accessTypes: ['read'],
            accessType: 'read',
        }, '1');
        model.addDataBreakpoint({
            description: 'second',
            src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'secondId' },
            canPersist: false,
            accessTypes: ['readWrite'],
            accessType: 'readWrite',
        }, '2');
        model.updateDataBreakpoint('1', { condition: 'aCondition' });
        model.updateDataBreakpoint('2', { hitCondition: '10' });
        const dataBreakpoints = model.getDataBreakpoints();
        assert.strictEqual(dataBreakpoints[0].canPersist, true);
        assert.deepStrictEqual(dataBreakpoints[0].src, {
            type: 0 /* DataBreakpointSetType.Variable */,
            dataId: 'id',
        });
        assert.strictEqual(dataBreakpoints[0].accessType, 'read');
        assert.strictEqual(dataBreakpoints[0].condition, 'aCondition');
        assert.strictEqual(dataBreakpoints[1].canPersist, false);
        assert.strictEqual(dataBreakpoints[1].description, 'second');
        assert.strictEqual(dataBreakpoints[1].accessType, 'readWrite');
        assert.strictEqual(dataBreakpoints[1].hitCondition, '10');
        assert.strictEqual(eventCount, 4);
        model.removeDataBreakpoints(dataBreakpoints[0].getId());
        assert.strictEqual(eventCount, 5);
        assert.strictEqual(model.getDataBreakpoints().length, 1);
        model.removeDataBreakpoints();
        assert.strictEqual(model.getDataBreakpoints().length, 0);
        assert.strictEqual(eventCount, 6);
    });
    test('message and class name', () => {
        const modelUri = uri.file('/myfolder/my file first.js');
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 5, enabled: true, condition: 'x > 5' },
            { lineNumber: 10, enabled: false },
            { lineNumber: 12, enabled: true, logMessage: 'hello' },
            { lineNumber: 15, enabled: true, hitCondition: '12' },
            { lineNumber: 500, enabled: true },
        ]);
        const breakpoints = model.getBreakpoints();
        const ls = new MockLabelService();
        let result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[0], ls, model);
        assert.strictEqual(result.message, 'Condition: x > 5');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-conditional');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[1], ls, model);
        assert.strictEqual(result.message, 'Disabled Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-disabled');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[2], ls, model);
        assert.strictEqual(result.message, 'Log Message: hello');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-log');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[3], ls, model);
        assert.strictEqual(result.message, 'Hit Count: 12');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-conditional');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[4], ls, model);
        assert.strictEqual(result.message, ls.getUriLabel(breakpoints[4].uri));
        assert.strictEqual(result.icon.id, 'debug-breakpoint');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, false, breakpoints[2], ls, model);
        assert.strictEqual(result.message, 'Disabled Logpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-log-disabled');
        model.addDataBreakpoint({
            description: 'label',
            canPersist: true,
            accessTypes: ['read'],
            accessType: 'read',
            src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: 'id' },
        });
        const dataBreakpoints = model.getDataBreakpoints();
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, dataBreakpoints[0], ls, model);
        assert.strictEqual(result.message, 'Data Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-data');
        const functionBreakpoint = model.addFunctionBreakpoint({ name: 'foo' }, '1');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, functionBreakpoint, ls, model);
        assert.strictEqual(result.message, 'Function Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-function');
        const data = new Map();
        data.set(breakpoints[0].getId(), { verified: false, line: 10 });
        data.set(breakpoints[1].getId(), { verified: true, line: 50 });
        data.set(breakpoints[2].getId(), { verified: true, line: 50, message: 'world' });
        data.set(functionBreakpoint.getId(), { verified: true });
        model.setBreakpointSessionData('mocksessionid', {
            supportsFunctionBreakpoints: false,
            supportsDataBreakpoints: true,
            supportsLogPoints: true,
        }, data);
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[0], ls, model);
        assert.strictEqual(result.message, 'Unverified Breakpoint');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-unverified');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, functionBreakpoint, ls, model);
        assert.strictEqual(result.message, 'Function breakpoints not supported by this debug type');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-function-unverified');
        result = getBreakpointMessageAndIcon(2 /* State.Stopped */, true, breakpoints[2], ls, model);
        assert.strictEqual(result.message, 'Log Message: hello, world');
        assert.strictEqual(result.icon.id, 'debug-breakpoint-log');
    });
    test('decorations', () => {
        const modelUri = uri.file('/myfolder/my file first.js');
        const languageId = 'testMode';
        const textModel = createTextModel([
            'this is line one',
            'this is line two',
            '    this is line three it has whitespace at start',
            'this is line four',
            'this is line five',
        ].join('\n'), languageId);
        addBreakpointsAndCheckEvents(model, modelUri, [
            { lineNumber: 1, enabled: true, condition: 'x > 5' },
            { lineNumber: 2, column: 4, enabled: false },
            { lineNumber: 3, enabled: true, logMessage: 'hello' },
            { lineNumber: 500, enabled: true },
        ]);
        const breakpoints = model.getBreakpoints();
        const instantiationService = new TestInstantiationService();
        const debugService = new MockDebugService();
        debugService.getModel = () => model;
        instantiationService.stub(IDebugService, debugService);
        instantiationService.stub(ILabelService, new MockLabelService());
        instantiationService.stub(ILanguageService, disposables.add(new LanguageService()));
        let decorations = instantiationService.invokeFunction((accessor) => createBreakpointDecorations(accessor, textModel, breakpoints, 3 /* State.Running */, true, true));
        assert.strictEqual(decorations.length, 3); // last breakpoint filtered out since it has a large line number
        assert.deepStrictEqual(decorations[0].range, new Range(1, 1, 1, 2));
        assert.deepStrictEqual(decorations[1].range, new Range(2, 4, 2, 5));
        assert.deepStrictEqual(decorations[2].range, new Range(3, 5, 3, 6));
        assert.strictEqual(decorations[0].options.beforeContentClassName, undefined);
        assert.strictEqual(decorations[1].options.before?.inlineClassName, `debug-breakpoint-placeholder`);
        assert.strictEqual(decorations[0].options.overviewRuler?.position, OverviewRulerLane.Left);
        const expected = new MarkdownString(undefined, {
            isTrusted: true,
            supportThemeIcons: true,
        }).appendCodeblock(languageId, 'Condition: x > 5');
        assert.deepStrictEqual(decorations[0].options.glyphMarginHoverMessage, expected);
        decorations = instantiationService.invokeFunction((accessor) => createBreakpointDecorations(accessor, textModel, breakpoints, 3 /* State.Running */, true, false));
        assert.strictEqual(decorations[0].options.overviewRuler, null);
        textModel.dispose();
        instantiationService.dispose();
    });
    test('updates when storage changes', () => {
        const storage1 = disposables.add(new TestStorageService());
        const debugStorage1 = disposables.add(new MockDebugStorage(storage1));
        const model1 = disposables.add(new DebugModel(debugStorage1, { isDirty: (e) => false }, mockUriIdentityService, new NullLogService()));
        // 1. create breakpoints in the first model
        const modelUri = uri.file('/myfolder/my file first.js');
        const first = [
            { lineNumber: 1, enabled: true, condition: 'x > 5' },
            { lineNumber: 2, column: 4, enabled: false },
        ];
        addBreakpointsAndCheckEvents(model1, modelUri, first);
        debugStorage1.storeBreakpoints(model1);
        const stored = storage1.get('debug.breakpoint', 1 /* StorageScope.WORKSPACE */);
        // 2. hydrate a new model and ensure external breakpoints get applied
        const storage2 = disposables.add(new TestStorageService());
        const model2 = disposables.add(new DebugModel(disposables.add(new MockDebugStorage(storage2)), { isDirty: (e) => false }, mockUriIdentityService, new NullLogService()));
        storage2.store('debug.breakpoint', stored, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */, 
        /* external= */ true);
        assert.deepStrictEqual(model2.getBreakpoints().map((b) => b.getId()), model1.getBreakpoints().map((b) => b.getId()));
        // 3. ensure non-external changes are ignored
        storage2.store('debug.breakpoint', '[]', 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */, 
        /* external= */ false);
        assert.deepStrictEqual(model2.getBreakpoints().map((b) => b.getId()), model1.getBreakpoints().map((b) => b.getId()));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9icmVha3BvaW50cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDcEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMzRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRyxPQUFPLEVBSU4sYUFB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Q0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxLQUFLLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWpELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQTtRQUN6RCxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDaEUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMs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