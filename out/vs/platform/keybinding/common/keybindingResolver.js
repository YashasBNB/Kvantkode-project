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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy9jb21tb24va2V5YmluZGluZ1Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixPQUFPLEVBS1AsMkNBQTJDLEdBQzNDLE1BQU0sdUNBQXVDLENBQUE7QUFHOUMsMkJBQTJCO0FBRTNCLE1BQU0sQ0FBTixJQUFrQixVQVNqQjtBQVRELFdBQWtCLFVBQVU7SUFDM0Isa0RBQWtEO0lBQ2xELDJEQUFZLENBQUE7SUFFWixzRkFBc0Y7SUFDdEYsbUVBQWdCLENBQUE7SUFFaEIseURBQXlEO0lBQ3pELGlEQUFPLENBQUE7QUFDUixDQUFDLEVBVGlCLFVBQVUsS0FBVixVQUFVLFFBUzNCO0FBT0QsbUZBQW1GO0FBRW5GLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBcUIsRUFBRSxJQUFJLGlDQUF5QixFQUFFLENBQUE7QUFDL0UsTUFBTSxnQkFBZ0IsR0FBcUIsRUFBRSxJQUFJLHFDQUE2QixFQUFFLENBQUE7QUFDaEYsU0FBUyxPQUFPLENBQUMsU0FBd0IsRUFBRSxXQUFnQixFQUFFLFFBQWlCO0lBQzdFLE9BQU8sRUFBRSxJQUFJLDRCQUFvQixFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUE7QUFDdEUsQ0FBQztBQUVELFlBQVk7QUFFWjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBUTlCO0lBQ0Msa0RBQWtEO0lBQ2xELGtCQUE0QztJQUM1Qyx5QkFBeUI7SUFDekIsU0FBbUMsRUFDbkMsR0FBMEI7UUFFMUIsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUE7UUFDZixJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUE7UUFFN0MsSUFBSSxDQUFD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