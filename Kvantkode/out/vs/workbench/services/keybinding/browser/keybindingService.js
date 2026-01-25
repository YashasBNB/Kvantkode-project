/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WorkbenchKeybindingService_1;
import * as nls from '../../../../nls.js';
// base
import * as browser from '../../../../base/browser/browser.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as dom from '../../../../base/browser/dom.js';
import { printKeyboardEvent, printStandardKeyboardEvent, StandardKeyboardEvent, } from '../../../../base/browser/keyboardEvent.js';
import { DeferredPromise, RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { parse } from '../../../../base/common/json.js';
import { UserSettingsLabelProvider } from '../../../../base/common/keybindingLabels.js';
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { KeyCodeChord, ScanCodeChord, } from '../../../../base/common/keybindings.js';
import { IMMUTABLE_CODE_TO_KEY_CODE, KeyCodeUtils, ScanCodeUtils, } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as objects from '../../../../base/common/objects.js';
import { isMacintosh, OS } from '../../../../base/common/platform.js';
import { dirname } from '../../../../base/common/resources.js';
import { mainWindow } from '../../../../base/browser/window.js';
// platform
import { MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Extensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { AbstractKeybindingService } from '../../../../platform/keybinding/common/abstractKeybindingService.js';
import { IKeybindingService, } from '../../../../platform/keybinding/common/keybinding.js';
import { KeybindingResolver } from '../../../../platform/keybinding/common/keybindingResolver.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ResolvedKeybindingItem } from '../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { IKeyboardLayoutService } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
// workbench
import { commandsExtensionPoint } from '../../actions/common/menusExtensionPoint.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ExtensionsRegistry, } from '../../extensions/common/extensionsRegistry.js';
import { IHostService } from '../../host/browser/host.js';
import { getAllUnboundCommands } from './unboundCommands.js';
import { KeybindingIO, OutputBuilder } from '../common/keybindingIO.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
function isValidContributedKeyBinding(keyBinding, rejects) {
    if (!keyBinding) {
        rejects.push(nls.localize('nonempty', 'expected non-empty value.'));
        return false;
    }
    if (typeof keyBinding.command !== 'string') {
        rejects.push(nls.localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'command'));
        return false;
    }
    if (keyBinding.key && typeof keyBinding.key !== 'string') {
        rejects.push(nls.localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'key'));
        return false;
    }
    if (keyBinding.when && typeof keyBinding.when !== 'string') {
        rejects.push(nls.localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'when'));
        return false;
    }
    if (keyBinding.mac && typeof keyBinding.mac !== 'string') {
        rejects.push(nls.localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'mac'));
        return false;
    }
    if (keyBinding.linux && typeof keyBinding.linux !== 'string') {
        rejects.push(nls.localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'linux'));
        return false;
    }
    if (keyBinding.win && typeof keyBinding.win !== 'string') {
        rejects.push(nls.localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'win'));
        return false;
    }
    return true;
}
const keybindingType = {
    type: 'object',
    default: { command: '', key: '' },
    properties: {
        command: {
            description: nls.localize('vscode.extension.contributes.keybindings.command', 'Identifier of the command to run when keybinding is triggered.'),
            type: 'string',
        },
        args: {
            description: nls.localize('vscode.extension.contributes.keybindings.args', 'Arguments to pass to the command to execute.'),
        },
        key: {
            description: nls.localize('vscode.extension.contributes.keybindings.key', 'Key or key sequence (separate keys with plus-sign and sequences with space, e.g. Ctrl+O and Ctrl+L L for a chord).'),
            type: 'string',
        },
        mac: {
            description: nls.localize('vscode.extension.contributes.keybindings.mac', 'Mac specific key or key sequence.'),
            type: 'string',
        },
        linux: {
            description: nls.localize('vscode.extension.contributes.keybindings.linux', 'Linux specific key or key sequence.'),
            type: 'string',
        },
        win: {
            description: nls.localize('vscode.extension.contributes.keybindings.win', 'Windows specific key or key sequence.'),
            type: 'string',
        },
        when: {
            description: nls.localize('vscode.extension.contributes.keybindings.when', 'Condition when the key is active.'),
            type: 'string',
        },
    },
};
const keybindingsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'keybindings',
    deps: [commandsExtensionPoint],
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.keybindings', 'Contributes keybindings.'),
        oneOf: [
            keybindingType,
            {
                type: 'array',
                items: keybindingType,
            },
        ],
    },
});
const NUMPAD_PRINTABLE_SCANCODES = [
    90 /* ScanCode.NumpadDivide */,
    91 /* ScanCode.NumpadMultiply */,
    92 /* ScanCode.NumpadSubtract */,
    93 /* ScanCode.NumpadAdd */,
    95 /* ScanCode.Numpad1 */,
    96 /* ScanCode.Numpad2 */,
    97 /* ScanCode.Numpad3 */,
    98 /* ScanCode.Numpad4 */,
    99 /* ScanCode.Numpad5 */,
    100 /* ScanCode.Numpad6 */,
    101 /* ScanCode.Numpad7 */,
    102 /* ScanCode.Numpad8 */,
    103 /* ScanCode.Numpad9 */,
    104 /* ScanCode.Numpad0 */,
    105 /* ScanCode.NumpadDecimal */,
];
const otherMacNumpadMapping = new Map();
otherMacNumpadMapping.set(95 /* ScanCode.Numpad1 */, 22 /* KeyCode.Digit1 */);
otherMacNumpadMapping.set(96 /* ScanCode.Numpad2 */, 23 /* KeyCode.Digit2 */);
otherMacNumpadMapping.set(97 /* ScanCode.Numpad3 */, 24 /* KeyCode.Digit3 */);
otherMacNumpadMapping.set(98 /* ScanCode.Numpad4 */, 25 /* KeyCode.Digit4 */);
otherMacNumpadMapping.set(99 /* ScanCode.Numpad5 */, 26 /* KeyCode.Digit5 */);
otherMacNumpadMapping.set(100 /* ScanCode.Numpad6 */, 27 /* KeyCode.Digit6 */);
otherMacNumpadMapping.set(101 /* ScanCode.Numpad7 */, 28 /* KeyCode.Digit7 */);
otherMacNumpadMapping.set(102 /* ScanCode.Numpad8 */, 29 /* KeyCode.Digit8 */);
otherMacNumpadMapping.set(103 /* ScanCode.Numpad9 */, 30 /* KeyCode.Digit9 */);
otherMacNumpadMapping.set(104 /* ScanCode.Numpad0 */, 21 /* KeyCode.Digit0 */);
let WorkbenchKeybindingService = WorkbenchKeybindingService_1 = class WorkbenchKeybindingService extends AbstractKeybindingService {
    constructor(contextKeyService, commandService, telemetryService, notificationService, userDataProfileService, hostService, extensionService, fileService, uriIdentityService, logService, keyboardLayoutService) {
        super(contextKeyService, commandService, telemetryService, notificationService, logService);
        this.hostService = hostService;
        this.keyboardLayoutService = keyboardLayoutService;
        this._contributions = [];
        this.isComposingGlobalContextKey = contextKeyService.createKey('isComposing', false);
        this.kbsJsonSchema = new KeybindingsJsonSchema();
        this.updateKeybindingsJsonSchema();
        this._keyboardMapper = this.keyboardLayoutService.getKeyboardMapper();
        this._register(this.keyboardLayoutService.onDidChangeKeyboardLayout(() => {
            this._keyboardMapper = this.keyboardLayoutService.getKeyboardMapper();
            this.updateResolver();
        }));
        this._keybindingHoldMode = null;
        this._cachedResolver = null;
        this.userKeybindings = this._register(new UserKeybindings(userDataProfileService, uriIdentityService, fileService, logService));
        this.userKeybindings.initialize().then(() => {
            if (this.userKeybindings.keybindings.length) {
                this.updateResolver();
            }
        });
        this._register(this.userKeybindings.onDidChange(() => {
            logService.debug('User keybindings changed');
            this.updateResolver();
        }));
        keybindingsExtPoint.setHandler((extensions) => {
            const keybindings = [];
            for (const extension of extensions) {
                this._handleKeybindingsExtensionPointUser(extension.description.identifier, extension.description.isBuiltin, extension.value, extension.collector, keybindings);
            }
            KeybindingsRegistry.setExtensionKeybindings(keybindings);
            this.updateResolver();
        });
        this.updateKeybindingsJsonSchema();
        this._register(extensionService.onDidRegisterExtensions(() => this.updateKeybindingsJsonSchema()));
        this._register(Event.runAndSubscribe(dom.onDidRegisterWindow, ({ window, disposables }) => disposables.add(this._registerKeyListeners(window)), { window: mainWindow, disposables: this._store }));
        this._register(browser.onDidChangeFullscreen((windowId) => {
            if (windowId !== mainWindow.vscodeWindowId) {
                return;
            }
            const keyboard = navigator.keyboard;
            if (BrowserFeatures.keyboard === 2 /* KeyboardSupport.None */) {
                return;
            }
            if (browser.isFullscreen(mainWindow)) {
                keyboard?.lock(['Escape']);
            }
            else {
                keyboard?.unlock();
            }
            // update resolver which will bring back all unbound keyboard shortcuts
            this._cachedResolver = null;
            this._onDidUpdateKeybindings.fire();
        }));
    }
    _registerKeyListeners(window) {
        const disposables = new DisposableStore();
        // for standard keybindings
        disposables.add(dom.addDisposableListener(window, dom.EventType.KEY_DOWN, (e) => {
            if (this._keybindingHoldMode) {
                return;
            }
            this.isComposingGlobalContextKey.set(e.isComposing);
            const keyEvent = new StandardKeyboardEvent(e);
            this._log(`/ Received  keydown event - ${printKeyboardEvent(e)}`);
            this._log(`| Converted keydown event - ${printStandardKeyboardEvent(keyEvent)}`);
            const shouldPreventDefault = this._dispatch(keyEvent, keyEvent.target);
            if (shouldPreventDefault) {
                keyEvent.preventDefault();
            }
            this.isComposingGlobalContextKey.set(false);
        }));
        // for single modifier chord keybindings (e.g. shift shift)
        disposables.add(dom.addDisposableListener(window, dom.EventType.KEY_UP, (e) => {
            this._resetKeybindingHoldMode();
            this.isComposingGlobalContextKey.set(e.isComposing);
            const keyEvent = new StandardKeyboardEvent(e);
            const shouldPreventDefault = this._singleModifierDispatch(keyEvent, keyEvent.target);
            if (shouldPreventDefault) {
                keyEvent.preventDefault();
            }
            this.isComposingGlobalContextKey.set(false);
        }));
        return disposables;
    }
    registerSchemaContribution(contribution) {
        this._contributions.push(contribution);
        if (contribution.onDidChange) {
            this._register(contribution.onDidChange(() => this.updateKeybindingsJsonSchema()));
        }
        this.updateKeybindingsJsonSchema();
    }
    updateKeybindingsJsonSchema() {
        this.kbsJsonSchema.updateSchema(this._contributions.flatMap((x) => x.getSchemaAdditions()));
    }
    _printKeybinding(keybinding) {
        return (UserSettingsLabelProvider.toLabel(OS, keybinding.chords, (chord) => {
            if (chord instanceof KeyCodeChord) {
                return KeyCodeUtils.toString(chord.keyCode);
            }
            return ScanCodeUtils.toString(chord.scanCode);
        }) || '[null]');
    }
    _printResolvedKeybinding(resolvedKeybinding) {
        return resolvedKeybinding
            .getDispatchChords()
            .map((x) => x || '[null]')
            .join(' ');
    }
    _printResolvedKeybindings(output, input, resolvedKeybindings) {
        const padLength = 35;
        const firstRow = `${input.padStart(padLength, ' ')} => `;
        if (resolvedKeybindings.length === 0) {
            // no binding found
            output.push(`${firstRow}${'[NO BINDING]'.padStart(padLength, ' ')}`);
            return;
        }
        const firstRowIndentation = firstRow.length;
        const isFirst = true;
        for (const resolvedKeybinding of resolvedKeybindings) {
            if (isFirst) {
                output.push(`${firstRow}${this._printResolvedKeybinding(resolvedKeybinding).padStart(padLength, ' ')}`);
            }
            else {
                output.push(`${' '.repeat(firstRowIndentation)}${this._printResolvedKeybinding(resolvedKeybinding).padStart(padLength, ' ')}`);
            }
        }
    }
    _dumpResolveKeybindingDebugInfo() {
        const seenBindings = new Set();
        const result = [];
        result.push(`Default Resolved Keybindings (unique only):`);
        for (const item of KeybindingsRegistry.getDefaultKeybindings()) {
            if (!item.keybinding) {
                continue;
            }
            const input = this._printKeybinding(item.keybinding);
            if (seenBindings.has(input)) {
                continue;
            }
            seenBindings.add(input);
            const resolvedKeybindings = this._keyboardMapper.resolveKeybinding(item.keybinding);
            this._printResolvedKeybindings(result, input, resolvedKeybindings);
        }
        result.push(`User Resolved Keybindings (unique only):`);
        for (const item of this.userKeybindings.keybindings) {
            if (!item.keybinding) {
                continue;
            }
            const input = item._sourceKey ?? 'Impossible: missing source key, but has keybinding';
            if (seenBindings.has(input)) {
                continue;
            }
            seenBindings.add(input);
            const resolvedKeybindings = this._keyboardMapper.resolveKeybinding(item.keybinding);
            this._printResolvedKeybindings(result, input, resolvedKeybindings);
        }
        return result.join('\n');
    }
    _dumpDebugInfo() {
        const layoutInfo = JSON.stringify(this.keyboardLayoutService.getCurrentKeyboardLayout(), null, '\t');
        const mapperInfo = this._keyboardMapper.dumpDebugInfo();
        const resolvedKeybindings = this._dumpResolveKeybindingDebugInfo();
        const rawMapping = JSON.stringify(this.keyboardLayoutService.getRawKeyboardMapping(), null, '\t');
        return `Layout info:\n${layoutInfo}\n\n${resolvedKeybindings}\n\n${mapperInfo}\n\nRaw mapping:\n${rawMapping}`;
    }
    _dumpDebugInfoJSON() {
        const info = {
            layout: this.keyboardLayoutService.getCurrentKeyboardLayout(),
            rawMapping: this.keyboardLayoutService.getRawKeyboardMapping(),
        };
        return JSON.stringify(info, null, '\t');
    }
    enableKeybindingHoldMode(commandId) {
        if (this._currentlyDispatchingCommandId !== commandId) {
            return undefined;
        }
        this._keybindingHoldMode = new DeferredPromise();
        const focusTracker = dom.trackFocus(dom.getWindow(undefined));
        const listener = focusTracker.onDidBlur(() => this._resetKeybindingHoldMode());
        this._keybindingHoldMode.p.finally(() => {
            listener.dispose();
            focusTracker.dispose();
        });
        this._log(`+ Enabled hold-mode for ${commandId}.`);
        return this._keybindingHoldMode.p;
    }
    _resetKeybindingHoldMode() {
        if (this._keybindingHoldMode) {
            this._keybindingHoldMode?.complete();
            this._keybindingHoldMode = null;
        }
    }
    customKeybindingsCount() {
        return this.userKeybindings.keybindings.length;
    }
    updateResolver() {
        this._cachedResolver = null;
        this._onDidUpdateKeybindings.fire();
    }
    _getResolver() {
        if (!this._cachedResolver) {
            const defaults = this._resolveKeybindingItems(KeybindingsRegistry.getDefaultKeybindings(), true);
            const overrides = this._resolveUserKeybindingItems(this.userKeybindings.keybindings, false);
            this._cachedResolver = new KeybindingResolver(defaults, overrides, (str) => this._log(str));
        }
        return this._cachedResolver;
    }
    _documentHasFocus() {
        // it is possible that the document has lost focus, but the
        // window is still focused, e.g. when a <webview> element
        // has focus
        return this.hostService.hasFocus;
    }
    _resolveKeybindingItems(items, isDefault) {
        const result = [];
        let resultLen = 0;
        for (const item of items) {
            const when = item.when || undefined;
            const keybinding = item.keybinding;
            if (!keybinding) {
                // This might be a removal keybinding item in user settings => accept it
                result[resultLen++] = new ResolvedKeybindingItem(undefined, item.command, item.commandArgs, when, isDefault, item.extensionId, item.isBuiltinExtension);
            }
            else {
                if (this._assertBrowserConflicts(keybinding)) {
                    continue;
                }
                const resolvedKeybindings = this._keyboardMapper.resolveKeybinding(keybinding);
                for (let i = resolvedKeybindings.length - 1; i >= 0; i--) {
                    const resolvedKeybinding = resolvedKeybindings[i];
                    result[resultLen++] = new ResolvedKeybindingItem(resolvedKeybinding, item.command, item.commandArgs, when, isDefault, item.extensionId, item.isBuiltinExtension);
                }
            }
        }
        return result;
    }
    _resolveUserKeybindingItems(items, isDefault) {
        const result = [];
        let resultLen = 0;
        for (const item of items) {
            const when = item.when || undefined;
            if (!item.keybinding) {
                // This might be a removal keybinding item in user settings => accept it
                result[resultLen++] = new ResolvedKeybindingItem(undefined, item.command, item.commandArgs, when, isDefault, null, false);
            }
            else {
                const resolvedKeybindings = this._keyboardMapper.resolveKeybinding(item.keybinding);
                for (const resolvedKeybinding of resolvedKeybindings) {
                    result[resultLen++] = new ResolvedKeybindingItem(resolvedKeybinding, item.command, item.commandArgs, when, isDefault, null, false);
                }
            }
        }
        return result;
    }
    _assertBrowserConflicts(keybinding) {
        if (BrowserFeatures.keyboard === 0 /* KeyboardSupport.Always */) {
            return false;
        }
        if (BrowserFeatures.keyboard === 1 /* KeyboardSupport.FullScreen */ &&
            browser.isFullscreen(mainWindow)) {
            return false;
        }
        for (const chord of keybinding.chords) {
            if (!chord.metaKey && !chord.altKey && !chord.ctrlKey && !chord.shiftKey) {
                continue;
            }
            const modifiersMask = 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */;
            let partModifiersMask = 0;
            if (chord.metaKey) {
                partModifiersMask |= 2048 /* KeyMod.CtrlCmd */;
            }
            if (chord.shiftKey) {
                partModifiersMask |= 1024 /* KeyMod.Shift */;
            }
            if (chord.altKey) {
                partModifiersMask |= 512 /* KeyMod.Alt */;
            }
            if (chord.ctrlKey && OS === 2 /* OperatingSystem.Macintosh */) {
                partModifiersMask |= 256 /* KeyMod.WinCtrl */;
            }
            if ((partModifiersMask & modifiersMask) === (2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */)) {
                if (chord instanceof ScanCodeChord &&
                    (chord.scanCode === 86 /* ScanCode.ArrowLeft */ || chord.scanCode === 85 /* ScanCode.ArrowRight */)) {
                    // console.warn('Ctrl/Cmd+Arrow keybindings should not be used by default in web. Offender: ', kb.getHashCode(), ' for ', commandId);
                    return true;
                }
                if (chord instanceof KeyCodeChord &&
                    (chord.keyCode === 15 /* KeyCode.LeftArrow */ || chord.keyCode === 17 /* KeyCode.RightArrow */)) {
                    // console.warn('Ctrl/Cmd+Arrow keybindings should not be used by default in web. Offender: ', kb.getHashCode(), ' for ', commandId);
                    return true;
                }
            }
            if ((partModifiersMask & modifiersMask) === 2048 /* KeyMod.CtrlCmd */) {
                if (chord instanceof ScanCodeChord &&
                    chord.scanCode >= 36 /* ScanCode.Digit1 */ &&
                    chord.scanCode <= 45 /* ScanCode.Digit0 */) {
                    // console.warn('Ctrl/Cmd+Num keybindings should not be used by default in web. Offender: ', kb.getHashCode(), ' for ', commandId);
                    return true;
                }
                if (chord instanceof KeyCodeChord &&
                    chord.keyCode >= 21 /* KeyCode.Digit0 */ &&
                    chord.keyCode <= 30 /* KeyCode.Digit9 */) {
                    // console.warn('Ctrl/Cmd+Num keybindings should not be used by default in web. Offender: ', kb.getHashCode(), ' for ', commandId);
                    return true;
                }
            }
        }
        return false;
    }
    resolveKeybinding(kb) {
        return this._keyboardMapper.resolveKeybinding(kb);
    }
    resolveKeyboardEvent(keyboardEvent) {
        this.keyboardLayoutService.validateCurrentKeyboardMapping(keyboardEvent);
        return this._keyboardMapper.resolveKeyboardEvent(keyboardEvent);
    }
    resolveUserBinding(userBinding) {
        const keybinding = KeybindingParser.parseKeybinding(userBinding);
        return keybinding ? this._keyboardMapper.resolveKeybinding(keybinding) : [];
    }
    _handleKeybindingsExtensionPointUser(extensionId, isBuiltin, keybindings, collector, result) {
        if (Array.isArray(keybindings)) {
            for (let i = 0, len = keybindings.length; i < len; i++) {
                this._handleKeybinding(extensionId, isBuiltin, i + 1, keybindings[i], collector, result);
            }
        }
        else {
            this._handleKeybinding(extensionId, isBuiltin, 1, keybindings, collector, result);
        }
    }
    _handleKeybinding(extensionId, isBuiltin, idx, keybindings, collector, result) {
        const rejects = [];
        if (isValidContributedKeyBinding(keybindings, rejects)) {
            const rule = this._asCommandRule(extensionId, isBuiltin, idx++, keybindings);
            if (rule) {
                result.push(rule);
            }
        }
        if (rejects.length > 0) {
            collector.error(nls.localize('invalid.keybindings', 'Invalid `contributes.{0}`: {1}', keybindingsExtPoint.name, rejects.join('\n')));
        }
    }
    static bindToCurrentPlatform(key, mac, linux, win) {
        if (OS === 1 /* OperatingSystem.Windows */ && win) {
            if (win) {
                return win;
            }
        }
        else if (OS === 2 /* OperatingSystem.Macintosh */) {
            if (mac) {
                return mac;
            }
        }
        else {
            if (linux) {
                return linux;
            }
        }
        return key;
    }
    _asCommandRule(extensionId, isBuiltin, idx, binding) {
        const { command, args, when, key, mac, linux, win } = binding;
        const keybinding = WorkbenchKeybindingService_1.bindToCurrentPlatform(key, mac, linux, win);
        if (!keybinding) {
            return undefined;
        }
        let weight;
        if (isBuiltin) {
            weight = 300 /* KeybindingWeight.BuiltinExtension */ + idx;
        }
        else {
            weight = 400 /* KeybindingWeight.ExternalExtension */ + idx;
        }
        const commandAction = MenuRegistry.getCommand(command);
        const precondition = commandAction && commandAction.precondition;
        let fullWhen;
        if (when && precondition) {
            fullWhen = ContextKeyExpr.and(precondition, ContextKeyExpr.deserialize(when));
        }
        else if (when) {
            fullWhen = ContextKeyExpr.deserialize(when);
        }
        else if (precondition) {
            fullWhen = precondition;
        }
        const desc = {
            id: command,
            args,
            when: fullWhen,
            weight: weight,
            keybinding: KeybindingParser.parseKeybinding(keybinding),
            extensionId: extensionId.value,
            isBuiltinExtension: isBuiltin,
        };
        return desc;
    }
    getDefaultKeybindingsContent() {
        const resolver = this._getResolver();
        const defaultKeybindings = resolver.getDefaultKeybindings();
        const boundCommands = resolver.getDefaultBoundCommands();
        return (WorkbenchKeybindingService_1._getDefaultKeybindings(defaultKeybindings) +
            '\n\n' +
            WorkbenchKeybindingService_1._getAllCommandsAsComment(boundCommands));
    }
    static _getDefaultKeybindings(defaultKeybindings) {
        const out = new OutputBuilder();
        out.writeLine('[');
        const lastIndex = defaultKeybindings.length - 1;
        defaultKeybindings.forEach((k, index) => {
            KeybindingIO.writeKeybindingItem(out, k);
            if (index !== lastIndex) {
                out.writeLine(',');
            }
            else {
                out.writeLine();
            }
        });
        out.writeLine(']');
        return out.toString();
    }
    static _getAllCommandsAsComment(boundCommands) {
        const unboundCommands = getAllUnboundCommands(boundCommands);
        const pretty = unboundCommands.sort().join('\n// - ');
        return ('// ' +
            nls.localize('unboundCommands', 'Here are other available commands: ') +
            '\n// - ' +
            pretty);
    }
    mightProducePrintableCharacter(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            // ignore ctrl/cmd/alt-combination but not shift-combinatios
            return false;
        }
        const code = ScanCodeUtils.toEnum(event.code);
        if (NUMPAD_PRINTABLE_SCANCODES.indexOf(code) !== -1) {
            // This is a numpad key that might produce a printable character based on NumLock.
            // Let's check if NumLock is on or off based on the event's keyCode.
            // e.g.
            // - when NumLock is off, ScanCode.Numpad4 produces KeyCode.LeftArrow
            // - when NumLock is on, ScanCode.Numpad4 produces KeyCode.NUMPAD_4
            // However, ScanCode.NumpadAdd always produces KeyCode.NUMPAD_ADD
            if (event.keyCode === IMMUTABLE_CODE_TO_KEY_CODE[code]) {
                // NumLock is on or this is /, *, -, + on the numpad
                return true;
            }
            if (isMacintosh && event.keyCode === otherMacNumpadMapping.get(code)) {
                // on macOS, the numpad keys can also map to keys 1 - 0.
                return true;
            }
            return false;
        }
        const keycode = IMMUTABLE_CODE_TO_KEY_CODE[code];
        if (keycode !== -1) {
            // https://github.com/microsoft/vscode/issues/74934
            return false;
        }
        // consult the KeyboardMapperFactory to check the given event for
        // a printable value.
        const mapping = this.keyboardLayoutService.getRawKeyboardMapping();
        if (!mapping) {
            return false;
        }
        const keyInfo = mapping[event.code];
        if (!keyInfo) {
            return false;
        }
        if (!keyInfo.value || /\s/.test(keyInfo.value)) {
            return false;
        }
        return true;
    }
};
WorkbenchKeybindingService = WorkbenchKeybindingService_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICommandService),
    __param(2, ITelemetryService),
    __param(3, INotificationService),
    __param(4, IUserDataProfileService),
    __param(5, IHostService),
    __param(6, IExtensionService),
    __param(7, IFileService),
    __param(8, IUriIdentityService),
    __param(9, ILogService),
    __param(10, IKeyboardLayoutService)
], WorkbenchKeybindingService);
export { WorkbenchKeybindingService };
class UserKeybindings extends Disposable {
    get keybindings() {
        return this._keybindings;
    }
    constructor(userDataProfileService, uriIdentityService, fileService, logService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this._rawKeybindings = [];
        this._keybindings = [];
        this.watchDisposables = this._register(new DisposableStore());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.watch();
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reload().then((changed) => {
            if (changed) {
                this._onDidChange.fire();
            }
        }), 50));
        this._register(Event.filter(this.fileService.onDidFilesChange, (e) => e.contains(this.userDataProfileService.currentProfile.keybindingsResource))(() => {
            logService.debug('Keybindings file changed');
            this.reloadConfigurationScheduler.schedule();
        }));
        this._register(this.fileService.onDidRunOperation((e) => {
            if (e.operation === 4 /* FileOperation.WRITE */ &&
                e.resource.toString() ===
                    this.userDataProfileService.currentProfile.keybindingsResource.toString()) {
                logService.debug('Keybindings file written');
                this.reloadConfigurationScheduler.schedule();
            }
        }));
        this._register(userDataProfileService.onDidChangeCurrentProfile((e) => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.keybindingsResource, e.profile.keybindingsResource)) {
                e.join(this.whenCurrentProfileChanged());
            }
        }));
    }
    async whenCurrentProfileChanged() {
        this.watch();
        this.reloadConfigurationScheduler.schedule();
    }
    watch() {
        this.watchDisposables.clear();
        this.watchDisposables.add(this.fileService.watch(dirname(this.userDataProfileService.currentProfile.keybindingsResource)));
        // Also listen to the resource incase the resource is a symlink - https://github.com/microsoft/vscode/issues/118134
        this.watchDisposables.add(this.fileService.watch(this.userDataProfileService.currentProfile.keybindingsResource));
    }
    async initialize() {
        await this.reload();
    }
    async reload() {
        const newKeybindings = await this.readUserKeybindings();
        if (objects.equals(this._rawKeybindings, newKeybindings)) {
            // no change
            return false;
        }
        this._rawKeybindings = newKeybindings;
        this._keybindings = this._rawKeybindings.map((k) => KeybindingIO.readUserKeybindingItem(k));
        return true;
    }
    async readUserKeybindings() {
        try {
            const content = await this.fileService.readFile(this.userDataProfileService.currentProfile.keybindingsResource);
            const value = parse(content.value.toString());
            return Array.isArray(value)
                ? value.filter((v) => v && typeof v === 'object' /* just typeof === object doesn't catch `null` */)
                : [];
        }
        catch (e) {
            return [];
        }
    }
}
/**
 * Registers the `keybindings.json`'s schema with the JSON schema registry. Allows updating the schema, e.g., when new commands are registered (e.g., by extensions).
 *
 * Lifecycle owned by `WorkbenchKeybindingService`. Must be instantiated only once.
 */
class KeybindingsJsonSchema {
    static { this.schemaId = 'vscode://schemas/keybindings'; }
    constructor() {
        this.commandsSchemas = [];
        this.commandsEnum = [];
        this.removalCommandsEnum = [];
        this.commandsEnumDescriptions = [];
        this.schema = {
            id: KeybindingsJsonSchema.schemaId,
            type: 'array',
            title: nls.localize('keybindings.json.title', 'Keybindings configuration'),
            allowTrailingCommas: true,
            allowComments: true,
            definitions: {
                editorGroupsSchema: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            groups: {
                                $ref: '#/definitions/editorGroupsSchema',
                                default: [{}, {}],
                            },
                            size: {
                                type: 'number',
                                default: 0.5,
                            },
                        },
                    },
                },
                commandNames: {
                    type: 'string',
                    enum: this.commandsEnum,
                    enumDescriptions: this.commandsEnumDescriptions,
                    description: nls.localize('keybindings.json.command', 'Name of the command to execute'),
                },
                commandType: {
                    anyOf: [
                        // repetition of this clause here and below is intentional: one is for nice diagnostics & one is for code completion
                        {
                            $ref: '#/definitions/commandNames',
                        },
                        {
                            type: 'string',
                            enum: this.removalCommandsEnum,
                            enumDescriptions: this.commandsEnumDescriptions,
                            description: nls.localize('keybindings.json.removalCommand', 'Name of the command to remove keyboard shortcut for'),
                        },
                        {
                            type: 'string',
                        },
                    ],
                },
                commandsSchemas: {
                    allOf: this.commandsSchemas,
                },
            },
            items: {
                required: ['key'],
                type: 'object',
                defaultSnippets: [{ body: { key: '$1', command: '$2', when: '$3' } }],
                properties: {
                    key: {
                        type: 'string',
                        description: nls.localize('keybindings.json.key', 'Key or key sequence (separated by space)'),
                    },
                    command: {
                        anyOf: [
                            {
                                if: {
                                    type: 'array',
                                },
                                then: {
                                    not: {
                                        type: 'array',
                                    },
                                    errorMessage: nls.localize('keybindings.commandsIsArray', "Incorrect type. Expected \"{0}\". The field 'command' does not support running multiple commands. Use command 'runCommands' to pass it multiple commands to run.", 'string'),
                                },
                                else: {
                                    $ref: '#/definitions/commandType',
                                },
                            },
                            {
                                $ref: '#/definitions/commandType',
                            },
                        ],
                    },
                    when: {
                        type: 'string',
                        description: nls.localize('keybindings.json.when', 'Condition when the key is active.'),
                    },
                    args: {
                        description: nls.localize('keybindings.json.args', 'Arguments to pass to the command to execute.'),
                    },
                },
                $ref: '#/definitions/commandsSchemas',
            },
        };
        this.schemaRegistry = Registry.as(Extensions.JSONContribution);
        this.schemaRegistry.registerSchema(KeybindingsJsonSchema.schemaId, this.schema);
    }
    // TODO@ulugbekna: can updates happen incrementally rather than rebuilding; concerns:
    // - is just appending additional schemas enough for the registry to pick them up?
    // - can `CommandsRegistry.getCommands` and `MenuRegistry.getCommands` return different values at different times? ie would just pushing new schemas from `additionalContributions` not be enough?
    updateSchema(additionalContributions) {
        this.commandsSchemas.length = 0;
        this.commandsEnum.length = 0;
        this.removalCommandsEnum.length = 0;
        this.commandsEnumDescriptions.length = 0;
        const knownCommands = new Set();
        const addKnownCommand = (commandId, description) => {
            if (!/^_/.test(commandId)) {
                if (!knownCommands.has(commandId)) {
                    knownCommands.add(commandId);
                    this.commandsEnum.push(commandId);
                    this.commandsEnumDescriptions.push(isLocalizedString(description) ? description.value : description);
                    // Also add the negative form for keybinding removal
                    this.removalCommandsEnum.push(`-${commandId}`);
                }
            }
        };
        const allCommands = CommandsRegistry.getCommands();
        for (const [commandId, command] of allCommands) {
            const commandMetadata = command.metadata;
            addKnownCommand(commandId, commandMetadata?.description ?? MenuRegistry.getCommand(commandId)?.title);
            if (!commandMetadata ||
                !commandMetadata.args ||
                commandMetadata.args.length !== 1 ||
                !commandMetadata.args[0].schema) {
                continue;
            }
            const argsSchema = commandMetadata.args[0].schema;
            const argsRequired = typeof commandMetadata.args[0].isOptional !== 'undefined'
                ? !commandMetadata.args[0].isOptional
                : Array.isArray(argsSchema.required) && argsSchema.required.length > 0;
            const addition = {
                if: {
                    required: ['command'],
                    properties: {
                        command: { const: commandId },
                    },
                },
                then: {
                    required: [].concat(argsRequired ? ['args'] : []),
                    properties: {
                        args: argsSchema,
                    },
                },
            };
            this.commandsSchemas.push(addition);
        }
        const menuCommands = MenuRegistry.getCommands();
        for (const commandId of menuCommands.keys()) {
            addKnownCommand(commandId);
        }
        this.commandsSchemas.push(...additionalContributions);
        this.schemaRegistry.notifySchemaChanged(KeybindingsJsonSchema.schemaId);
    }
}
registerSingleton(IKeybindingService, WorkbenchKeybindingService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2Jyb3dzZXIva2V5YmluZGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTztBQUNQLE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN0RixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsMEJBQTBCLEVBQzFCLHFCQUFxQixHQUNyQixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sWUFBWSxFQUVaLGFBQWEsR0FDYixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTiwwQkFBMEIsRUFFMUIsWUFBWSxFQUdaLGFBQWEsR0FDYixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxLQUFL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