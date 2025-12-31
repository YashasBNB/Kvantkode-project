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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9icm93c2VyL2tleWJpbmRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU87QUFDUCxPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDdEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLDBCQUEwQixFQUMxQixxQkFBcUIsR0FDckIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUVOLFlBQVksRUFFWixhQUFhLEdBQ2IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQ04sMEJBQTBCLEVBRTFCLFlBQVksRUFHWixhQUFhLEdBQ2IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sS0FBSyxPQUFP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