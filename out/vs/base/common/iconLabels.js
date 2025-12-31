/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy } from './filters.js';
import { ltrim } from './strings.js';
import { ThemeIcon } from './themables.js';
const iconStartMarker = '$(';
const iconsRegex = new RegExp(`\\$\\(${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?\\)`, 'g'); // no capturing groups
const escapeIconsRegex = new RegExp(`(\\\\)?${iconsRegex.source}`, 'g');
export function escapeIcons(text) {
    return text.replace(escapeIconsRegex, (match, escaped) => (escaped ? match : `\\${match}`));
}
const markdownEscapedIconsRegex = new RegExp(`\\\\${iconsRegex.source}`, 'g');
export function markdownEscapeEscapedIcons(text) {
    // Need to add an extra \ for escaping in markdown
    return text.replace(markdownEscapedIconsRegex, (match) => `\\${match}`);
}
const stripIconsRegex = new RegExp(`(\\s)?(\\\\)?${iconsRegex.source}(\\s)?`, 'g');
/**
 * Takes a label with icons (`$(iconId)xyz`)  and strips the icons out (`xyz`)
 */
export function stripIcons(text) {
    if (text.indexOf(iconStartMarker) === -1) {
        return text;
    }
    return text.replace(stripIconsRegex, (match, preWhitespace, escaped, postWhitespace) => escaped ? match : preWhitespace || postWhitespace || '');
}
/**
 * Takes a label with icons (`$(iconId)xyz`), removes the icon syntax adds whitespace so that screen readers can read the text better.
 */
export function getCodiconAriaLabel(text) {
    if (!text) {
        return '';
    }
    return text.replace(/\$\((.*?)\)/g, (_match, codiconName) => ` ${codiconName} `).trim();
}
const _parseIconsRegex = new RegExp(`\\$\\(${ThemeIcon.iconNameCharacter}+\\)`, 'g');
/**
 * Takes a label with icons (`abc $(iconId)xyz`) and returns the text (`abc xyz`) and the offsets of the icons (`[3]`)
 */
export function parseLabelWithIcons(input) {
    _parseIconsRegex.lastIndex = 0;
    let text = '';
    const iconOffsets = [];
    let iconsOffset = 0;
    while (true) {
        const pos = _parseIconsRegex.lastIndex;
        const match = _parseIconsRegex.exec(input);
        const chars = input.substring(pos, match?.index);
        if (chars.length > 0) {
            text += chars;
            for (let i = 0; i < chars.length; i++) {
                iconOffsets.push(iconsOffset);
            }
        }
        if (!match) {
            break;
        }
        iconsOffset += match[0].length;
    }
    return { text, iconOffsets };
}
export function matchesFuzzyIconAware(query, target, enableSeparateSubstringMatching = false) {
    const { text, iconOffsets } = target;
    // Return early if there are no icon markers in the word to match against
    if (!iconOffsets || iconOffsets.length === 0) {
        return matchesFuzzy(query, text, enableSeparateSubstringMatching);
    }
    // Trim the word to match against because it could have leading
    // whitespace now if the word started with an icon
    const wordToMatchAgainstWithoutIconsTrimmed = ltrim(text, ' ');
    const leadingWhitespaceOffset = text.length - wordToMatchAgainstWithoutIconsTrimmed.length;
    // match on value without icon
    const matches = matchesFuzzy(query, wordToMatchAgainstWithoutIconsTrimmed, enableSeparateSubstringMatching);
    // Map matches back to offsets with icon and trimming
    if (matches) {
        for (const match of matches) {
            const iconOffset = iconOffsets[match.start + leadingWhitespaceOffset] /* icon offsets at index */ +
                leadingWhitespaceOffset; /* overall leading whitespace offset */
            match.start += iconOffset;
            match.end += iconOffset;
        }
    }
    return matches;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2ljb25MYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFVLFlBQVksRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUUxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUE7QUFFNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxNQUFNLENBQzVCLFNBQVMsU0FBUyxDQUFDLGtCQUFrQixNQUFNLFNBQVMsQ0FBQyxzQkFBc0IsT0FBTyxFQUNsRixHQUFHLENBQ0gsQ0FBQSxDQUFDLHNCQUFzQjtBQUV4QixNQUFNLGdCQUFnQixHQUFHLElBQUksTUFBTSxDQUFDLFVBQVUsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZFLE1BQU0sVUFBVSxXQUFXLENBQUMsSUFBWTtJQUN2QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1RixDQUFDO0FBRUQsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUM3RSxNQUFNLFVBQVUsMEJBQTBCLENBQUMsSUFBWTtJQUN0RCxrREFBa0Q7SUFDbEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFF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