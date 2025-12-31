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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb24vcHJvbXB0SW5wdXRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sc0VBQXNFLENBQUE7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUcvRCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxnQkFBa0MsQ0FBQTtJQUN0QyxJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLGNBQXlDLENBQUE7SUFDN0MsSUFBSSxxQkFBb0MsQ0FBQTtJQUN4QyxJQUFJLGlCQUE0QyxDQUFBO0lBRWhELEtBQUssVUFBVSxZQUFZLENBQUMsSUFBWTtRQUN2QyxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JE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