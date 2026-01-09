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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci94dGVybS9zaGVsbEludGVncmF0aW9uQWRkb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDaEUsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBSzdFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixxQkFBcUIsR0FDckIsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFaEUsTUFBTSx5QkFBMEIsU0FBUSxxQkFBcUI7SUFDNUQsdUJBQXVCLENBQUMsUUFBa0I7UUFDekMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyw4Q0FBc0MsVUFBVSxDQUFDLENBQUE7UUFDdEUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFDRCxpQkFBaUI7UUFDaEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHdCQUF3QixFQUFF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