/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InternalTerminalShellIntegration } from '../../common/extHostTerminalShellIntegration.js';
import { Emitter } from '../../../../base/common/event.js';
import { TerminalShellExecutionCommandLineConfidence } from '../../common/extHostTypes.js';
import { deepStrictEqual, notStrictEqual, strictEqual } from 'assert';
import { DeferredPromise } from '../../../../base/common/async.js';
function cmdLine(value) {
    return Object.freeze({
        confidence: TerminalShellExecutionCommandLineConfidence.High,
        value,
        isTrusted: true,
    });
}
function asCmdLine(value) {
    if (typeof value === 'string') {
        return cmdLine(value);
    }
    return value;
}
function vsc(data) {
    return `\x1b]633;${data}\x07`;
}
const testCommandLine = 'echo hello world';
const testCommandLine2 = 'echo goodbye world';
suite('InternalTerminalShellIntegration', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let si;
    let terminal;
    let onDidStartTerminalShellExecution;
    let trackedEvents;
    let readIteratorsFlushed;
    async function startExecutionAwaitObject(commandLine, cwd) {
        return await new Promise((r) => {
            store.add(onDidStartTerminalShellExecution.event((e) => {
                r(e.execution);
            }));
            si.startShellExecution(asCmdLine(commandLine), cwd);
        });
    }
    async function endExecutionAwaitObject(commandLine) {
        return await new Promise((r) => {
            store.add(si.onDidRequestEndExecution((e) => r(e.execution)));
            si.endShellExecution(asCmdLine(commandLine), 0);
        });
    }
    async function emitData(data) {
        // AsyncIterableObjects are initialized in a microtask, this doesn't matter in practice
        // since the events will always come through in different events.
        await new Promise((r) => queueMicrotask(r));
        si.emitData(data);
    }
    function assertTrackedEvents(expected) {
        deepStrictEqual(trackedEvents, expected);
    }
    function assertNonDataTrackedEvents(expected) {
        deepStrictEqual(trackedEvents.filter((e) => e.type !== 'data'), expected);
    }
    function assertDataTrackedEvents(expected) {
        deepStrictEqual(trackedEvents.filter((e) => e.type === 'data'), expected);
    }
    setup(() => {
        terminal = Symbol('testTerminal');
        onDidStartTerminalShellExecution = store.add(new Emitter());
        si = store.add(new InternalTerminalShellIntegration(terminal, onDidStartTerminalShellExecution));
        trackedEvents = [];
        readIteratorsFlushed = [];
        store.add(onDidStartTerminalShellExecution.event(async (e) => {
            trackedEvents.push({
                type: 'start',
                commandLine: e.execution.commandLine.value,
            });
            const stream = e.execution.read();
            const readIteratorsFlushedDeferred = new DeferredPromise();
            readIteratorsFlushed.push(readIteratorsFlushedDeferred.p);
            for await (const data of stream) {
                trackedEvents.push({
                    type: 'data',
                    commandLine: e.execution.commandLine.value,
                    data,
                });
            }
            readIteratorsFlushedDeferred.complete();
        }));
        store.add(si.onDidRequestEndExecution((e) => trackedEvents.push({
            type: 'end',
            commandLine: e.execution.commandLine.value,
        })));
    });
    test('simple execution', async () => {
        const execution = await startExecutionAwaitObject(testCommandLine);
        deepStrictEqual(execution.commandLine.value, testCommandLine);
        const execution2 = await endExecutionAwaitObject(testCommandLine);
        strictEqual(execution2, execution);
        assertTrackedEvents([
            { commandLine: testCommandLine, type: 'start' },
            { commandLine: testCommandLine, type: 'end' },
        ]);
    });
    test('different execution unexpectedly ended', async () => {
        const execution1 = await startExecutionAwaitObject(testCommandLine);
        const execution2 = await endExecutionAwaitObject(testCommandLine2);
        strictEqual(execution1, execution2, 'when a different execution is ended, the one that started first should end');
        assertTrackedEvents([
            { commandLine: testCommandLine, type: 'start' },
            // This looks weird, but it's the same execution behind the scenes, just the command
            // line was updated
            { commandLine: testCommandLine2, type: 'end' },
        ]);
    });
    test('no end event', async () => {
        const execution1 = await startExecutionAwaitObject(testCommandLine);
        const endedExecution = await new Promise((r) => {
            store.add(si.onDidRequestEndExecution((e) => r(e.execution)));
            startExecutionAwaitObject(testCommandLine2);
        });
        strictEqual(execution1, endedExecution, 'when no end event is fired, the current execution should end');
        // Clean up disposables
        await endExecutionAwaitObject(testCommandLine2);
        await Promise.all(readIteratorsFlushed);
        assertTrackedEvents([
            { commandLine: testCommandLine, type: 'start' },
            { commandLine: testCommandLine, type: 'end' },
            { commandLine: testCommandLine2, type: 'start' },
            { commandLine: testCommandLine2, type: 'end' },
        ]);
    });
    suite('executeCommand', () => {
        test('^C to clear previous command', async () => {
            const commandLine = 'foo';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const firstExecution = await startExecutionAwaitObject('^C');
            notStrictEqual(firstExecution, apiRequestedExecution.value);
            si.emitData('SIGINT');
            si.endShellExecution(cmdLine('^C'), 0);
            si.startShellExecution(cmdLine(commandLine), undefined);
            await emitData('1');
            await endExecutionAwaitObject(commandLine);
            // IMPORTANT: We cannot reliably assert the order of data events here because flushing
            // of the async iterator is asynchronous and could happen after the execution's end
            // event fires if an execution is started immediately afterwards.
            await Promise.all(readIteratorsFlushed);
            assertNonDataTrackedEvents([
                { commandLine: '^C', type: 'start' },
                { commandLine: '^C', type: 'end' },
                { commandLine, type: 'start' },
                { commandLine, type: 'end' },
            ]);
            assertDataTrackedEvents([
                { commandLine: '^C', type: 'data', data: 'SIGINT' },
                { commandLine, type: 'data', data: '1' },
            ]);
        });
        test('multi-line command line', async () => {
            const commandLine = 'foo\nbar';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject('foo');
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData('1');
            si.emitData('2');
            si.endShellExecution(cmdLine('foo'), 0);
            si.startShellExecution(cmdLine('bar'), undefined);
            si.emitData('3');
            si.emitData('4');
            const endedExecution = await endExecutionAwaitObject('bar');
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: '1' },
                { commandLine, type: 'data', data: '2' },
                { commandLine, type: 'data', data: '3' },
                { commandLine, type: 'data', data: '4' },
                { commandLine, type: 'end' },
            ]);
        });
        test('multi-line command with long second command', async () => {
            const commandLine = 'echo foo\ncat << EOT\nline1\nline2\nline3\nEOT';
            const subCommandLine1 = 'echo foo';
            const subCommandLine2 = 'cat << EOT\nline1\nline2\nline3\nEOT';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject(subCommandLine1);
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData(`${vsc('C')}foo`);
            si.endShellExecution(cmdLine(subCommandLine1), 0);
            si.startShellExecution(cmdLine(subCommandLine2), undefined);
            si.emitData(`${vsc('C')}line1`);
            si.emitData('line2');
            si.emitData('line3');
            const endedExecution = await endExecutionAwaitObject(subCommandLine2);
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: `${vsc('C')}foo` },
                { commandLine, type: 'data', data: `${vsc('C')}line1` },
                { commandLine, type: 'data', data: 'line2' },
                { commandLine, type: 'data', data: 'line3' },
                { commandLine, type: 'end' },
            ]);
        });
        test('multi-line command comment followed by long second command', async () => {
            const commandLine = '# comment: foo\ncat << EOT\nline1\nline2\nline3\nEOT';
            const subCommandLine1 = '# comment: foo';
            const subCommandLine2 = 'cat << EOT\nline1\nline2\nline3\nEOT';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject(subCommandLine1);
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData(`${vsc('C')}`);
            si.endShellExecution(cmdLine(subCommandLine1), 0);
            si.startShellExecution(cmdLine(subCommandLine2), undefined);
            si.emitData(`${vsc('C')}line1`);
            si.emitData('line2');
            si.emitData('line3');
            const endedExecution = await endExecutionAwaitObject(subCommandLine2);
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: `${vsc('C')}` },
                { commandLine, type: 'data', data: `${vsc('C')}line1` },
                { commandLine, type: 'data', data: 'line2' },
                { commandLine, type: 'data', data: 'line3' },
                { commandLine, type: 'end' },
            ]);
        });
        test('4 multi-line commands with output', async () => {
            const commandLine = 'echo "\nfoo"\ngit commit -m "hello\n\nworld"\ncat << EOT\nline1\nline2\nline3\nEOT\n{\necho "foo"\n}';
            const subCommandLine1 = 'echo "\nfoo"';
            const subCommandLine2 = 'git commit -m "hello\n\nworld"';
            const subCommandLine3 = 'cat << EOT\nline1\nline2\nline3\nEOT';
            const subCommandLine4 = '{\necho "foo"\n}';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject(subCommandLine1);
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData(`${vsc('C')}foo`);
            si.endShellExecution(cmdLine(subCommandLine1), 0);
            si.startShellExecution(cmdLine(subCommandLine2), undefined);
            si.emitData(`${vsc('C')} 2 files changed, 61 insertions(+), 2 deletions(-)`);
            si.endShellExecution(cmdLine(subCommandLine2), 0);
            si.startShellExecution(cmdLine(subCommandLine3), undefined);
            si.emitData(`${vsc('C')}line1`);
            si.emitData('line2');
            si.emitData('line3');
            si.endShellExecution(cmdLine(subCommandLine3), 0);
            si.emitData(`${vsc('C')}foo`);
            si.startShellExecution(cmdLine(subCommandLine4), undefined);
            const endedExecution = await endExecutionAwaitObject(subCommandLine4);
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: `${vsc('C')}foo` },
                {
                    commandLine,
                    type: 'data',
                    data: `${vsc('C')} 2 files changed, 61 insertions(+), 2 deletions(-)`,
                },
                { commandLine, type: 'data', data: `${vsc('C')}line1` },
                { commandLine, type: 'data', data: 'line2' },
                { commandLine, type: 'data', data: 'line3' },
                { commandLine, type: 'data', data: `${vsc('C')}foo` },
                { commandLine, type: 'end' },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2NvbW1vbi9leHRIb3N0VGVybWluYWxTaGVsbEludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbEUsU0FBUyxPQUFPLENBQUMsS0FBYTtJQUM3QixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDcEIsVUFBVSxFQUFFLDJDQUEyQyxDQUFDLElBQUk7UUFDNUQsS0FBSztRQUNMLFNBQVMsRUFBRSxJQUFJO0tBQ2YsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUNELFNBQVMsU0FBUyxDQUNqQixLQUFpRDtJQUVqRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFDRCxTQUFTLEdBQUcsQ0FBQyxJQUFZO0lBQ3hCLE9BQU8sWUFBWSxJQUFJLE1BQU0sQ0FBQTtBQUM5QixDQUFDO0FBRUQsTUFBTSxlQUFlLEdB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