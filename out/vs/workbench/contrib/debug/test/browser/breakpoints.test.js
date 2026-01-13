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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2JyZWFrcG9pbnRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxD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