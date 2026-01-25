/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../log/common/log.js';
import { PromptInputModel, } from '../../../../common/capabilities/commandDetection/promptInputModel.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ok, notDeepStrictEqual, strictEqual } from 'assert';
import { timeout } from '../../../../../../base/common/async.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
suite('PromptInputModel', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let promptInputModel;
    let xterm;
    let onCommandStart;
    let onCommandStartChanged;
    let onCommandExecuted;
    async function writePromise(data) {
        await new Promise((r) => xterm.write(data, r));
    }
    function fireCommandStart() {
        onCommandStart.fire({ marker: xterm.registerMarker() });
    }
    function fireCommandExecuted() {
        onCommandExecuted.fire(null);
    }
    function setContinuationPrompt(prompt) {
        promptInputModel.setContinuationPrompt(prompt);
    }
    async function assertPromptInput(valueWithCursor) {
        await timeout(0);
        if (promptInputModel.cursorIndex !== -1 && !valueWithCursor.includes('|')) {
            throw new Error('assertPromptInput must contain | character');
        }
        const actualValueWithCursor = promptInputModel.getCombinedString();
        strictEqual(actualValueWithCursor, valueWithCursor.replaceAll('\n', '\u23CE'));
        // This is required to ensure the cursor index is correctly resolved for non-ascii characters
        const value = valueWithCursor.replace(/[\|\[\]]/g, '');
        const cursorIndex = valueWithCursor.indexOf('|');
        strictEqual(promptInputModel.value, value);
        strictEqual(promptInputModel.cursorIndex, cursorIndex, `value=${promptInputModel.value}`);
        ok(promptInputModel.ghostTextIndex === -1 || cursorIndex <= promptInputModel.ghostTextIndex, `cursorIndex (${cursorIndex}) must be before ghostTextIndex (${promptInputModel.ghostTextIndex})`);
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true }));
        onCommandStart = store.add(new Emitter());
        onCommandStartChanged = store.add(new Emitter());
        onCommandExecuted = store.add(new Emitter());
        promptInputModel = store.add(new PromptInputModel(xterm, onCommandStart.event, onCommandStartChanged.event, onCommandExecuted.event, new NullLogService()));
    });
    test('basic input and execute', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        await writePromise('\r\n');
        fireCommandExecuted();
        await assertPromptInput('foo bar');
        await writePromise('(command output)\r\n$ ');
        fireCommandStart();
        await assertPromptInput('|');
    });
    test('should not fire onDidChangeInput events when nothing changes', async () => {
        const events = [];
        store.add(promptInputModel.onDidChangeInput((e) => events.push(e)));
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo');
        await assertPromptInput('foo|');
        await writePromise(' bar');
        await assertPromptInput('foo bar|');
        await writePromise('\r\n');
        fireCommandExecuted();
        await assertPromptInput('foo bar');
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        for (let i = 0; i < events.length - 1; i++) {
            notDeepStrictEqual(events[i], events[i + 1], 'not adjacent events should fire with the same value');
        }
    });
    test('should fire onDidInterrupt followed by onDidFinish when ctrl+c is pressed', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo');
        await assertPromptInput('foo|');
        await new Promise((r) => {
            store.add(promptInputModel.onDidInterrupt(() => {
                // Fire onDidFinishInput immediately after onDidInterrupt
                store.add(promptInputModel.onDidFinishInput(() => {
                    r();
                }));
            }));
            xterm.input('\x03');
            writePromise('^C').then(() => fireCommandExecuted());
        });
    });
    test('cursor navigation', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        await writePromise('\x1b[3D');
        await assertPromptInput('foo |bar');
        await writePromise('\x1b[4D');
        await assertPromptInput('|foo bar');
        await writePromise('\x1b[3C');
        await assertPromptInput('foo| bar');
        await writePromise('\x1b[4C');
        await assertPromptInput('foo bar|');
        await writePromise('\x1b[D');
        await assertPromptInput('foo ba|r');
        await writePromise('\x1b[C');
        await assertPromptInput('foo bar|');
    });
    suite('ghost text', () => {
        test('basic ghost text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[2m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
        });
        test('trailing whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo    ');
            await writePromise('\x1b[4D');
            await assertPromptInput('foo|    ');
        });
        test('basic ghost text one word', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('pw\x1b[2md\x1b[1D');
            await assertPromptInput('pw|[d]');
        });
        test('ghost text with cursor navigation', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[2m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
            await writePromise('\x1b[C');
            await assertPromptInput('fo|o[ bar]');
            await writePromise('\x1b[C');
            await assertPromptInput('foo|[ bar]');
        });
        test('ghost text with different foreground colors only', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[38;2;255;0;0m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
        });
        test('no ghost text when foreground color matches earlier text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[38;2;255;0;0mred1\x1b[0m ' + // Red "red1"
                '\x1b[38;2;0;255;0mgreen\x1b[0m ' + // Green "green"
                '\x1b[38;2;255;0;0mred2\x1b[0m');
            await assertPromptInput('red1 green red2|'); // No ghost text expected
        });
        test('ghost text detected when foreground color is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[38;2;255;0;0mcmd\x1b[0m ' + // Red "cmd"
                '\x1b[38;2;0;255;0marg\x1b[0m ' + // Green "arg"
                '\x1b[38;2;0;0;255mfinal\x1b[5D');
            await assertPromptInput('cmd arg |[final]');
        });
        test('no ghost text when background color matches earlier text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[48;2;255;0;0mred_bg1\x1b[0m ' + // Red background
                '\x1b[48;2;0;255;0mgreen_bg\x1b[0m ' + // Green background
                '\x1b[48;2;255;0;0mred_bg2\x1b[0m');
            await assertPromptInput('red_bg1 green_bg red_bg2|'); // No ghost text expected
        });
        test('ghost text detected when background color is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[48;2;255;0;0mred_bg\x1b[0m ' + // Red background
                '\x1b[48;2;0;255;0mgreen_bg\x1b[0m ' + // Green background
                '\x1b[48;2;0;0;255mblue_bg\x1b[7D');
            await assertPromptInput('red_bg green_bg |[blue_bg]');
        });
        test('ghost text detected when bold style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' + '\x1b[1mBOLD\x1b[4D');
            await assertPromptInput('text |[BOLD]');
        });
        test('no ghost text when earlier text has the same bold style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[1mBOLD1\x1b[0m ' + // Bold "BOLD1"
                'normal ' +
                '\x1b[1mBOLD2\x1b[0m');
            await assertPromptInput('BOLD1 normal BOLD2|'); // No ghost text expected
        });
        test('ghost text detected when italic style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' + '\x1b[3mITALIC\x1b[6D');
            await assertPromptInput('text |[ITALIC]');
        });
        test('no ghost text when earlier text has the same italic style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[3mITALIC1\x1b[0m ' + // Italic "ITALIC1"
                'normal ' +
                '\x1b[3mITALIC2\x1b[0m');
            await assertPromptInput('ITALIC1 normal ITALIC2|'); // No ghost text expected
        });
        test('ghost text detected when underline style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' + '\x1b[4mUNDERLINE\x1b[9D');
            await assertPromptInput('text |[UNDERLINE]');
        });
        test('no ghost text when earlier text has the same underline style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[4mUNDERLINE1\x1b[0m ' + // Underlined "UNDERLINE1"
                'normal ' +
                '\x1b[4mUNDERLINE2\x1b[0m');
            await assertPromptInput('UNDERLINE1 normal UNDERLINE2|'); // No ghost text expected
        });
        test('ghost text detected when strikethrough style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' + '\x1b[9mSTRIKE\x1b[6D');
            await assertPromptInput('text |[STRIKE]');
        });
        test('no ghost text when earlier text has the same strikethrough style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[9mSTRIKE1\x1b[0m ' + // Strikethrough "STRIKE1"
                'normal ' +
                '\x1b[9mSTRIKE2\x1b[0m');
            await assertPromptInput('STRIKE1 normal STRIKE2|'); // No ghost text expected
        });
        suite('With wrapping', () => {
            test('Fish ghost text in long line with wrapped content', async () => {
                promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                // Write a command with ghost text that will wrap
                await writePromise('find . -name');
                await assertPromptInput(`find . -name|`);
                // Add ghost text with dim style
                await writePromise('\x1b[2m test\x1b[0m\x1b[4D');
                await assertPromptInput(`find . -name |[test]`);
                // Move cursor within the ghost text
                await writePromise('\x1b[C');
                await assertPromptInput(`find . -name t|[est]`);
                // Accept ghost text
                await writePromise('\x1b[C\x1b[C\x1b[C\x1b[C\x1b[C');
                await assertPromptInput(`find . -name test|`);
            });
            test('Pwsh ghost text in long line with wrapped content', async () => {
                promptInputModel.setShellType("pwsh" /* GeneralShellType.PowerShell */);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                // Write a command with ghost text that will wrap
                await writePromise('find . -name');
                await assertPromptInput(`find . -name|`);
                // Add ghost text with dim style
                await writePromise('\x1b[2m test\x1b[0m\x1b[4D');
                await assertPromptInput(`find . -name |[test]`);
                // Move cursor within the ghost text
                await writePromise('\x1b[C');
                await assertPromptInput(`find . -name t|[est]`);
                // Accept ghost text
                await writePromise('\x1b[C\x1b[C\x1b[C\x1b[C\x1b[C');
                await assertPromptInput(`find . -name test|`);
            });
        });
    });
    test('wide input (Korean)', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('안영');
        await assertPromptInput('안영|');
        await writePromise('\r\n컴퓨터');
        await assertPromptInput('안영\n컴퓨터|');
        await writePromise('\r\n사람');
        await assertPromptInput('안영\n컴퓨터\n사람|');
        await writePromise('\x1b[G');
        await assertPromptInput('안영\n컴퓨터\n|사람');
        await writePromise('\x1b[A');
        await assertPromptInput('안영\n|컴퓨터\n사람');
        await writePromise('\x1b[4C');
        await assertPromptInput('안영\n컴퓨|터\n사람');
        await writePromise('\x1b[1;4H');
        await assertPromptInput('안|영\n컴퓨터\n사람');
        await writePromise('\x1b[D');
        await assertPromptInput('|안영\n컴퓨터\n사람');
    });
    test('emoji input', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('✌️👍');
        await assertPromptInput('✌️👍|');
        await writePromise('\r\n😎😕😅');
        await assertPromptInput('✌️👍\n😎😕😅|');
        await writePromise('\r\n🤔🤷😩');
        await assertPromptInput('✌️👍\n😎😕😅\n🤔🤷😩|');
        await writePromise('\x1b[G');
        await assertPromptInput('✌️👍\n😎😕😅\n|🤔🤷😩');
        await writePromise('\x1b[A');
        await assertPromptInput('✌️👍\n|😎😕😅\n🤔🤷😩');
        await writePromise('\x1b[2C');
        await assertPromptInput('✌️👍\n😎😕|😅\n🤔🤷😩');
        await writePromise('\x1b[1;4H');
        await assertPromptInput('✌️|👍\n😎😕😅\n🤔🤷😩');
        await writePromise('\x1b[D');
        await assertPromptInput('|✌️👍\n😎😕😅\n🤔🤷😩');
    });
    suite('trailing whitespace', () => {
        test('delete whitespace with backspace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise(' ');
            await assertPromptInput(` |`);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput('|');
            xterm.input(' '.repeat(4), true);
            await writePromise(' '.repeat(4));
            await assertPromptInput(`    |`);
            xterm.input('\x1b[D'.repeat(2), true); // Left
            await writePromise('\x1b[2D');
            await assertPromptInput(`  |  `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput(` |  `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput(`|  `);
            xterm.input(' ', true);
            await writePromise(' ');
            await assertPromptInput(` |  `);
            xterm.input(' ', true);
            await writePromise(' ');
            await assertPromptInput(`  |  `);
            xterm.input('\x1b[C', true); // Right
            await writePromise('\x1b[C');
            await assertPromptInput(`   | `);
            xterm.input('a', true);
            await writePromise('a');
            await assertPromptInput(`   a| `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D\x1b[K');
            await assertPromptInput(`   | `);
            xterm.input('\x1b[D'.repeat(2), true); // Left
            await writePromise('\x1b[2D');
            await assertPromptInput(` |   `);
            xterm.input('\x1b[3~', true); // Delete
            await writePromise('');
            await assertPromptInput(` |  `);
        });
        // TODO: This doesn't work correctly but it doesn't matter too much as it only happens when
        // there is a lot of whitespace at the end of a prompt input
        test.skip('track whitespace when ConPTY deletes whitespace unexpectedly', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            xterm.input('ls', true);
            await writePromise('ls');
            await assertPromptInput(`ls|`);
            xterm.input(' '.repeat(4), true);
            await writePromise(' '.repeat(4));
            await assertPromptInput(`ls    |`);
            xterm.input(' ', true);
            await writePromise('\x1b[4D\x1b[5X\x1b[5C'); // Cursor left x(N-1), delete xN, cursor right xN
            await assertPromptInput(`ls     |`);
        });
        test('track whitespace beyond cursor', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise(' '.repeat(8));
            await assertPromptInput(`${' '.repeat(8)}|`);
            await writePromise('\x1b[4D');
            await assertPromptInput(`${' '.repeat(4)}|${' '.repeat(4)}`);
        });
    });
    suite('multi-line', () => {
        test('basic 2 line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
        });
        test('basic 3 line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\nb\n|`);
            await writePromise('c');
            await assertPromptInput(`echo "a\nb\nc|`);
        });
        test('navigate left in multi-line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "a\n|b`);
            await writePromise('\x1b[@c');
            await assertPromptInput(`echo "a\nc|b`);
            await writePromise('\x1b[K\n\r\∙ ');
            await assertPromptInput(`echo "a\nc\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nc\nb|`);
            await writePromise(' foo');
            await assertPromptInput(`echo "a\nc\nb foo|`);
            await writePromise('\x1b[3D');
            await assertPromptInput(`echo "a\nc\nb |foo`);
        });
        test('navigate up in multi-line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "foo');
            await assertPromptInput(`echo "foo|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\n|`);
            await writePromise('bar');
            await assertPromptInput(`echo "foo\nbar|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\nbar\n|`);
            await writePromise('baz');
            await assertPromptInput(`echo "foo\nbar\nbaz|`);
            await writePromise('\x1b[A');
            await assertPromptInput(`echo "foo\nbar|\nbaz`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nba|r\nbaz`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nb|ar\nbaz`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\n|bar\nbaz`);
            await writePromise('\x1b[1;9H');
            await assertPromptInput(`echo "|foo\nbar\nbaz`);
            await writePromise('\x1b[C');
            await assertPromptInput(`echo "f|oo\nbar\nbaz`);
            await writePromise('\x1b[C');
            await assertPromptInput(`echo "fo|o\nbar\nbaz`);
            await writePromise('\x1b[C');
            await assertPromptInput(`echo "foo|\nbar\nbaz`);
        });
        test('navigating up when first line contains invalid/stale trailing whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "foo      \x1b[6D');
            await assertPromptInput(`echo "foo|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\n|`);
            await writePromise('bar');
            await assertPromptInput(`echo "foo\nbar|`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nba|r`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nb|ar`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\n|bar`);
        });
    });
    suite('multi-line wrapped (no continuation prompt)', () => {
        test('basic wrapped line', async () => {
            xterm.resize(5, 10);
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('ech');
            await assertPromptInput(`ech|`);
            await writePromise('o ');
            await assertPromptInput(`echo |`);
            await writePromise('"a"');
            // HACK: Trailing whitespace is due to flaky detection in wrapped lines (but it doesn't matter much)
            await assertPromptInput(`echo "a"| `);
            await writePromise('\n\r\ b');
            await assertPromptInput(`echo "a"\n b|`);
            await writePromise('\n\r\ c');
            await assertPromptInput(`echo "a"\n b\n c|`);
        });
    });
    suite('multi-line wrapped (continuation prompt)', () => {
        test('basic wrapped line', async () => {
            xterm.resize(5, 10);
            promptInputModel.setContinuationPrompt('∙ ');
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('ech');
            await assertPromptInput(`ech|`);
            await writePromise('o ');
            await assertPromptInput(`echo |`);
            await writePromise('"a"');
            // HACK: Trailing whitespace is due to flaky detection in wrapped lines (but it doesn't matter much)
            await assertPromptInput(`echo "a"| `);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a"\nb|`);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\nb\n|`);
            await writePromise('c');
            await assertPromptInput(`echo "a"\nb\nc|`);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\nb\nc\n|`);
        });
    });
    suite('multi-line wrapped fish', () => {
        test('forward slash continuation', async () => {
            promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
            await writePromise('$ ');
            await assertPromptInput('|');
            await writePromise('[I] meganrogge@Megans-MacBook-Pro ~ (main|BISECTING)>');
            fireCommandStart();
            await writePromise('ech\\');
            await assertPromptInput(`ech\\|`);
            await writePromise('\no bye');
            await assertPromptInput(`echo bye|`);
        });
        test('newline with no continuation', async () => {
            promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
            await writePromise('$ ');
            await assertPromptInput('|');
            await writePromise('[I] meganrogge@Megans-MacBook-Pro ~ (main|BISECTING)>');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "hi');
            await assertPromptInput(`echo "hi|`);
            await writePromise('\nand bye\nwhy"');
            await assertPromptInput(`echo "hi\nand bye\nwhy"|`);
        });
    });
    // To "record a session" for these tests:
    // - Enable debug logging
    // - Open and clear Terminal output channel
    // - Open terminal and perform the test
    // - Extract all "parsing data" lines from the terminal
    suite('recorded sessions', () => {
        async function replayEvents(events) {
            for (const data of events) {
                await writePromise(data);
            }
        }
        suite('Windows 11 (10.0.22621.3447), pwsh 7.4.2, starship prompt 1.10.2', () => {
            test('input with ignored ghost text', async () => {
                await replayEvents([
                    '[?25l[2J[m[H]0;C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\\pwsh.exe[?25h',
                    '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                    ']633;P;IsWindows=True',
                    ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                    ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m03:13:47 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$⇡ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                fireCommandStart();
                await assertPromptInput('|');
                await replayEvents([
                    '[?25l[93mf[97m[2m[3makecommand[3;4H[?25h',
                    '[m',
                    '[93mfo[9X',
                    '[m',
                    '[?25l[93m[3;3Hfoo[?25h',
                    '[m',
                ]);
                await assertPromptInput('foo|');
            });
            test('input with accepted and run ghost text', async () => {
                await replayEvents([
                    '[?25l[2J[m[H]0;C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\\pwsh.exe[?25h',
                    '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                    ']633;P;IsWindows=True',
                    ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                    ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m03:41:36 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                promptInputModel.setContinuationPrompt('∙ ');
                fireCommandStart();
                await assertPromptInput('|');
                await replayEvents(['[?25l[93me[97m[2m[3mcho "hello world"[3;4H[?25h', '[m']);
                await assertPromptInput('e|[cho "hello world"]');
                await replayEvents(['[?25l[93mec[97m[2m[3mho "hello world"[3;5H[?25h', '[m']);
                await assertPromptInput('ec|[ho "hello world"]');
                await replayEvents(['[?25l[93m[3;3Hech[97m[2m[3mo "hello world"[3;6H[?25h', '[m']);
                await assertPromptInput('ech|[o "hello world"]');
                await replayEvents(['[?25l[93m[3;3Hecho[97m[2m[3m "hello world"[3;7H[?25h', '[m']);
                await assertPromptInput('echo|[ "hello world"]');
                await replayEvents(['[?25l[93m[3;3Hecho [97m[2m[3m"hello world"[3;8H[?25h', '[m']);
                await assertPromptInput('echo |["hello world"]');
                await replayEvents(['[?25l[93m[3;3Hecho [36m"hello world"[?25h', '[m']);
                await assertPromptInput('echo "hello world"|');
                await replayEvents([']633;E;echo "hello world";ff464d39-bc80-4bae-9ead-b1cafc4adf6f]633;C']);
                fireCommandExecuted();
                await assertPromptInput('echo "hello world"');
                await replayEvents(['\r\n', 'hello world\r\n']);
                await assertPromptInput('echo "hello world"');
                await replayEvents([
                    ']633;D;0]633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m03:41:42 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                fireCommandStart();
                await assertPromptInput('|');
            });
            test('input, go to start (ctrl+home), delete word in front (ctrl+delete)', async () => {
                await replayEvents([
                    '[?25l[2J[m[H]0;C:\Program Files\WindowsApps\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\pwsh.exe[?25h',
                    '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                    ']633;P;IsWindows=True',
                    ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                    ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                    '[34m\r\n[38;2;17;17;17m[44m16:07:06 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/210662 [33m[46m [38;2;17;17;17m$! [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                ]);
                fireCommandStart();
                await assertPromptInput('|');
                await replayEvents([
                    '[?25l[93mG[97m[2m[3mit push[3;4H[?25h',
                    '[m',
                    '[?25l[93mGe[97m[2m[3mt-ChildItem -Path a[3;5H[?25h',
                    '[m',
                    '[?25l[93m[3;3HGet[97m[2m[3m-ChildItem -Path a[3;6H[?25h',
                ]);
                await assertPromptInput('Get|[-ChildItem -Path a]');
                await replayEvents(['[m', '[?25l[3;3H[?25h', '[21X']);
                // Don't force a sync, the prompt input model should update by itself
                await timeout(0);
                const actualValueWithCursor = promptInputModel.getCombinedString();
                strictEqual(actualValueWithCursor, '|'.replaceAll('\n', '\u23CE'));
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbi9wcm9tcHRJbnB1dE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRy9ELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLGdCQUFrQyxDQUFBO0lBQ3RDLElBQUksS0FBZSxDQUFBO0lBQ25CLElBQUksY0FBeUMsQ0FBQTtJQUM3QyxJQUFJLHFCQUFvQyxDQUFBO0lBQ3hDLElBQUksaUJBQTRDLENBQUE7SUFFaEQsS0FBSyxVQUFVLFlBQVksQ0FBQyxJQUFZO1FBQ3ZDLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7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