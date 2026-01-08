/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TestAccessibilityService } from '../../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { createDecorationsForStackFrame } from '../../browser/callStackEditorContribution.js';
import { getContext, getContextForContributedActions, getSpecificSourceName, } from '../../browser/callStackView.js';
import { debugStackframe, debugStackframeFocused } from '../../browser/debugIcons.js';
import { getStackFrameThreadAndSessionToFocus } from '../../browser/debugService.js';
import { DebugSession } from '../../browser/debugSession.js';
import { StackFrame, Thread } from '../../common/debugModel.js';
import { Source } from '../../common/debugSource.js';
import { createMockDebugModel, mockUriIdentityService } from './mockDebugModel.js';
import { MockRawSession } from '../common/mockDebug.js';
const mockWorkspaceContextService = {
    getWorkspace: () => {
        return {
            folders: [],
        };
    },
};
export function createTestSession(model, name = 'mockSession', options) {
    return new DebugSession(generateUuid(), { resolved: { name, type: 'node', request: 'launch' }, unresolved: undefined }, undefined, model, options, {
        getViewModel() {
            return {
                updateViews() {
                    // noop
                },
            };
        },
    }, undefined, undefined, new TestConfigurationService({ debug: { console: { collapseIdenticalLines: true } } }), undefined, mockWorkspaceContextService, undefined, undefined, undefined, mockUriIdentityService, new TestInstantiationService(), undefined, undefined, new NullLogService(), undefined, undefined, new TestAccessibilityService());
}
function createTwoStackFrames(session) {
    const thread = new (class extends Thread {
        getCallStack() {
            return [firstStackFrame, secondStackFrame];
        }
    })(session, 'mockthread', 1);
    const firstSource = new Source({
        name: 'internalModule.js',
        path: 'a/b/c/d/internalModule.js',
        sourceReference: 10,
    }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
    const secondSource = new Source({
        name: 'internalModule.js',
        path: 'z/x/c/d/internalModule.js',
        sourceReference: 11,
    }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
    const firstStackFrame = new StackFrame(thread, 0, firstSource, 'app.js', 'normal', { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 10 }, 0, true);
    const secondStackFrame = new StackFrame(thread, 1, secondSource, 'app2.js', 'normal', { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 10 }, 1, true);
    return { firstStackFrame, secondStackFrame };
}
suite('Debug - CallStack', () => {
    let model;
    let mockRawSession;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        model = createMockDebugModel(disposables);
        mockRawSession = new MockRawSession();
    });
    teardown(() => {
        sinon.restore();
    });
    // Threads
    test('threads simple', () => {
        const threadId = 1;
        const threadName = 'firstThread';
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        assert.strictEqual(model.getSessions(true).length, 1);
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId,
                    name: threadName,
                },
            ],
        });
        assert.strictEqual(session.getThread(threadId).name, threadName);
        model.clearThreads(session.getId(), true);
        assert.strictEqual(session.getThread(threadId), undefined);
        assert.strictEqual(model.getSessions(true).length, 1);
    });
    test('threads multiple with allThreadsStopped', async () => {
        const threadId1 = 1;
        const threadName1 = 'firstThread';
        const threadId2 = 2;
        const threadName2 = 'secondThread';
        const stoppedReason = 'breakpoint';
        // Add the threads
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        session['raw'] = mockRawSession;
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId1,
                    name: threadName1,
                },
            ],
        });
        // Stopped event with all threads stopped
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId1,
                    name: threadName1,
                },
                {
                    id: threadId2,
                    name: threadName2,
                },
            ],
            stoppedDetails: {
                reason: stoppedReason,
                threadId: 1,
                allThreadsStopped: true,
            },
        });
        const thread1 = session.getThread(threadId1);
        const thread2 = session.getThread(threadId2);
        // at the beginning, callstacks are obtainable but not available
        assert.strictEqual(session.getAllThreads().length, 2);
        assert.strictEqual(thread1.name, threadName1);
        assert.strictEqual(thread1.stopped, true);
        assert.strictEqual(thread1.getCallStack().length, 0);
        assert.strictEqual(thread1.stoppedDetails.reason, stoppedReason);
        assert.strictEqual(thread2.name, threadName2);
        assert.strictEqual(thread2.stopped, true);
        assert.strictEqual(thread2.getCallStack().length, 0);
        assert.strictEqual(thread2.stoppedDetails.reason, undefined);
        // after calling getCallStack, the callstack becomes available
        // and results in a request for the callstack in the debug adapter
        await thread1.fetchCallStack();
        assert.notStrictEqual(thread1.getCallStack().length, 0);
        await thread2.fetchCallStack();
        assert.notStrictEqual(thread2.getCallStack().length, 0);
        // calling multiple times getCallStack doesn't result in multiple calls
        // to the debug adapter
        await thread1.fetchCallStack();
        await thread2.fetchCallStack();
        // clearing the callstack results in the callstack not being available
        thread1.clearCallStack();
        assert.strictEqual(thread1.stopped, true);
        assert.strictEqual(thread1.getCallStack().length, 0);
        thread2.clearCallStack();
        assert.strictEqual(thread2.stopped, true);
        assert.strictEqual(thread2.getCallStack().length, 0);
        model.clearThreads(session.getId(), true);
        assert.strictEqual(session.getThread(threadId1), undefined);
        assert.strictEqual(session.getThread(threadId2), undefined);
        assert.strictEqual(session.getAllThreads().length, 0);
    });
    test('allThreadsStopped in multiple events', async () => {
        const threadId1 = 1;
        const threadName1 = 'firstThread';
        const threadId2 = 2;
        const threadName2 = 'secondThread';
        const stoppedReason = 'breakpoint';
        // Add the threads
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        session['raw'] = mockRawSession;
        // Stopped event with all threads stopped
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId1,
                    name: threadName1,
                },
                {
                    id: threadId2,
                    name: threadName2,
                },
            ],
            stoppedDetails: {
                reason: stoppedReason,
                threadId: threadId1,
                allThreadsStopped: true,
            },
        });
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId1,
                    name: threadName1,
                },
                {
                    id: threadId2,
                    name: threadName2,
                },
            ],
            stoppedDetails: {
                reason: stoppedReason,
                threadId: threadId2,
                allThreadsStopped: true,
            },
        });
        const thread1 = session.getThread(threadId1);
        const thread2 = session.getThread(threadId2);
        assert.strictEqual(thread1.stoppedDetails?.reason, stoppedReason);
        assert.strictEqual(thread2.stoppedDetails?.reason, stoppedReason);
    });
    test('threads multiple without allThreadsStopped', async () => {
        const sessionStub = sinon.spy(mockRawSession, 'stackTrace');
        const stoppedThreadId = 1;
        const stoppedThreadName = 'stoppedThread';
        const runningThreadId = 2;
        const runningThreadName = 'runningThread';
        const stoppedReason = 'breakpoint';
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        session['raw'] = mockRawSession;
        // Add the threads
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: stoppedThreadId,
                    name: stoppedThreadName,
                },
            ],
        });
        // Stopped event with only one thread stopped
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: 1,
                    name: stoppedThreadName,
                },
                {
                    id: runningThreadId,
                    name: runningThreadName,
                },
            ],
            stoppedDetails: {
                reason: stoppedReason,
                threadId: 1,
                allThreadsStopped: false,
            },
        });
        const stoppedThread = session.getThread(stoppedThreadId);
        const runningThread = session.getThread(runningThreadId);
        // the callstack for the stopped thread is obtainable but not available
        // the callstack for the running thread is not obtainable nor available
        assert.strictEqual(stoppedThread.name, stoppedThreadName);
        assert.strictEqual(stoppedThread.stopped, true);
        assert.strictEqual(session.getAllThreads().length, 2);
        assert.strictEqual(stoppedThread.getCallStack().length, 0);
        assert.strictEqual(stoppedThread.stoppedDetails.reason, stoppedReason);
        assert.strictEqual(runningThread.name, runningThreadName);
        assert.strictEqual(runningThread.stopped, false);
        assert.strictEqual(runningThread.getCallStack().length, 0);
        assert.strictEqual(runningThread.stoppedDetails, undefined);
        // after calling getCallStack, the callstack becomes available
        // and results in a request for the callstack in the debug adapter
        await stoppedThread.fetchCallStack();
        assert.notStrictEqual(stoppedThread.getCallStack().length, 0);
        assert.strictEqual(runningThread.getCallStack().length, 0);
        assert.strictEqual(sessionStub.callCount, 1);
        // calling getCallStack on the running thread returns empty array
        // and does not return in a request for the callstack in the debug
        // adapter
        await runningThread.fetchCallStack();
        assert.strictEqual(runningThread.getCallStack().length, 0);
        assert.strictEqual(sessionStub.callCount, 1);
        // clearing the callstack results in the callstack not being available
        stoppedThread.clearCallStack();
        assert.strictEqual(stoppedThread.stopped, true);
        assert.strictEqual(stoppedThread.getCallStack().length, 0);
        model.clearThreads(session.getId(), true);
        assert.strictEqual(session.getThread(stoppedThreadId), undefined);
        assert.strictEqual(session.getThread(runningThreadId), undefined);
        assert.strictEqual(session.getAllThreads().length, 0);
    });
    test('stack frame get specific source name', () => {
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        const { firstStackFrame, secondStackFrame } = createTwoStackFrames(session);
        assert.strictEqual(getSpecificSourceName(firstStackFrame), '.../b/c/d/internalModule.js');
        assert.strictEqual(getSpecificSourceName(secondStackFrame), '.../x/c/d/internalModule.js');
    });
    test('stack frame toString()', () => {
        const session = createTestSession(model);
        disposables.add(session);
        const thread = new Thread(session, 'mockthread', 1);
        const firstSource = new Source({
            name: 'internalModule.js',
            path: 'a/b/c/d/internalModule.js',
            sourceReference: 10,
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        const stackFrame = new StackFrame(thread, 1, firstSource, 'app', 'normal', { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10 }, 1, true);
        assert.strictEqual(stackFrame.toString(), 'app (internalModule.js:1)');
        const secondSource = new Source(undefined, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        const stackFrame2 = new StackFrame(thread, 2, secondSource, 'module', 'normal', {
            startLineNumber: undefined,
            startColumn: undefined,
            endLineNumber: undefined,
            endColumn: undefined,
        }, 2, true);
        assert.strictEqual(stackFrame2.toString(), 'module');
    });
    test('debug child sessions are added in correct order', () => {
        const session = disposables.add(createTestSession(model));
        model.addSession(session);
        const secondSession = disposables.add(createTestSession(model, 'mockSession2'));
        model.addSession(secondSession);
        const firstChild = disposables.add(createTestSession(model, 'firstChild', { parentSession: session }));
        model.addSession(firstChild);
        const secondChild = disposables.add(createTestSession(model, 'secondChild', { parentSession: session }));
        model.addSession(secondChild);
        const thirdSession = disposables.add(createTestSession(model, 'mockSession3'));
        model.addSession(thirdSession);
        const anotherChild = disposables.add(createTestSession(model, 'secondChild', { parentSession: secondSession }));
        model.addSession(anotherChild);
        const sessions = model.getSessions();
        assert.strictEqual(sessions[0].getId(), session.getId());
        assert.strictEqual(sessions[1].getId(), firstChild.getId());
        assert.strictEqual(sessions[2].getId(), secondChild.getId());
        assert.strictEqual(sessions[3].getId(), secondSession.getId());
        assert.strictEqual(sessions[4].getId(), anotherChild.getId());
        assert.strictEqual(sessions[5].getId(), thirdSession.getId());
    });
    test('decorations', () => {
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        const { firstStackFrame, secondStackFrame } = createTwoStackFrames(session);
        let decorations = createDecorationsForStackFrame(firstStackFrame, true, false);
        assert.strictEqual(decorations.length, 3);
        assert.deepStrictEqual(decorations[0].range, new Range(1, 2, 1, 3));
        assert.strictEqual(decorations[0].options.glyphMarginClassName, ThemeIcon.asClassName(debugStackframe));
        assert.deepStrictEqual(decorations[1].range, new Range(1, 2, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */));
        assert.strictEqual(decorations[1].options.className, 'debug-top-stack-frame-line');
        assert.strictEqual(decorations[1].options.isWholeLine, true);
        decorations = createDecorationsForStackFrame(secondStackFrame, true, false);
        assert.strictEqual(decorations.length, 2);
        assert.deepStrictEqual(decorations[0].range, new Range(1, 2, 1, 3));
        assert.strictEqual(decorations[0].options.glyphMarginClassName, ThemeIcon.asClassName(debugStackframeFocused));
        assert.deepStrictEqual(decorations[1].range, new Range(1, 2, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */));
        assert.strictEqual(decorations[1].options.className, 'debug-focused-stack-frame-line');
        assert.strictEqual(decorations[1].options.isWholeLine, true);
        decorations = createDecorationsForStackFrame(firstStackFrame, true, false);
        assert.strictEqual(decorations.length, 3);
        assert.deepStrictEqual(decorations[0].range, new Range(1, 2, 1, 3));
        assert.strictEqual(decorations[0].options.glyphMarginClassName, ThemeIcon.asClassName(debugStackframe));
        assert.deepStrictEqual(decorations[1].range, new Range(1, 2, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */));
        assert.strictEqual(decorations[1].options.className, 'debug-top-stack-frame-line');
        assert.strictEqual(decorations[1].options.isWholeLine, true);
        // Inline decoration gets rendered in this case
        assert.strictEqual(decorations[2].options.before?.inlineClassName, 'debug-top-stack-frame-column');
        assert.deepStrictEqual(decorations[2].range, new Range(1, 2, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */));
    });
    test('contexts', () => {
        const session = createTestSession(model);
        disposables.add(session);
        model.addSession(session);
        const { firstStackFrame, secondStackFrame } = createTwoStackFrames(session);
        let context = getContext(firstStackFrame);
        assert.strictEqual(context.sessionId, firstStackFrame.thread.session.getId());
        assert.strictEqual(context.threadId, firstStackFrame.thread.getId());
        assert.strictEqual(context.frameId, firstStackFrame.getId());
        context = getContext(secondStackFrame.thread);
        assert.strictEqual(context.sessionId, secondStackFrame.thread.session.getId());
        assert.strictEqual(context.threadId, secondStackFrame.thread.getId());
        assert.strictEqual(context.frameId, undefined);
        context = getContext(session);
        assert.strictEqual(context.sessionId, session.getId());
        assert.strictEqual(context.threadId, undefined);
        assert.strictEqual(context.frameId, undefined);
        let contributedContext = getContextForContributedActions(firstStackFrame);
        assert.strictEqual(contributedContext, firstStackFrame.source.raw.path);
        contributedContext = getContextForContributedActions(firstStackFrame.thread);
        assert.strictEqual(contributedContext, firstStackFrame.thread.threadId);
        contributedContext = getContextForContributedActions(session);
        assert.strictEqual(contributedContext, session.getId());
    });
    test('focusStackFrameThreadAndSession', () => {
        const threadId1 = 1;
        const threadName1 = 'firstThread';
        const threadId2 = 2;
        const threadName2 = 'secondThread';
        const stoppedReason = 'breakpoint';
        // Add the threads
        const session = new (class extends DebugSession {
            get state() {
                return 2 /* State.Stopped */;
            }
        })(generateUuid(), {
            resolved: { name: 'stoppedSession', type: 'node', request: 'launch' },
            unresolved: undefined,
        }, undefined, model, undefined, undefined, undefined, undefined, undefined, undefined, mockWorkspaceContextService, undefined, undefined, undefined, mockUriIdentityService, new TestInstantiationService(), undefined, undefined, new NullLogService(), undefined, undefined, new TestAccessibilityService());
        disposables.add(session);
        const runningSession = createTestSession(model);
        disposables.add(runningSession);
        model.addSession(runningSession);
        model.addSession(session);
        session['raw'] = mockRawSession;
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId1,
                    name: threadName1,
                },
            ],
        });
        // Stopped event with all threads stopped
        model.rawUpdate({
            sessionId: session.getId(),
            threads: [
                {
                    id: threadId1,
                    name: threadName1,
                },
                {
                    id: threadId2,
                    name: threadName2,
                },
            ],
            stoppedDetails: {
                reason: stoppedReason,
                threadId: 1,
                allThreadsStopped: true,
            },
        });
        const thread = session.getThread(threadId1);
        const runningThread = session.getThread(threadId2);
        let toFocus = getStackFrameThreadAndSessionToFocus(model, undefined);
        // Verify stopped session and stopped thread get focused
        assert.deepStrictEqual(toFocus, { stackFrame: undefined, thread: thread, session: session });
        toFocus = getStackFrameThreadAndSessionToFocus(model, undefined, undefined, runningSession);
        assert.deepStrictEqual(toFocus, {
            stackFrame: undefined,
            thread: undefined,
            session: runningSession,
        });
        toFocus = getStackFrameThreadAndSessionToFocus(model, undefined, thread);
        assert.deepStrictEqual(toFocus, { stackFrame: undefined, thread: thread, session: session });
        toFocus = getStackFrameThreadAndSessionToFocus(model, undefined, runningThread);
        assert.deepStrictEqual(toFocus, {
            stackFrame: undefined,
            thread: runningThread,
            session: session,
        });
        const stackFrame = new StackFrame(thread, 5, undefined, 'stackframename2', undefined, undefined, 1, true);
        toFocus = getStackFrameThreadAndSessionToFocus(model, stackFrame);
        assert.deepStrictEqual(toFocus, { stackFrame: stackFrame, thread: thread, session: session });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9jYWxsU3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdGLE9BQU8sRUFDTixVQUFVLEVBQ1YsK0JBQStCLEVBQy9CLHFCQUFxQixHQUNyQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFNUQsT0FB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