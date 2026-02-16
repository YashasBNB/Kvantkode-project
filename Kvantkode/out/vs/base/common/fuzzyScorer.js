/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareAnything } from './comparers.js';
import { createMatches as createFuzzyMatches, fuzzyScore, isUpper, matchesPrefix, } from './filters.js';
import { hash } from './hash.js';
import { sep } from './path.js';
import { isLinux, isWindows } from './platform.js';
import { equalsIgnoreCase, stripWildcards } from './strings.js';
const NO_MATCH = 0;
const NO_SCORE = [NO_MATCH, []];
// const DEBUG = true;
// const DEBUG_MATRIX = false;
export function scoreFuzzy(target, query, queryLower, allowNonContiguousMatches) {
    if (!target || !query) {
        return NO_SCORE; // return early if target or query are undefined
    }
    const targetLength = target.length;
    const queryLength = query.length;
    if (targetLength < queryLength) {
        return NO_SCORE; // impossible for query to be contained in target
    }
    // if (DEBUG) {
    // 	console.group(`Target: ${target}, Query: ${query}`);
    // }
    const targetLower = target.toLowerCase();
    const res = doScoreFuzzy(query, queryLower, queryLength, target, targetLower, targetLength, allowNonContiguousMatches);
    // if (DEBUG) {
    // 	console.log(`%cFinal Score: ${res[0]}`, 'font-weight: bold');
    // 	console.groupEnd();
    // }
    return res;
}
function doScoreFuzzy(query, queryLower, queryLength, target, targetLower, targetLength, allowNonContiguousMatches) {
    const scores = [];
    const matches = [];
    //
    // Build Scorer Matrix:
    //
    // The matrix is composed of query q and target t. For each index we score
    // q[i] with t[i] and compare that with the previous score. If the score is
    // equal or larger, we keep the match. In addition to the score, we also keep
    // the length of the consecutive matches to use as boost for the score.
    //
    //      t   a   r   g   e   t
    //  q
    //  u
    //  e
    //  r
    //  y
    //
    for (let queryIndex = 0; queryIndex < queryLength; queryIndex++) {
        const queryIndexOffset = queryIndex * targetLength;
        const queryIndexPreviousOffset = queryIndexOffset - targetLength;
        const queryIndexGtNull = queryIndex > 0;
        const queryCharAtIndex = query[queryIndex];
        const queryLowerCharAtIndex = queryLower[queryIndex];
        for (let targetIndex = 0; targetIndex < targetLength; targetIndex++) {
            const targetIndexGtNull = targetIndex > 0;
            const currentIndex = queryIndexOffset + targetIndex;
            const leftIndex = currentIndex - 1;
            const diagIndex = queryIndexPreviousOffset + targetIndex - 1;
            const leftScore = targetIndexGtNull ? scores[leftIndex] : 0;
            const diagScore = queryIndexGtNull && targetIndexGtNull ? scores[diagIndex] : 0;
            const matchesSequenceLength = queryIndexGtNull && targetIndexGtNull ? matches[diagIndex] : 0;
            // If we are not matching on the first query character any more, we only produce a
            // score if we had a score previously for the last query index (by looking at the diagScore).
            // This makes sure that the query always matches in sequence on the target. For example
            // given a target of "ede" and a query of "de", we would otherwise produce a wrong high score
            // for query[1] ("e") matching on target[0] ("e") because of the "beginning of word" boost.
            let score;
            if (!diagScore && queryIndexGtNull) {
                score = 0;
            }
            else {
                score = computeCharScore(queryCharAtIndex, queryLowerCharAtIndex, target, targetLower, targetIndex, matchesSequenceLength);
            }
            // We have a score and its equal or larger than the left score
            // Match: sequence continues growing from previous diag value
            // Score: increases by diag score value
            const isValidScore = score && diagScore + score >= leftScore;
            if (isValidScore &&
                // We don't need to check if it's contiguous if we allow non-contiguous matches
                (allowNonContiguousMatches ||
                    // We must be looking for a contiguous match.
                    // Looking at an index higher than 0 in the query means we must have already
                    // found out this is contiguous otherwise there wouldn't have been a score
                    queryIndexGtNull ||
                    // lastly check if the query is completely contiguous at this index in the target
                    targetLower.startsWith(queryLower, targetIndex))) {
                matches[currentIndex] = matchesSequenceLength + 1;
                scores[currentIndex] = diagScore + score;
            }
            // We either have no score or the score is lower than the left score
            // Match: reset to 0
            // Score: pick up from left hand side
            else {
                matches[currentIndex] = NO_MATCH;
                scores[currentIndex] = leftScore;
            }
        }
    }
    // Restore Positions (starting from bottom right of matrix)
    const positions = [];
    let queryIndex = queryLength - 1;
    let targetIndex = targetLength - 1;
    while (queryIndex >= 0 && targetIndex >= 0) {
        const currentIndex = queryIndex * targetLength + targetIndex;
        const match = matches[currentIndex];
        if (match === NO_MATCH) {
            targetIndex--; // go left
        }
        else {
            positions.push(targetIndex);
            // go up and left
            queryIndex--;
            targetIndex--;
        }
    }
    // Print matrix
    // if (DEBUG_MATRIX) {
    // 	printMatrix(query, target, matches, scores);
    // }
    return [scores[queryLength * targetLength - 1], positions.reverse()];
}
function computeCharScore(queryCharAtIndex, queryLowerCharAtIndex, target, targetLower, targetIndex, matchesSequenceLength) {
    let score = 0;
    if (!considerAsEqual(queryLowerCharAtIndex, targetLower[targetIndex])) {
        return score; // no match of characters
    }
    // if (DEBUG) {
    // 	console.groupCollapsed(`%cFound a match of char: ${queryLowerCharAtIndex} at index ${targetIndex}`, 'font-weight: normal');
    // }
    // Character match bonus
    score += 1;
    // if (DEBUG) {
    // 	console.log(`%cCharacter match bonus: +1`, 'font-weight: normal');
    // }
    // Consecutive match bonus
    if (matchesSequenceLength > 0) {
        score += matchesSequenceLength * 5;
        // if (DEBUG) {
        // 	console.log(`Consecutive match bonus: +${matchesSequenceLength * 5}`);
        // }
    }
    // Same case bonus
    if (queryCharAtIndex === target[targetIndex]) {
        score += 1;
        // if (DEBUG) {
        // 	console.log('Same case bonus: +1');
        // }
    }
    // Start of word bonus
    if (targetIndex === 0) {
        score += 8;
        // if (DEBUG) {
        // 	console.log('Start of word bonus: +8');
        // }
    }
    else {
        // After separator bonus
        const separatorBonus = scoreSeparatorAtPos(target.charCodeAt(targetIndex - 1));
        if (separatorBonus) {
            score += separatorBonus;
            // if (DEBUG) {
            // 	console.log(`After separator bonus: +${separatorBonus}`);
            // }
        }
        // Inside word upper case bonus (camel case). We only give this bonus if we're not in a contiguous sequence.
        // For example:
        // NPE => NullPointerException = boost
        // HTTP => HTTP = not boost
        else if (isUpper(target.charCodeAt(targetIndex)) && matchesSequenceLength === 0) {
            score += 2;
            // if (DEBUG) {
            // 	console.log('Inside word upper case bonus: +2');
            // }
        }
    }
    // if (DEBUG) {
    // 	console.log(`Total score: ${score}`);
    // 	console.groupEnd();
    // }
    return score;
}
function considerAsEqual(a, b) {
    if (a === b) {
        return true;
    }
    // Special case path separators: ignore platform differences
    if (a === '/' || a === '\\') {
        return b === '/' || b === '\\';
    }
    return false;
}
function scoreSeparatorAtPos(charCode) {
    switch (charCode) {
        case 47 /* CharCode.Slash */:
        case 92 /* CharCode.Backslash */:
            return 5; // prefer path separators...
        case 95 /* CharCode.Underline */:
        case 45 /* CharCode.Dash */:
        case 46 /* CharCode.Period */:
        case 32 /* CharCode.Space */:
        case 39 /* CharCode.SingleQuote */:
        case 34 /* CharCode.DoubleQuote */:
        case 58 /* CharCode.Colon */:
            return 4; // ...over other separators
        default:
            return 0;
    }
}
const NO_SCORE2 = [undefined, []];
export function scoreFuzzy2(target, query, patternStart = 0, wordStart = 0) {
    // Score: multiple inputs
    const preparedQuery = query;
    if (preparedQuery.values && preparedQuery.values.length > 1) {
        return doScoreFuzzy2Multiple(target, preparedQuery.values, patternStart, wordStart);
    }
    // Score: single input
    return doScoreFuzzy2Single(target, query, patternStart, wordStart);
}
function doScoreFuzzy2Multiple(target, query, patternStart, wordStart) {
    let totalScore = 0;
    const totalMatches = [];
    for (const queryPiece of query) {
        const [score, matches] = doScoreFuzzy2Single(target, queryPiece, patternStart, wordStart);
        if (typeof score !== 'number') {
            // if a single query value does not match, return with
            // no score entirely, we require all queries to match
            return NO_SCORE2;
        }
        totalScore += score;
        totalMatches.push(...matches);
    }
    // if we have a score, ensure that the positions are
    // sorted in ascending order and distinct
    return [totalScore, normalizeMatches(totalMatches)];
}
function doScoreFuzzy2Single(target, query, patternStart, wordStart) {
    const score = fuzzyScore(query.original, query.originalLowercase, patternStart, target, target.toLowerCase(), wordStart, { firstMatchCanBeWeak: true, boostFullMatch: true });
    if (!score) {
        return NO_SCORE2;
    }
    return [score[0], createFuzzyMatches(score)];
}
const NO_ITEM_SCORE = Object.freeze({ score: 0 });
const PATH_IDENTITY_SCORE = 1 << 18;
const LABEL_PREFIX_SCORE_THRESHOLD = 1 << 17;
const LABEL_SCORE_THRESHOLD = 1 << 16;
function getCacheHash(label, description, allowNonContiguousMatches, query) {
    const values = query.values ? query.values : [query];
    const cacheHash = hash({
        [query.normalized]: {
            values: values.map((v) => ({
                value: v.normalized,
                expectContiguousMatch: v.expectContiguousMatch,
            })),
            label,
            description,
            allowNonContiguousMatches,
        },
    });
    return cacheHash;
}
export function scoreItemFuzzy(item, query, allowNonContiguousMatches, accessor, cache) {
    if (!item || !query.normalized) {
        return NO_ITEM_SCORE; // we need an item and query to score on at least
    }
    const label = accessor.getItemLabel(item);
    if (!label) {
        return NO_ITEM_SCORE; // we need a label at least
    }
    const description = accessor.getItemDescription(item);
    // in order to speed up scoring, we cache the score with a unique hash based on:
    // - label
    // - description (if provided)
    // - whether non-contiguous matching is enabled or not
    // - hash of the query (normalized) values
    const cacheHash = getCacheHash(label, description, allowNonContiguousMatches, query);
    const cached = cache[cacheHash];
    if (cached) {
        return cached;
    }
    const itemScore = doScoreItemFuzzy(label, description, accessor.getItemPath(item), query, allowNonContiguousMatches);
    cache[cacheHash] = itemScore;
    return itemScore;
}
function doScoreItemFuzzy(label, description, path, query, allowNonContiguousMatches) {
    const preferLabelMatches = !path || !query.containsPathSeparator;
    // Treat identity matches on full path highest
    if (path &&
        (isLinux ? query.pathNormalized === path : equalsIgnoreCase(query.pathNormalized, path))) {
        return {
            score: PATH_IDENTITY_SCORE,
            labelMatch: [{ start: 0, end: label.length }],
            descriptionMatch: description ? [{ start: 0, end: description.length }] : undefined,
        };
    }
    // Score: multiple inputs
    if (query.values && query.values.length > 1) {
        return doScoreItemFuzzyMultiple(label, description, path, query.values, preferLabelMatches, allowNonContiguousMatches);
    }
    // Score: single input
    return doScoreItemFuzzySingle(label, description, path, query, preferLabelMatches, allowNonContiguousMatches);
}
function doScoreItemFuzzyMultiple(label, description, path, query, preferLabelMatches, allowNonContiguousMatches) {
    let totalScore = 0;
    const totalLabelMatches = [];
    const totalDescriptionMatches = [];
    for (const queryPiece of query) {
        const { score, labelMatch, descriptionMatch } = doScoreItemFuzzySingle(label, description, path, queryPiece, preferLabelMatches, allowNonContiguousMatches);
        if (score === NO_MATCH) {
            // if a single query value does not match, return with
            // no score entirely, we require all queries to match
            return NO_ITEM_SCORE;
        }
        totalScore += score;
        if (labelMatch) {
            totalLabelMatches.push(...labelMatch);
        }
        if (descriptionMatch) {
            totalDescriptionMatches.push(...descriptionMatch);
        }
    }
    // if we have a score, ensure that the positions are
    // sorted in ascending order and distinct
    return {
        score: totalScore,
        labelMatch: normalizeMatches(totalLabelMatches),
        descriptionMatch: normalizeMatches(totalDescriptionMatches),
    };
}
function doScoreItemFuzzySingle(label, description, path, query, preferLabelMatches, allowNonContiguousMatches) {
    // Prefer label matches if told so or we have no description
    if (preferLabelMatches || !description) {
        const [labelScore, labelPositions] = scoreFuzzy(label, query.normalized, query.normalizedLowercase, allowNonContiguousMatches && !query.expectContiguousMatch);
        if (labelScore) {
            // If we have a prefix match on the label, we give a much
            // higher baseScore to elevate these matches over others
            // This ensures that typing a file name wins over results
            // that are present somewhere in the label, but not the
            // beginning.
            const labelPrefixMatch = matchesPrefix(query.normalized, label);
            let baseScore;
            if (labelPrefixMatch) {
                baseScore = LABEL_PREFIX_SCORE_THRESHOLD;
                // We give another boost to labels that are short, e.g. given
                // files "window.ts" and "windowActions.ts" and a query of
                // "window", we want "window.ts" to receive a higher score.
                // As such we compute the percentage the query has within the
                // label and add that to the baseScore.
                const prefixLengthBoost = Math.round((query.normalized.length / label.length) * 100);
                baseScore += prefixLengthBoost;
            }
            else {
                baseScore = LABEL_SCORE_THRESHOLD;
            }
            return {
                score: baseScore + labelScore,
                labelMatch: labelPrefixMatch || createMatches(labelPositions),
            };
        }
    }
    // Finally compute description + label scores if we have a description
    if (description) {
        let descriptionPrefix = description;
        if (!!path) {
            descriptionPrefix = `${description}${sep}`; // assume this is a file path
        }
        const descriptionPrefixLength = descriptionPrefix.length;
        const descriptionAndLabel = `${descriptionPrefix}${label}`;
        const [labelDescriptionScore, labelDescriptionPositions] = scoreFuzzy(descriptionAndLabel, query.normalized, query.normalizedLowercase, allowNonContiguousMatches && !query.expectContiguousMatch);
        if (labelDescriptionScore) {
            const labelDescriptionMatches = createMatches(labelDescriptionPositions);
            const labelMatch = [];
            const descriptionMatch = [];
            // We have to split the matches back onto the label and description portions
            labelDescriptionMatches.forEach((h) => {
                // Match overlaps label and description part, we need to split it up
                if (h.start < descriptionPrefixLength && h.end > descriptionPrefixLength) {
                    labelMatch.push({ start: 0, end: h.end - descriptionPrefixLength });
                    descriptionMatch.push({ start: h.start, end: descriptionPrefixLength });
                }
                // Match on label part
                else if (h.start >= descriptionPrefixLength) {
                    labelMatch.push({
                        start: h.start - descriptionPrefixLength,
                        end: h.end - descriptionPrefixLength,
                    });
                }
                // Match on description part
                else {
                    descriptionMatch.push(h);
                }
            });
            return { score: labelDescriptionScore, labelMatch, descriptionMatch };
        }
    }
    return NO_ITEM_SCORE;
}
function createMatches(offsets) {
    const ret = [];
    if (!offsets) {
        return ret;
    }
    let last;
    for (const pos of offsets) {
        if (last && last.end === pos) {
            last.end += 1;
        }
        else {
            last = { start: pos, end: pos + 1 };
            ret.push(last);
        }
    }
    return ret;
}
function normalizeMatches(matches) {
    // sort matches by start to be able to normalize
    const sortedMatches = matches.sort((matchA, matchB) => {
        return matchA.start - matchB.start;
    });
    // merge matches that overlap
    const normalizedMatches = [];
    let currentMatch = undefined;
    for (const match of sortedMatches) {
        // if we have no current match or the matches
        // do not overlap, we take it as is and remember
        // it for future merging
        if (!currentMatch || !matchOverlaps(currentMatch, match)) {
            currentMatch = match;
            normalizedMatches.push(match);
        }
        // otherwise we merge the matches
        else {
            currentMatch.start = Math.min(currentMatch.start, match.start);
            currentMatch.end = Math.max(currentMatch.end, match.end);
        }
    }
    return normalizedMatches;
}
function matchOverlaps(matchA, matchB) {
    if (matchA.end < matchB.start) {
        return false; // A ends before B starts
    }
    if (matchB.end < matchA.start) {
        return false; // B ends before A starts
    }
    return true;
}
//#endregion
//#region Comparers
export function compareItemsByFuzzyScore(itemA, itemB, query, allowNonContiguousMatches, accessor, cache) {
    const itemScoreA = scoreItemFuzzy(itemA, query, allowNonContiguousMatches, accessor, cache);
    const itemScoreB = scoreItemFuzzy(itemB, query, allowNonContiguousMatches, accessor, cache);
    const scoreA = itemScoreA.score;
    const scoreB = itemScoreB.score;
    // 1.) identity matches have highest score
    if (scoreA === PATH_IDENTITY_SCORE || scoreB === PATH_IDENTITY_SCORE) {
        if (scoreA !== scoreB) {
            return scoreA === PATH_IDENTITY_SCORE ? -1 : 1;
        }
    }
    // 2.) matches on label are considered higher compared to label+description matches
    if (scoreA > LABEL_SCORE_THRESHOLD || scoreB > LABEL_SCORE_THRESHOLD) {
        if (scoreA !== scoreB) {
            return scoreA > scoreB ? -1 : 1;
        }
        // prefer more compact matches over longer in label (unless this is a prefix match where
        // longer prefix matches are actually preferred)
        if (scoreA < LABEL_PREFIX_SCORE_THRESHOLD && scoreB < LABEL_PREFIX_SCORE_THRESHOLD) {
            const comparedByMatchLength = compareByMatchLength(itemScoreA.labelMatch, itemScoreB.labelMatch);
            if (comparedByMatchLength !== 0) {
                return comparedByMatchLength;
            }
        }
        // prefer shorter labels over longer labels
        const labelA = accessor.getItemLabel(itemA) || '';
        const labelB = accessor.getItemLabel(itemB) || '';
        if (labelA.length !== labelB.length) {
            return labelA.length - labelB.length;
        }
    }
    // 3.) compare by score in label+description
    if (scoreA !== scoreB) {
        return scoreA > scoreB ? -1 : 1;
    }
    // 4.) scores are identical: prefer matches in label over non-label matches
    const itemAHasLabelMatches = Array.isArray(itemScoreA.labelMatch) && itemScoreA.labelMatch.length > 0;
    const itemBHasLabelMatches = Array.isArray(itemScoreB.labelMatch) && itemScoreB.labelMatch.length > 0;
    if (itemAHasLabelMatches && !itemBHasLabelMatches) {
        return -1;
    }
    else if (itemBHasLabelMatches && !itemAHasLabelMatches) {
        return 1;
    }
    // 5.) scores are identical: prefer more compact matches (label and description)
    const itemAMatchDistance = computeLabelAndDescriptionMatchDistance(itemA, itemScoreA, accessor);
    const itemBMatchDistance = computeLabelAndDescriptionMatchDistance(itemB, itemScoreB, accessor);
    if (itemAMatchDistance && itemBMatchDistance && itemAMatchDistance !== itemBMatchDistance) {
        return itemBMatchDistance > itemAMatchDistance ? -1 : 1;
    }
    // 6.) scores are identical: start to use the fallback compare
    return fallbackCompare(itemA, itemB, query, accessor);
}
function computeLabelAndDescriptionMatchDistance(item, score, accessor) {
    let matchStart = -1;
    let matchEnd = -1;
    // If we have description matches, the start is first of description match
    if (score.descriptionMatch && score.descriptionMatch.length) {
        matchStart = score.descriptionMatch[0].start;
    }
    // Otherwise, the start is the first label match
    else if (score.labelMatch && score.labelMatch.length) {
        matchStart = score.labelMatch[0].start;
    }
    // If we have label match, the end is the last label match
    // If we had a description match, we add the length of the description
    // as offset to the end to indicate this.
    if (score.labelMatch && score.labelMatch.length) {
        matchEnd = score.labelMatch[score.labelMatch.length - 1].end;
        if (score.descriptionMatch && score.descriptionMatch.length) {
            const itemDescription = accessor.getItemDescription(item);
            if (itemDescription) {
                matchEnd += itemDescription.length;
            }
        }
    }
    // If we have just a description match, the end is the last description match
    else if (score.descriptionMatch && score.descriptionMatch.length) {
        matchEnd = score.descriptionMatch[score.descriptionMatch.length - 1].end;
    }
    return matchEnd - matchStart;
}
function compareByMatchLength(matchesA, matchesB) {
    if ((!matchesA && !matchesB) ||
        ((!matchesA || !matchesA.length) && (!matchesB || !matchesB.length))) {
        return 0; // make sure to not cause bad comparing when matches are not provided
    }
    if (!matchesB || !matchesB.length) {
        return -1;
    }
    if (!matchesA || !matchesA.length) {
        return 1;
    }
    // Compute match length of A (first to last match)
    const matchStartA = matchesA[0].start;
    const matchEndA = matchesA[matchesA.length - 1].end;
    const matchLengthA = matchEndA - matchStartA;
    // Compute match length of B (first to last match)
    const matchStartB = matchesB[0].start;
    const matchEndB = matchesB[matchesB.length - 1].end;
    const matchLengthB = matchEndB - matchStartB;
    // Prefer shorter match length
    return matchLengthA === matchLengthB ? 0 : matchLengthB < matchLengthA ? 1 : -1;
}
function fallbackCompare(itemA, itemB, query, accessor) {
    // check for label + description length and prefer shorter
    const labelA = accessor.getItemLabel(itemA) || '';
    const labelB = accessor.getItemLabel(itemB) || '';
    const descriptionA = accessor.getItemDescription(itemA);
    const descriptionB = accessor.getItemDescription(itemB);
    const labelDescriptionALength = labelA.length + (descriptionA ? descriptionA.length : 0);
    const labelDescriptionBLength = labelB.length + (descriptionB ? descriptionB.length : 0);
    if (labelDescriptionALength !== labelDescriptionBLength) {
        return labelDescriptionALength - labelDescriptionBLength;
    }
    // check for path length and prefer shorter
    const pathA = accessor.getItemPath(itemA);
    const pathB = accessor.getItemPath(itemB);
    if (pathA && pathB && pathA.length !== pathB.length) {
        return pathA.length - pathB.length;
    }
    // 7.) finally we have equal scores and equal length, we fallback to comparer
    // compare by label
    if (labelA !== labelB) {
        return compareAnything(labelA, labelB, query.normalized);
    }
    // compare by description
    if (descriptionA && descriptionB && descriptionA !== descriptionB) {
        return compareAnything(descriptionA, descriptionB, query.normalized);
    }
    // compare by path
    if (pathA && pathB && pathA !== pathB) {
        return compareAnything(pathA, pathB, query.normalized);
    }
    // equal
    return 0;
}
/*
 * If a query is wrapped in quotes, the user does not want to
 * use fuzzy search for this query.
 */
function queryExpectsExactMatch(query) {
    return query.startsWith('"') && query.endsWith('"');
}
/**
 * Helper function to prepare a search value for scoring by removing unwanted characters
 * and allowing to score on multiple pieces separated by whitespace character.
 */
const MULTIPLE_QUERY_VALUES_SEPARATOR = ' ';
export function prepareQuery(original) {
    if (typeof original !== 'string') {
        original = '';
    }
    const originalLowercase = original.toLowerCase();
    const { pathNormalized, normalized, normalizedLowercase } = normalizeQuery(original);
    const containsPathSeparator = pathNormalized.indexOf(sep) >= 0;
    const expectExactMatch = queryExpectsExactMatch(original);
    let values = undefined;
    const originalSplit = original.split(MULTIPLE_QUERY_VALUES_SEPARATOR);
    if (originalSplit.length > 1) {
        for (const originalPiece of originalSplit) {
            const expectExactMatchPiece = queryExpectsExactMatch(originalPiece);
            const { pathNormalized: pathNormalizedPiece, normalized: normalizedPiece, normalizedLowercase: normalizedLowercasePiece, } = normalizeQuery(originalPiece);
            if (normalizedPiece) {
                if (!values) {
                    values = [];
                }
                values.push({
                    original: originalPiece,
                    originalLowercase: originalPiece.toLowerCase(),
                    pathNormalized: pathNormalizedPiece,
                    normalized: normalizedPiece,
                    normalizedLowercase: normalizedLowercasePiece,
                    expectContiguousMatch: expectExactMatchPiece,
                });
            }
        }
    }
    return {
        original,
        originalLowercase,
        pathNormalized,
        normalized,
        normalizedLowercase,
        values,
        containsPathSeparator,
        expectContiguousMatch: expectExactMatch,
    };
}
function normalizeQuery(original) {
    let pathNormalized;
    if (isWindows) {
        pathNormalized = original.replace(/\//g, sep); // Help Windows users to search for paths when using slash
    }
    else {
        pathNormalized = original.replace(/\\/g, sep); // Help macOS/Linux users to search for paths when using backslash
    }
    // we remove quotes here because quotes are used for exact match search
    const normalized = stripWildcards(pathNormalized).replace(/\s|"/g, '');
    return {
        pathNormalized,
        normalized,
        normalizedLowercase: normalized.toLowerCase(),
    };
}
export function pieceToQuery(arg1) {
    if (Array.isArray(arg1)) {
        return prepareQuery(arg1.map((piece) => piece.original).join(MULTIPLE_QUERY_VALUES_SEPARATOR));
    }
    return prepareQuery(arg1.original);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV6enlTY29yZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2Z1enp5U2NvcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNoRCxPQUFPLEVBQ04sYUFBYSxJQUFJLGtCQUFrQixFQUNuQyxVQUFVLEVBRVYsT0FBTyxFQUNQLGFBQWEsR0FDYixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ2hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQU8vRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUE7QUFDbEIsTUFBTSxRQUFRLEdBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFFM0Msc0JBQXNCO0FBQ3RCLDhCQUE4QjtBQUU5QixNQUFNLFVBQVUsVUFBVSxDQUN6QixNQUFjLEVBQ2QsS0FBYSxFQUNiLFVBQWtCLEVBQ2xCLHlCQUFrQztJQUVsQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsT0FBTyxRQUFRLENBQUEsQ0FBQyxnREFBZ0Q7SUFDakUsQ0FBQztJQUVELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDbEMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtJQUVoQyxJQUFJLFlBQVksR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUNo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