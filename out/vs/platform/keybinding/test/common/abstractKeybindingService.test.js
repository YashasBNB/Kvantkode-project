/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { createSimpleKeybinding, KeyCodeChord, } from '../../../../base/common/keybindings.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { OS } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ContextKeyExpr, } from '../../../contextkey/common/contextkey.js';
import { AbstractKeybindingService } from '../../common/abstractKeybindingService.js';
import { KeybindingResolver } from '../../common/keybindingResolver.js';
import { ResolvedKeybindingItem } from '../../common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
import { createUSLayoutResolvedKeybinding } from './keybindingsTestUtils.js';
import { NullLogService } from '../../../log/common/log.js';
import { NoOpNotification, } from '../../../notification/common/notification.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
function createContext(ctx) {
    return {
        getValue: (key) => {
            return ctx[key];
        },
    };
}
suite('AbstractKeybindingService', () => {
    class TestKeybindingService extends AbstractKeybindingService {
        constructor(resolver, contextKeyService, commandService, notificationService) {
            super(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService());
            this._resolver = resolver;
        }
        _getResolver() {
            return this._resolver;
        }
        _documentHasFocus() {
            return true;
        }
        resolveKeybinding(kb) {
            return USLayoutResolvedKeybinding.resolveKeybinding(kb, OS);
        }
        resolveKeyboardEvent(keyboardEvent) {
            const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode).toKeybinding();
            return this.resolveKeybinding(chord)[0];
        }
        resolveUserBinding(userBinding) {
            return [];
        }
        testDispatch(kb) {
            const keybinding = createSimpleKeybinding(kb, OS);
            return this._dispatch({
                _standardKeyboardEventBrand: true,
                ctrlKey: keybinding.ctrlKey,
                shiftKey: keybinding.shiftKey,
                altKey: keybinding.altKey,
                metaKey: keybinding.metaKey,
                altGraphKey: false,
                keyCode: keybinding.keyCode,
                code: null,
            }, null);
        }
        _dumpDebugInfo() {
            return '';
        }
        _dumpDebugInfoJSON() {
            return '';
        }
        registerSchemaContribution() {
            // noop
        }
        enableKeybindingHoldMode() {
            return undefined;
        }
    }
    let createTestKeybindingService = null;
    let currentContextValue = null;
    let executeCommandCalls = null;
    let showMessageCalls = null;
    let statusMessageCalls = null;
    let statusMessageCallsDisposed = null;
    teardown(() => {
        currentContextValue = null;
        executeCommandCalls = null;
        showMessageCalls = null;
        createTestKeybindingService = null;
        statusMessageCalls = null;
        statusMessageCallsDisposed = null;
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        createTestKeybindingService = (items) => {
            const contextKeyService = {
                _serviceBrand: undefined,
                onDidChangeContext: undefined,
                bufferChangeEvents() { },
                createKey: undefined,
                contextMatchesRules: undefined,
                getContextKeyValue: undefined,
                createScoped: undefined,
                createOverlay: undefined,
                getContext: (target) => {
                    return currentContextValue;
                },
                updateParent: () => { },
            };
            const commandService = {
                _serviceBrand: undefined,
                onWillExecuteCommand: () => Disposable.None,
                onDidExecuteCommand: () => Disposable.None,
                executeCommand: (commandId, ...args) => {
                    executeCommandCalls.push({
                        commandId: commandId,
                        args: args,
                    });
                    return Promise.resolve(undefined);
                },
            };
            const notificationService = {
                _serviceBrand: undefined,
                onDidAddNotification: undefined,
                onDidRemoveNotification: undefined,
                onDidChangeFilter: undefined,
                notify: (notification) => {
                    showMessageCalls.push({ sev: notification.severity, message: notification.message });
                    return new NoOpNotification();
                },
                info: (message) => {
                    showMessageCalls.push({ sev: Severity.Info, message });
                    return new NoOpNotification();
                },
                warn: (message) => {
                    showMessageCalls.push({ sev: Severity.Warning, message });
                    return new NoOpNotification();
                },
                error: (message) => {
                    showMessageCalls.push({ sev: Severity.Error, message });
                    return new NoOpNotification();
                },
                prompt(severity, message, choices, options) {
                    throw new Error('not implemented');
                },
                status(message, options) {
                    statusMessageCalls.push(message);
                    return {
                        dispose: () => {
                            statusMessageCallsDisposed.push(message);
                        },
                    };
                },
                setFilter() {
                    throw new Error('not implemented');
                },
                getFilter() {
                    throw new Error('not implemented');
                },
                getFilters() {
                    throw new Error('not implemented');
                },
                removeFilter() {
                    throw new Error('not implemented');
                },
            };
            const resolver = new KeybindingResolver(items, [], () => { });
            return new TestKeybindingService(resolver, contextKeyService, commandService, notificationService);
        };
    });
    function kbItem(keybinding, command, when) {
        return new ResolvedKeybindingItem(createUSLayoutResolvedKeybinding(keybinding, OS), command, null, when, true, null, false);
    }
    function toUsLabel(keybinding) {
        return createUSLayoutResolvedKeybinding(keybinding, OS).getLabel();
    }
    suite('simple tests: single- and multi-chord keybindings are dispatched', () => {
        test('a single-chord keybinding is dispatched correctly; this test makes sure the dispatch in general works before we test empty-string/null command ID', () => {
            const key = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const kbService = createTestKeybindingService([kbItem(key, 'myCommand')]);
            currentContextValue = createContext({});
            const shouldPreventDefault = kbService.testDispatch(key);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, [{ commandId: 'myCommand', args: [null] }]);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            kbService.dispose();
        });
        test('a multi-chord keybinding is dispatched correctly', () => {
            const chord0 = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const chord1 = 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */;
            const key = [chord0, chord1];
            const kbService = createTestKeybindingService([kbItem(key, 'myCommand')]);
            currentContextValue = createContext({});
            let shouldPreventDefault = kbService.testDispatch(chord0);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            shouldPreventDefault = kbService.testDispatch(chord1);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, [{ commandId: 'myCommand', args: [null] }]);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            assert.deepStrictEqual(statusMessageCallsDisposed, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            kbService.dispose();
        });
    });
    suite('keybindings with empty-string/null command ID', () => {
        test('a single-chord keybinding with an empty string command ID unbinds the keybinding (shouldPreventDefault = false)', () => {
            const kbService = createTestKeybindingService([
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'myCommand'),
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, ''),
            ]);
            // send Ctrl/Cmd + K
            currentContextValue = createContext({});
            const shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, false);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            kbService.dispose();
        });
        test('a single-chord keybinding with a null command ID unbinds the keybinding (shouldPreventDefault = false)', () => {
            const kbService = createTestKeybindingService([
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'myCommand'),
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, null),
            ]);
            // send Ctrl/Cmd + K
            currentContextValue = createContext({});
            const shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, false);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            kbService.dispose();
        });
        test('a multi-chord keybinding with an empty-string command ID keeps the keybinding (shouldPreventDefault = true)', () => {
            const chord0 = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const chord1 = 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */;
            const key = [chord0, chord1];
            const kbService = createTestKeybindingService([kbItem(key, 'myCommand'), kbItem(key, '')]);
            currentContextValue = createContext({});
            let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
                `The key combination (${toUsLabel(chord0)}, ${toUsLabel(chord1)}) is not a command.`,
            ]);
            assert.deepStrictEqual(statusMessageCallsDisposed, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            kbService.dispose();
        });
        test('a multi-chord keybinding with a null command ID keeps the keybinding (shouldPreventDefault = true)', () => {
            const chord0 = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const chord1 = 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */;
            const key = [chord0, chord1];
            const kbService = createTestKeybindingService([kbItem(key, 'myCommand'), kbItem(key, null)]);
            currentContextValue = createContext({});
            let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
                `The key combination (${toUsLabel(chord0)}, ${toUsLabel(chord1)}) is not a command.`,
            ]);
            assert.deepStrictEqual(statusMessageCallsDisposed, [
                `(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`,
            ]);
            kbService.dispose();
        });
    });
    test('issue #16498: chord mode is quit for invalid chords', () => {
        const kbService = createTestKeybindingService([
            kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */), 'chordCommand'),
            kbItem(1 /* KeyCode.Backspace */, 'simpleCommand'),
        ]);
        // send Ctrl/Cmd + K
        let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`,
        ]);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send backspace
        shouldPreventDefault = kbService.testDispatch(1 /* KeyCode.Backspace */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, [
            `The key combination (${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}, ${toUsLabel(1 /* KeyCode.Backspace */)}) is not a command.`,
        ]);
        assert.deepStrictEqual(statusMessageCallsDisposed, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`,
        ]);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send backspace
        shouldPreventDefault = kbService.testDispatch(1 /* KeyCode.Backspace */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [
            {
                commandId: 'simpleCommand',
                args: [null],
            },
        ]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
    test('issue #16833: Keybinding service should not testDispatch on modifier keys', () => {
        const kbService = createTestKeybindingService([
            kbItem(5 /* KeyCode.Ctrl */, 'nope'),
            kbItem(57 /* KeyCode.Meta */, 'nope'),
            kbItem(6 /* KeyCode.Alt */, 'nope'),
            kbItem(4 /* KeyCode.Shift */, 'nope'),
            kbItem(2048 /* KeyMod.CtrlCmd */, 'nope'),
            kbItem(256 /* KeyMod.WinCtrl */, 'nope'),
            kbItem(512 /* KeyMod.Alt */, 'nope'),
            kbItem(1024 /* KeyMod.Shift */, 'nope'),
        ]);
        function assertIsIgnored(keybinding) {
            const shouldPreventDefault = kbService.testDispatch(keybinding);
            assert.strictEqual(shouldPreventDefault, false);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            executeCommandCalls = [];
            showMessageCalls = [];
            statusMessageCalls = [];
            statusMessageCallsDisposed = [];
        }
        assertIsIgnored(5 /* KeyCode.Ctrl */);
        assertIsIgnored(57 /* KeyCode.Meta */);
        assertIsIgnored(6 /* KeyCode.Alt */);
        assertIsIgnored(4 /* KeyCode.Shift */);
        assertIsIgnored(2048 /* KeyMod.CtrlCmd */);
        assertIsIgnored(256 /* KeyMod.WinCtrl */);
        assertIsIgnored(512 /* KeyMod.Alt */);
        assertIsIgnored(1024 /* KeyMod.Shift */);
        kbService.dispose();
    });
    test('can trigger command that is sharing keybinding with chord', () => {
        const kbService = createTestKeybindingService([
            kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */), 'chordCommand'),
            kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'simpleCommand', ContextKeyExpr.has('key1')),
        ]);
        // send Ctrl/Cmd + K
        currentContextValue = createContext({
            key1: true,
        });
        let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [
            {
                commandId: 'simpleCommand',
                args: [null],
            },
        ]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + K
        currentContextValue = createContext({});
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`,
        ]);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + X
        currentContextValue = createContext({});
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [
            {
                commandId: 'chordCommand',
                args: [null],
            },
        ]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`,
        ]);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
    test('cannot trigger chord if command is overwriting', () => {
        const kbService = createTestKeybindingService([
            kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */), 'chordCommand', ContextKeyExpr.has('key1')),
            kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'simpleCommand'),
        ]);
        // send Ctrl/Cmd + K
        currentContextValue = createContext({});
        let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [
            {
                commandId: 'simpleCommand',
                args: [null],
            },
        ]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + K
        currentContextValue = createContext({
            key1: true,
        });
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [
            {
                commandId: 'simpleCommand',
                args: [null],
            },
        ]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + X
        currentContextValue = createContext({
            key1: true,
        });
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */);
        assert.strictEqual(shouldPreventDefault, false);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
    test('can have spying command', () => {
        const kbService = createTestKeybindingService([
            kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, '^simpleCommand'),
        ]);
        // send Ctrl/Cmd + K
        currentContextValue = createContext({});
        const shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, false);
        assert.deepStrictEqual(executeCommandCalls, [
            {
                commandId: 'simpleCommand',
                args: [null],
            },
        ]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy90ZXN0L2NvbW1vbi9hYnN0cmFjdEtleWJpbmRpbmdTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUNOLHNCQUFzQixFQUV0QixZQUFZLEdBRVosTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFDTixjQUFjLEdBS2QsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQU1OLGdCQUFnQixHQUNoQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRWxGLFNBQVMsYUFBYSxDQUFDLEdBQVE7SUFDOUIsT0FBTztRQUNOLFFBQVEsRUFBRSxDQUFDLEdBQVcsRUFBRSxFQUFFO1lBQ3pCLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDdkMsTUFBTSxxQkFBc0IsU0FBUSx5QkFBeUI7UUFHNUQsWUFDQyxRQUE0QixFQUM1QixpQkFBcUMsRUFDckMsY0FBK0IsRUFDL0IsbUJBQXlDO1lBRXpDLEtBQUssQ0FDSixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQzFCLENBQUM7UUFFUyxZQUFZO1lBQ3JCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUN0QixDQUFDO1FBRVMsaUJBQWlCO1lBQzFCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVNLGlCQUFpQixDQUFDLEVBQWM7WUFDdEMsT0FBTywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVNLG9CQUFvQixDQUFDLGFBQTZCO1lBQ3hELE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUM3QixhQUFhLENBQUMsT0FBTyxFQUNyQixhQUFhLENBQUMsUUFBUSxFQUN0QixhQUFhLENBQUMsTUFBTSxFQUNwQixhQUFhLENBQUMsT0FBTyxFQUNyQixhQUFhLENBQUMsT0FBTyxDQUNyQixDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFTSxrQkFBa0IsQ0FBQyxXQUFtQjtZQUM1QyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFTSxZQUFZLENBQUMsRUFBVTtZQUM3QixNQUFNLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDakQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUNwQjtnQkFDQywyQkFBMkIsRUFBRSxJQUFJO2dCQUNqQyxPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87Z0JBQzNCLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtnQkFDN0IsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO2dCQUN6QixPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87Z0JBQzNCLFdBQVcsRUFBRSxLQUFLO2dCQUNsQixPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87Z0JBQzNCLElBQUksRUFBRSxJQUFLO2FBQ1gsRUFDRCxJQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUM7UUFFTSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVNLGtCQUFrQjtZQUN4QixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFTSwwQkFBMEI7WUFDaEMsT0FBTztRQUNSLENBQUM7UUFFTSx3QkFBd0I7WUFDOUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztLQUNEO0lBRUQsSUFBSSwyQkFBMkIsR0FHRixJQUFLLENBQUE7SUFDbEMsSUFBSSxtQkFBbUIsR0FBb0IsSUFBSSxDQUFBO0lBQy9DLElBQUksbUJBQW1CLEdBQXlDLElBQUssQ0FBQTtJQUNyRSxJQUFJLGdCQUFnQixHQUFzQyxJQUFLLENBQUE7SUFDL0QsSUFBSSxrQkFBa0IsR0FBb0IsSUFBSSxDQUFBO0lBQzlDLElBQUksMEJBQTBCLEdBQW9CLElBQUksQ0FBQTtJQUV0RCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO1FBQzFCLG1CQUFtQixHQUFHLElBQUssQ0FBQTtRQUMzQixnQkFBZ0IsR0FBRyxJQUFLLENBQUE7UUFDeEIsMkJBQTJCLEdBQUcsSUFBSyxDQUFBO1FBQ25DLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUN6QiwwQkFBMEIsR0FBRyxJQUFJLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0IsMkJBQTJCLEdBQUcsQ0FBQyxLQUErQixFQUF5QixFQUFFO1lBQ3hGLE1BQU0saUJBQWlCLEdBQXVCO2dCQUM3QyxhQUFhLEVBQUUsU0FBUztnQkFDeEIsa0JBQWtCLEVBQUUsU0FBVTtnQkFDOUIsa0JBQWtCLEtBQUksQ0FBQztnQkFDdkIsU0FBUyxFQUFFLFNBQVU7Z0JBQ3JCLG1CQUFtQixFQUFFLFNBQVU7Z0JBQy9CLGtCQUFrQixFQUFFLFNBQVU7Z0JBQzlCLFlBQVksRUFBRSxTQUFVO2dCQUN4QixhQUFhLEVBQUUsU0FBVTtnQkFDekIsVUFBVSxFQUFFLENBQUMsTUFBZ0MsRUFBTyxFQUFFO29CQUNyRCxPQUFPLG1CQUFtQixDQUFBO2dCQUMzQixDQUFDO2dCQUNELFlBQVksRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO2FBQ3RCLENBQUE7WUFFRCxNQUFNLGNBQWMsR0FBb0I7Z0JBQ3ZDLGFBQWEsRUFBRSxTQUFTO2dCQUN4QixvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtnQkFDM0MsbUJBQW1CLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7Z0JBQzFDLGNBQWMsRUFBRSxDQUFDLFNBQWlCLEVBQUUsR0FBRyxJQUFXLEVBQWdCLEVBQUU7b0JBQ25FLG1CQUFtQixDQUFDLElBQUksQ0FBQzt3QkFDeEIsU0FBUyxFQUFFLFNBQVM7d0JBQ3BCLElBQUksRUFBRSxJQUFJO3FCQUNWLENBQUMsQ0FBQTtvQkFDRixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7YUFDRCxDQUFBO1lBRUQsTUFBTSxtQkFBbUIsR0FBeUI7Z0JBQ2pELGFBQWEsRUFBRSxTQUFTO2dCQUN4QixvQkFBb0IsRUFBRSxTQUFVO2dCQUNoQyx1QkFBdUIsRUFBRSxTQUFVO2dCQUNuQyxpQkFBaUIsRUFBRSxTQUFVO2dCQUM3QixNQUFNLEVBQUUsQ0FBQyxZQUEyQixFQUFFLEVBQUU7b0JBQ3ZDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtvQkFDcEYsT0FBTyxJQUFJLGdCQUFnQixFQUFFLENBQUE7Z0JBQzlCLENBQUM7Z0JBQ0QsSUFBSSxFQUFFLENBQUMsT0FBWSxFQUFFLEVBQUU7b0JBQ3RCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7b0JBQ3RELE9BQU8sSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO2dCQUM5QixDQUFDO2dCQUNELElBQUksRUFBRSxDQUFDLE9BQVksRUFBRSxFQUFFO29CQUN0QixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO29CQUN6RCxPQUFPLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtnQkFDOUIsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxPQUFZLEVBQUUsRUFBRTtvQkFDdkIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtvQkFDdkQsT0FBTyxJQUFJLGdCQUFnQixFQUFFLENBQUE7Z0JBQzlCLENBQUM7Z0JBQ0QsTUFBTSxDQUNMLFFBQWtCLEVBQ2xCLE9BQWUsRUFDZixPQUF3QixFQUN4QixPQUF3QjtvQkFFeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO2dCQUNELE1BQU0sQ0FBQyxPQUFlLEVBQUUsT0FBK0I7b0JBQ3RELGtCQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDakMsT0FBTzt3QkFDTixPQUFPLEVBQUUsR0FBRyxFQUFFOzRCQUNiLDBCQUEyQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTt3QkFDMUMsQ0FBQztxQkFDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsU0FBUztvQkFDUixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ25DLENBQUM7Z0JBQ0QsU0FBUztvQkFDUixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ25DLENBQUM7Z0JBQ0QsVUFBVTtvQkFDVCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ25DLENBQUM7Z0JBQ0QsWUFBWTtvQkFDWCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ25DLENBQUM7YUFDRCxDQUFBO1lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVELE9BQU8sSUFBSSxxQkFBcUIsQ0FDL0IsUUFBUSxFQUNSLGlCQUFpQixFQUNqQixjQUFjLEVBQ2QsbUJBQW1CLENBQ25CLENBQUE7UUFDRixDQUFDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsTUFBTSxDQUNkLFVBQTZCLEVBQzdCLE9BQXNCLEVBQ3RCLElBQTJCO1FBRTNCLE9BQU8sSUFBSSxzQkFBc0IsQ0FDaEMsZ0NBQWdDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUNoRCxPQUFPLEVBQ1AsSUFBSSxFQUNKLElBQUksRUFDSixJQUFJLEVBQ0osSUFBSSxFQUNKLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLFVBQWtCO1FBQ3BDLE9BQU8sZ0NBQWdDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDLFFBQVEsRUFBRyxDQUFBO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsa0VBQWtFLEVBQUUsR0FBRyxFQUFFO1FBQzlFLElBQUksQ0FBQyxtSkFBbUosRUFBRSxHQUFHLEVBQUU7WUFDOUosTUFBTSxHQUFHLEdBQUcsaURBQTZCLENBQUE7WUFDekMsTUFBTSxTQUFTLEdBQUcsMkJBQTJCLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV6RSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdkMsTUFBTSxvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2RixNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUV0RCxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1lBQzdELE1BQU0sTUFBTSxHQUFHLGlEQUE2QixDQUFBO1lBQzVDLE1BQU0sTUFBTSxHQUFHLGlEQUE2QixDQUFBO1lBQzVDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzVCLE1BQU0sU0FBUyxHQUFHLDJCQUEyQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFekUsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRXZDLElBQUksb0JBQW9CLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUMxQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsbURBQW1EO2FBQ3hFLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFdEQsb0JBQW9CLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNyRCxNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUMxQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsbURBQW1EO2FBQ3hFLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUU7Z0JBQ2xELElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxtREFBbUQ7YUFDeEUsQ0FBQyxDQUFBO1lBRUYsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQzNELElBQUksQ0FBQyxpSEFBaUgsRUFBRSxHQUFHLEVBQUU7WUFDNUgsTUFBTSxTQUFTLEdBQUcsMkJBQTJCLENBQUM7Z0JBQzdDLE1BQU0sQ0FBQyxpREFBNkIsRUFBRSxXQUFXLENBQUM7Z0JBQ2xELE1BQU0sQ0FBQyxpREFBNkIsRUFBRSxFQUFFLENBQUM7YUFDekMsQ0FBQyxDQUFBO1lBRUYsb0JBQW9CO1lBQ3BCLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2QyxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsaURBQTZCLENBQUMsQ0FBQTtZQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFdEQsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHdHQUF3RyxFQUFFLEdBQUcsRUFBRTtZQUNuSCxNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztnQkFDN0MsTUFBTSxDQUFDLGlEQUE2QixFQUFFLFdBQVcsQ0FBQztnQkFDbEQsTUFBTSxDQUFDLGlEQUE2QixFQUFFLElBQUksQ0FBQzthQUMzQyxDQUFDLENBQUE7WUFFRixvQkFBb0I7WUFDcEIsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sb0JBQW9CLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxpREFBNkIsQ0FBQyxDQUFBO1lBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUV0RCxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsNkdBQTZHLEVBQUUsR0FBRyxFQUFFO1lBQ3hILE1BQU0sTUFBTSxHQUFHLGlEQUE2QixDQUFBO1lBQzVDLE1BQU0sTUFBTSxHQUFHLGlEQUE2QixDQUFBO1lBQzVDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzVCLE1BQU0sU0FBUyxHQUFHLDJCQUEyQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUxRixtQkFBbUIsR0FBRyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFdkMsSUFBSSxvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGlEQUE2QixDQUFDLENBQUE7WUFDaEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRTtnQkFDMUMsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLG1EQUFtRDthQUN4RSxDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRXRELG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsaURBQTZCLENBQUMsQ0FBQTtZQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFO2dCQUMxQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsbURBQW1EO2dCQUN4RSx3QkFBd0IsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUMscUJBQXFCO2FBQ3BGLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUU7Z0JBQ2xELElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxtREFBbUQ7YUFDeEUsQ0FBQyxDQUFBO1lBRUYsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG9HQUFvRyxFQUFFLEdBQUcsRUFBRTtZQUMvRyxNQUFNLE1BQU0sR0FBRyxpREFBNkIsQ0FBQTtZQUM1QyxNQUFNLE1BQU0sR0FBRyxpREFBNkIsQ0FBQTtZQUM1QyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUM1QixNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFNUYsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRXZDLElBQUksb0JBQW9CLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxpREFBNkIsQ0FBQyxDQUFBO1lBQ2hGLE1BQU0sQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUU7Z0JBQzFDLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxtREFBbUQ7YUFDeEUsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUV0RCxvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGlEQUE2QixDQUFDLENBQUE7WUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRTtnQkFDMUMsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLG1EQUFtRDtnQkFDeEUsd0JBQXdCLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxTQUFTLENBQUMsTUFBTSxDQUFDLHFCQUFxQjthQUNwRixDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFO2dCQUNsRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsbURBQW1EO2FBQ3hFLENBQUMsQ0FBQTtZQUVGLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNwQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEdBQUcsRUFBRTtRQUNoRSxNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztZQUM3QyxNQUFNLENBQ0wsUUFBUSxDQUFDLGlEQUE2QixFQUFFLGlEQUE2QixDQUFDLEVBQ3RFLGNBQWMsQ0FDZDtZQUNELE1BQU0sNEJBQW9CLGVBQWUsQ0FBQztTQUMxQyxDQUFDLENBQUE7UUFFRixvQkFBb0I7UUFDcEIsSUFBSSxvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGlEQUE2QixDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRTtZQUMxQyxJQUFJLFNBQVMsQ0FBQyxpREFBNkIsQ0FBQyxtREFBbUQ7U0FDL0YsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RCxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0IsaUJBQWlCO1FBQ2pCLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLDJCQUFtQixDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUU7WUFDMUMsd0JBQXdCLFNBQVMsQ0FBQyxpREFBNkIsQ0FBQyxLQUFLLFNBQVMsMkJBQW1CLHFCQUFxQjtTQUN0SCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFO1lBQ2xELElBQUksU0FBUyxDQUFDLGlEQUE2QixDQUFDLG1EQUFtRDtTQUMvRixDQUFDLENBQUE7UUFDRixtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0IsaUJBQWlCO1FBQ2pCLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLDJCQUFtQixDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRTtZQUMzQztnQkFDQyxTQUFTLEVBQUUsZUFBZTtnQkFDMUIsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO2FBQ1o7U0FDRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RCxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJFQUEyRSxFQUFFLEdBQUcsRUFBRTtRQUN0RixNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztZQUM3QyxNQUFNLHVCQUFlLE1BQU0sQ0FBQztZQUM1QixNQUFNLHdCQUFlLE1BQU0sQ0FBQztZQUM1QixNQUFNLHNCQUFjLE1BQU0sQ0FBQztZQUMzQixNQUFNLHdCQUFnQixNQUFNLENBQUM7WUFFN0IsTUFBTSw0QkFBaUIsTUFBTSxDQUFDO1lBQzlCLE1BQU0sMkJBQWlCLE1BQU0sQ0FBQztZQUM5QixNQUFNLHVCQUFhLE1BQU0sQ0FBQztZQUMxQixNQUFNLDBCQUFlLE1BQU0sQ0FBQztTQUM1QixDQUFDLENBQUE7UUFFRixTQUFTLGVBQWUsQ0FBQyxVQUFrQjtZQUMxQyxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RELG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtZQUN4QixnQkFBZ0IsR0FBRyxFQUFFLENBQUE7WUFDckIsa0JBQWtCLEdBQUcsRUFBRSxDQUFBO1lBQ3ZCLDBCQUEwQixHQUFHLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsZUFBZSxzQkFBYyxDQUFBO1FBQzdCLGVBQWUsdUJBQWMsQ0FBQTtRQUM3QixlQUFlLHFCQUFhLENBQUE7UUFDNUIsZUFBZSx1QkFBZSxDQUFBO1FBRTlCLGVBQWUsMkJBQWdCLENBQUE7UUFDL0IsZUFBZSwwQkFBZ0IsQ0FBQTtRQUMvQixlQUFlLHNCQUFZLENBQUE7UUFDM0IsZUFBZSx5QkFBYyxDQUFBO1FBRTdCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUU7UUFDdEUsTUFBTSxTQUFTLEdBQUcsMkJBQTJCLENBQUM7WUFDN0MsTUFBTSxDQUNMLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSxpREFBNkIsQ0FBQyxFQUN0RSxjQUFjLENBQ2Q7WUFDRCxNQUFNLENBQUMsaURBQTZCLEVBQUUsZUFBZSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbEYsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CO1FBQ3BCLG1CQUFtQixHQUFHLGFBQWEsQ0FBQztZQUNuQyxJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUMsQ0FBQTtRQUNGLElBQUksb0JBQW9CLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxpREFBNkIsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRTtZQUMzQztnQkFDQyxTQUFTLEVBQUUsZUFBZTtnQkFDMUIsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO2FBQ1o7U0FDRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RCxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0Isb0JBQW9CO1FBQ3BCLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGlEQUE2QixDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRTtZQUMxQyxJQUFJLFNBQVMsQ0FBQyxpREFBNkIsQ0FBQyxtREFBbUQ7U0FDL0YsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RCxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0Isb0JBQW9CO1FBQ3BCLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGlEQUE2QixDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFO1lBQzNDO2dCQUNDLFNBQVMsRUFBRSxjQUFjO2dCQUN6QixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7YUFDWjtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFO1lBQ2xELElBQUksU0FBUyxDQUFDLGlEQUE2QixDQUFDLG1EQUFtRDtTQUMvRixDQUFDLENBQUE7UUFDRixtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtRQUMzRCxNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztZQUM3QyxNQUFNLENBQ0wsUUFBUSxDQUFDLGlEQUE2QixFQUFFLGlEQUE2QixDQUFDLEVBQ3RFLGNBQWMsRUFDZCxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUMxQjtZQUNELE1BQU0sQ0FBQyxpREFBNkIsRUFBRSxlQUFlLENBQUM7U0FDdEQsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CO1FBQ3BCLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxJQUFJLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsaURBQTZCLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUU7WUFDM0M7Z0JBQ0MsU0FBUyxFQUFFLGVBQWU7Z0JBQzFCLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQzthQUNaO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEQsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtRQUNyQixrQkFBa0IsR0FBRyxFQUFFLENBQUE7UUFDdkIsMEJBQTBCLEdBQUcsRUFBRSxDQUFBO1FBRS9CLG9CQUFvQjtRQUNwQixtQkFBbUIsR0FBRyxhQUFhLENBQUM7WUFDbkMsSUFBSSxFQUFFLElBQUk7U0FDVixDQUFDLENBQUE7UUFDRixvQkFBb0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGlEQUE2QixDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFO1lBQzNDO2dCQUNDLFNBQVMsRUFBRSxlQUFlO2dCQUMxQixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7YUFDWjtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtRQUN4QixnQkFBZ0IsR0FBRyxFQUFFLENBQUE7UUFDckIsa0JBQWtCLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLDBCQUEwQixHQUFHLEVBQUUsQ0FBQTtRQUUvQixvQkFBb0I7UUFDcEIsbUJBQW1CLEdBQUcsYUFBYSxDQUFDO1lBQ25DLElBQUksRUFBRSxJQUFJO1NBQ1YsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxpREFBNkIsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RCxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtRQUN2QiwwQkFBMEIsR0FBRyxFQUFFLENBQUE7UUFFL0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztZQUM3QyxNQUFNLENBQUMsaURBQTZCLEVBQUUsZ0JBQWdCLENBQUM7U0FDdkQsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CO1FBQ3BCLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsaURBQTZCLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUU7WUFDM0M7Z0JBQ0MsU0FBUyxFQUFFLGVBQWU7Z0JBQzFCLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQzthQUNaO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEQsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtRQUNyQixrQkFBa0IsR0FBRyxFQUFFLENBQUE7UUFDdkIsMEJBQTBCLEdBQUcsRUFBRSxDQUFBO1FBRS9CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=