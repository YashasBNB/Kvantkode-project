/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepEqual, deepStrictEqual, strictEqual } from 'assert';
import * as sinon from 'sinon';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { deserializeMessage, parseKeyValueAssignment, parseMarkSequence, ShellIntegrationAddon, } from '../../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
class TestShellIntegrationAddon extends ShellIntegrationAddon {
    getCommandDetectionMock(terminal) {
        const capability = super._createOrGetCommandDetection(terminal);
        this.capabilities.add(2 /* TerminalCapability.CommandDetection */, capability);
        return sinon.mock(capability);
    }
    getCwdDectionMock() {
        const capability = super._createOrGetCwdDetection();
        this.capabilities.add(0 /* TerminalCapability.CwdDetection */, capability);
        return sinon.mock(capability);
    }
}
suite('ShellIntegrationAddon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let shellIntegrationAddon;
    let capabilities;
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 }));
        shellIntegrationAddon = store.add(new TestShellIntegrationAddon('', true, undefined, new NullLogService()));
        xterm.loadAddon(shellIntegrationAddon);
        capabilities = shellIntegrationAddon.capabilities;
    });
    suite('cwd detection', () => {
        test('should activate capability on the cwd sequence (OSC 633 ; P ; Cwd=<cwd> ST)', async () => {
            strictEqual(capabilities.has(0 /* TerminalCapability.CwdDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(0 /* TerminalCapability.CwdDetection */), false);
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            strictEqual(capabilities.has(0 /* TerminalCapability.CwdDetection */), true);
        });
        test('should pass cwd sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCwdDectionMock();
            mock.expects('updateCwd').once().withExactArgs('/foo');
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            mock.verify();
        });
        test('detect ITerm sequence: `OSC 1337 ; CurrentDir=<Cwd> ST`', async () => {
            const cases = [
                ['root', '/', '/'],
                ['non-root', '/some/path', '/some/path'],
            ];
            for (const x of cases) {
                const [title, input, expected] = x;
                const mock = shellIntegrationAddon.getCwdDectionMock();
                mock.expects('updateCwd').once().withExactArgs(expected).named(title);
                await writeP(xterm, `\x1b]1337;CurrentDir=${input}\x07`);
                mock.verify();
            }
        });
        suite('detect `SetCwd` sequence: `OSC 7; scheme://cwd ST`', () => {
            test('should accept well-formatted URLs', async () => {
                const cases = [
                    // Different hostname values:
                    ['empty hostname, pointing root', 'file:///', '/'],
                    ['empty hostname', 'file:///test-root/local', '/test-root/local'],
                    ['non-empty hostname', 'file://some-hostname/test-root/local', '/test-root/local'],
                    // URL-encoded chars:
                    ['URL-encoded value (1)', 'file:///test-root/%6c%6f%63%61%6c', '/test-root/local'],
                    ['URL-encoded value (2)', 'file:///test-root/local%22', '/test-root/local"'],
                    ['URL-encoded value (3)', 'file:///test-root/local"', '/test-root/local"'],
                ];
                for (const x of cases) {
                    const [title, input, expected] = x;
                    const mock = shellIntegrationAddon.getCwdDectionMock();
                    mock.expects('updateCwd').once().withExactArgs(expected).named(title);
                    await writeP(xterm, `\x1b]7;${input}\x07`);
                    mock.verify();
                }
            });
            test('should ignore ill-formatted URLs', async () => {
                const cases = [
                    // Different hostname values:
                    ['no hostname, pointing root', 'file://'],
                    // Non-`file` scheme values:
                    ['no scheme (1)', '/test-root'],
                    ['no scheme (2)', '//test-root'],
                    ['no scheme (3)', '///test-root'],
                    ['no scheme (4)', ':///test-root'],
                    ['http', 'http:///test-root'],
                    ['ftp', 'ftp:///test-root'],
                    ['ssh', 'ssh:///test-root'],
                ];
                for (const x of cases) {
                    const [title, input] = x;
                    const mock = shellIntegrationAddon.getCwdDectionMock();
                    mock.expects('updateCwd').never().named(title);
                    await writeP(xterm, `\x1b]7;${input}\x07`);
                    mock.verify();
                }
            });
        });
        test('detect `SetWindowsFrindlyCwd` sequence: `OSC 9 ; 9 ; <cwd> ST`', async () => {
            const cases = [
                ['root', '/', '/'],
                ['non-root', '/some/path', '/some/path'],
            ];
            for (const x of cases) {
                const [title, input, expected] = x;
                const mock = shellIntegrationAddon.getCwdDectionMock();
                mock.expects('updateCwd').once().withExactArgs(expected).named(title);
                await writeP(xterm, `\x1b]9;9;${input}\x07`);
                mock.verify();
            }
        });
    });
    suite('command tracking', () => {
        test('should activate capability on the prompt start sequence (OSC 633 ; A ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;A\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass prompt start sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handlePromptStart').once().withExactArgs();
            await writeP(xterm, '\x1b]633;A\x07');
            mock.verify();
        });
        test('should activate capability on the command start sequence (OSC 633 ; B ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;B\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass command start sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handleCommandStart').once().withExactArgs();
            await writeP(xterm, '\x1b]633;B\x07');
            mock.verify();
        });
        test('should activate capability on the command executed sequence (OSC 633 ; C ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;C\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass command executed sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handleCommandExecuted').once().withExactArgs();
            await writeP(xterm, '\x1b]633;C\x07');
            mock.verify();
        });
        test('should activate capability on the command finished sequence (OSC 633 ; D ; <ExitCode> ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;D;7\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass command finished sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handleCommandFinished').once().withExactArgs(7);
            await writeP(xterm, '\x1b]633;D;7\x07');
            mock.verify();
        });
        test('should pass command line sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('setCommandLine').once().withExactArgs('', false);
            await writeP(xterm, '\x1b]633;E\x07');
            mock.verify();
            const mock2 = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock2.expects('setCommandLine').twice().withExactArgs('cmd', false);
            await writeP(xterm, '\x1b]633;E;cmd\x07');
            await writeP(xterm, '\x1b]633;E;cmd;invalid-nonce\x07');
            mock2.verify();
        });
        test('should not activate capability on the cwd sequence (OSC 633 ; P=Cwd=<cwd> ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
        });
        test("should pass cwd sequence to the capability if it's initialized", async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('setCwd').once().withExactArgs('/foo');
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            mock.verify();
        });
    });
    suite('BufferMarkCapability', () => {
        test('SetMark', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        test('SetMark - ID', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;1;\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        test('SetMark - hidden', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;;Hidden\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        test('SetMark - hidden & ID', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;1;Hidden\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        suite('parseMarkSequence', () => {
            test('basic', async () => {
                deepEqual(parseMarkSequence(['', '']), { id: undefined, hidden: false });
            });
            test('ID', async () => {
                deepEqual(parseMarkSequence(['Id=3', '']), { id: '3', hidden: false });
            });
            test('hidden', async () => {
                deepEqual(parseMarkSequence(['', 'Hidden']), { id: undefined, hidden: true });
            });
            test('ID + hidden', async () => {
                deepEqual(parseMarkSequence(['Id=4555', 'Hidden']), { id: '4555', hidden: true });
            });
        });
    });
    suite('deserializeMessage', () => {
        // A single literal backslash, in order to avoid confusion about whether we are escaping test data or testing escapes.
        const Backslash = '\\';
        const Newline = '\n';
        const Semicolon = ';';
        const cases = [
            ['empty', '', ''],
            ['basic', 'value', 'value'],
            ['space', 'some thing', 'some thing'],
            ['escaped backslash', `${Backslash}${Backslash}`, Backslash],
            ['non-initial escaped backslash', `foo${Backslash}${Backslash}`, `foo${Backslash}`],
            [
                'two escaped backslashes',
                `${Backslash}${Backslash}${Backslash}${Backslash}`,
                `${Backslash}${Backslash}`,
            ],
            [
                'escaped backslash amidst text',
                `Hello${Backslash}${Backslash}there`,
                `Hello${Backslash}there`,
            ],
            [
                'backslash escaped literally and as hex',
                `${Backslash}${Backslash} is same as ${Backslash}x5c`,
                `${Backslash} is same as ${Backslash}`,
            ],
            ['escaped semicolon', `${Backslash}x3b`, Semicolon],
            ['non-initial escaped semicolon', `foo${Backslash}x3b`, `foo${Semicolon}`],
            ['escaped semicolon (upper hex)', `${Backslash}x3B`, Semicolon],
            [
                'escaped backslash followed by literal "x3b" is not a semicolon',
                `${Backslash}${Backslash}x3b`,
                `${Backslash}x3b`,
            ],
            [
                'non-initial escaped backslash followed by literal "x3b" is not a semicolon',
                `foo${Backslash}${Backslash}x3b`,
                `foo${Backslash}x3b`,
            ],
            [
                'escaped backslash followed by escaped semicolon',
                `${Backslash}${Backslash}${Backslash}x3b`,
                `${Backslash}${Semicolon}`,
            ],
            ['escaped semicolon amidst text', `some${Backslash}x3bthing`, `some${Semicolon}thing`],
            ['escaped newline', `${Backslash}x0a`, Newline],
            ['non-initial escaped newline', `foo${Backslash}x0a`, `foo${Newline}`],
            ['escaped newline (upper hex)', `${Backslash}x0A`, Newline],
            [
                'escaped backslash followed by literal "x0a" is not a newline',
                `${Backslash}${Backslash}x0a`,
                `${Backslash}x0a`,
            ],
            [
                'non-initial escaped backslash followed by literal "x0a" is not a newline',
                `foo${Backslash}${Backslash}x0a`,
                `foo${Backslash}x0a`,
            ],
            ['PS1 simple', '[\\u@\\h \\W]\\$', '[\\u@\\h \\W]\\$'],
            [
                'PS1 VSC SI',
                `${Backslash}x1b]633;A${Backslash}x07\\[${Backslash}x1b]0;\\u@\\h:\\w\\a\\]${Backslash}x1b]633;B${Backslash}x07`,
                '\x1b]633;A\x07\\[\x1b]0;\\u@\\h:\\w\\a\\]\x1b]633;B\x07',
            ],
        ];
        cases.forEach(([title, input, expected]) => {
            test(title, () => strictEqual(deserializeMessage(input), expected));
        });
    });
    test('parseKeyValueAssignment', () => {
        const cases = [
            ['empty', '', ['', undefined]],
            ['no "=" sign', 'some-text', ['some-text', undefined]],
            ['empty value', 'key=', ['key', '']],
            ['empty key', '=value', ['', 'value']],
            ['normal', 'key=value', ['key', 'value']],
            ['multiple "=" signs (1)', 'key==value', ['key', '=value']],
            ['multiple "=" signs (2)', 'key=value===true', ['key', 'value===true']],
            ['just a "="', '=', ['', '']],
            ['just a "=="', '==', ['', '=']],
        ];
        cases.forEach((x) => {
            const [title, input, [key, value]] = x;
            deepStrictEqual(parseKeyValueAssignment(input), { key, value }, title);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIveHRlcm0vc2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ2hFLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUs3RSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIscUJBQXFCLEdBQ3JCLE1BQU0sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWhFLE1BQU0seUJBQTBCLFNBQVEscUJBQXFCO0lBQzVELHVCQUF1QixDQUFDLFFBQWtCO1FBQ3pDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsOENBQXNDLFVBQVUsQ0FBQyxDQUFBO1FBQ3RFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQ25ELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRywwQ0FBa0MsVUFBVSxDQUFDLENBQUE7UUFDbEUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLHFCQUFnRCxDQUFBO0lBQ3BELElBQUksWUFBc0MsQ0FBQTtJQUUxQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsTUFBTSxZQUFZLEdBQUcsQ0FDcEIsTUFBTSxtQkFBbUIsQ0FBZ0MsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUN4RixDQUFDLFFBQVEsQ0FBQTtRQUNWLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksWUFBWSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRixxQkFBcUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNoQyxJQUFJLHlCQUF5QixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FDeEUsQ0FBQTtRQUNELEtBQUssQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN0QyxZQUFZLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFBO0lBQ2xELENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlGLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyx5Q0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNyRSxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDMUIsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLHlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3JFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1lBQzlDLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyx5Q0FBaUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRSxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1lBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3RELE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBRTFFLE1BQU0sS0FBSyxHQUFlO2dCQUN6QixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNsQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDO2FBQ3hDLENBQUE7WUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN2QixNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2xDLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFLENBQUE7Z0JBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDckUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLHdCQUF3QixLQUFLLE1BQU0sQ0FBQyxDQUFBO2dCQUN4RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixLQUFLLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1lBQ2hFLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFFcEQsTUFBTSxLQUFLLEdBQWU7b0JBQ3pCLDZCQUE2QjtvQkFDN0IsQ0FBQywrQkFBK0IsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDO29CQUNsRCxDQUFDLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLGtCQUFrQixDQUFDO29CQUNqRSxDQUFDLG9CQUFvQixFQUFFLHNDQUFzQyxFQUFFLGtCQUFrQixDQUFDO29CQUNsRixxQkFBcUI7b0JBQ3JCLENBQUMsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsa0JBQWtCLENBQUM7b0JBQ2xGLENBQUMsdUJBQXVCLEVBQUUsNEJBQTRCLEVBQUUsbUJBQW1CLENBQUM7b0JBQzVFLENBQUMsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUM7aUJBQzFFLENBQUE7Z0JBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNsQyxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO29CQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3JFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLEtBQUssTUFBTSxDQUFDLENBQUE7b0JBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBRW5ELE1BQU0sS0FBSyxHQUFlO29CQUN6Qiw2QkFBNkI7b0JBQzdCLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxDQUFDO29CQUN6Qyw0QkFBNEI7b0JBQzVCLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQztvQkFDL0IsQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDO29CQUNoQyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUM7b0JBQ2pDLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQztvQkFDbEMsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUM7b0JBQzdCLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDO29CQUMzQixDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQztpQkFDM0IsQ0FBQTtnQkFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUN2QixNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDeEIsTUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtvQkFDdEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQzlDLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFVLEtBQUssTUFBTSxDQUFDLENBQUE7b0JBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxLQUFLLElBQUksRUFBRTtZQUVqRixNQUFNLEtBQUssR0FBZTtnQkFDekIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDbEIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQzthQUN4QyxDQUFBO1lBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNsQyxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO2dCQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3JFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxZQUFZLEtBQUssTUFBTSxDQUFDLENBQUE7Z0JBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM5QixJQUFJLENBQUMsMEVBQTBFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0YsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDckMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RFLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUN4RCxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtZQUNyQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQywyRUFBMkUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzFCLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyw2Q0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6RSxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtZQUNyQyxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekUsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsc0RBQXNELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkUsTUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3pELE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3JDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9GLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyw2Q0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6RSxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDMUIsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3JDLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyw2Q0FBcUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6RSxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx5REFBeUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxRSxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNqRSxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDNUQsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsMkZBQTJGLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFDdkMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFFLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0QsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEUsTUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDOUQsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBRWIsTUFBTSxLQUFLLEdBQUcscUJBQXFCLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLG9CQUFvQixDQUFDLENBQUE7WUFDekMsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGtDQUFrQyxDQUFDLENBQUE7WUFDdkQsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsK0VBQStFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEcsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLHlCQUF5QixDQUFDLENBQUE7WUFDOUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pGLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ25ELE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDRixLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUIsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdEQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsZ0RBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDNUUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUE7WUFDNUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdEQUF3QyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvQixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsZ0RBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDNUUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzFCLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyxnREFBd0MsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM1RSxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtZQUM5QyxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsZ0RBQXdDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdEQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsZ0RBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDNUUsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLDhCQUE4QixDQUFDLENBQUE7WUFDbkQsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdEQUF3QyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hDLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyxnREFBd0MsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM1RSxNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDMUIsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdEQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVFLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSwrQkFBK0IsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyxnREFBd0MsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RSxDQUFDLENBQUMsQ0FBQTtRQUNGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDeEIsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ3pFLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDckIsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZFLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDekIsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzlFLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDOUIsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDaEMsc0hBQXNIO1FBQ3RILE1BQU0sU0FBUyxHQUFHLElBQWEsQ0FBQTtRQUMvQixNQUFNLE9BQU8sR0FBRyxJQUFhLENBQUE7UUFDN0IsTUFBTSxTQUFTLEdBQUcsR0FBWSxDQUFBO1FBRzlCLE1BQU0sS0FBSyxHQUFlO1lBQ3pCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDakIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQztZQUMzQixDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDO1lBQ3JDLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxTQUFTLEdBQUcsU0FBUyxFQUFFLEVBQUUsU0FBUyxDQUFDO1lBQzVELENBQUMsK0JBQStCLEVBQUUsTUFBTSxTQUFTLEdBQUcsU0FBUyxFQUFFLEVBQUUsTUFBTSxTQUFTLEVBQUUsQ0FBQztZQUNuRjtnQkFDQyx5QkFBeUI7Z0JBQ3pCLEdBQUcsU0FBUyxHQUFHLFNBQVMsR0FBRyxTQUFTLEdBQUcsU0FBUyxFQUFFO2dCQUNsRCxHQUFHLFNBQVMsR0FBRyxTQUFTLEVBQUU7YUFDMUI7WUFDRDtnQkFDQywrQkFBK0I7Z0JBQy9CLFFBQVEsU0FBUyxHQUFHLFNBQVMsT0FBTztnQkFDcEMsUUFBUSxTQUFTLE9BQU87YUFDeEI7WUFDRDtnQkFDQyx3Q0FBd0M7Z0JBQ3hDLEdBQUcsU0FBUyxHQUFHLFNBQVMsZUFBZSxTQUFTLEtBQUs7Z0JBQ3JELEdBQUcsU0FBUyxlQUFlLFNBQVMsRUFBRTthQUN0QztZQUNELENBQUMsbUJBQW1CLEVBQUUsR0FBRyxTQUFTLEtBQUssRUFBRSxTQUFTLENBQUM7WUFDbkQsQ0FBQywrQkFBK0IsRUFBRSxNQUFNLFNBQVMsS0FBSyxFQUFFLE1BQU0sU0FBUyxFQUFFLENBQUM7WUFDMUUsQ0FBQywrQkFBK0IsRUFBRSxHQUFHLFNBQVMsS0FBSyxFQUFFLFNBQVMsQ0FBQztZQUMvRDtnQkFDQyxnRUFBZ0U7Z0JBQ2hFLEdBQUcsU0FBUyxHQUFHLFNBQVMsS0FBSztnQkFDN0IsR0FBRyxTQUFTLEtBQUs7YUFDakI7WUFDRDtnQkFDQyw0RUFBNEU7Z0JBQzVFLE1BQU0sU0FBUyxHQUFHLFNBQVMsS0FBSztnQkFDaEMsTUFBTSxTQUFTLEtBQUs7YUFDcEI7WUFDRDtnQkFDQyxpREFBaUQ7Z0JBQ2pELEdBQUcsU0FBUyxHQUFHLFNBQVMsR0FBRyxTQUFTLEtBQUs7Z0JBQ3pDLEdBQUcsU0FBUyxHQUFHLFNBQVMsRUFBRTthQUMxQjtZQUNELENBQUMsK0JBQStCLEVBQUUsT0FBTyxTQUFTLFVBQVUsRUFBRSxPQUFPLFNBQVMsT0FBTyxDQUFDO1lBQ3RGLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxTQUFTLEtBQUssRUFBRSxPQUFPLENBQUM7WUFDL0MsQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLFNBQVMsS0FBSyxFQUFFLE1BQU0sT0FBTyxFQUFFLENBQUM7WUFDdEUsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLFNBQVMsS0FBSyxFQUFFLE9BQU8sQ0FBQztZQUMzRDtnQkFDQyw4REFBOEQ7Z0JBQzlELEdBQUcsU0FBUyxHQUFHLFNBQVMsS0FBSztnQkFDN0IsR0FBRyxTQUFTLEtBQUs7YUFDakI7WUFDRDtnQkFDQywwRUFBMEU7Z0JBQzFFLE1BQU0sU0FBUyxHQUFHLFNBQVMsS0FBSztnQkFDaEMsTUFBTSxTQUFTLEtBQUs7YUFDcEI7WUFDRCxDQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztZQUN0RDtnQkFDQyxZQUFZO2dCQUNaLEdBQUcsU0FBUyxZQUFZLFNBQVMsU0FBUyxTQUFTLDBCQUEwQixTQUFTLFlBQVksU0FBUyxLQUFLO2dCQUNoSCx5REFBeUQ7YUFDekQ7U0FDRCxDQUFBO1FBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFNcEMsTUFBTSxLQUFLLEdBQWU7WUFDekIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzlCLENBQUMsYUFBYSxFQUFFLFdBQVcsRUFBRSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN0RCxDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN6QyxDQUFDLHdCQUF3QixFQUFFLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzRCxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QixDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDaEMsQ0FBQTtRQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuQixNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN0QyxlQUFlLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=