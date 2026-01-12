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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1Jlc29sdmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvdGVzdC9jb21tb24va2V5YmluZGluZ1Jlc29sdmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsc0JBQXNCLEdBRXRCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLGNBQWMsR0FHZCxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBYyxNQUFNLG9DQUFvQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRTVFLFNBQVMsYUFBYSxDQUFDLEdBQVE7SUFDOUIsT0FBTztRQUNOLFFBQVEsRUFBRSxDQUFDLEdBQVcsRUFBRSxFQUFFO1lBQ3pCLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLE1BQU0sQ0FDZCxVQUE2QixF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