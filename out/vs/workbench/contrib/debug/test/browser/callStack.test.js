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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvY2FsbFN0YWNrLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RixPQUFPLEVBQ04sVUFBVSxFQUNWLCtCQUErQixFQUMvQixxQkFBcUIsR0FDckIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckYsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTVELE9BQU8sRUFB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