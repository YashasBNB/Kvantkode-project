/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { implies, expressionsAreEqualWithConstantSubstitution, } from '../../contextkey/common/contextkey.js';
//#region resolution-result
export var ResultKind;
(function (ResultKind) {
    /** No keybinding found this sequence of chords */
    ResultKind[ResultKind["NoMatchingKb"] = 0] = "NoMatchingKb";
    /** There're several keybindings that have the given sequence of chords as a prefix */
    ResultKind[ResultKind["MoreChordsNeeded"] = 1] = "MoreChordsNeeded";
    /** A single keybinding found to be dispatched/invoked */
    ResultKind[ResultKind["KbFound"] = 2] = "KbFound";
})(ResultKind || (ResultKind = {}));
// util definitions to make working with the above types easier within this module:
export const NoMatchingKb = { kind: 0 /* ResultKind.NoMatchingKb */ };
const MoreChordsNeeded = { kind: 1 /* ResultKind.MoreChordsNeeded */ };
function KbFound(commandId, commandArgs, isBubble) {
    return { kind: 2 /* ResultKind.KbFound */, commandId, commandArgs, isBubble };
}
//#endregion
/**
 * Stores mappings from keybindings to commands and from commands to keybindings.
 * Given a sequence of chords, `resolve`s which keybinding it matches
 */
export class KeybindingResolver {
    constructor(
    /** built-in and extension-provided keybindings */
    defaultKeybindings, 
    /** user's keybindings */
    overrides, log) {
        this._log = log;
        this._defaultKeybindings = defaultKeybindings;
        this._defaultBoundCommands = new Map();
        for (const defaultKeybinding of defaultKeybindings) {
            const command = defaultKeybinding.command;
            if (command && command.charAt(0) !== '-') {
                this._defaultBoundCommands.set(command, true);
            }
        }
        this._map = new Map();
        this._lookupMap = new Map();
        this._keybindings = KeybindingResolver.handleRemovals([].concat(defaultKeybindings).concat(overrides));
        for (let i = 0, len = this._keybindings.length; i < len; i++) {
            const k = this._keybindings[i];
            if (k.chords.length === 0) {
                // unbound
                continue;
            }
            // substitute with constants that are registered after startup - https://github.com/microsoft/vscode/issues/174218#issuecomment-1437972127
            const when = k.when?.substituteConstants();
            if (when && when.type === 0 /* ContextKeyExprType.False */) {
                // when condition is false
                continue;
            }
            this._addKeyPress(k.chords[0], k);
        }
    }
    static _isTargetedForRemoval(defaultKb, keypress, when) {
        if (keypress) {
            for (let i = 0; i < keypress.length; i++) {
                if (keypress[i] !== defaultKb.chords[i]) {
                    return false;
                }
            }
        }
        // `true` means always, as does `undefined`
        // so we will treat `true` === `undefined`
        if (when && when.type !== 1 /* ContextKeyExprType.True */) {
            if (!defaultKb.when) {
                return false;
            }
            if (!expressionsAreEqualWithConstantSubstitution(when, defaultKb.when)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Looks for rules containing "-commandId" and removes them.
     */
    static handleRemovals(rules) {
        // Do a first pass and construct a hash-map for removals
        const removals = new Map();
        for (let i = 0, len = rules.length; i < len; i++) {
            const rule = rules[i];
            if (rule.command && rule.command.charAt(0) === '-') {
                const command = rule.command.substring(1);
                if (!removals.has(command)) {
                    removals.set(command, [rule]);
                }
                else {
                    removals.get(command).push(rule);
                }
            }
        }
        if (removals.size === 0) {
            // There are no removals
            return rules;
        }
        // Do a second pass and keep only non-removed keybindings
        const result = [];
        for (let i = 0, len = rules.length; i < len; i++) {
            const rule = rules[i];
            if (!rule.command || rule.command.length === 0) {
                result.push(rule);
                continue;
            }
            if (rule.command.charAt(0) === '-') {
                continue;
            }
            const commandRemovals = removals.get(rule.command);
            if (!commandRemovals || !rule.isDefault) {
                result.push(rule);
                continue;
            }
            let isRemoved = false;
            for (const commandRemoval of commandRemovals) {
                const when = commandRemoval.when;
                if (this._isTargetedForRemoval(rule, commandRemoval.chords, when)) {
                    isRemoved = true;
                    break;
                }
            }
            if (!isRemoved) {
                result.push(rule);
                continue;
            }
        }
        return result;
    }
    _addKeyPress(keypress, item) {
        const conflicts = this._map.get(keypress);
        if (typeof conflicts === 'undefined') {
            // There is no conflict so far
            this._map.set(keypress, [item]);
            this._addToLookupMap(item);
            return;
        }
        for (let i = conflicts.length - 1; i >= 0; i--) {
            const conflict = conflicts[i];
            if (conflict.command === item.command) {
                continue;
            }
            // Test if the shorter keybinding is a prefix of the longer one.
            // If the shorter keybinding is a prefix, it effectively will shadow the longer one and is considered a conflict.
            let isShorterKbPrefix = true;
            for (let i = 1; i < conflict.chords.length && i < item.chords.length; i++) {
                if (conflict.chords[i] !== item.chords[i]) {
                    // The ith step does not conflict
                    isShorterKbPrefix = false;
                    break;
                }
            }
            if (!isShorterKbPrefix) {
                continue;
            }
            if (KeybindingResolver.whenIsEntirelyIncluded(conflict.when, item.when)) {
                // `item` completely overwrites `conflict`
                // Remove conflict from the lookupMap
                this._removeFromLookupMap(conflict);
            }
        }
        conflicts.push(item);
        this._addToLookupMap(item);
    }
    _addToLookupMap(item) {
        if (!item.command) {
            return;
        }
        let arr = this._lookupMap.get(item.command);
        if (typeof arr === 'undefined') {
            arr = [item];
            this._lookupMap.set(item.command, arr);
        }
        else {
            arr.push(item);
        }
    }
    _removeFromLookupMap(item) {
        if (!item.command) {
            return;
        }
        const arr = this._lookupMap.get(item.command);
        if (typeof arr === 'undefined') {
            return;
        }
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) {
                arr.splice(i, 1);
                return;
            }
        }
    }
    /**
     * Returns true if it is provable `a` implies `b`.
     */
    static whenIsEntirelyIncluded(a, b) {
        if (!b || b.type === 1 /* ContextKeyExprType.True */) {
            return true;
        }
        if (!a || a.type === 1 /* ContextKeyExprType.True */) {
            return false;
        }
        return implies(a, b);
    }
    getDefaultBoundCommands() {
        return this._defaultBoundCommands;
    }
    getDefaultKeybindings() {
        return this._defaultKeybindings;
    }
    getKeybindings() {
        return this._keybindings;
    }
    lookupKeybindings(commandId) {
        const items = this._lookupMap.get(commandId);
        if (typeof items === 'undefined' || items.length === 0) {
            return [];
        }
        // Reverse to get the most specific item first
        const result = [];
        let resultLen = 0;
        for (let i = items.length - 1; i >= 0; i--) {
            result[resultLen++] = items[i];
        }
        return result;
    }
    lookupPrimaryKeybinding(commandId, context, enforceContextCheck = false) {
        const items = this._lookupMap.get(commandId);
        if (typeof items === 'undefined' || items.length === 0) {
            return null;
        }
        if (items.length === 1 && !enforceContextCheck) {
            return items[0];
        }
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (context.contextMatchesRules(item.when)) {
                return item;
            }
        }
        if (enforceContextCheck) {
            return null;
        }
        return items[items.length - 1];
    }
    /**
     * Looks up a keybinding trigged as a result of pressing a sequence of chords - `[...currentChords, keypress]`
     *
     * Example: resolving 3 chords pressed sequentially - `cmd+k cmd+p cmd+i`:
     * 	`currentChords = [ 'cmd+k' , 'cmd+p' ]` and `keypress = `cmd+i` - last pressed chord
     */
    resolve(context, currentChords, keypress) {
        const pressedChords = [...currentChords, keypress];
        this._log(`| Resolving ${pressedChords}`);
        const kbCandidates = this._map.get(pressedChords[0]);
        if (kbCandidates === undefined) {
            // No bindings with such 0-th chord
            this._log(`\\ No keybinding entries.`);
            return NoMatchingKb;
        }
        let lookupMap = null;
        if (pressedChords.length < 2) {
            lookupMap = kbCandidates;
        }
        else {
            // Fetch all chord bindings for `currentChords`
            lookupMap = [];
            for (let i = 0, len = kbCandidates.length; i < len; i++) {
                const candidate = kbCandidates[i];
                if (pressedChords.length > candidate.chords.length) {
                    // # of pressed chords can't be less than # of chords in a keybinding to invoke
                    continue;
                }
                let prefixMatches = true;
                for (let i = 1; i < pressedChords.length; i++) {
                    if (candidate.chords[i] !== pressedChords[i]) {
                        prefixMatches = false;
                        break;
                    }
                }
                if (prefixMatches) {
                    lookupMap.push(candidate);
                }
            }
        }
        // check there's a keybinding with a matching when clause
        const result = this._findCommand(context, lookupMap);
        if (!result) {
            this._log(`\\ From ${lookupMap.length} keybinding entries, no when clauses matched the context.`);
            return NoMatchingKb;
        }
        // check we got all chords necessary to be sure a particular keybinding needs to be invoked
        if (pressedChords.length < result.chords.length) {
            // The chord sequence is not complete
            this._log(`\\ From ${lookupMap.length} keybinding entries, awaiting ${result.chords.length - pressedChords.length} more chord(s), when: ${printWhenExplanation(result.when)}, source: ${printSourceExplanation(result)}.`);
            return MoreChordsNeeded;
        }
        this._log(`\\ From ${lookupMap.length} keybinding entries, matched ${result.command}, when: ${printWhenExplanation(result.when)}, source: ${printSourceExplanation(result)}.`);
        return KbFound(result.command, result.commandArgs, result.bubble);
    }
    _findCommand(context, matches) {
        for (let i = matches.length - 1; i >= 0; i--) {
            const k = matches[i];
            if (!KeybindingResolver._contextMatchesRules(context, k.when)) {
                continue;
            }
            return k;
        }
        return null;
    }
    static _contextMatchesRules(context, rules) {
        if (!rules) {
            return true;
        }
        return rules.evaluate(context);
    }
}
function printWhenExplanation(when) {
    if (!when) {
        return `no when condition`;
    }
    return `${when.serialize()}`;
}
function printSourceExplanation(kb) {
    return kb.extensionId
        ? kb.isBuiltinExtension
            ? `built-in extension ${kb.extensionId}`
            : `user extension ${kb.extensionId}`
        : kb.isDefault
            ? `built-in`
            : `user`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL2NvbW1vbi9rZXliaW5kaW5nUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLE9BQU8sRUFLUCwyQ0FBMkMsR0FDM0MsTUFBTSx1Q0FBdUMsQ0FBQTtBQUc5QywyQkFBMkI7QUFFM0IsTUFBTSxDQUFOLElBQWtCLFVBU2pCO0FBVEQsV0FBa0IsVUFBVTtJQUMzQixrREFBa0Q7SUFDbEQsMkRBQVksQ0FBQTtJQUVaLHNGQUFzRjtJQUN0RixtRUFBZ0IsQ0FBQTtJQUVoQix5REFBeUQ7SUFDekQsaURBQU8sQ0FBQTtBQUNSLENBQUMsRUFUaUIsVUFBVSxLQUFWLFVBQVUsUUFTM0I7QUFPRCxtRkFBbUY7QUFFbkYsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFxQixFQUFFLElBQUksaUNBQXlCLEVBQUUsQ0FBQTtBQUMvRSxNQUFNLGdCQUFnQixHQUFxQixFQUFFLElBQUkscUNBQTZCLEVBQUUsQ0FBQTtBQUNoRixTQUFTLE9BQU8sQ0FBQyxTQUF3QixFQUFFLFdBQWdCLEVBQUUsUUFBaUI7SUFDN0UsT0FBTyxFQUFFLElBQUksNEJBQW9CLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQTtBQUN0RSxDQUFDO0FBRUQsWUFBWTtBQUVaOzs7R0FHRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFROUI7SUFDQyxrREFBa0Q7SUFDbEQsa0JBQTRDO0lBQzVDLHlCQUF5QjtJQUN6QixTQUFtQyxFQUNuQyxHQUEwQjtRQUUxQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQTtRQUNmLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQTtRQUU3QyxJQUFJ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