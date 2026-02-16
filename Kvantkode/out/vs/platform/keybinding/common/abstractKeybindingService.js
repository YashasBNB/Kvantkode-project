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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy9jb21tb24vYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBUWpELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBS3RDLE9BQU8sRUFJTixZQUFZLEdBQ1osTUFBTSx5QkFBeUIsQ0FBQTtBQVdoQyxNQUFNLGtCQUFrQixHQUFHLDBEQUEwRCxDQUFBO0FBRXJGLE1BQU0sT0FBZ0IseUJBQTBCLFNBQVEsVUFBVTtJQUlqRSxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQSxDQUFDLCtDQUErQztJQUN0SSxDQUFDO0lBb0JELElBQVcsV0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsWUFDUyxrQkFBc0MsRUFDcEMsZUFBZ0MsRUFDaEMsaUJBQW9DLEVBQ3RDLG9CQUEwQyxFQUN4QyxXQUF3QjtRQUVsQyxLQUFLLEVBQUUsQ0FBQTtRQU5DLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDcEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDdEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUN4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQWhDaEIsNEJBQXVCLEdBQWtCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBb0M5RixJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFDekQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQTtRQUNsQyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQTtRQUM1RCxJQUFJLENBQUMsOEJBQThCLEdBQUcsSUFBSSxDQUFBO1FBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO0lBQ3RCLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBV00sNEJBQTRCO1FBQ2xDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVNLGFBQWE7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDOUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFUyxJQUFJLENBQUMsR0FBVztRQUN6QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVNLHFCQUFxQjtRQUMzQixPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQzVDLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRU0saUJBQWlCLENBQUMsU0FBaUI7UUFDekMsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUNyQixJQUFJLENBQUMsWUFBWSxFQUFFO2FBQ2pCLGlCQUFpQixDQUFDLFNBQVMsQ0FBQzthQUM1QixHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUN4QyxDQUFBO0lBQ0YsQ0FBQztJQUVNLGdCQUFnQixDQUN0QixTQUFpQixFQUNqQixPQUE0QixFQUM1QixtQkFBbUIsR0FBRyxLQUFLO1FBRTNCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyx1QkFBdUIsQ0FDekQsU0FBUyxFQUNULE9BQU8sSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQ2xDLG1CQUFtQixDQUNuQixDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLGtCQUFrQixDQUFBO0lBQ2pDLENBQUM7SUFFTSxhQUFhLENBQUMsQ0FBaUIsRUFBRSxNQUFnQztRQUN2RSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCw2REFBNkQ7SUFDN0QsMEdBQTBHO0lBQ25HLFlBQVksQ0FBQyxDQUFpQixFQUFFLE1BQWdDO1FBQ3RFLElBQUksQ0FBQyxJQUFJLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtRQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsSUFBSSxVQUFVLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0RBQXdELENBQUMsQ0FBQTtZQUN0RSxPQUFPLFlBQVksQ0FBQTtRQUNwQixDQUFDO1FBQ0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ25ELElBQUksVUFBVSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pCLG9EQUFvRDtZQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUE7WUFDbkQsT0FBTyxZQUFZLENBQUE7UUFDcEIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6RSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO2dCQUMvQiwwQ0FBMEM7Z0JBQzFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDdEIsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyx1QkFBdUIsR0FBRyxJQUFJLEVBQUUsQ0FBQztnQkFDakQsd0NBQXdDO2dCQUN4QyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNSLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxVQUFrQixFQUFFLGFBQTRCO1FBQzNFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUV4RSxRQUFRLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEMsS0FBSyxDQUFDO2dCQUNMLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2pDLEtBQUssQ0FBQztnQkFDTCxvRkFBb0Y7Z0JBQ3BGLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUNqRSxHQUFHLENBQUMsUUFBUSxDQUNYLGFBQWEsRUFDYix1REFBdUQsRUFDdkQsYUFBYSxDQUNiLENBQ0QsQ0FBQTtnQkFDRCxNQUFLO1lBQ04sT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDVCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNsRixJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FDakUsR0FBRyxDQUFDLFFBQVEsQ0FDWCxZQUFZLEVBQ1oscURBQXFELEVBQ3JELGlCQUFpQixDQUNqQixDQUNELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBRTlCLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZTtRQUN0QixJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUE7UUFDeEIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2IsQ0FBQztJQUVNLDJCQUEyQixDQUNqQyxpQkFBeUIsRUFDekIsTUFBZ0M7UUFFaEMsSUFBSSxDQUFDLElBQUksQ0FDUixtRUFBbUUsaUJBQWlCLEVBQUUsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzlELElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDekQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekUsQ0FBQztJQUNGLENBQUM7SUFFUyxTQUFTLENBQUMsQ0FBaUIsRUFBRSxNQUFnQztRQUN0RSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5RixDQUFDO0lBRVMsdUJBQXVCLENBQUMsQ0FBaUIsRUFBRSxNQUFnQztRQUNwRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLFVBQVUsQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1FBRXJFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxJQUFJLENBQ1IsOEJBQThCLGNBQWMsb0RBQW9ELENBQ2hHLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtnQkFDekQsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUNoRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO2dCQUNsQyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcscUJBQXFCLENBQUMsS0FBSyxDQUFBO1lBRXpELElBQUksSUFBSSxDQUFDLHNCQUFzQixLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMxQyx1RkFBdUY7Z0JBQ3ZGLElBQUksQ0FBQyxJQUFJLENBQUMsZ0RBQWdELGNBQWMsR0FBRyxDQUFDLENBQUE7Z0JBQzVFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxjQUFjLENBQUE7Z0JBQzVDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO29CQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUE7b0JBQzdELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUE7Z0JBQ25DLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDUCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxJQUFJLGNBQWMsS0FBSyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDcEQsU0FBUztnQkFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxjQUFjLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQTtnQkFDcEYsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUNoRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO2dCQUNsQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzRSxDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FDUix3REFBd0QsSUFBSSxDQUFDLHNCQUFzQixJQUFJLGNBQWMsRUFBRSxDQUN2RyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2hELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUE7WUFDbEMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsOEZBQThGO1FBQzlGLHFGQUFxRjtRQUNyRixNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQzNDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRW5FLElBQUksSUFBSSxDQUFDLHNCQUFzQixLQUFLLElBQUksRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsaURBQWlELENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2hELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUE7UUFDbEMsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sV0FBVyxDQUNsQixZQUFnQyxFQUNoQyxNQUFnQyxFQUNoQyxvQkFBb0IsR0FBRyxLQUFLO1FBRTVCLElBQUksb0JBQW9CLEdBQUcsS0FBSyxDQUFBO1FBRWhDLElBQUksWUFBWSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztZQUN0Qyx5REFBeUQ7WUFDekQsT0FBTyxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFBO1lBQ25FLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksZ0JBQWdCLEdBQWtCLElBQUksQ0FBQTtRQUMxQyxJQUFJLGFBQWEsR0FBb0IsSUFBSSxDQUFBO1FBRXpDLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQix3RkFBd0Y7WUFDeEYsd0ZBQXdGO1lBQ3hGLHdFQUF3RTtZQUN4RSxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsWUFBWSxDQUFDLCtCQUErQixFQUFFLENBQUE7WUFDeEUsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO1lBQ2xDLGFBQWEsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQSxDQUFDLG1IQUFtSDtRQUM3SyxDQUFDO2FBQU0sQ0FBQztZQUNQLENBQUM7WUFBQSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDdEQsYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELElBQUksZ0JBQWdCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQywwREFBMEQsQ0FBQyxDQUFBO1lBQ3JFLG9EQUFvRDtZQUNwRCxPQUFPLG9CQUFvQixDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUU3QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUVoRyxRQUFRLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QixvQ0FBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUNyQiw0QkFBNEIsRUFDNUIsYUFBYSxFQUNiLDRCQUE0QixDQUM1QixDQUFBO2dCQUVELElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN0QixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNuRixJQUFJLENBQUMsSUFBSSxDQUNSLGlEQUFpRCxrQkFBa0IsS0FBSyxhQUFhLElBQUksQ0FDekYsQ0FBQTtvQkFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUMvQixHQUFHLENBQUMsUUFBUSxDQUNYLGVBQWUsRUFDZixrREFBa0QsRUFDbEQsa0JBQWtCLEVBQ2xCLGFBQWEsQ0FDYixFQUNELEVBQUUsU0FBUyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQ2xDLENBQUE7b0JBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO29CQUV0QixvQkFBb0IsR0FBRyxJQUFJLENBQUE7Z0JBQzVCLENBQUM7Z0JBQ0QsT0FBTyxvQkFBb0IsQ0FBQTtZQUM1QixDQUFDO1lBRUQsd0NBQWdDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FDckIsNEJBQTRCLEVBQzVCLGFBQWEsRUFDYixvREFBb0QsQ0FDcEQsQ0FBQTtnQkFFRCxvQkFBb0IsR0FBRyxJQUFJLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtnQkFDekQsSUFBSSxDQUFDLElBQUksQ0FDUixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDO29CQUMvQixDQUFDLENBQUMsZ0NBQWdDO29CQUNsQyxDQUFDLENBQUMsa0NBQWtDLENBQ3JDLENBQUE7Z0JBQ0QsT0FBTyxvQkFBb0IsQ0FBQTtZQUM1QixDQUFDO1lBRUQsK0JBQXVCLENBQUMsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FDckIsNEJBQTRCLEVBQzVCLGFBQWEsRUFDYiwyQkFBMkIsYUFBYSxDQUFDLFNBQVMsSUFBSSxDQUN0RCxDQUFBO2dCQUVELElBQUksYUFBYSxDQUFDLFNBQVMsS0FBSyxJQUFJLElBQUksYUFBYSxDQUFDLFNBQVMsS0FBSyxFQUFFLEVBQUUsQ0FBQztvQkFDeEUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ3RCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ25GLElBQUksQ0FBQyxJQUFJLENBQ1IsMkNBQTJDLGtCQUFrQixLQUFLLGFBQWEsSUFBSSxDQUNuRixDQUFBO3dCQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQy9CLEdBQUcsQ0FBQyxRQUFRLENBQ1gsZUFBZSxFQUNmLGtEQUFrRCxFQUNsRCxrQkFBa0IsRUFDbEIsYUFBYSxDQUNiLEVBQ0QsRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FDbEMsQ0FBQTt3QkFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7d0JBQ3RCLG9CQUFvQixHQUFHLElBQUksQ0FBQTtvQkFDNUIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ3RCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDdkIsQ0FBQztvQkFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUM3QixvQkFBb0IsR0FBRyxJQUFJLENBQUE7b0JBQzVCLENBQUM7b0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsYUFBYSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7b0JBQzNELElBQUksQ0FBQyw4QkFBOEIsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFBO29CQUM3RCxJQUFJLENBQUM7d0JBQ0osSUFBSSxPQUFPLGFBQWEsQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7NEJBQ3RELElBQUksQ0FBQyxlQUFlO2lDQUNsQixjQUFjLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztpQ0FDdkMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO3dCQUNoRSxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsSUFBSSxDQUFDLGVBQWU7aUNBQ2xCLGNBQWMsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxXQUFXLENBQUM7aUNBQ2xFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTt3QkFDaEUsQ0FBQztvQkFDRixDQUFDOzRCQUFTLENBQUM7d0JBQ1YsSUFBSSxDQUFDLDhCQUE4QixHQUFHLElBQUksQ0FBQTtvQkFDM0MsQ0FBQztvQkFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO3dCQUN2RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUcvQix5QkFBeUIsRUFBRTs0QkFDNUIsRUFBRSxFQUFFLGFBQWEsQ0FBQyxTQUFTOzRCQUMzQixJQUFJLEVBQUUsWUFBWTs0QkFDbEIsTUFBTSxFQUFFLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLFNBQVM7eUJBQ3hELENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyxvQkFBb0IsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFJRCw4QkFBOEIsQ0FBQyxLQUFxQjtRQUNuRCxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLDREQUE0RDtZQUM1RCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCw0RUFBNEU7UUFDNUUsNENBQTRDO1FBQzVDLElBQ0MsQ0FBQyxLQUFLLENBQUMsT0FBTyx5QkFBZ0IsSUFBSSxLQUFLLENBQUMsT0FBTyx5QkFBZ0IsQ0FBQztZQUNoRSxDQUFDLEtBQUssQ0FBQyxPQUFPLDJCQUFrQixJQUFJLEtBQUssQ0FBQyxPQUFPLDJCQUFrQixDQUFDLEVBQ25FLENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRDtBQUVELE1BQU0scUJBQXFCO2FBQ1osVUFBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFPckQsWUFBWSxNQUE0QjtRQUN2QyxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQy9DLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDakQsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUM3QyxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ2hELENBQUM7SUFFRCxHQUFHLENBQUMsUUFBNkI7UUFDaEMsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBQ3JCLEtBQUssT0FBTztnQkFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7WUFDdEIsS0FBSyxLQUFLO2dCQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtZQUNwQixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDIn0=