/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as uuid from '../../../../../base/common/uuid.js';
import { OS } from '../../../../../base/common/platform.js';
import { KeyCodeChord } from '../../../../../base/common/keybindings.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IExtensionService } from '../../../extensions/common/extensions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsEditorModel } from '../../browser/keybindingsEditorModel.js';
import { ResolvedKeybindingItem } from '../../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Action2, MenuRegistry, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { ExtensionIdentifier, } from '../../../../../platform/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('KeybindingsEditorModel', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let testObject;
    let extensions = [];
    setup(() => {
        extensions = [];
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IKeybindingService, {});
        instantiationService.stub(IExtensionService, {
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
            get extensions() {
                return extensions;
            },
        });
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, OS));
        disposables.add(CommandsRegistry.registerCommand('command_without_keybinding', () => { }));
    });
    test('fetch returns default keybindings', async () => {
        const expected = prepareKeybindingService(aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'b' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }));
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch(''));
        assertKeybindingItems(actuals, expected);
    });
    test('fetch returns distinct keybindings', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = prepareKeybindingService(aResolvedKeybindingItem({ command, firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), aResolvedKeybindingItem({ command, firstChord: { keyCode: 9 /* KeyCode.Escape */ } }));
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch(''));
        assertKeybindingItems(actuals, [expected[0]]);
    });
    test('fetch returns default keybindings at the top', async () => {
        const expected = prepareKeybindingService(aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'b' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }));
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch('').slice(0, 2), true);
        assertKeybindingItems(actuals, expected);
    });
    test('fetch returns default keybindings sorted by command id', async () => {
        const keybindings = prepareKeybindingService(aResolvedKeybindingItem({
            command: 'b' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'c' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 1 /* KeyCode.Backspace */ },
        }));
        const expected = [keybindings[2], keybindings[0], keybindings[1]];
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch(''));
        assertKeybindingItems(actuals, expected);
    });
    test('fetch returns user keybinding first if default and user has same id', async () => {
        const sameId = 'b' + uuid.generateUuid();
        const keybindings = prepareKeybindingService(aResolvedKeybindingItem({ command: sameId, firstChord: { keyCode: 9 /* KeyCode.Escape */ } }), aResolvedKeybindingItem({
            command: sameId,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
            isDefault: false,
        }));
        const expected = [keybindings[1], keybindings[0]];
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch(''));
        assertKeybindingItems(actuals, expected);
    });
    test('fetch returns keybinding with titles first', async () => {
        const keybindings = prepareKeybindingService(aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'b' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'c' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'd' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }));
        registerCommandWithTitle(keybindings[1].command, 'B Title');
        registerCommandWithTitle(keybindings[3].command, 'A Title');
        const expected = [keybindings[3], keybindings[1], keybindings[0], keybindings[2]];
        instantiationService.stub(IKeybindingService, 'getKeybindings', () => keybindings);
        instantiationService.stub(IKeybindingService, 'getDefaultKeybindings', () => keybindings);
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch(''));
        assertKeybindingItems(actuals, expected);
    });
    test('fetch returns keybinding with user first if title and id matches', async () => {
        const sameId = 'b' + uuid.generateUuid();
        const keybindings = prepareKeybindingService(aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: sameId,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'c' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: sameId,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            isDefault: false,
        }));
        registerCommandWithTitle(keybindings[1].command, 'Same Title');
        const expected = [keybindings[3], keybindings[1], keybindings[0], keybindings[2]];
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch(''));
        assertKeybindingItems(actuals, expected);
    });
    test('fetch returns default keybindings sorted by precedence', async () => {
        const expected = prepareKeybindingService(aResolvedKeybindingItem({
            command: 'b' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'c' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            secondChord: { keyCode: 9 /* KeyCode.Escape */ },
        }), aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 1 /* KeyCode.Backspace */ },
        }));
        await testObject.resolve(new Map());
        const actuals = asResolvedKeybindingItems(testObject.fetch('', true));
        assertKeybindingItems(actuals, expected);
    });
    test('convert keybinding without title to entry', async () => {
        const expected = aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject.fetch('')[0];
        assert.strictEqual(actual.keybindingItem.command, expected.command);
        assert.strictEqual(actual.keybindingItem.commandLabel, '');
        assert.strictEqual(actual.keybindingItem.commandDefaultLabel, null);
        assert.strictEqual(actual.keybindingItem.keybinding.getAriaLabel(), expected.resolvedKeybinding.getAriaLabel());
        assert.strictEqual(actual.keybindingItem.when, expected.when.serialize());
    });
    test('convert keybinding with title to entry', async () => {
        const expected = aResolvedKeybindingItem({
            command: 'a' + uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
        });
        prepareKeybindingService(expected);
        registerCommandWithTitle(expected.command, 'Some Title');
        await testObject.resolve(new Map());
        const actual = testObject.fetch('')[0];
        assert.strictEqual(actual.keybindingItem.command, expected.command);
        assert.strictEqual(actual.keybindingItem.commandLabel, 'Some Title');
        assert.strictEqual(actual.keybindingItem.commandDefaultLabel, null);
        assert.strictEqual(actual.keybindingItem.keybinding.getAriaLabel(), expected.resolvedKeybinding.getAriaLabel());
        assert.strictEqual(actual.keybindingItem.when, expected.when.serialize());
    });
    test('convert without title and binding to entry', async () => {
        disposables.add(CommandsRegistry.registerCommand('command_without_keybinding', () => { }));
        prepareKeybindingService();
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('')
            .filter((element) => element.keybindingItem.command === 'command_without_keybinding')[0];
        assert.strictEqual(actual.keybindingItem.command, 'command_without_keybinding');
        assert.strictEqual(actual.keybindingItem.commandLabel, '');
        assert.strictEqual(actual.keybindingItem.commandDefaultLabel, null);
        assert.strictEqual(actual.keybindingItem.keybinding, undefined);
        assert.strictEqual(actual.keybindingItem.when, '');
    });
    test('convert with title and without binding to entry', async () => {
        const id = 'a' + uuid.generateUuid();
        registerCommandWithTitle(id, 'some title');
        prepareKeybindingService();
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('')
            .filter((element) => element.keybindingItem.command === id)[0];
        assert.strictEqual(actual.keybindingItem.command, id);
        assert.strictEqual(actual.keybindingItem.commandLabel, 'some title');
        assert.strictEqual(actual.keybindingItem.commandDefaultLabel, null);
        assert.strictEqual(actual.keybindingItem.keybinding, undefined);
        assert.strictEqual(actual.keybindingItem.when, '');
    });
    test('filter by command id', async () => {
        const id = 'workbench.action.increaseViewSize';
        registerCommandWithTitle(id, 'some title');
        prepareKeybindingService();
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('workbench action view size')
            .filter((element) => element.keybindingItem.command === id)[0];
        assert.ok(actual);
    });
    test('filter by command title', async () => {
        const id = 'a' + uuid.generateUuid();
        registerCommandWithTitle(id, 'Increase view size');
        prepareKeybindingService();
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('increase size')
            .filter((element) => element.keybindingItem.command === id)[0];
        assert.ok(actual);
    });
    test('filter by system source', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('system')
            .filter((element) => element.keybindingItem.command === command)[0];
        assert.ok(actual);
    });
    test('filter by user source', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
            isDefault: false,
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('user')
            .filter((element) => element.keybindingItem.command === command)[0];
        assert.ok(actual);
    });
    test('filter by default source with "@source: " prefix', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
            isDefault: true,
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('@source: default')
            .filter((element) => element.keybindingItem.command === command)[0];
        assert.ok(actual);
    });
    test('filter by user source with "@source: " prefix', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
            isDefault: false,
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('@source: user')
            .filter((element) => element.keybindingItem.command === command)[0];
        assert.ok(actual);
    });
    test('filter by command prefix with different commands', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
            isDefault: true,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command: uuid.generateUuid(),
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: true,
        }));
        await testObject.resolve(new Map());
        const actual = testObject.fetch(`@command:${command}`);
        assert.strictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].keybindingItem.command, command);
    });
    test('filter by command prefix with same commands', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'context1 && context2',
            isDefault: true,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: true,
        }));
        await testObject.resolve(new Map());
        const actual = testObject.fetch(`@command:${command}`);
        assert.strictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].keybindingItem.command, command);
        assert.deepStrictEqual(actual[1].keybindingItem.command, command);
    });
    test('filter by when context', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('when context')
            .filter((element) => element.keybindingItem.command === command)[0];
        assert.ok(actual);
    });
    test('filter by cmd key', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected);
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('cmd')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { metaKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by meta key', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('meta')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { metaKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by command key', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('command')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { metaKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by windows key', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 1 /* OperatingSystem.Windows */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('windows')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { metaKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by alt key', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('alt')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { altKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by option key', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('option')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { altKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by ctrl key', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('ctrl')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { ctrlKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by control key', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('control')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { ctrlKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by shift key', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('shift')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { shiftKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by arrow', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 17 /* KeyCode.RightArrow */, modifiers: { shiftKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('arrow')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { keyCode: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by modifier and key', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 17 /* KeyCode.RightArrow */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 17 /* KeyCode.RightArrow */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('alt right')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { altKey: true, keyCode: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by key and modifier', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 17 /* KeyCode.RightArrow */, modifiers: { altKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 17 /* KeyCode.RightArrow */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('right alt')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(0, actual.length);
    });
    test('filter by modifiers and key', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true, metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('alt cmd esc')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            altKey: true,
            metaKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by modifiers in random order and key', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('cmd shift esc')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            metaKey: true,
            shiftKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by first part', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 20 /* KeyCode.Delete */ },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('cmd shift esc')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            metaKey: true,
            shiftKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter matches in chord part', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 20 /* KeyCode.Delete */ },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('cmd del')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { metaKey: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, { keyCode: true });
    });
    test('filter matches first part and in chord part', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 20 /* KeyCode.Delete */ },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 16 /* KeyCode.UpArrow */ },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('cmd shift esc del')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            shiftKey: true,
            metaKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, { keyCode: true });
    });
    test('filter exact matches', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"ctrl c"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { ctrlKey: true, keyCode: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter exact matches with first and chord part', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"shift meta escape ctrl c"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            shiftKey: true,
            metaKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, { ctrlKey: true, keyCode: true });
    });
    test('filter exact matches with first and chord part no results', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 20 /* KeyCode.Delete */, modifiers: { metaKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 16 /* KeyCode.UpArrow */ },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"cmd shift esc del"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(0, actual.length);
    });
    test('filter matches with + separator', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"control+c"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { ctrlKey: true, keyCode: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter by keybinding prefix', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('@keybinding:control+c')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { ctrlKey: true, keyCode: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter matches with + separator in first and chord parts', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"shift+meta+escape ctrl+c"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            shiftKey: true,
            metaKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, { keyCode: true, ctrlKey: true });
    });
    test('filter by keybinding prefix with chord', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('@keybinding:"shift+meta+escape ctrl+c"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, {
            shiftKey: true,
            metaKey: true,
            keyCode: true,
        });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, { keyCode: true, ctrlKey: true });
    });
    test('filter exact matches with space #32993', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 10 /* KeyCode.Space */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 1 /* KeyCode.Backspace */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"ctrl+space"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
    });
    test('filter exact matches with user settings label', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 18 /* KeyCode.DownArrow */ },
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({ command: 'down', firstChord: { keyCode: 9 /* KeyCode.Escape */ } }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"down"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { keyCode: true });
    });
    test('filter exact matches also return chords', async () => {
        const command = 'a' + uuid.generateUuid();
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 41 /* KeyCode.KeyK */, modifiers: { ctrlKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { shiftKey: true, metaKey: true } },
            secondChord: { keyCode: 33 /* KeyCode.KeyC */, modifiers: { ctrlKey: true } },
            when: 'whenContext1 && whenContext2',
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('"control+k"')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { ctrlKey: true, keyCode: true });
        assert.deepStrictEqual(actual[0].keybindingMatches.chordPart, {});
    });
    test('filter modifiers are not matched when not completely matched (prefix)', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const term = `alt.${uuid.generateUuid()}`;
        const command = `command.${term}`;
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command: 'some_command',
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject.fetch(term);
        assert.strictEqual(1, actual.length);
        assert.strictEqual(command, actual[0].keybindingItem.command);
        assert.strictEqual(1, actual[0].commandIdMatches?.length);
    });
    test('filter modifiers are not matched when not completely matched (includes)', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const term = `abcaltdef.${uuid.generateUuid()}`;
        const command = `command.${term}`;
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command: 'some_command',
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject.fetch(term);
        assert.strictEqual(1, actual.length);
        assert.strictEqual(command, actual[0].keybindingItem.command);
        assert.strictEqual(1, actual[0].commandIdMatches?.length);
    });
    test('filter modifiers are matched with complete term', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command = `command.${uuid.generateUuid()}`;
        const expected = aResolvedKeybindingItem({
            command,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            isDefault: false,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({
            command: 'some_command',
            firstChord: { keyCode: 9 /* KeyCode.Escape */ },
            isDefault: false,
        }));
        await testObject.resolve(new Map());
        const actual = testObject
            .fetch('alt')
            .filter((element) => element.keybindingItem.command === command);
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingMatches.firstPart, { altKey: true });
    });
    test('filter by extension', async () => {
        testObject = disposables.add(instantiationService.createInstance(KeybindingsEditorModel, 2 /* OperatingSystem.Macintosh */));
        const command1 = `command.${uuid.generateUuid()}`;
        const command2 = `command.${uuid.generateUuid()}`;
        extensions.push({ identifier: new ExtensionIdentifier('foo'), displayName: 'foo bar' }, { identifier: new ExtensionIdentifier('bar'), displayName: 'bar foo' });
        disposables.add(MenuRegistry.addCommand({
            id: command2,
            title: 'title',
            category: 'category',
            source: { id: extensions[1].identifier.value, title: extensions[1].displayName },
        }));
        const expected = aResolvedKeybindingItem({
            command: command1,
            firstChord: { keyCode: 9 /* KeyCode.Escape */, modifiers: { altKey: true } },
            isDefault: true,
            extensionId: extensions[0].identifier.value,
        });
        prepareKeybindingService(expected, aResolvedKeybindingItem({ command: command2, isDefault: true }));
        await testObject.resolve(new Map());
        let actual = testObject.fetch('@ext:foo');
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingItem.command, command1);
        actual = testObject.fetch('@ext:"bar foo"');
        assert.strictEqual(1, actual.length);
        assert.deepStrictEqual(actual[0].keybindingItem.command, command2);
    });
    function prepareKeybindingService(...keybindingItems) {
        instantiationService.stub(IKeybindingService, 'getKeybindings', () => keybindingItems);
        instantiationService.stub(IKeybindingService, 'getDefaultKeybindings', () => keybindingItems);
        return keybindingItems;
    }
    function registerCommandWithTitle(command, title) {
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: command,
                    title: { value: title, original: title },
                    f1: true,
                });
            }
            async run() { }
        }));
    }
    function assertKeybindingItems(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        for (let i = 0; i < actual.length; i++) {
            assertKeybindingItem(actual[i], expected[i]);
        }
    }
    function assertKeybindingItem(actual, expected) {
        assert.strictEqual(actual.command, expected.command);
        if (actual.when) {
            assert.ok(!!expected.when);
            assert.strictEqual(actual.when.serialize(), expected.when.serialize());
        }
        else {
            assert.ok(!expected.when);
        }
        assert.strictEqual(actual.isDefault, expected.isDefault);
        if (actual.resolvedKeybinding) {
            assert.ok(!!expected.resolvedKeybinding);
            assert.strictEqual(actual.resolvedKeybinding.getLabel(), expected.resolvedKeybinding.getLabel());
        }
        else {
            assert.ok(!expected.resolvedKeybinding);
        }
    }
    function aResolvedKeybindingItem({ command, when, isDefault, firstChord, secondChord, extensionId, }) {
        const aSimpleKeybinding = function (chord) {
            const { ctrlKey, shiftKey, altKey, metaKey } = chord.modifiers || {
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
            };
            return new KeyCodeChord(ctrlKey, shiftKey, altKey, metaKey, chord.keyCode);
        };
        const chords = [];
        if (firstChord) {
            chords.push(aSimpleKeybinding(firstChord));
            if (secondChord) {
                chords.push(aSimpleKeybinding(secondChord));
            }
        }
        const keybinding = chords.length > 0 ? new USLayoutResolvedKeybinding(chords, OS) : undefined;
        return new ResolvedKeybindingItem(keybinding, command || 'some command', null, when ? ContextKeyExpr.deserialize(when) : undefined, isDefault === undefined ? true : isDefault, extensionId ?? null, false);
    }
    function asResolvedKeybindingItems(keybindingEntries, keepUnassigned = false) {
        if (!keepUnassigned) {
            keybindingEntries = keybindingEntries.filter((keybindingEntry) => !!keybindingEntry.keybindingItem.keybinding);
        }
        return keybindingEntries.map((entry) => entry.keybindingItem.keybindingItem);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvdGVzdC9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsRUFBRSxFQUFtQixNQUFNLHdDQUF3QyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDNUcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFcEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFFeEgsT0FBTyxFQUNOLE9BQU8sRUFDUCxZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBU2xHLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUM3RCxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksVUFBa0MsQ0FBQTtJQUN0QyxJQUFJLFVBQVUsR0FBcUMsRUFBRSxDQUFBO0lBRXJELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixVQUFVLEdBQUcsRUFBRSxDQUFBO1FBQ2Ysb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQTtRQUV0RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQzVDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQzlELElBQUksVUFBVTtnQkFDYixPQUFPLFVBQXFDLENBQUE7WUFDN0MsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUNGLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdGLFdBQVcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEQsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQ3hDLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1NBQ3ZDLENBQUMsRUFDRix1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDbEMsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxXQUFXLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1NBQ3hDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRCxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUN4Qyx1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLEVBQUUsQ0FBQyxFQUM3RSx1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUM3RSxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0QsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQ3hDLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1NBQ3ZDLENBQUMsRUFDRix1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDbEMsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxXQUFXLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1NBQ3hDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pGLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RSxNQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FDM0MsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2xDLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDdkMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLFdBQVcsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDeEMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLDJCQUFtQixFQUFFO1NBQzFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWpFLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sT0FBTyxHQUFHLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUVBQXFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEYsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FDM0MsdUJBQXVCLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsRUFBRSxDQUFDLEVBQ3JGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxNQUFNO1lBQ2YsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxXQUFXLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3hDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3RCxNQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FDM0MsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2xDLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDdkMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLFdBQVcsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDeEMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLFdBQVcsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDeEMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLFdBQVcsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDeEMsQ0FBQyxDQUNGLENBQUE7UUFFRCx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzVELHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFNUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbEYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRXpGLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sT0FBTyxHQUFHLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0VBQWtFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkYsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FDM0MsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2xDLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDdkMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxNQUFNO1lBQ2YsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxXQUFXLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1NBQ3hDLENBQUMsRUFDRix1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDbEMsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxXQUFXLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1NBQ3hDLENBQUMsRUFDRix1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsTUFBTTtZQUNmLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7WUFDdkMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBUSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQy9ELE1BQU0sUUFBUSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakYsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RSxNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FDeEMsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2xDLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDdkMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLFdBQVcsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7U0FDeEMsQ0FBQyxFQUNGLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsRUFBRSxPQUFPLDJCQUFtQixFQUFFO1NBQzFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNyRSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2xDLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7WUFDdkMsSUFBSSxFQUFFLHNCQUFzQjtTQUM1QixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsQyxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUMvQyxRQUFRLENBQUMsa0JBQW1CLENBQUMsWUFBWSxFQUFFLENBQzNDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUMzRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RCxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDbEMsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxJQUFJLEVBQUUsc0JBQXNCO1NBQzVCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxPQUFRLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFekQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFDL0MsUUFBUSxDQUFDLGtCQUFtQixDQUFDLFlBQVksRUFBRSxDQUMzQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDM0UsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6Rix3QkFBd0IsRUFBRSxDQUFBO1FBRTFCLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLEVBQUUsQ0FBQzthQUNULE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLDRCQUE0QixDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xFLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDcEMsd0JBQXdCLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzFDLHdCQUF3QixFQUFFLENBQUE7UUFFMUIsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsRUFBRSxDQUFDO2FBQ1QsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2QyxNQUFNLEVBQUUsR0FBRyxtQ0FBbUMsQ0FBQTtRQUM5Qyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDMUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUUxQixNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQzthQUNuQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNwQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUNsRCx3QkFBd0IsRUFBRSxDQUFBO1FBRTFCLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLGVBQWUsQ0FBQzthQUN0QixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxJQUFJLEVBQUUsc0JBQXNCO1NBQzVCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLFFBQVEsQ0FBQzthQUNmLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbEMsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsTUFBTSxDQUFDO2FBQ2IsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25FLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7WUFDdkMsSUFBSSxFQUFFLHNCQUFzQjtZQUM1QixTQUFTLEVBQUUsSUFBSTtTQUNmLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLGtCQUFrQixDQUFDO2FBQ3pCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRSxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbEMsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsZUFBZSxDQUFDO2FBQ3RCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRSxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQzVCLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3BFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsWUFBWSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7WUFDdkMsSUFBSSxFQUFFLHNCQUFzQjtZQUM1QixTQUFTLEVBQUUsSUFBSTtTQUNmLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3BFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsWUFBWSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDbEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLGNBQWMsQ0FBQzthQUNyQixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0Isb0NBQTRCLENBQ3RGLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLEtBQUssQ0FBQzthQUNaLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyQyxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixvQ0FBNEIsQ0FDdEYsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDdEUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FBQzthQUNiLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixvQ0FBNEIsQ0FDdEYsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDcEUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLFNBQVMsQ0FBQzthQUNoQixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0Isa0NBQTBCLENBQ3BGLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyxTQUFTLENBQUM7YUFDaEIsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3BFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLEtBQUssQ0FBQzthQUNaLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2QyxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyxRQUFRLENBQUM7YUFDZixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckMsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN0RSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsTUFBTSxDQUFDO2FBQ2IsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLFNBQVMsQ0FBQzthQUNoQixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDdEUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsT0FBTyxDQUFDO2FBQ2QsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sNkJBQW9CLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzFFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLE9BQU8sQ0FBQzthQUNkLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLDZCQUFvQixFQUFFLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN4RSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sNkJBQW9CLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3pFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyxXQUFXLENBQUM7YUFDbEIsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyw2QkFBb0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDeEUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLDZCQUFvQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN6RSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsV0FBVyxDQUFDO2FBQ2xCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlDLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLG9DQUE0QixDQUN0RixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNuRixJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyxhQUFhLENBQUM7YUFDcEIsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFO1lBQzlELE1BQU0sRUFBRSxJQUFJO1lBQ1osT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsSUFBSTtTQUNiLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RCxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixvQ0FBNEIsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsZUFBZSxDQUFDO2FBQ3RCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUM5RCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsT0FBTyxFQUFFLElBQUk7U0FDYixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0Isb0NBQTRCLENBQ3RGLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JGLFdBQVcsRUFBRSxFQUFFLE9BQU8seUJBQWdCLEVBQUU7WUFDeEMsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsZUFBZSxDQUFDO2FBQ3RCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUM5RCxPQUFPLEVBQUUsSUFBSTtZQUNiLFFBQVEsRUFBRSxJQUFJO1lBQ2QsT0FBTyxFQUFFLElBQUk7U0FDYixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0MsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0Isb0NBQTRCLENBQ3RGLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JGLFdBQVcsRUFBRSxFQUFFLE9BQU8seUJBQWdCLEVBQUU7WUFDeEMsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsU0FBUyxDQUFDO2FBQ2hCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLG9DQUE0QixDQUN0RixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRixXQUFXLEVBQUUsRUFBRSxPQUFPLHlCQUFnQixFQUFFO1lBQ3hDLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRixXQUFXLEVBQUUsRUFBRSxPQUFPLDBCQUFpQixFQUFFO1lBQ3pDLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQzthQUMxQixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUU7WUFDOUQsUUFBUSxFQUFFLElBQUk7WUFDZCxPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSxJQUFJO1NBQ2IsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDbEYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkMsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNuRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsV0FBVyxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDO2FBQ2pCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pFLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsV0FBVyxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLDRCQUE0QixDQUFDO2FBQ25DLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUM5RCxRQUFRLEVBQUUsSUFBSTtZQUNkLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLElBQUk7U0FDYixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2pHLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVFLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLG9DQUE0QixDQUN0RixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRixXQUFXLEVBQUUsRUFBRSxPQUFPLHlCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN0RSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsV0FBVyxFQUFFLEVBQUUsT0FBTywwQkFBaUIsRUFBRTtZQUN6QyxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMscUJBQXFCLENBQUM7YUFDNUIsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNuRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsV0FBVyxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsYUFBYSxDQUFDO2FBQ3BCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlDLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3JGLFdBQVcsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDcEUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLHVCQUF1QixDQUFDO2FBQzlCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNFLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsV0FBVyxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLDRCQUE0QixDQUFDO2FBQ25DLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUM5RCxRQUFRLEVBQUUsSUFBSTtZQUNkLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLElBQUk7U0FDYixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2pHLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDckYsV0FBVyxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sdUJBQWMsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLHdDQUF3QyxDQUFDO2FBQy9DLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUM5RCxRQUFRLEVBQUUsSUFBSTtZQUNkLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLElBQUk7U0FDYixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2pHLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWUsRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDcEUsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDO1lBQ3ZCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLDJCQUFtQixFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN4RSxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsY0FBYyxDQUFDO2FBQ3JCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hFLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLG9DQUE0QixDQUN0RixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyw0QkFBbUIsRUFBRTtTQUMxQyxDQUFDLENBQUE7UUFDRix3QkFBd0IsQ0FDdkIsUUFBUSxFQUNSLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUNyRixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFrQixDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVTthQUN2QixLQUFLLENBQUMsUUFBUSxDQUFDO2FBQ2YsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDbEYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx1QkFBYyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNuRSxXQUFXLEVBQUUsRUFBRSxPQUFPLHVCQUFjLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3BFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPO1lBQ1AsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNyRixXQUFXLEVBQUUsRUFBRSxPQUFPLHVCQUFjLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3BFLElBQUksRUFBRSw4QkFBOEI7WUFDcEMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVO2FBQ3ZCLEtBQUssQ0FBQyxhQUFhLENBQUM7YUFDcEIsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUVBQXVFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEYsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0Isb0NBQTRCLENBQ3RGLENBQUE7UUFDRCxNQUFNLElBQUksR0FBRyxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sT0FBTyxHQUFHLFdBQVcsSUFBSSxFQUFFLENBQUE7UUFDakMsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUU7WUFDdkMsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQztZQUN2QixPQUFPLEVBQUUsY0FBYztZQUN2QixVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlFQUF5RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFGLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLG9DQUE0QixDQUN0RixDQUFBO1FBQ0QsTUFBTSxJQUFJLEdBQUcsYUFBYSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLE9BQU8sR0FBRyxXQUFXLElBQUksRUFBRSxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDO1lBQ3hDLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFO1lBQ3ZDLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLGNBQWM7WUFDdkIsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDcEUsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixvQ0FBNEIsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLFdBQVcsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUE7UUFDaEQsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUM7WUFDeEMsT0FBTztZQUNQLFVBQVUsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3BFLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUN2QixRQUFRLEVBQ1IsdUJBQXVCLENBQUM7WUFDdkIsT0FBTyxFQUFFLGNBQWM7WUFDdkIsVUFBVSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRTtZQUN2QyxTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBa0IsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLFVBQVU7YUFDdkIsS0FBSyxDQUFDLEtBQUssQ0FBQzthQUNaLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFrQixDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2pGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RDLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLG9DQUE0QixDQUN0RixDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQUcsV0FBVyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQTtRQUNqRCxNQUFNLFFBQVEsR0FBRyxXQUFXLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFBO1FBQ2pELFVBQVUsQ0FBQyxJQUFJLENBQ2QsRUFBRSxVQUFVLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEVBQ3RFLEVBQUUsVUFBVSxFQUFFLElBQUksbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxDQUN0RSxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQ3ZCLEVBQUUsRUFBRSxRQUFRO1lBQ1osS0FBSyxFQUFFLE9BQU87WUFDZCxRQUFRLEVBQUUsVUFBVTtZQUNwQixNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFZLEVBQUU7U0FDbEYsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQztZQUN4QyxPQUFPLEVBQUUsUUFBUTtZQUNqQixVQUFVLEVBQUUsRUFBRSxPQUFPLHdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNwRSxTQUFTLEVBQUUsSUFBSTtZQUNmLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVyxDQUFDLEtBQUs7U0FDNUMsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQ3ZCLFFBQVEsRUFDUix1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQy9ELENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQTtRQUNuRCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixTQUFTLHdCQUF3QixDQUNoQyxHQUFHLGVBQXlDO1FBRTVDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN0RixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDN0YsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUVELFNBQVMsd0JBQXdCLENBQUMsT0FBZSxFQUFFLEtBQWE7UUFDL0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87WUFDcEI7Z0JBQ0MsS0FBSyxDQUFDO29CQUNMLEVBQUUsRUFBRSxPQUFPO29CQUNYLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRTtvQkFDeEMsRUFBRSxFQUFFLElBQUk7aUJBQ1IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELEtBQUssQ0FBQyxHQUFHLEtBQW1CLENBQUM7U0FDN0IsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FDN0IsTUFBZ0MsRUFDaEMsUUFBa0M7UUFFbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQzVCLE1BQThCLEVBQzlCLFFBQWdDO1FBRWhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEQsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDdkUsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXhELElBQUksTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUNwQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQ3RDLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN4QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsdUJBQXVCLENBQUMsRUFDaEMsT0FBTyxFQUNQLElBQUksRUFDSixTQUFTLEVBQ1QsVUFBVSxFQUNWLFdBQVcsRUFDWCxXQUFXLEdBUVg7UUFDQSxNQUFNLGlCQUFpQixHQUFHLFVBQVUsS0FHbkM7WUFDQSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLFNBQVMsSUFBSTtnQkFDakUsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7YUFDZCxDQUFBO1lBQ0QsT0FBTyxJQUFJLFlBQVksQ0FBQyxPQUFRLEVBQUUsUUFBUyxFQUFFLE1BQU8sRUFBRSxPQUFRLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFtQixFQUFFLENBQUE7UUFDakMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQzVDLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksMEJBQTBCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDN0YsT0FBTyxJQUFJLHNCQUFzQixDQUNoQyxVQUFVLEVBQ1YsT0FBTyxJQUFJLGNBQWMsRUFDekIsSUFBSSxFQUNKLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUNuRCxTQUFTLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFDMUMsV0FBVyxJQUFJLElBQUksRUFDbkIsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FDakMsaUJBQXlDLEVBQ3pDLGlCQUEwQixLQUFLO1FBRS9CLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQzNDLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQ2hFLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDN0UsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFBIn0=