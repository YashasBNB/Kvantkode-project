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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBR04sRUFBRSxFQUNGLDBCQUEwQixFQUMxQixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLG9DQUFvQyxDQUFBO0FBRTNDLE9BQU8sRUFDTixpQkFBaUIsRUFDakIseUJBQXlCLEVBQ3pCLGVBQWUsR0FFZixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFRbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHNCQUFzQixHQUV0QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVyRixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQTtBQUV2RSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtBQUMzRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBUTVDLE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxTQUFpQixFQUFFLElBQWE7SUFDNUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDN0MsT0FBTyxZQUFZLFNBQVMsR0FBRyxRQUFRLEVBQUUsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtBQUM5RSxNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQTtBQUM3QyxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQTtBQUNwQyxNQUFNLFlBQVksR0FBRyw2Q0FBNkMsQ0FBQTtBQUNsRSxNQUFNLGVBQWUsR0FBRyw0QkFBNEIsQ0FBQTtBQUNwRCxNQUFNLGdCQUFnQixHQUFHLGtDQUFrQyxDQUFBO0FBRXBELElBQU0sc0JBQXNCLDhCQUE1QixNQUFNLHNCQUF1QixTQUFRLFdBQVc7SUFLdEQsWUFDQyxFQUFtQixFQUNrQixrQkFBc0MsRUFDdkMsZ0JBQW1DO1FBRXZFLEtBQUssRUFBRSxDQUFBO1FBSDhCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDdkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUd2RSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQzFCLElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxFQUFFLENBQUE7UUFDNUMsSUFBSSxDQUFDLGNBQWMsR0FBRztZQUNyQixFQUFFLEVBQUUsZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDMUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7U0FDbEQsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBbUIsRUFBRSxtQkFBNEIsS0FBSztRQUMzRCxJQUFJLGVBQWUsR0FBRyxnQkFBZ0I7WUFDckMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQ0FBa0M7WUFDekMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtRQUV4QixzQkFBc0I7UUFDdEIsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELElBQUksZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUMxQyxJQUFJLHVCQUF1QixHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7WUFFbEYsd0JBQXdCO1lBQ3hCLElBQUksdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ2hELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNuQyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ3ZDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUN6RixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sdUJBQXVCLENBQUMsR0FBRyxDQUNqQyxDQUFDLGNBQWMsRUFBd0IsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLEVBQUUsRUFBRSx3QkFBc0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUNoRCxjQUFjO2dCQUNkLFVBQVUsRUFBRSw0QkFBNEI7YUFDeEMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3BDLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUNuRSxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDcEQsQ0FBQzthQUFNLENBQUM7WUFDUCxvQkFBb0I7WUFDcEIsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzFELElBQUksZ0JBQWdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQztvQkFDdEMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztvQkFDbEUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN0QixlQUFlLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDdEUsV0FBVyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7aUJBQU0sQ0FBQztnQkFDUCx5QkFBeUI7Z0JBQ3pCLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM1RCxJQUFJLGlCQUFpQixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN6RSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO2dCQUNsRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxXQUFXLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPLGVBQWUsQ0FBQyxHQUFHLENBQ3pCLENBQUMsY0FBYyxFQUF3QixFQUFFLENBQUMsQ0FBQztnQkFDMUMsRUFBRSxFQUFFLHdCQUFzQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQ2hELGNBQWM7Z0JBQ2QsVUFBVSxFQUFFLDRCQUE0QjthQUN4QyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTyxjQUFjLENBQ3JCLGVBQWtDLEVBQ2xDLFdBQW1CO1FBRW5CLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3ZGLE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxhQUFhLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDL0MsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFDRCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRU8saUJBQWlCLENBQ3hCLGVBQWtDLEVBQ2xDLFNBQWlCO1FBRWpCLFNBQVMsR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDMUMsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUM1QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNuQixDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUM7Z0JBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxLQUFLLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNsRSxDQUFBO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FDbkIsZUFBa0MsRUFDbEMsV0FBbUI7UUFFbkIsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQTtRQUN0RCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFBO1FBQzFFLE1BQU0sYUFBYSxHQUFHLGdCQUFnQixJQUFJLGVBQWUsQ0FBQTtRQUN6RCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsV0FBVyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUNELElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsV0FBVyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFaEMsTUFBTSxNQUFNLEdBQTJCLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4RCxLQUFLLE1BQU0sY0FBYyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzlDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxxQkFBcUIsQ0FDbEQsSUFBSSxDQUFDLGNBQWMsRUFDbkIsY0FBYyxFQUNkLFdBQVcsRUFDWCxLQUFLLEVBQ0wsZUFBZSxFQUNmLGFBQWEsQ0FDYixDQUFBO1lBQ0QsSUFDQyxpQkFBaUIsQ0FBQyxnQkFBZ0I7Z0JBQ2xDLGlCQUFpQixDQUFDLG1CQUFtQjtnQkFDckMsaUJBQWlCLENBQUMsMEJBQTBCO2dCQUM1QyxpQkFBaUIsQ0FBQyxhQUFhO2dCQUMvQixpQkFBaUIsQ0FBQyxXQUFXO2dCQUM3QixpQkFBaUIsQ0FBQyxpQkFBaUI7Z0JBQ25DLGlCQUFpQixDQUFDLGtCQUFrQjtnQkFDcEMsaUJBQWlCLENBQUMscUJBQXFCLEVBQ3RDLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDWCxFQUFFLEVBQUUsd0JBQXNCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztvQkFDaEQsVUFBVSxFQUFFLDRCQUE0QjtvQkFDeEMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsbUJBQW1CLElBQUksU0FBUztvQkFDdkUsMEJBQTBCLEVBQUUsaUJBQWlCLENBQUMsMEJBQTBCLElBQUksU0FBUztvQkFDckYsY0FBYztvQkFDZCxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxpQkFBaUIsSUFBSSxTQUFTO29CQUNuRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxnQkFBZ0IsSUFBSSxTQUFTO29CQUNqRSxhQUFhLEVBQUUsaUJBQWlCLENBQUMsYUFBYSxJQUFJLFNBQVM7b0JBQzNELFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxXQUFXLElBQUksU0FBUztvQkFDdkQsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsa0JBQWtCLElBQUksU0FBUztvQkFDckUscUJBQXFCLEVBQUUsaUJBQWlCLENBQUMscUJBQXFCLElBQUksU0FBUztpQkFDM0UsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxZQUFZLENBQ25CLGVBQWtDLEVBQ2xDLE9BQWUsRUFDZixJQUFZO1FBRVosSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUE7UUFDOUUsSUFBSSx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxPQUFPLHVCQUF1QixDQUFBO1FBQy9CLENBQUM7UUFFRCwyRUFBMkU7UUFDM0UsdUZBQXVGO1FBQ3ZGLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUE7UUFFcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxzQkFBc0IsQ0FDaEQsU0FBUyxFQUNULE9BQU8sRUFDUCxJQUFJLEVBQ0osY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFDaEMsS0FBSyxFQUNMLElBQUksRUFDSixLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELE9BQU87WUFDTix3QkFBc0IsQ0FBQyxpQkFBaUIsQ0FDdkMsT0FBTyxFQUNQLGNBQWMsRUFDZCxZQUFZLEVBQ1osSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQzNCO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxzQkFBZ0M7UUFDNUQsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQUssTUFBTSxJQUFJLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUMzQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFUSxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsSUFBSSxHQUFHLEVBQWtCO1FBQzlELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBRTlDLElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxFQUFFLENBQUE7UUFDNUMsTUFBTSxhQUFhLEdBQXlCLElBQUksR0FBRyxFQUFtQixDQUFBO1FBQ3RFLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDbkUsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3hCLG9DQUFvQztnQkFDcEMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLElBQUksQ0FDM0Msd0JBQXNCLENBQUMsaUJBQWlCLENBQ3ZDLFVBQVUsQ0FBQyxPQUFPLEVBQ2xCLFVBQVUsRUFDVixZQUFZLEVBQ1osVUFBVSxDQUNWLENBQ0QsQ0FBQTtnQkFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxrQkFBa0I7YUFDNUQscUJBQXFCLEVBQUU7YUFDdkIsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekMsS0FBSyxNQUFNLE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQzVELE1BQU0sY0FBYyxHQUFHLElBQUksc0JBQXNCLENBQ2hELFNBQVMsRUFDVCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCw4QkFBOEIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQ3RELElBQUksRUFDSixLQUFLLENBQ0wsQ0FBQTtZQUNELElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLENBQzNDLHdCQUFzQixDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUMzRixDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxRQUFRLENBQ2pELElBQUksQ0FBQyxrQ0FBa0MsRUFDdkMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLHdCQUFzQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FDaEUsQ0FBQTtRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0NBQWtDO2FBQzdELEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDUixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyx3QkFBc0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVwRSxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUErQjtRQUNuRCxPQUFPLENBQ04sY0FBYyxDQUFDLE9BQU87WUFDdEIsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNsRCxjQUFjLENBQUMsSUFBSTtZQUNuQixDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO2dCQUMvQixDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU07Z0JBQ3ZCLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FDMUMsQ0FBQTtJQUNGLENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxzQkFBc0IsRUFBeUIsQ0FBQTtRQUN0RSxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMxRCxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFFTyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBa0IsRUFBRSxDQUFrQjtRQUMxRSxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDVixDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDcEQsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTyxNQUFNLENBQUMsaUJBQWlCLENBQy9CLE9BQWUsRUFDZixjQUFzQyxFQUN0QyxPQUE0QixFQUM1QixVQUF5RDtRQUV6RCxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM5QyxJQUFJLE1BQU0sR0FBbUMsV0FBVyxDQUFBO1FBQ3hELElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sV0FBVyxHQUNoQixjQUFjLENBQUMsV0FBVztnQkFDMUIsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMxRSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFBO1FBQ3pGLENBQUM7UUFDRCxtRUFBbUU7UUFDbkUsT0FBd0I7WUFDdkIsVUFBVSxFQUFFLGNBQWMsQ0FBQyxrQkFBa0I7WUFDN0MsY0FBYztZQUNkLE9BQU87WUFDUCxZQUFZLEVBQUUsd0JBQXNCLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQztZQUNwRixtQkFBbUIsRUFBRSx3QkFBc0IsQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUM7WUFDL0UsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDaEUsTUFBTTtTQUNOLENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLHNCQUFzQixDQUFDLFdBQXVDO1FBQzVFLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxLQUFLLElBQXVCLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hGLE1BQU0sUUFBUSxHQUF1QixXQUFXLENBQUMsUUFBUTtvQkFDeEQsQ0FBQyxDQUFvQixXQUFXLENBQUMsUUFBUyxDQUFDLFFBQVE7b0JBQ25ELENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQ1osTUFBTSxLQUFLLEdBQXNCLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFBO2dCQUM1RCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDN0UsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxNQUFNLENBQUMsZUFBZSxDQUM3QixXQUF1QyxFQUN2QyxpQkFBcUM7UUFFckMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixNQUFNLFFBQVEsR0FBdUIsV0FBVyxDQUFDLFFBQVE7Z0JBQ3hELENBQUMsQ0FBQyxPQUFPLFdBQVcsQ0FBQyxRQUFRLEtBQUssUUFBUTtvQkFDekMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRO29CQUN0QixDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLO2dCQUM3QixDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ1osTUFBTSxLQUFLLEdBQ1YsT0FBTyxXQUFXLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7WUFDcEYsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQzdFLENBQUM7UUFFRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsT0FBTyxpQkFBaUIsQ0FBQTtRQUN6QixDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0NBQ0QsQ0FBQTtBQWhYWSxzQkFBc0I7SUFPaEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGlCQUFpQixDQUFBO0dBUlAsc0JBQXNCLENBZ1hsQzs7QUFFRCxNQUFNLHFCQUFxQjtJQVUxQixZQUNTLGNBQThCLEVBQ3RDLGNBQStCLEVBQy9CLFdBQW1CLEVBQ25CLEtBQWUsRUFDZixlQUF5QixFQUN6QixhQUFzQjtRQUxkLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQVY5QixxQkFBZ0IsR0FBb0IsSUFBSSxDQUFBO1FBQ3hDLHdCQUFtQixHQUFvQixJQUFJLENBQUE7UUFDM0MsK0JBQTBCLEdBQW9CLElBQUksQ0FBQTtRQUNsRCxrQkFBYSxHQUFvQixJQUFJLENBQUE7UUFDckMsZ0JBQVcsR0FBb0IsSUFBSSxDQUFBO1FBQ25DLHNCQUFpQixHQUE2QixJQUFJLENBQUE7UUFDbEQsdUJBQWtCLEdBQW9CLElBQUksQ0FBQTtRQUMxQywwQkFBcUIsR0FBb0IsSUFBSSxDQUFBO1FBVXJELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FDbkMsV0FBVyxFQUNYLGNBQWMsQ0FBQyxPQUFPLEVBQ3RCLEVBQUUsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsRUFDbEMsS0FBSyxDQUNMLENBQUE7WUFDRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsY0FBYyxDQUFDLFlBQVk7Z0JBQ3JELENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUNaLFdBQVcsRUFDWCxjQUFjLENBQUMsWUFBWSxFQUMzQixDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUNuRixLQUFLLENBQ0w7Z0JBQ0YsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNQLElBQUksQ0FBQywwQkFBMEIsR0FBRyxjQUFjLENBQUMsbUJBQW1CO2dCQUNuRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FDWixXQUFXLEVBQ1gsY0FBYyxDQUFDLG1CQUFtQixFQUNsQyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLENBQzVCLFlBQVksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxFQUM3RCxLQUFLLENBQ0w7Z0JBQ0YsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNQLElBQUksQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDLElBQUk7Z0JBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxLQUFLLENBQUM7Z0JBQ3BGLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDUCxJQUFJLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUNoQyxXQUFXLEVBQ1gsY0FBYyxDQUFDLE1BQU0sRUFDckIsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQWdCLEVBQUUsSUFBSSxDQUFDLEVBQ3ZGLEtBQUssQ0FDTCxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLFdBQVc7b0JBQzdELENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUNaLFdBQVcsRUFDWCxjQUFjLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFDakMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsRUFDbkYsS0FBSyxDQUNMO29CQUNGLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxjQUFjLENBQUMsVUFBVTtZQUNqRCxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixjQUFjLENBQUMsVUFBVSxFQUN6QixXQUFXLEVBQ1gsZUFBZSxFQUNmLGFBQWEsQ0FDYjtZQUNGLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDUixDQUFDO0lBRU8sT0FBTyxDQUNkLFdBQTBCLEVBQzFCLGtCQUEwQixFQUMxQixpQkFBMEIsRUFDMUIsS0FBZTtRQUVmLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDOUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDMUUsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU8sWUFBWSxDQUNuQixLQUFlLEVBQ2Ysa0JBQTBCLEVBQzFCLGlCQUEwQjtRQUUxQixJQUFJLE9BQU8sR0FBb0IsRUFBRSxDQUFBO1FBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFDL0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFBO1lBQy9DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsSUFBSSxDQUFBO2dCQUNkLE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFpQjtRQUN0QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7YUFDcEQsTUFBTSxDQUNOLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDVCxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ1osQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBQ2pELENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUs7WUFDdEIsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUNuQixDQUNGO2FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVPLGlCQUFpQixDQUN4QixVQUE4QixFQUM5QixXQUFtQixFQUNuQixLQUFlLEVBQ2YsYUFBc0I7UUFFdEIsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsR0FBRyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUE7UUFFckQsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUMzRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ25DLElBQ0MsQ0FBQyxpQkFBaUIsSUFBSSxPQUFPLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RGLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RFLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzdELENBQUM7WUFDRixPQUFPO2dCQUNOLFNBQVMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDO2dCQUM5QyxTQUFTLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQzthQUM5QyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFvQixFQUFFLENBQUE7UUFDMUMsSUFBSSxjQUFjLEdBQW9CLEVBQUUsQ0FBQTtRQUV4QyxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUE7UUFDakMsTUFBTSxxQkFBcUIsR0FBYSxFQUFFLENBQUE7UUFDMUMsSUFBSSxxQkFBcUIsR0FBYSxFQUFFLENBQUE7UUFDeEMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO1lBQzVCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO1lBRTVCLGNBQWMsR0FBRyxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFBO1lBQzFELElBQUksY0FBYyxHQUFHLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQTtZQUU1QyxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNqRixJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDNUIsS0FBSyxNQUFNLHdCQUF3QixJQUFJLHFCQUFxQixFQUFFLENBQUM7d0JBQzlELElBQUkscUJBQXFCLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzs0QkFDcEUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQ3ZFLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxjQUFjLEdBQUcsRUFBRSxDQUFBO29CQUNuQixxQkFBcUIsR0FBRyxFQUFFLENBQUE7b0JBQzFCLGNBQWMsR0FBRyxLQUFLLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNsRixDQUFDO1lBRUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUNELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIscUJBQXFCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2xDLENBQUM7WUFDRCxJQUFJLGdCQUFnQixJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQzFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekIsQ0FBQztZQUVELGNBQWMsR0FBRyxjQUFjLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDeEYsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQztZQUMxRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUU7WUFDMUQsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNSLENBQUM7SUFFTyxTQUFTLENBQ2hCLEtBQTJCLEVBQzNCLEtBQXNCLEVBQ3RCLElBQVksRUFDWixhQUFzQjtRQUV0QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNkLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2QsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDckIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDZCxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUN0QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNkLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3JELEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ3BCLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDZixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU8sY0FBYyxDQUNyQixLQUEyQixFQUMzQixJQUFZLEVBQ1osYUFBc0I7UUFFdEIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQVcsS0FBSyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUE7UUFDbEQsSUFBSSxhQUFhLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3RELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLG1CQUFtQixDQUFDLEtBQTJCLEVBQUUsSUFBWTtRQUNwRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxLQUEyQixFQUFFLElBQVk7UUFDcEUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsS0FBMkIsRUFBRSxJQUFZO1FBQ3JFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVPLGtCQUFrQixDQUFDLEtBQTJCLEVBQUUsSUFBWTtRQUNuRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTyxXQUFXLENBQUMsZUFBZ0M7UUFDbkQsT0FBTyxDQUNOLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUN4QixDQUFDLENBQUMsZUFBZSxDQUFDLE9BQU87WUFDekIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPO1lBQ3pCLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUTtZQUMxQixDQUFDLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FDekIsQ0FBQTtJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsS0FBMkIsRUFBRSxLQUFzQjtRQUMxRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxLQUEyQjtRQUN0RCxNQUFNLEtBQUssR0FBb0IsRUFBRSxDQUFBO1FBQ2pDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNwQixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDckIsQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQTtZQUNwQixDQUFDO1lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ3JCLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDcEIsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7WUFDdEIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBWTtRQUM5QixJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLHNCQUFzQixDQUFDLElBQVk7UUFDMUMsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbkUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLHVCQUF1QixDQUFDLElBQVk7UUFDM0MsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDcEUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sdUJBQXVCLENBQUMsSUFBWTtRQUMzQyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN0RSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN0RSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sd0JBQXdCLENBQUMsSUFBWTtRQUM1QyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCJ9