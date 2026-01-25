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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvY29tbW9uL2V4dEhvc3RUZXJtaW5hbFNoZWxsSW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBRXJFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRSxTQUFTLE9BQU8sQ0FBQyxLQUFhO0lBQzdCLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNwQixVQUFVLEVBQUUsMkNBQTJDLENBQUMsSUFBSTtRQUM1RCxLQUFLO1FBQ0wsU0FBUyxFQUFFLElBQUk7S0FDZixDQUFDLENBQUE7QUFDSCxDQUFDO0FBQ0QsU0FBUyxTQUFTLENBQ2pCLEtBQWlEO0lBRWpELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDL0IsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUNELFNBQVMsR0FBRyxDQUFDLElBQVk7SUFDeEIsT0FBTyxZQUFZLElBQUksTUFBTSxDQUFBO0FBQzlCLENBQUM7QUFFRCxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQTtBQUMxQyxNQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFBO0FBUTdDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7SUFDOUMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLEVBQW9DLENBQUE7SUFDeEMsSUFBSSxRQUFrQixDQUFBO0lBQ3RCLElBQUksZ0NBQTJFLENBQUE7SUFDL0UsSUFBSSxhQUE4QixDQUFBO0lBQ2xDLElBQUksb0JBQXFDLENBQUE7SUFFekMsS0FBSyxVQUFVLHlCQUF5QixDQUN2QyxXQUF1RCxFQUN2RCxHQUFTO1FBRVQsT0FBTyxNQUFNLElBQUksT0FBTyxDQUF5QixDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3RELEtBQUssQ0FBQyxHQUFHLENBQ1IsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDZixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLFVBQVUsdUJBQXVCLENBQ3JDLFdBQXVEO1FBRXZELE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBeUIsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0RCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0QsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLFVBQVUsUUFBUSxDQUFDLElBQVk7UUFDbkMsdUZBQXVGO1FBQ3ZGLGlFQUFpRTtRQUNqRSxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLFFBQXlCO1FBQ3JELGVBQWUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQUMsUUFBeUI7UUFDNUQsZUFBZSxDQUNkLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLEVBQzlDLFFBQVEsQ0FDUixDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsdUJBQXVCLENBQUMsUUFBeUI7UUFDekQsZUFBZSxDQUNkLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLEVBQzlDLFFBQVEsQ0FDUixDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixRQUFRLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBUSxDQUFBO1FBQ3hDLGdDQUFnQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzNELEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLENBQUMsUUFBUSxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQTtRQUVoRyxhQUFhLEdBQUcsRUFBRSxDQUFBO1FBQ2xCLG9CQUFvQixHQUFHLEVBQUUsQ0FBQTtRQUN6QixLQUFLLENBQUMsR0FBRyxDQUNSLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbEQsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDbEIsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUs7YUFDMUMsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNqQyxNQUFNLDRCQUE0QixHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7WUFDaEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pELElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNqQyxhQUFhLENBQUMsSUFBSSxDQUFDO29CQUNsQixJQUFJLEVBQUUsTUFBTTtvQkFDWixXQUFXLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSztvQkFDMUMsSUFBSTtpQkFDSixDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsNEJBQTRCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELEtBQUssQ0FBQyxHQUFHLENBQ1IsRUFBRSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDakMsYUFBYSxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsS0FBSztZQUNYLFdBQVcsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLO1NBQzFDLENBQUMsQ0FDRixDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLFNBQVMsR0FBRyxNQUFNLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2xFLGVBQWUsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM3RCxNQUFNLFVBQVUsR0FBRyxNQUFNLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2pFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbEMsbUJBQW1CLENBQUM7WUFDbkIsRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDL0MsRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7U0FDN0MsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsTUFBTSxVQUFVLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNuRSxNQUFNLFVBQVUsR0FBRyxNQUFNLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDbEUsV0FBVyxDQUNWLFVBQVUsRUFDVixVQUFVLEVBQ1YsNEVBQTRFLENBQzVFLENBQUE7UUFFRCxtQkFBbUIsQ0FBQztZQUNuQixFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtZQUMvQyxvRkFBb0Y7WUFDcEYsbUJBQW1CO1lBQ25CLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7U0FDOUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9CLE1BQU0sVUFBVSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDbkUsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBeUIsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0RSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0QseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUMsQ0FBQTtRQUNGLFdBQVcsQ0FDVixVQUFVLEVBQ1YsY0FBYyxFQUNkLDhEQUE4RCxDQUM5RCxDQUFBO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUMvQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUV2QyxtQkFBbUIsQ0FBQztZQUNuQixFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtZQUMvQyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM3QyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ2hELEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7U0FDOUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUE7WUFDekIsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzFGLE1BQU0sY0FBYyxHQUFHLE1BQU0seUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUQsY0FBYyxDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzRCxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3JCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN2RCxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuQixNQUFNLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzFDLHNGQUFzRjtZQUN0RixtRkFBbUY7WUFDbkYsaUVBQWlFO1lBQ2pFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBRXZDLDBCQUEwQixDQUFDO2dCQUMxQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtnQkFDcEMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7Z0JBQ2xDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzlCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7YUFDNUIsQ0FBQyxDQUFBO1lBQ0YsdUJBQXVCLENBQUM7Z0JBQ3ZCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7Z0JBQ25ELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTthQUN4QyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxQyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUE7WUFDOUIsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzFGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvRCxXQUFXLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFMUQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoQixFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNqRCxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDaEIsTUFBTSxjQUFjLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzRCxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFFN0MsbUJBQW1CLENBQUM7Z0JBQ25CLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzlCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDeEMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO2dCQUN4QyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ3hDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDeEMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTthQUM1QixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxNQUFNLFdBQVcsR0FBRyxnREFBZ0QsQ0FBQTtZQUNwRSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUE7WUFDbEMsTUFBTSxlQUFlLEdBQUcsc0NBQXNDLENBQUE7WUFFOUQsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzFGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUN6RSxXQUFXLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFMUQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqRCxFQUFFLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNELEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQy9CLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDcEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQixNQUFNLGNBQWMsR0FBRyxNQUFNLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3JFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUU3QyxtQkFBbUIsQ0FBQztnQkFDbkIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtnQkFDOUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDckQsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRTtnQkFDdkQsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO2dCQUM1QyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzVDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7YUFDNUIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0UsTUFBTSxXQUFXLEdBQUcsc0RBQXNELENBQUE7WUFDMUUsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUE7WUFDeEMsTUFBTSxlQUFlLEdBQUcsc0NBQXNDLENBQUE7WUFFOUQsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzFGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUN6RSxXQUFXLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFMUQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDMUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqRCxFQUFFLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNELEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQy9CLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDcEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQixNQUFNLGNBQWMsR0FBRyxNQUFNLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3JFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUU3QyxtQkFBbUIsQ0FBQztnQkFDbkIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtnQkFDOUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRTtnQkFDbEQsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRTtnQkFDdkQsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO2dCQUM1QyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzVDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7YUFDNUIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEQsTUFBTSxXQUFXLEdBQ2hCLHNHQUFzRyxDQUFBO1lBQ3ZHLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQTtZQUN0QyxNQUFNLGVBQWUsR0FBRyxnQ0FBZ0MsQ0FBQTtZQUN4RCxNQUFNLGVBQWUsR0FBRyxzQ0FBc0MsQ0FBQTtZQUM5RCxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQTtZQUUxQyxNQUFNLHFCQUFxQixHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDMUYsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3pFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUUxRCxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QixFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pELEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0QsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQTtZQUM1RSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pELEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0QsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDL0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQixFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BCLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDakQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzRCxNQUFNLGNBQWMsR0FBRyxNQUFNLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3JFLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUU3QyxtQkFBbUIsQ0FBQztnQkFDbkIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtnQkFDOUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDckQ7b0JBQ0MsV0FBVztvQkFDWCxJQUFJLEVBQUUsTUFBTTtvQkFDWixJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLG9EQUFvRDtpQkFDckU7Z0JBQ0QsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRTtnQkFDdkQsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO2dCQUM1QyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzVDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3JELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7YUFDNUIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=