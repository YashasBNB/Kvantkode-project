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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL3Rlc3QvYnJvd3Nlci9rZXliaW5kaW5nc0VkaXRvck1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEVBQUUsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBRXBILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBRXhILE9BQU8sRUFDTixPQUFPLEVBQ1AsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSww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