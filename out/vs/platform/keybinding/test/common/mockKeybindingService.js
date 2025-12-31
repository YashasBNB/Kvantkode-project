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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0tleWJpbmRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy90ZXN0L2NvbW1vbi9tb2NrS2V5YmluZGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFFTixZQUFZLEdBRVosTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFXeEQsT0FBTyxFQUFFLFlBQVksRUFBb0IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVuRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV2RixNQUFNLHdCQUF3QjtJQU03QixZQUFZLFlBQTJCO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQW9CO1FBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO0lBQ3BCLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQ2pDLENBQUM7SUFFTSxHQUFHO1FBQ1QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxxQkFBcUI7SUFBbEM7UUFFUyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUE7SUF3Q3BELENBQUM7SUF0Q08sT0FBTztRQUNiLEVBQUU7SUFDSCxDQUFDO0lBQ00sU0FBUyxDQUNmLEdBQVcsRUFDWCxZQUEyQjtRQUUzQixN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