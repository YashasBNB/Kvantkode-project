/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { KeyCodeChord, } from '../../../../base/common/keybindings.js';
import { OS } from '../../../../base/common/platform.js';
import { NoMatchingKb } from '../../common/keybindingResolver.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
class MockKeybindingContextKey {
    constructor(defaultValue) {
        this._defaultValue = defaultValue;
        this._value = this._defaultValue;
    }
    set(value) {
        this._value = value;
    }
    reset() {
        this._value = this._defaultValue;
    }
    get() {
        return this._value;
    }
}
export class MockContextKeyService {
    constructor() {
        this._keys = new Map();
    }
    dispose() {
        //
    }
    createKey(key, defaultValue) {
        const ret = new MockKeybindingContextKey(defaultValue);
        this._keys.set(key, ret);
        return ret;
    }
    contextMatchesRules(rules) {
        return false;
    }
    get onDidChangeContext() {
        return Event.None;
    }
    bufferChangeEvents(callback) {
        callback();
    }
    getContextKeyValue(key) {
        const value = this._keys.get(key);
        if (value) {
            return value.get();
        }
    }
    getContext(domNode) {
        return null;
    }
    createScoped(domNode) {
        return this;
    }
    createOverlay() {
        return this;
    }
    updateParent(_parentContextKeyService) {
        // no-op
    }
}
export class MockScopableContextKeyService extends MockContextKeyService {
    /**
     * Don't implement this for all tests since we rarely depend on this behavior and it isn't implemented fully
     */
    createScoped(domNote) {
        return new MockScopableContextKeyService();
    }
}
export class MockKeybindingService {
    constructor() {
        this.inChordMode = false;
    }
    get onDidUpdateKeybindings() {
        return Event.None;
    }
    getDefaultKeybindingsContent() {
        return '';
    }
    getDefaultKeybindings() {
        return [];
    }
    getKeybindings() {
        return [];
    }
    resolveKeybinding(keybinding) {
        return USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return this.resolveKeybinding(chord.toKeybinding())[0];
    }
    resolveUserBinding(userBinding) {
        return [];
    }
    lookupKeybindings(commandId) {
        return [];
    }
    lookupKeybinding(commandId) {
        return undefined;
    }
    customKeybindingsCount() {
        return 0;
    }
    softDispatch(keybinding, target) {
        return NoMatchingKb;
    }
    dispatchByUserSettingsLabel(userSettingsLabel, target) { }
    dispatchEvent(e, target) {
        return false;
    }
    enableKeybindingHoldMode(commandId) {
        return undefined;
    }
    mightProducePrintableCharacter(e) {
        return false;
    }
    toggleLogging() {
        return false;
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0tleWJpbmRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL3Rlc3QvY29tbW9uL21vY2tLZXliaW5kaW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUVOLFlBQVksR0FFWixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVd4RCxPQUFPLEVBQUUsWUFBWSxFQUFvQixNQUFNLG9DQUFvQyxDQUFBO0FBRW5GLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZGLE1BQU0sd0JBQXdCO0lBTTdCLFlBQVksWUFBMkI7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7UUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQ2pDLENBQUM7SUFFTSxHQUFHLENBQUMsS0FBb0I7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7SUFDcEIsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDakMsQ0FBQztJQUVNLEdBQUc7UUFDVCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHFCQUFxQjtJQUFsQztRQUVTLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQTtJQXdDcEQsQ0FBQztJQXRDTyxPQUFPO1FBQ2IsRUFBRTtJQUNILENBQUM7SUFDTSxTQUFTLENBQ2YsR0FBVyxFQUNYLFlBQTJCO1FB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