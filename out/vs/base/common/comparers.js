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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb21wYXJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRS9CLG1GQUFtRjtBQUNuRiw2RUFBNkU7QUFDN0UscURBQXFEO0FBRXJELDhGQUE4RjtBQUM5RixNQUFNLCtCQUErQixHQUdoQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDckYsT0FBTztRQUNOLFFBQVE7UUFDUixpQkFBaUIsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTztLQUNyRCxDQUFBO0FBQ0YsQ0FBQyxDQUFDLENBQUE7QUFFRiwyQ0FBMkM7QUFDM0MsTUFBTSwyQkFBMkIsR0FBc0MsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ3BGLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNoRSxPQUFPO1FBQ04sUUFBUTtLQUNSLENBQUE7QUFDRixDQUFDLENBQUMsQ0FBQTtBQUVGLG1HQUFtRztBQUNuRyxNQUFNLDBDQUEwQyxHQUFzQyxJQUFJLElBQUksQ0FDN0YsR0FBRyxFQUFFO0lBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLE9B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