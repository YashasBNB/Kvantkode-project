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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL3Rlc3QvY29tbW9uL2Fic3RyYWN0S2V5YmluZGluZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLFlBQVksR0FFWixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEQsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUNOLGNBQWMsR0FLZCxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXJGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBTU4sZ0JBQWdCLEdBQ2hCLE1BQU0sOENBQThDLENBQUE7QUFDckQs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