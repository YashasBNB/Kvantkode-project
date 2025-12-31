/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { decodeKeybinding, createSimpleKeybinding, } from '../../../../base/common/keybindings.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { OS } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ContextKeyExpr, } from '../../../contextkey/common/contextkey.js';
import { KeybindingResolver } from '../../common/keybindingResolver.js';
import { ResolvedKeybindingItem } from '../../common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
import { createUSLayoutResolvedKeybinding } from './keybindingsTestUtils.js';
function createContext(ctx) {
    return {
        getValue: (key) => {
            return ctx[key];
        },
    };
}
suite('KeybindingResolver', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function kbItem(keybinding, command, commandArgs, when, isDefault) {
        const resolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
        return new ResolvedKeybindingItem(resolvedKeybinding, command, commandArgs, when, isDefault, null, false);
    }
    function getDispatchStr(chord) {
        return USLayoutResolvedKeybinding.getDispatchStr(chord);
    }
    test('resolve key', () => {
        const keybinding = 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */;
        const runtimeKeybinding = createSimpleKeybinding(keybinding, OS);
        const contextRules = ContextKeyExpr.equals('bar', 'baz');
        const keybindingItem = kbItem(keybinding, 'yes', null, contextRules, true);
        assert.strictEqual(contextRules.evaluate(createContext({ bar: 'baz' })), true);
        assert.strictEqual(contextRules.evaluate(createContext({ bar: 'bz' })), false);
        const resolver = new KeybindingResolver([keybindingItem], [], () => { });
        const r1 = resolver.resolve(createContext({ bar: 'baz' }), [], getDispatchStr(runtimeKeybinding));
        assert.ok(r1.kind === 2 /* ResultKind.KbFound */);
        assert.strictEqual(r1.commandId, 'yes');
        const r2 = resolver.resolve(createContext({ bar: 'bz' }), [], getDispatchStr(runtimeKeybinding));
        assert.strictEqual(r2.kind, 0 /* ResultKind.NoMatchingKb */);
    });
    test('resolve key with arguments', () => {
        const commandArgs = { text: 'no' };
        const keybinding = 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */;
        const runtimeKeybinding = createSimpleKeybinding(keybinding, OS);
        const contextRules = ContextKeyExpr.equals('bar', 'baz');
        const keybindingItem = kbItem(keybinding, 'yes', commandArgs, contextRules, true);
        const resolver = new KeybindingResolver([keybindingItem], [], () => { });
        const r = resolver.resolve(createContext({ bar: 'baz' }), [], getDispatchStr(runtimeKeybinding));
        assert.ok(r.kind === 2 /* ResultKind.KbFound */);
        assert.strictEqual(r.commandArgs, commandArgs);
    });
    suite('handle keybinding removals', () => {
        test('simple 1', () => {
            const defaults = [kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true)];
            const overrides = [kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), false),
            ]);
        });
        test('simple 2', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [kbItem(33 /* KeyCode.KeyC */, 'yes3', null, ContextKeyExpr.equals('3', 'c'), false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
                kbItem(33 /* KeyCode.KeyC */, 'yes3', null, ContextKeyExpr.equals('3', 'c'), false),
            ]);
        });
        test('removal with not matching when', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-yes1', null, ContextKeyExpr.equals('1', 'b'), false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('removal with not matching keybinding', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [
                kbItem(32 /* KeyCode.KeyB */, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('removal with matching keybinding and when', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('removal with unspecified keybinding', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [kbItem(0, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('removal with unspecified when', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [kbItem(31 /* KeyCode.KeyA */, '-yes1', null, undefined, false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('removal with unspecified when and unspecified keybinding', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [kbItem(0, '-yes1', null, undefined, false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('issue #138997 - removal in default list', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, undefined, true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, undefined, true),
                kbItem(0, '-yes1', null, undefined, false),
            ];
            const overrides = [];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [kbItem(32 /* KeyCode.KeyB */, 'yes2', null, undefined, true)]);
        });
        test('issue #612#issuecomment-222109084 cannot remove keybindings for commands with ^', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, '^yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ];
            const overrides = [kbItem(31 /* KeyCode.KeyA */, '-yes1', null, undefined, false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
            ]);
        });
        test('issue #140884 Unable to reassign F1 as keybinding for Show All Commands', () => {
            const defaults = [kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, true)];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, undefined, false),
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, false)]);
        });
        test('issue #141638: Keyboard Shortcuts: Change When Expression might actually remove keybinding in Insiders', () => {
            const defaults = [kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, true)];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, ContextKeyExpr.equals('a', '1'), false),
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, undefined, false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, ContextKeyExpr.equals('a', '1'), false),
            ]);
        });
        test('issue #157751: Auto-quoting of context keys prevents removal of keybindings via UI', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, ContextKeyExpr.deserialize(`editorTextFocus && activeEditor != workbench.editor.notebook && editorLangId in julia.supportedLanguageIds`), true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, ContextKeyExpr.deserialize(`editorTextFocus && activeEditor != 'workbench.editor.notebook' && editorLangId in 'julia.supportedLanguageIds'`), false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, []);
        });
        test('issue #160604: Remove keybindings with when clause does not work', () => {
            const defaults = [kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, true)];
            const overrides = [kbItem(31 /* KeyCode.KeyA */, '-command1', null, ContextKeyExpr.true(), false)];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, []);
        });
        test('contextIsEntirelyIncluded', () => {
            const toContextKeyExpression = (expr) => {
                if (typeof expr === 'string' || !expr) {
                    return ContextKeyExpr.deserialize(expr);
                }
                return expr;
            };
            const assertIsIncluded = (a, b) => {
                assert.strictEqual(KeybindingResolver.whenIsEntirelyIncluded(toContextKeyExpression(a), toContextKeyExpression(b)), true);
            };
            const assertIsNotIncluded = (a, b) => {
                assert.strictEqual(KeybindingResolver.whenIsEntirelyIncluded(toContextKeyExpression(a), toContextKeyExpression(b)), false);
            };
            assertIsIncluded(null, null);
            assertIsIncluded(null, ContextKeyExpr.true());
            assertIsIncluded(ContextKeyExpr.true(), null);
            assertIsIncluded(ContextKeyExpr.true(), ContextKeyExpr.true());
            assertIsIncluded('key1', null);
            assertIsIncluded('key1', '');
            assertIsIncluded('key1', 'key1');
            assertIsIncluded('key1', ContextKeyExpr.true());
            assertIsIncluded('!key1', '');
            assertIsIncluded('!key1', '!key1');
            assertIsIncluded('key2', '');
            assertIsIncluded('key2', 'key2');
            assertIsIncluded('key1 && key1 && key2 && key2', 'key2');
            assertIsIncluded('key1 && key2', 'key2');
            assertIsIncluded('key1 && key2', 'key1');
            assertIsIncluded('key1 && key2', '');
            assertIsIncluded('key1', 'key1 || key2');
            assertIsIncluded('key1 || !key1', 'key2 || !key2');
            assertIsIncluded('key1', 'key1 || key2 && key3');
            assertIsNotIncluded('key1', '!key1');
            assertIsNotIncluded('!key1', 'key1');
            assertIsNotIncluded('key1 && key2', 'key3');
            assertIsNotIncluded('key1 && key2', 'key4');
            assertIsNotIncluded('key1', 'key2');
            assertIsNotIncluded('key1 || key2', 'key2');
            assertIsNotIncluded('', 'key2');
            assertIsNotIncluded(null, 'key2');
        });
    });
    suite('resolve command', () => {
        function _kbItem(keybinding, command, when) {
            return kbItem(keybinding, command, null, when, true);
        }
        const items = [
            // This one will never match because its "when" is always overwritten by another one
            _kbItem(54 /* KeyCode.KeyX */, 'first', ContextKeyExpr.and(ContextKeyExpr.equals('key1', true), ContextKeyExpr.notEquals('key2', false))),
            // This one always overwrites first
            _kbItem(54 /* KeyCode.KeyX */, 'second', ContextKeyExpr.equals('key2', true)),
            // This one is a secondary mapping for `second`
            _kbItem(56 /* KeyCode.KeyZ */, 'second', undefined),
            // This one sometimes overwrites first
            _kbItem(54 /* KeyCode.KeyX */, 'third', ContextKeyExpr.equals('key3', true)),
            // This one is always overwritten by another one
            _kbItem(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 'fourth', ContextKeyExpr.equals('key4', true)),
            // This one overwrites with a chord the previous one
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */), 'fifth', undefined),
            // This one has no keybinding
            _kbItem(0, 'sixth', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */), 'seventh', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */), 'seventh', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */), 'uncomment lines', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */), // cmd+k cmd+c
            'comment lines', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */), // cmd+g cmd+c
            'unreachablechord', undefined),
            _kbItem(2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, // cmd+g
            'eleven', undefined),
            _kbItem([2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 31 /* KeyCode.KeyA */, 32 /* KeyCode.KeyB */], // cmd+k a b
            'long multi chord', undefined),
            _kbItem([2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */], // cmd+b cmd+c
            'shadowed by long-multi-chord-2', undefined),
            _kbItem([2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, 39 /* KeyCode.KeyI */], // cmd+b cmd+c i
            'long-multi-chord-2', undefined),
        ];
        const resolver = new KeybindingResolver(items, [], () => { });
        const testKbLookupByCommand = (commandId, expectedKeys) => {
            // Test lookup
            const lookupResult = resolver.lookupKeybindings(commandId);
            assert.strictEqual(lookupResult.length, expectedKeys.length, 'Length mismatch @ commandId ' + commandId);
            for (let i = 0, len = lookupResult.length; i < len; i++) {
                const expected = createUSLayoutResolvedKeybinding(expectedKeys[i], OS);
                assert.strictEqual(lookupResult[i].resolvedKeybinding.getUserSettingsLabel(), expected.getUserSettingsLabel(), 'value mismatch @ commandId ' + commandId);
            }
        };
        const testResolve = (ctx, _expectedKey, commandId) => {
            const expectedKeybinding = decodeKeybinding(_expectedKey, OS);
            const previousChord = [];
            for (let i = 0, len = expectedKeybinding.chords.length; i < len; i++) {
                const chord = getDispatchStr(expectedKeybinding.chords[i]);
                const result = resolver.resolve(ctx, previousChord, chord);
                if (i === len - 1) {
                    // if it's the final chord, then we should find a valid command,
                    // and there should not be a chord.
                    assert.ok(result.kind === 2 /* ResultKind.KbFound */, `Enters multi chord for ${commandId} at chord ${i}`);
                    assert.strictEqual(result.commandId, commandId, `Enters multi chord for ${commandId} at chord ${i}`);
                }
                else if (i > 0) {
                    // if this is an intermediate chord, we should not find a valid command,
                    // and there should be an open chord we continue.
                    assert.ok(result.kind === 1 /* ResultKind.MoreChordsNeeded */, `Continues multi chord for ${commandId} at chord ${i}`);
                }
                else {
                    // if it's not the final chord and not an intermediate, then we should not
                    // find a valid command, and we should enter a chord.
                    assert.ok(result.kind === 1 /* ResultKind.MoreChordsNeeded */, `Enters multi chord for ${commandId} at chord ${i}`);
                }
                previousChord.push(chord);
            }
        };
        test('resolve command - 1', () => {
            testKbLookupByCommand('first', []);
        });
        test('resolve command - 2', () => {
            testKbLookupByCommand('second', [56 /* KeyCode.KeyZ */, 54 /* KeyCode.KeyX */]);
            testResolve(createContext({ key2: true }), 54 /* KeyCode.KeyX */, 'second');
            testResolve(createContext({}), 56 /* KeyCode.KeyZ */, 'second');
        });
        test('resolve command - 3', () => {
            testKbLookupByCommand('third', [54 /* KeyCode.KeyX */]);
            testResolve(createContext({ key3: true }), 54 /* KeyCode.KeyX */, 'third');
        });
        test('resolve command - 4', () => {
            testKbLookupByCommand('fourth', []);
        });
        test('resolve command - 5', () => {
            testKbLookupByCommand('fifth', [KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */)]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */), 'fifth');
        });
        test('resolve command - 6', () => {
            testKbLookupByCommand('seventh', [
                KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */),
            ]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */), 'seventh');
        });
        test('resolve command - 7', () => {
            testKbLookupByCommand('uncomment lines', [
                KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */),
            ]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */), 'uncomment lines');
        });
        test('resolve command - 8', () => {
            testKbLookupByCommand('comment lines', [
                KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
            ]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */), 'comment lines');
        });
        test('resolve command - 9', () => {
            testKbLookupByCommand('unreachablechord', []);
        });
        test('resolve command - 10', () => {
            testKbLookupByCommand('eleven', [2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */]);
            testResolve(createContext({}), 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, 'eleven');
        });
        test('resolve command - 11', () => {
            testKbLookupByCommand('sixth', []);
        });
        test('resolve command - 12', () => {
            testKbLookupByCommand('long multi chord', [
                [2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 31 /* KeyCode.KeyA */, 32 /* KeyCode.KeyB */],
            ]);
            testResolve(createContext({}), [2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 31 /* KeyCode.KeyA */, 32 /* KeyCode.KeyB */], 'long multi chord');
        });
        const emptyContext = createContext({});
        test('KBs having common prefix - the one defined later is returned', () => {
            testResolve(emptyContext, [2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, 39 /* KeyCode.KeyI */], 'long-multi-chord-2');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1Jlc29sdmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL3Rlc3QvY29tbW9uL2tleWJpbmRpbmdSZXNvbHZlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLHNCQUFzQixHQUV0QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixjQUFjLEdBR2QsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQWMsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUU1RSxTQUFTLGFBQWEsQ0FBQyxHQUFRO0lBQzlCLE9BQU87UUFDTixRQUFRLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUN6QixPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQixDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxNQUFNLENBQ2QsVUFBNkIsRUFDN0Is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