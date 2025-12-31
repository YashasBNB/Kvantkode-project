/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, ok } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
class TestCommandDetectionCapability extends CommandDetectionCapability {
    clearCommands() {
        this._commands.length = 0;
    }
}
suite('CommandDetectionCapability', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let capability;
    let addEvents;
    function assertCommands(expectedCommands) {
        deepStrictEqual(capability.commands.map((e) => e.command), expectedCommands.map((e) => e.command));
        deepStrictEqual(capability.commands.map((e) => e.cwd), expectedCommands.map((e) => e.cwd));
        deepStrictEqual(capability.commands.map((e) => e.exitCode), expectedCommands.map((e) => e.exitCode));
        deepStrictEqual(capability.commands.map((e) => e.marker?.line), expectedCommands.map((e) => e.marker?.line));
        // Ensure timestamps are set and were captured recently
        for (const command of capability.commands) {
            ok(Math.abs(Date.now() - command.timestamp) < 2000);
        }
        deepStrictEqual(addEvents, capability.commands);
        // Clear the commands to avoid re-asserting past commands
        addEvents.length = 0;
        capability.clearCommands();
    }
    async function printStandardCommand(prompt, command, output, cwd, exitCode) {
        if (cwd !== undefined) {
            capability.setCwd(cwd);
        }
        capability.handlePromptStart();
        await writeP(xterm, `\r${prompt}`);
        capability.handleCommandStart();
        await writeP(xterm, command);
        capability.handleCommandExecuted();
        await writeP(xterm, `\r\n${output}\r\n`);
        capability.handleCommandFinished(exitCode);
    }
    async function printCommandStart(prompt) {
        capability.handlePromptStart();
        await writeP(xterm, `\r${prompt}`);
        capability.handleCommandStart();
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80 }));
        const instantiationService = workbenchInstantiationService(undefined, store);
        capability = store.add(instantiationService.createInstance(TestCommandDetectionCapability, xterm));
        addEvents = [];
        store.add(capability.onCommandFinished((e) => addEvents.push(e)));
        assertCommands([]);
    });
    test('should not add commands when no capability methods are triggered', async () => {
        await writeP(xterm, 'foo\r\nbar\r\n');
        assertCommands([]);
        await writeP(xterm, 'baz\r\n');
        assertCommands([]);
    });
    test('should add commands for expected capability method calls', async () => {
        await printStandardCommand('$ ', 'echo foo', 'foo', undefined, 0);
        await printCommandStart('$ ');
        assertCommands([
            {
                command: 'echo foo',
                exitCode: 0,
                cwd: undefined,
                marker: { line: 0 },
            },
        ]);
    });
    test('should trim the command when command executed appears on the following line', async () => {
        await printStandardCommand('$ ', 'echo foo\r\n', 'foo', undefined, 0);
        await printCommandStart('$ ');
        assertCommands([
            {
                command: 'echo foo',
                exitCode: 0,
                cwd: undefined,
                marker: { line: 0 },
            },
        ]);
    });
    suite('cwd', () => {
        test("should add cwd to commands when it's set", async () => {
            await printStandardCommand('$ ', 'echo foo', 'foo', '/home', 0);
            await printStandardCommand('$ ', 'echo bar', 'bar', '/home/second', 0);
            await printCommandStart('$ ');
            assertCommands([
                { command: 'echo foo', exitCode: 0, cwd: '/home', marker: { line: 0 } },
                { command: 'echo bar', exitCode: 0, cwd: '/home/second', marker: { line: 2 } },
            ]);
        });
        test('should add old cwd to commands if no cwd sequence is output', async () => {
            await printStandardCommand('$ ', 'echo foo', 'foo', '/home', 0);
            await printStandardCommand('$ ', 'echo bar', 'bar', undefined, 0);
            await printCommandStart('$ ');
            assertCommands([
                { command: 'echo foo', exitCode: 0, cwd: '/home', marker: { line: 0 } },
                { command: 'echo bar', exitCode: 0, cwd: '/home', marker: { line: 2 } },
            ]);
        });
        test("should use an undefined cwd if it's not set initially", async () => {
            await printStandardCommand('$ ', 'echo foo', 'foo', undefined, 0);
            await printStandardCommand('$ ', 'echo bar', 'bar', '/home', 0);
            await printCommandStart('$ ');
            assertCommands([
                { command: 'echo foo', exitCode: 0, cwd: undefined, marker: { line: 0 } },
                { command: 'echo bar', exitCode: 0, cwd: '/home', marker: { line: 2 } },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQTtBQUNsSSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFNcEcsTUFBTSw4QkFBK0IsU0FBUSwwQkFBMEI7SUFDdEUsYUFBYTtRQUNaLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUMxQixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxLQUFlLENBQUE7SUFDbkIsSUFBSSxVQUEwQyxDQUFBO0lBQzlDLElBQUksU0FBNkIsQ0FBQTtJQUVqQyxTQUFTLGNBQWMsQ0FBQyxnQkFBNEM7UUFDbkUsZUFBZSxDQUNkLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQ3pD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