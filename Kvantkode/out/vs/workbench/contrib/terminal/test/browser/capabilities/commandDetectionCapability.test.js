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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL2NhcGFiaWxpdGllcy9jb21tYW5kRGV0ZWN0aW9uQ2FwYWJpbGl0eS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQzVDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXJHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVGQUF1RixDQUFBO0FBQ2xJLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQU1wRyxNQUFNLDhCQUErQixTQUFRLDBCQUEwQjtJQUN0RSxhQUFhO1FBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzFCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLFVBQTBDLENBQUE7SUFDOUMsSUFBSSxTQUE2QixDQUFBO0lBRWpDLFNBQVMsY0FBYyxDQUFDLGdCQUE0QztRQUNuRSxlQUFlLENBQ2QsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDekMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQ3RDLENBQUE7UUFDRCxlQUFlLENBQ2QsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDckMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ2xDLENBQUE7UUFDRCxlQUFlLENBQ2QsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFDMUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQ3ZDLENBQUE7UUFDRCxlQUFlLENBQ2QsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQzlDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FDM0MsQ0FBQTtRQUNELHVEQUF1RDtRQUN2RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxlQUFlLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyx5REFBeUQ7UUFDekQsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7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