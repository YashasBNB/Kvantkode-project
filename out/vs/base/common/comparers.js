/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from './lazy.js';
import { sep } from './path.js';
// When comparing large numbers of strings it's better for performance to create an
// Intl.Collator object and use the function provided by its compare property
// than it is to use String.prototype.localeCompare()
// A collator with numeric sorting enabled, and no sensitivity to case, accents or diacritics.
const intlFileNameCollatorBaseNumeric = new Lazy(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return {
        collator,
        collatorIsNumeric: collator.resolvedOptions().numeric,
    };
});
// A collator with numeric sorting enabled.
const intlFileNameCollatorNumeric = new Lazy(() => {
    const collator = new Intl.Collator(undefined, { numeric: true });
    return {
        collator,
    };
});
// A collator with numeric sorting enabled, and sensitivity to accents and diacritics but not case.
const intlFileNameCollatorNumericCaseInsensitive = new Lazy(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'accent' });
    return {
        collator,
    };
});
/** Compares filenames without distinguishing the name from the extension. Disambiguates by unicode comparison. */
export function compareFileNames(one, other, caseSensitive = false) {
    const a = one || '';
    const b = other || '';
    const result = intlFileNameCollatorBaseNumeric.value.collator.compare(a, b);
    // Using the numeric option will make compare(`foo1`, `foo01`) === 0. Disambiguate.
    if (intlFileNameCollatorBaseNumeric.value.collatorIsNumeric && result === 0 && a !== b) {
        return a < b ? -1 : 1;
    }
    return result;
}
/** Compares full filenames without grouping by case. */
export function compareFileNamesDefault(one, other) {
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    one = one || '';
    other = other || '';
    return compareAndDisambiguateByLength(collatorNumeric, one, other);
}
/** Compares full filenames grouping uppercase names before lowercase. */
export function compareFileNamesUpper(one, other) {
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    one = one || '';
    other = other || '';
    return (compareCaseUpperFirst(one, other) || compareAndDisambiguateByLength(collatorNumeric, one, other));
}
/** Compares full filenames grouping lowercase names before uppercase. */
export function compareFileNamesLower(one, other) {
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    one = one || '';
    other = other || '';
    return (compareCaseLowerFirst(one, other) || compareAndDisambiguateByLength(collatorNumeric, one, other));
}
/** Compares full filenames by unicode value. */
export function compareFileNamesUnicode(one, other) {
    one = one || '';
    other = other || '';
    if (one === other) {
        return 0;
    }
    return one < other ? -1 : 1;
}
/** Compares filenames by extension, then by name. Disambiguates by unicode comparison. */
export function compareFileExtensions(one, other) {
    const [oneName, oneExtension] = extractNameAndExtension(one);
    const [otherName, otherExtension] = extractNameAndExtension(other);
    let result = intlFileNameCollatorBaseNumeric.value.collator.compare(oneExtension, otherExtension);
    if (result === 0) {
        // Using the numeric option will  make compare(`foo1`, `foo01`) === 0. Disambiguate.
        if (intlFileNameCollatorBaseNumeric.value.collatorIsNumeric &&
            oneExtension !== otherExtension) {
            return oneExtension < otherExtension ? -1 : 1;
        }
        // Extensions are equal, compare filenames
        result = intlFileNameCollatorBaseNumeric.value.collator.compare(oneName, otherName);
        if (intlFileNameCollatorBaseNumeric.value.collatorIsNumeric &&
            result === 0 &&
            oneName !== otherName) {
            return oneName < otherName ? -1 : 1;
        }
    }
    return result;
}
/** Compares filenames by extension, then by full filename. Mixes uppercase and lowercase names together. */
export function compareFileExtensionsDefault(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one);
    const otherExtension = extractExtension(other);
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    const collatorNumericCaseInsensitive = intlFileNameCollatorNumericCaseInsensitive.value.collator;
    return (compareAndDisambiguateByLength(collatorNumericCaseInsensitive, oneExtension, otherExtension) ||
        compareAndDisambiguateByLength(collatorNumeric, one, other));
}
/** Compares filenames by extension, then case, then full filename. Groups uppercase names before lowercase. */
export function compareFileExtensionsUpper(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one);
    const otherExtension = extractExtension(other);
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    const collatorNumericCaseInsensitive = intlFileNameCollatorNumericCaseInsensitive.value.collator;
    return (compareAndDisambiguateByLength(collatorNumericCaseInsensitive, oneExtension, otherExtension) ||
        compareCaseUpperFirst(one, other) ||
        compareAndDisambiguateByLength(collatorNumeric, one, other));
}
/** Compares filenames by extension, then case, then full filename. Groups lowercase names before uppercase. */
export function compareFileExtensionsLower(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one);
    const otherExtension = extractExtension(other);
    const collatorNumeric = intlFileNameCollatorNumeric.value.collator;
    const collatorNumericCaseInsensitive = intlFileNameCollatorNumericCaseInsensitive.value.collator;
    return (compareAndDisambiguateByLength(collatorNumericCaseInsensitive, oneExtension, otherExtension) ||
        compareCaseLowerFirst(one, other) ||
        compareAndDisambiguateByLength(collatorNumeric, one, other));
}
/** Compares filenames by case-insensitive extension unicode value, then by full filename unicode value. */
export function compareFileExtensionsUnicode(one, other) {
    one = one || '';
    other = other || '';
    const oneExtension = extractExtension(one).toLowerCase();
    const otherExtension = extractExtension(other).toLowerCase();
    // Check for extension differences
    if (oneExtension !== otherExtension) {
        return oneExtension < otherExtension ? -1 : 1;
    }
    // Check for full filename differences.
    if (one !== other) {
        return one < other ? -1 : 1;
    }
    return 0;
}
const FileNameMatch = /^(.*?)(\.([^.]*))?$/;
/** Extracts the name and extension from a full filename, with optional special handling for dotfiles */
function extractNameAndExtension(str, dotfilesAsNames = false) {
    const match = str ? FileNameMatch.exec(str) : [];
    let result = [(match && match[1]) || '', (match && match[3]) || ''];
    // if the dotfilesAsNames option is selected, treat an empty filename with an extension
    // or a filename that starts with a dot, as a dotfile name
    if (dotfilesAsNames &&
        ((!result[0] && result[1]) || (result[0] && result[0].charAt(0) === '.'))) {
        result = [result[0] + '.' + result[1], ''];
    }
    return result;
}
/** Extracts the extension from a full filename. Treats dotfiles as names, not extensions. */
function extractExtension(str) {
    const match = str ? FileNameMatch.exec(str) : [];
    return (match && match[1] && match[1].charAt(0) !== '.' && match[3]) || '';
}
function compareAndDisambiguateByLength(collator, one, other) {
    // Check for differences
    const result = collator.compare(one, other);
    if (result !== 0) {
        return result;
    }
    // In a numeric comparison, `foo1` and `foo01` will compare as equivalent.
    // Disambiguate by sorting the shorter string first.
    if (one.length !== other.length) {
        return one.length < other.length ? -1 : 1;
    }
    return 0;
}
/** @returns `true` if the string is starts with a lowercase letter. Otherwise, `false`. */
function startsWithLower(string) {
    const character = string.charAt(0);
    return character.toLocaleUpperCase() !== character ? true : false;
}
/** @returns `true` if the string starts with an uppercase letter. Otherwise, `false`. */
function startsWithUpper(string) {
    const character = string.charAt(0);
    return character.toLocaleLowerCase() !== character ? true : false;
}
/**
 * Compares the case of the provided strings - lowercase before uppercase
 *
 * @returns
 * ```text
 *   -1 if one is lowercase and other is uppercase
 *    1 if one is uppercase and other is lowercase
 *    0 otherwise
 * ```
 */
function compareCaseLowerFirst(one, other) {
    if (startsWithLower(one) && startsWithUpper(other)) {
        return -1;
    }
    return startsWithUpper(one) && startsWithLower(other) ? 1 : 0;
}
/**
 * Compares the case of the provided strings - uppercase before lowercase
 *
 * @returns
 * ```text
 *   -1 if one is uppercase and other is lowercase
 *    1 if one is lowercase and other is uppercase
 *    0 otherwise
 * ```
 */
function compareCaseUpperFirst(one, other) {
    if (startsWithUpper(one) && startsWithLower(other)) {
        return -1;
    }
    return startsWithLower(one) && startsWithUpper(other) ? 1 : 0;
}
function comparePathComponents(one, other, caseSensitive = false) {
    if (!caseSensitive) {
        one = one && one.toLowerCase();
        other = other && other.toLowerCase();
    }
    if (one === other) {
        return 0;
    }
    return one < other ? -1 : 1;
}
export function comparePaths(one, other, caseSensitive = false) {
    const oneParts = one.split(sep);
    const otherParts = other.split(sep);
    const lastOne = oneParts.length - 1;
    const lastOther = otherParts.length - 1;
    let endOne, endOther;
    for (let i = 0;; i++) {
        endOne = lastOne === i;
        endOther = lastOther === i;
        if (endOne && endOther) {
            return compareFileNames(oneParts[i], otherParts[i], caseSensitive);
        }
        else if (endOne) {
            return -1;
        }
        else if (endOther) {
            return 1;
        }
        const result = comparePathComponents(oneParts[i], otherParts[i], caseSensitive);
        if (result !== 0) {
            return result;
        }
    }
}
export function compareAnything(one, other, lookFor) {
    const elementAName = one.toLowerCase();
    const elementBName = other.toLowerCase();
    // Sort prefix matches over non prefix matches
    const prefixCompare = compareByPrefix(one, other, lookFor);
    if (prefixCompare) {
        return prefixCompare;
    }
    // Sort suffix matches over non suffix matches
    const elementASuffixMatch = elementAName.endsWith(lookFor);
    const elementBSuffixMatch = elementBName.endsWith(lookFor);
    if (elementASuffixMatch !== elementBSuffixMatch) {
        return elementASuffixMatch ? -1 : 1;
    }
    // Understand file names
    const r = compareFileNames(elementAName, elementBName);
    if (r !== 0) {
        return r;
    }
    // Compare by name
    return elementAName.localeCompare(elementBName);
}
export function compareByPrefix(one, other, lookFor) {
    const elementAName = one.toLowerCase();
    const elementBName = other.toLowerCase();
    // Sort prefix matches over non prefix matches
    const elementAPrefixMatch = elementAName.startsWith(lookFor);
    const elementBPrefixMatch = elementBName.startsWith(lookFor);
    if (elementAPrefixMatch !== elementBPrefixMatch) {
        return elementAPrefixMatch ? -1 : 1;
    }
    // Same prefix: Sort shorter matches to the top to have those on top that match more precisely
    else if (elementAPrefixMatch && elementBPrefixMatch) {
        if (elementAName.length < elementBName.length) {
            return -1;
        }
        if (elementAName.length > elementBName.length) {
            return 1;
        }
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29tcGFyZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDaEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUUvQixtRkFBbUY7QUFDbkYsNkVBQTZFO0FBQzdFLHFEQUFxRDtBQUVyRCw4RkFBOEY7QUFDOUYsTUFBTSwrQkFBK0IsR0FHaEMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3JGLE9BQU87UUFDTixRQUFRO1FBQ1IsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDLE9BQU87S0FDckQsQ0FBQTtBQUNGLENBQUMsQ0FBQyxDQUFBO0FBRUYsMkNBQTJDO0FBQzNDLE1BQU0sMkJBQTJCLEdBQXNDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNwRixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDaEUsT0FBTztRQUNOLFFBQVE7S0FDUixDQUFBO0FBQ0YsQ0FBQyxDQUFDLENBQUE7QUFFRixtR0FBbUc7QUFDbkcsTUFBTSwwQ0FBMEMsR0FBc0MsSUFBSSxJQUFJLENBQzdGLEdBQUcsRUFBRTtJQUNKLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVB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