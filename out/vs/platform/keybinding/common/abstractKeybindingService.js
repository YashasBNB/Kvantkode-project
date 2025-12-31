/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { IntervalTimer, TimeoutTimer } from '../../../base/common/async.js';
import { illegalState } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IME } from '../../../base/common/ime.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { NoMatchingKb, } from './keybindingResolver.js';
const HIGH_FREQ_COMMANDS = /^(cursor|delete|undo|redo|tab|editor\.action\.clipboard)/;
export class AbstractKeybindingService extends Disposable {
    get onDidUpdateKeybindings() {
        return this._onDidUpdateKeybindings ? this._onDidUpdateKeybindings.event : Event.None; // Sinon stubbing walks properties on prototype
    }
    get inChordMode() {
        return this._currentChords.length > 0;
    }
    constructor(_contextKeyService, _commandService, _telemetryService, _notificationService, _logService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._commandService = _commandService;
        this._telemetryService = _telemetryService;
        this._notificationService = _notificationService;
        this._logService = _logService;
        this._onDidUpdateKeybindings = this._register(new Emitter());
        this._currentChords = [];
        this._currentChordChecker = new IntervalTimer();
        this._currentChordStatusMessage = null;
        this._ignoreSingleModifiers = KeybindingModifierSet.EMPTY;
        this._currentSingleModifier = null;
        this._currentSingleModifierClearTimeout = new TimeoutTimer();
        this._currentlyDispatchingCommandId = null;
        this._logging = false;
    }
    dispose() {
        super.dispose();
    }
    getDefaultKeybindingsContent() {
        return '';
    }
    toggleLogging() {
        this._logging = !this._logging;
        return this._logging;
    }
    _log(str) {
        if (this._logging) {
            this._logService.info(`[KeybindingService]: ${str}`);
        }
    }
    getDefaultKeybindings() {
        return this._getResolver().getDefaultKeybindings();
    }
    getKeybindings() {
        return this._getResolver().getKeybindings();
    }
    customKeybindingsCount() {
        return 0;
    }
    lookupKeybindings(commandId) {
        return arrays.coalesce(this._getResolver()
            .lookupKeybindings(commandId)
            .map((item) => item.resolvedKeybinding));
    }
    lookupKeybinding(commandId, context, enforceContextCheck = false) {
        const result = this._getResolver().lookupPrimaryKeybinding(commandId, context || this._contextKeyService, enforceContextCheck);
        if (!result) {
            return undefined;
        }
        return result.resolvedKeybinding;
    }
    dispatchEvent(e, target) {
        return this._dispatch(e, target);
    }
    // TODO@ulugbekna: update namings to align with `_doDispatch`
    // TODO@ulugbekna: this fn doesn't seem to take into account single-modifier keybindings, eg `shift shift`
    softDispatch(e, target) {
        this._log(`/ Soft dispatching keyboard event`);
        const keybinding = this.resolveKeyboardEvent(e);
        if (keybinding.hasMultipleChords()) {
            console.warn('keyboard event should not be mapped to multiple chords');
            return NoMatchingKb;
        }
        const [firstChord] = keybinding.getDispatchChords();
        if (firstChord === null) {
            // cannot be dispatched, probably only modifier keys
            this._log(`\\ Keyboard event cannot be dispatched`);
            return NoMatchingKb;
        }
        const contextValue = this._contextKeyService.getContext(target);
        const currentChords = this._currentChords.map(({ keypress }) => keypress);
        return this._getResolver().resolve(contextValue, currentChords, firstChord);
    }
    _scheduleLeaveChordMode() {
        const chordLastInteractedTime = Date.now();
        this._currentChordChecker.cancelAndSet(() => {
            if (!this._documentHasFocus()) {
                // Focus has been lost => leave chord mode
                this._leaveChordMode();
                return;
            }
            if (Date.now() - chordLastInteractedTime > 5000) {
                // 5 seconds elapsed => leave chord mode
                this._leaveChordMode();
            }
        }, 500);
    }
    _expectAnotherChord(firstChord, keypressLabel) {
        this._currentChords.push({ keypress: firstChord, label: keypressLabel });
        switch (this._currentChords.length) {
            case 0:
                throw illegalState('impossible');
            case 1:
                // TODO@ulugbekna: revise this message and the one below (at least, fix terminology)
                this._currentChordStatusMessage = this._notificationService.status(nls.localize('first.chord', '({0}) was pressed. Waiting for second key of chord...', keypressLabel));
                break;
            default: {
                const fullKeypressLabel = this._currentChords.map(({ label }) => label).join(', ');
                this._currentChordStatusMessage = this._notificationService.status(nls.localize('next.chord', '({0}) was pressed. Waiting for next key of chord...', fullKeypressLabel));
            }
        }
        this._scheduleLeaveChordMode();
        if (IME.enabled) {
            IME.disable();
        }
    }
    _leaveChordMode() {
        if (this._currentChordStatusMessage) {
            this._currentChordStatusMessage.dispose();
            this._currentChordStatusMessage = null;
        }
        this._currentChordChecker.cancel();
        this._currentChords = [];
        IME.enable();
    }
    dispatchByUserSettingsLabel(userSettingsLabel, target) {
        this._log(`/ Dispatching keybinding triggered via menu entry accelerator - ${userSettingsLabel}`);
        const keybindings = this.resolveUserBinding(userSettingsLabel);
        if (keybindings.length === 0) {
            this._log(`\\ Could not resolve - ${userSettingsLabel}`);
        }
        else {
            this._doDispatch(keybindings[0], target, /*isSingleModiferChord*/ false);
        }
    }
    _dispatch(e, target) {
        return this._doDispatch(this.resolveKeyboardEvent(e), target, /*isSingleModiferChord*/ false);
    }
    _singleModifierDispatch(e, target) {
        const keybinding = this.resolveKeyboardEvent(e);
        const [singleModifier] = keybinding.getSingleModifierDispatchChords();
        if (singleModifier) {
            if (this._ignoreSingleModifiers.has(singleModifier)) {
                this._log(`+ Ignoring single modifier ${singleModifier} due to it being pressed together with other keys.`);
                this._ignoreSingleModifiers = KeybindingModifierSet.EMPTY;
                this._currentSingleModifierClearTimeout.cancel();
                this._currentSingleModifier = null;
                return false;
            }
            this._ignoreSingleModifiers = KeybindingModifierSet.EMPTY;
            if (this._currentSingleModifier === null) {
                // we have a valid `singleModifier`, store it for the next keyup, but clear it in 300ms
                this._log(`+ Storing single modifier for possible chord ${singleModifier}.`);
                this._currentSingleModifier = singleModifier;
                this._currentSingleModifierClearTimeout.cancelAndSet(() => {
                    this._log(`+ Clearing single modifier due to 300ms elapsed.`);
                    this._currentSingleModifier = null;
                }, 300);
                return false;
            }
            if (singleModifier === this._currentSingleModifier) {
                // bingo!
                this._log(`/ Dispatching single modifier chord ${singleModifier} ${singleModifier}`);
                this._currentSingleModifierClearTimeout.cancel();
                this._currentSingleModifier = null;
                return this._doDispatch(keybinding, target, /*isSingleModiferChord*/ true);
            }
            this._log(`+ Clearing single modifier due to modifier mismatch: ${this._currentSingleModifier} ${singleModifier}`);
            this._currentSingleModifierClearTimeout.cancel();
            this._currentSingleModifier = null;
            return false;
        }
        // When pressing a modifier and holding it pressed with any other modifier or key combination,
        // the pressed modifiers should no longer be considered for single modifier dispatch.
        const [firstChord] = keybinding.getChords();
        this._ignoreSingleModifiers = new KeybindingModifierSet(firstChord);
        if (this._currentSingleModifier !== null) {
            this._log(`+ Clearing single modifier due to other key up.`);
        }
        this._currentSingleModifierClearTimeout.cancel();
        this._currentSingleModifier = null;
        return false;
    }
    _doDispatch(userKeypress, target, isSingleModiferChord = false) {
        let shouldPreventDefault = false;
        if (userKeypress.hasMultipleChords()) {
            // warn - because user can press a single chord at a time
            console.warn('Unexpected keyboard event mapped to multiple chords');
            return false;
        }
        let userPressedChord = null;
        let currentChords = null;
        if (isSingleModiferChord) {
            // The keybinding is the second keypress of a single modifier chord, e.g. "shift shift".
            // A single modifier can only occur when the same modifier is pressed in short sequence,
            // hence we disregard `_currentChord` and use the same modifier instead.
            const [dispatchKeyname] = userKeypress.getSingleModifierDispatchChords();
            userPressedChord = dispatchKeyname;
            currentChords = dispatchKeyname ? [dispatchKeyname] : []; // TODO@ulugbekna: in the `else` case we assign an empty array - make sure `resolve` can handle an empty array well
        }
        else {
            ;
            [userPressedChord] = userKeypress.getDispatchChords();
            currentChords = this._currentChords.map(({ keypress }) => keypress);
        }
        if (userPressedChord === null) {
            this._log(`\\ Keyboard event cannot be dispatched in keydown phase.`);
            // cannot be dispatched, probably only modifier keys
            return shouldPreventDefault;
        }
        const contextValue = this._contextKeyService.getContext(target);
        const keypressLabel = userKeypress.getLabel();
        const resolveResult = this._getResolver().resolve(contextValue, currentChords, userPressedChord);
        switch (resolveResult.kind) {
            case 0 /* ResultKind.NoMatchingKb */: {
                this._logService.trace('KeybindingService#dispatch', keypressLabel, `[ No matching keybinding ]`);
                if (this.inChordMode) {
                    const currentChordsLabel = this._currentChords.map(({ label }) => label).join(', ');
                    this._log(`+ Leaving multi-chord mode: Nothing bound to "${currentChordsLabel}, ${keypressLabel}".`);
                    this._notificationService.status(nls.localize('missing.chord', 'The key combination ({0}, {1}) is not a command.', currentChordsLabel, keypressLabel), { hideAfter: 10 * 1000 /* 10s */ });
                    this._leaveChordMode();
                    shouldPreventDefault = true;
                }
                return shouldPreventDefault;
            }
            case 1 /* ResultKind.MoreChordsNeeded */: {
                this._logService.trace('KeybindingService#dispatch', keypressLabel, `[ Several keybindings match - more chords needed ]`);
                shouldPreventDefault = true;
                this._expectAnotherChord(userPressedChord, keypressLabel);
                this._log(this._currentChords.length === 1
                    ? `+ Entering multi-chord mode...`
                    : `+ Continuing multi-chord mode...`);
                return shouldPreventDefault;
            }
            case 2 /* ResultKind.KbFound */: {
                this._logService.trace('KeybindingService#dispatch', keypressLabel, `[ Will dispatch command ${resolveResult.commandId} ]`);
                if (resolveResult.commandId === null || resolveResult.commandId === '') {
                    if (this.inChordMode) {
                        const currentChordsLabel = this._currentChords.map(({ label }) => label).join(', ');
                        this._log(`+ Leaving chord mode: Nothing bound to "${currentChordsLabel}, ${keypressLabel}".`);
                        this._notificationService.status(nls.localize('missing.chord', 'The key combination ({0}, {1}) is not a command.', currentChordsLabel, keypressLabel), { hideAfter: 10 * 1000 /* 10s */ });
                        this._leaveChordMode();
                        shouldPreventDefault = true;
                    }
                }
                else {
                    if (this.inChordMode) {
                        this._leaveChordMode();
                    }
                    if (!resolveResult.isBubble) {
                        shouldPreventDefault = true;
                    }
                    this._log(`+ Invoking command ${resolveResult.commandId}.`);
                    this._currentlyDispatchingCommandId = resolveResult.commandId;
                    try {
                        if (typeof resolveResult.commandArgs === 'undefined') {
                            this._commandService
                                .executeCommand(resolveResult.commandId)
                                .then(undefined, (err) => this._notificationService.warn(err));
                        }
                        else {
                            this._commandService
                                .executeCommand(resolveResult.commandId, resolveResult.commandArgs)
                                .then(undefined, (err) => this._notificationService.warn(err));
                        }
                    }
                    finally {
                        this._currentlyDispatchingCommandId = null;
                    }
                    if (!HIGH_FREQ_COMMANDS.test(resolveResult.commandId)) {
                        this._telemetryService.publicLog2('workbenchActionExecuted', {
                            id: resolveResult.commandId,
                            from: 'keybinding',
                            detail: userKeypress.getUserSettingsLabel() ?? undefined,
                        });
                    }
                }
                return shouldPreventDefault;
            }
        }
    }
    mightProducePrintableCharacter(event) {
        if (event.ctrlKey || event.metaKey) {
            // ignore ctrl/cmd-combination but not shift/alt-combinatios
            return false;
        }
        // weak check for certain ranges. this is properly implemented in a subclass
        // with access to the KeyboardMapperFactory.
        if ((event.keyCode >= 31 /* KeyCode.KeyA */ && event.keyCode <= 56 /* KeyCode.KeyZ */) ||
            (event.keyCode >= 21 /* KeyCode.Digit0 */ && event.keyCode <= 30 /* KeyCode.Digit9 */)) {
            return true;
        }
        return false;
    }
}
class KeybindingModifierSet {
    static { this.EMPTY = new KeybindingModifierSet(null); }
    constructor(source) {
        this._ctrlKey = source ? source.ctrlKey : false;
        this._shiftKey = source ? source.shiftKey : false;
        this._altKey = source ? source.altKey : false;
        this._metaKey = source ? source.metaKey : false;
    }
    has(modifier) {
        switch (modifier) {
            case 'ctrl':
                return this._ctrlKey;
            case 'shift':
                return this._shiftKey;
            case 'alt':
                return this._altKey;
            case 'meta':
                return this._metaKey;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL2Fic3RyYWN0S2V5YmluZGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQVFqRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUt0QyxPQUFPLEVBSU4sWUFBWSxHQUNaLE1BQU0seUJBQXlCLENBQUE7QUFXaEMsTUFBTSxrQkFBa0IsR0FBRywwREFBMEQsQ0FBQTtBQUVyRixNQUFNLE9BQWdCLHlCQUEwQixTQUFRLFVBQVU7SUFJakUsSUFBSSxzQkFBc0I7UUFDekIsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUEsQ0FBQywrQ0FBK0M7SUFDdEksQ0FBQztJQW9CRCxJQUFXLFdBQVc7UUFDckIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVELFlBQ1Msa0JBQXNDLEVBQ3BDLGVBQWdDLEVB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