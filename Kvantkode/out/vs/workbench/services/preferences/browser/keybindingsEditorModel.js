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
var KeybindingsEditorModel_1;
import { localize } from '../../../../nls.js';
import { distinct, coalesce } from '../../../../base/common/arrays.js';
import * as strings from '../../../../base/common/strings.js';
import { Language } from '../../../../base/common/platform.js';
import { or, matchesContiguousSubString, matchesPrefix, matchesCamelCase, matchesWords, } from '../../../../base/common/filters.js';
import { AriaLabelProvider, UserSettingsLabelProvider, UILabelProvider, } from '../../../../base/common/keybindingLabels.js';
import { MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ResolvedKeybindingItem } from '../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { getAllUnboundCommands } from '../../keybinding/browser/unboundCommands.js';
import { isEmptyObject, isString } from '../../../../base/common/types.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export const KEYBINDING_ENTRY_TEMPLATE_ID = 'keybinding.entry.template';
const SOURCE_SYSTEM = localize('default', 'System');
const SOURCE_EXTENSION = localize('extension', 'Extension');
const SOURCE_USER = localize('user', 'User');
export function createKeybindingCommandQuery(commandId, when) {
    const whenPart = when ? ` +when:${when}` : '';
    return `@command:${commandId}${whenPart}`;
}
const wordFilter = or(matchesPrefix, matchesWords, matchesContiguousSubString);
const COMMAND_REGEX = /@command:\s*([^\+]+)/i;
const WHEN_REGEX = /\+when:\s*(.+)/i;
const SOURCE_REGEX = /@source:\s*(user|default|system|extension)/i;
const EXTENSION_REGEX = /@ext:\s*((".+")|([^\s]+))/i;
const KEYBINDING_REGEX = /@keybinding:\s*((\".+\")|(\S+))/i;
let KeybindingsEditorModel = KeybindingsEditorModel_1 = class KeybindingsEditorModel extends EditorModel {
    constructor(os, keybindingsService, extensionService) {
        super();
        this.keybindingsService = keybindingsService;
        this.extensionService = extensionService;
        this._keybindingItems = [];
        this._keybindingItemsSortedByPrecedence = [];
        this.modifierLabels = {
            ui: UILabelProvider.modifierLabels[os],
            aria: AriaLabelProvider.modifierLabels[os],
            user: UserSettingsLabelProvider.modifierLabels[os],
        };
    }
    fetch(searchValue, sortByPrecedence = false) {
        let keybindingItems = sortByPrecedence
            ? this._keybindingItemsSortedByPrecedence
            : this._keybindingItems;
        // @command:COMMAND_ID
        const commandIdMatches = COMMAND_REGEX.exec(searchValue);
        if (commandIdMatches && commandIdMatches[1]) {
            const command = commandIdMatches[1].trim();
            let filteredKeybindingItems = keybindingItems.filter((k) => k.command === command);
            // +when:WHEN_EXPRESSION
            if (filteredKeybindingItems.length) {
                const whenMatches = WHEN_REGEX.exec(searchValue);
                if (whenMatches && whenMatches[1]) {
                    const whenValue = whenMatches[1].trim();
                    filteredKeybindingItems = this.filterByWhen(filteredKeybindingItems, command, whenValue);
                }
            }
            return filteredKeybindingItems.map((keybindingItem) => ({
                id: KeybindingsEditorModel_1.getId(keybindingItem),
                keybindingItem,
                templateId: KEYBINDING_ENTRY_TEMPLATE_ID,
            }));
        }
        // @source:SOURCE
        if (SOURCE_REGEX.test(searchValue)) {
            keybindingItems = this.filterBySource(keybindingItems, searchValue);
            searchValue = searchValue.replace(SOURCE_REGEX, '');
        }
        else {
            // @ext:EXTENSION_ID
            const extensionMatches = EXTENSION_REGEX.exec(searchValue);
            if (extensionMatches && (extensionMatches[2] || extensionMatches[3])) {
                const extensionId = extensionMatches[2]
                    ? extensionMatches[2].substring(1, extensionMatches[2].length - 1)
                    : extensionMatches[3];
                keybindingItems = this.filterByExtension(keybindingItems, extensionId);
                searchValue = searchValue.replace(EXTENSION_REGEX, '');
            }
            else {
                // @keybinding:KEYBINDING
                const keybindingMatches = KEYBINDING_REGEX.exec(searchValue);
                if (keybindingMatches && (keybindingMatches[2] || keybindingMatches[3])) {
                    searchValue = keybindingMatches[2] || `"${keybindingMatches[3]}"`;
                }
            }
        }
        searchValue = searchValue.trim();
        if (!searchValue) {
            return keybindingItems.map((keybindingItem) => ({
                id: KeybindingsEditorModel_1.getId(keybindingItem),
                keybindingItem,
                templateId: KEYBINDING_ENTRY_TEMPLATE_ID,
            }));
        }
        return this.filterByText(keybindingItems, searchValue);
    }
    filterBySource(keybindingItems, searchValue) {
        if (/@source:\s*default/i.test(searchValue) || /@source:\s*system/i.test(searchValue)) {
            return keybindingItems.filter((k) => k.source === SOURCE_SYSTEM);
        }
        if (/@source:\s*user/i.test(searchValue)) {
            return keybindingItems.filter((k) => k.source === SOURCE_USER);
        }
        if (/@source:\s*extension/i.test(searchValue)) {
            return keybindingItems.filter((k) => !isString(k.source) || k.source === SOURCE_EXTENSION);
        }
        return keybindingItems;
    }
    filterByExtension(keybindingItems, extension) {
        extension = extension.toLowerCase().trim();
        return keybindingItems.filter((k) => !isString(k.source) &&
            (ExtensionIdentifier.equals(k.source.identifier, extension) ||
                k.source.displayName?.toLowerCase() === extension.toLowerCase()));
    }
    filterByText(keybindingItems, searchValue) {
        const quoteAtFirstChar = searchValue.charAt(0) === '"';
        const quoteAtLastChar = searchValue.charAt(searchValue.length - 1) === '"';
        const completeMatch = quoteAtFirstChar && quoteAtLastChar;
        if (quoteAtFirstChar) {
            searchValue = searchValue.substring(1);
        }
        if (quoteAtLastChar) {
            searchValue = searchValue.substring(0, searchValue.length - 1);
        }
        searchValue = searchValue.trim();
        const result = [];
        const words = searchValue.split(' ');
        const keybindingWords = this.splitKeybindingWords(words);
        for (const keybindingItem of keybindingItems) {
            const keybindingMatches = new KeybindingItemMatches(this.modifierLabels, keybindingItem, searchValue, words, keybindingWords, completeMatch);
            if (keybindingMatches.commandIdMatches ||
                keybindingMatches.commandLabelMatches ||
                keybindingMatches.commandDefaultLabelMatches ||
                keybindingMatches.sourceMatches ||
                keybindingMatches.whenMatches ||
                keybindingMatches.keybindingMatches ||
                keybindingMatches.extensionIdMatches ||
                keybindingMatches.extensionLabelMatches) {
                result.push({
                    id: KeybindingsEditorModel_1.getId(keybindingItem),
                    templateId: KEYBINDING_ENTRY_TEMPLATE_ID,
                    commandLabelMatches: keybindingMatches.commandLabelMatches || undefined,
                    commandDefaultLabelMatches: keybindingMatches.commandDefaultLabelMatches || undefined,
                    keybindingItem,
                    keybindingMatches: keybindingMatches.keybindingMatches || undefined,
                    commandIdMatches: keybindingMatches.commandIdMatches || undefined,
                    sourceMatches: keybindingMatches.sourceMatches || undefined,
                    whenMatches: keybindingMatches.whenMatches || undefined,
                    extensionIdMatches: keybindingMatches.extensionIdMatches || undefined,
                    extensionLabelMatches: keybindingMatches.extensionLabelMatches || undefined,
                });
            }
        }
        return result;
    }
    filterByWhen(keybindingItems, command, when) {
        if (keybindingItems.length === 0) {
            return [];
        }
        // Check if a keybinding with the same command id and when clause exists
        const keybindingItemsWithWhen = keybindingItems.filter((k) => k.when === when);
        if (keybindingItemsWithWhen.length) {
            return keybindingItemsWithWhen;
        }
        // Create a new entry with the when clause which does not live in the model
        // We can reuse some of the properties from the same command with different when clause
        const commandLabel = keybindingItems[0].commandLabel;
        const keybindingItem = new ResolvedKeybindingItem(undefined, command, null, ContextKeyExpr.deserialize(when), false, null, false);
        const actionLabels = new Map([[command, commandLabel]]);
        return [
            KeybindingsEditorModel_1.toKeybindingEntry(command, keybindingItem, actionLabels, this.getExtensionsMapping()),
        ];
    }
    splitKeybindingWords(wordsSeparatedBySpaces) {
        const result = [];
        for (const word of wordsSeparatedBySpaces) {
            result.push(...coalesce(word.split('+')));
        }
        return result;
    }
    async resolve(actionLabels = new Map()) {
        const extensions = this.getExtensionsMapping();
        this._keybindingItemsSortedByPrecedence = [];
        const boundCommands = new Map();
        for (const keybinding of this.keybindingsService.getKeybindings()) {
            if (keybinding.command) {
                // Skip keybindings without commands
                this._keybindingItemsSortedByPrecedence.push(KeybindingsEditorModel_1.toKeybindingEntry(keybinding.command, keybinding, actionLabels, extensions));
                boundCommands.set(keybinding.command, true);
            }
        }
        const commandsWithDefaultKeybindings = this.keybindingsService
            .getDefaultKeybindings()
            .map((keybinding) => keybinding.command);
        for (const command of getAllUnboundCommands(boundCommands)) {
            const keybindingItem = new ResolvedKeybindingItem(undefined, command, null, undefined, commandsWithDefaultKeybindings.indexOf(command) === -1, null, false);
            this._keybindingItemsSortedByPrecedence.push(KeybindingsEditorModel_1.toKeybindingEntry(command, keybindingItem, actionLabels, extensions));
        }
        this._keybindingItemsSortedByPrecedence = distinct(this._keybindingItemsSortedByPrecedence, (keybindingItem) => KeybindingsEditorModel_1.getId(keybindingItem));
        this._keybindingItems = this._keybindingItemsSortedByPrecedence
            .slice(0)
            .sort((a, b) => KeybindingsEditorModel_1.compareKeybindingData(a, b));
        return super.resolve();
    }
    static getId(keybindingItem) {
        return (keybindingItem.command +
            (keybindingItem?.keybinding?.getAriaLabel() ?? '') +
            keybindingItem.when +
            (isString(keybindingItem.source)
                ? keybindingItem.source
                : keybindingItem.source.identifier.value));
    }
    getExtensionsMapping() {
        const extensions = new ExtensionIdentifierMap();
        for (const extension of this.extensionService.extensions) {
            extensions.set(extension.identifier, extension);
        }
        return extensions;
    }
    static compareKeybindingData(a, b) {
        if (a.keybinding && !b.keybinding) {
            return -1;
        }
        if (b.keybinding && !a.keybinding) {
            return 1;
        }
        if (a.commandLabel && !b.commandLabel) {
            return -1;
        }
        if (b.commandLabel && !a.commandLabel) {
            return 1;
        }
        if (a.commandLabel && b.commandLabel) {
            if (a.commandLabel !== b.commandLabel) {
                return a.commandLabel.localeCompare(b.commandLabel);
            }
        }
        if (a.command === b.command) {
            return a.keybindingItem.isDefault ? 1 : -1;
        }
        return a.command.localeCompare(b.command);
    }
    static toKeybindingEntry(command, keybindingItem, actions, extensions) {
        const menuCommand = MenuRegistry.getCommand(command);
        const editorActionLabel = actions.get(command);
        let source = SOURCE_USER;
        if (keybindingItem.isDefault) {
            const extensionId = keybindingItem.extensionId ??
                (keybindingItem.resolvedKeybinding ? undefined : menuCommand?.source?.id);
            source = extensionId ? (extensions.get(extensionId) ?? SOURCE_EXTENSION) : SOURCE_SYSTEM;
        }
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            keybinding: keybindingItem.resolvedKeybinding,
            keybindingItem,
            command,
            commandLabel: KeybindingsEditorModel_1.getCommandLabel(menuCommand, editorActionLabel),
            commandDefaultLabel: KeybindingsEditorModel_1.getCommandDefaultLabel(menuCommand),
            when: keybindingItem.when ? keybindingItem.when.serialize() : '',
            source,
        };
    }
    static getCommandDefaultLabel(menuCommand) {
        if (!Language.isDefaultVariant()) {
            if (menuCommand && menuCommand.title && menuCommand.title.original) {
                const category = menuCommand.category
                    ? menuCommand.category.original
                    : undefined;
                const title = menuCommand.title.original;
                return category ? localize('cat.title', '{0}: {1}', category, title) : title;
            }
        }
        return null;
    }
    static getCommandLabel(menuCommand, editorActionLabel) {
        if (menuCommand) {
            const category = menuCommand.category
                ? typeof menuCommand.category === 'string'
                    ? menuCommand.category
                    : menuCommand.category.value
                : undefined;
            const title = typeof menuCommand.title === 'string' ? menuCommand.title : menuCommand.title.value;
            return category ? localize('cat.title', '{0}: {1}', category, title) : title;
        }
        if (editorActionLabel) {
            return editorActionLabel;
        }
        return '';
    }
};
KeybindingsEditorModel = KeybindingsEditorModel_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IExtensionService)
], KeybindingsEditorModel);
export { KeybindingsEditorModel };
class KeybindingItemMatches {
    constructor(modifierLabels, keybindingItem, searchValue, words, keybindingWords, completeMatch) {
        this.modifierLabels = modifierLabels;
        this.commandIdMatches = null;
        this.commandLabelMatches = null;
        this.commandDefaultLabelMatches = null;
        this.sourceMatches = null;
        this.whenMatches = null;
        this.keybindingMatches = null;
        this.extensionIdMatches = null;
        this.extensionLabelMatches = null;
        if (!completeMatch) {
            this.commandIdMatches = this.matches(searchValue, keybindingItem.command, or(matchesWords, matchesCamelCase), words);
            this.commandLabelMatches = keybindingItem.commandLabel
                ? this.matches(searchValue, keybindingItem.commandLabel, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.commandLabel, true), words)
                : null;
            this.commandDefaultLabelMatches = keybindingItem.commandDefaultLabel
                ? this.matches(searchValue, keybindingItem.commandDefaultLabel, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.commandDefaultLabel, true), words)
                : null;
            this.whenMatches = keybindingItem.when
                ? this.matches(null, keybindingItem.when, or(matchesWords, matchesCamelCase), words)
                : null;
            if (isString(keybindingItem.source)) {
                this.sourceMatches = this.matches(searchValue, keybindingItem.source, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.source, true), words);
            }
            else {
                this.extensionLabelMatches = keybindingItem.source.displayName
                    ? this.matches(searchValue, keybindingItem.source.displayName, (word, wordToMatchAgainst) => matchesWords(word, keybindingItem.commandLabel, true), words)
                    : null;
            }
        }
        this.keybindingMatches = keybindingItem.keybinding
            ? this.matchesKeybinding(keybindingItem.keybinding, searchValue, keybindingWords, completeMatch)
            : null;
    }
    matches(searchValue, wordToMatchAgainst, wordMatchesFilter, words) {
        let matches = searchValue ? wordFilter(searchValue, wordToMatchAgainst) : null;
        if (!matches) {
            matches = this.matchesWords(words, wordToMatchAgainst, wordMatchesFilter);
        }
        if (matches) {
            matches = this.filterAndSort(matches);
        }
        return matches;
    }
    matchesWords(words, wordToMatchAgainst, wordMatchesFilter) {
        let matches = [];
        for (const word of words) {
            const wordMatches = wordMatchesFilter(word, wordToMatchAgainst);
            if (wordMatches) {
                matches = [...(matches || []), ...wordMatches];
            }
            else {
                matches = null;
                break;
            }
        }
        return matches;
    }
    filterAndSort(matches) {
        return distinct(matches, (a) => a.start + '.' + a.end)
            .filter((match) => !matches.some((m) => !(m.start === match.start && m.end === match.end) &&
            m.start <= match.start &&
            m.end >= match.end))
            .sort((a, b) => a.start - b.start);
    }
    matchesKeybinding(keybinding, searchValue, words, completeMatch) {
        const [firstPart, chordPart] = keybinding.getChords();
        const userSettingsLabel = keybinding.getUserSettingsLabel();
        const ariaLabel = keybinding.getAriaLabel();
        const label = keybinding.getLabel();
        if ((userSettingsLabel && strings.compareIgnoreCase(searchValue, userSettingsLabel) === 0) ||
            (ariaLabel && strings.compareIgnoreCase(searchValue, ariaLabel) === 0) ||
            (label && strings.compareIgnoreCase(searchValue, label) === 0)) {
            return {
                firstPart: this.createCompleteMatch(firstPart),
                chordPart: this.createCompleteMatch(chordPart),
            };
        }
        const firstPartMatch = {};
        let chordPartMatch = {};
        const matchedWords = [];
        const firstPartMatchedWords = [];
        let chordPartMatchedWords = [];
        let matchFirstPart = true;
        for (let index = 0; index < words.length; index++) {
            const word = words[index];
            let firstPartMatched = false;
            let chordPartMatched = false;
            matchFirstPart = matchFirstPart && !firstPartMatch.keyCode;
            let matchChordPart = !chordPartMatch.keyCode;
            if (matchFirstPart) {
                firstPartMatched = this.matchPart(firstPart, firstPartMatch, word, completeMatch);
                if (firstPartMatch.keyCode) {
                    for (const cordPartMatchedWordIndex of chordPartMatchedWords) {
                        if (firstPartMatchedWords.indexOf(cordPartMatchedWordIndex) === -1) {
                            matchedWords.splice(matchedWords.indexOf(cordPartMatchedWordIndex), 1);
                        }
                    }
                    chordPartMatch = {};
                    chordPartMatchedWords = [];
                    matchChordPart = false;
                }
            }
            if (matchChordPart) {
                chordPartMatched = this.matchPart(chordPart, chordPartMatch, word, completeMatch);
            }
            if (firstPartMatched) {
                firstPartMatchedWords.push(index);
            }
            if (chordPartMatched) {
                chordPartMatchedWords.push(index);
            }
            if (firstPartMatched || chordPartMatched) {
                matchedWords.push(index);
            }
            matchFirstPart = matchFirstPart && this.isModifier(word);
        }
        if (matchedWords.length !== words.length) {
            return null;
        }
        if (completeMatch) {
            if (!this.isCompleteMatch(firstPart, firstPartMatch)) {
                return null;
            }
            if (!isEmptyObject(chordPartMatch) && !this.isCompleteMatch(chordPart, chordPartMatch)) {
                return null;
            }
        }
        return this.hasAnyMatch(firstPartMatch) || this.hasAnyMatch(chordPartMatch)
            ? { firstPart: firstPartMatch, chordPart: chordPartMatch }
            : null;
    }
    matchPart(chord, match, word, completeMatch) {
        let matched = false;
        if (this.matchesMetaModifier(chord, word)) {
            matched = true;
            match.metaKey = true;
        }
        if (this.matchesCtrlModifier(chord, word)) {
            matched = true;
            match.ctrlKey = true;
        }
        if (this.matchesShiftModifier(chord, word)) {
            matched = true;
            match.shiftKey = true;
        }
        if (this.matchesAltModifier(chord, word)) {
            matched = true;
            match.altKey = true;
        }
        if (this.matchesKeyCode(chord, word, completeMatch)) {
            match.keyCode = true;
            matched = true;
        }
        return matched;
    }
    matchesKeyCode(chord, word, completeMatch) {
        if (!chord) {
            return false;
        }
        const ariaLabel = chord.keyAriaLabel || '';
        if (completeMatch || ariaLabel.length === 1 || word.length === 1) {
            if (strings.compareIgnoreCase(ariaLabel, word) === 0) {
                return true;
            }
        }
        else {
            if (matchesContiguousSubString(word, ariaLabel)) {
                return true;
            }
        }
        return false;
    }
    matchesMetaModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.metaKey) {
            return false;
        }
        return this.wordMatchesMetaModifier(word);
    }
    matchesCtrlModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.ctrlKey) {
            return false;
        }
        return this.wordMatchesCtrlModifier(word);
    }
    matchesShiftModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.shiftKey) {
            return false;
        }
        return this.wordMatchesShiftModifier(word);
    }
    matchesAltModifier(chord, word) {
        if (!chord) {
            return false;
        }
        if (!chord.altKey) {
            return false;
        }
        return this.wordMatchesAltModifier(word);
    }
    hasAnyMatch(keybindingMatch) {
        return (!!keybindingMatch.altKey ||
            !!keybindingMatch.ctrlKey ||
            !!keybindingMatch.metaKey ||
            !!keybindingMatch.shiftKey ||
            !!keybindingMatch.keyCode);
    }
    isCompleteMatch(chord, match) {
        if (!chord) {
            return true;
        }
        if (!match.keyCode) {
            return false;
        }
        if (chord.metaKey && !match.metaKey) {
            return false;
        }
        if (chord.altKey && !match.altKey) {
            return false;
        }
        if (chord.ctrlKey && !match.ctrlKey) {
            return false;
        }
        if (chord.shiftKey && !match.shiftKey) {
            return false;
        }
        return true;
    }
    createCompleteMatch(chord) {
        const match = {};
        if (chord) {
            match.keyCode = true;
            if (chord.metaKey) {
                match.metaKey = true;
            }
            if (chord.altKey) {
                match.altKey = true;
            }
            if (chord.ctrlKey) {
                match.ctrlKey = true;
            }
            if (chord.shiftKey) {
                match.shiftKey = true;
            }
        }
        return match;
    }
    isModifier(word) {
        if (this.wordMatchesAltModifier(word)) {
            return true;
        }
        if (this.wordMatchesCtrlModifier(word)) {
            return true;
        }
        if (this.wordMatchesMetaModifier(word)) {
            return true;
        }
        if (this.wordMatchesShiftModifier(word)) {
            return true;
        }
        return false;
    }
    wordMatchesAltModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.altKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.altKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.altKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(localize('option', 'option'), word)) {
            return true;
        }
        return false;
    }
    wordMatchesCtrlModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.ctrlKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.ctrlKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.ctrlKey, word)) {
            return true;
        }
        return false;
    }
    wordMatchesMetaModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.metaKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.metaKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.metaKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(localize('meta', 'meta'), word)) {
            return true;
        }
        return false;
    }
    wordMatchesShiftModifier(word) {
        if (strings.equalsIgnoreCase(this.modifierLabels.ui.shiftKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.aria.shiftKey, word)) {
            return true;
        }
        if (strings.equalsIgnoreCase(this.modifierLabels.user.shiftKey, word)) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2Jyb3dzZXIva2V5YmluZGluZ3NFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQW1CLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9FLE9BQU8sRUFHTixFQUFFLEVBQ0YsMEJBQTBCLEVBQzFCLGFBQWEsRUFDYixnQkFBZ0IsRUFDaEIsWUFBWSxHQUNaLE1BQU0sb0NBQW9DLENBQUE7QUFFM0MsT0FBTyxFQUNOLGlCQUFpQixFQUNqQix5QkFBeUIsRUFDekIsZUFBZSxHQUVmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVFuRixPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FB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