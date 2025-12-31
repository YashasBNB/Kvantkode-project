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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV6enlTY29yZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9mdXp6eVNjb3Jlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDaEQsT0FBTyxFQUNOLGFBQWEsSUFBSSxrQkFBa0IsRUFDbkMsVUFBVSxFQUVWLE9BQU8sRUFDUCxhQUFhLEdBQ2IsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQy9CLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2xELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFPL0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFBO0FBQ2xCLE1BQU0sUUFBUSxHQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBRTNDLHNCQUFzQjtBQUN0Qiw4QkFBOEI7QUFFOUIsTUFBTSxVQUFVLFVBQVUsQ0FDekIsTUFBYyxFQUNkLEtBQWEsRUFDYixVQUFrQixFQUNsQix5QkFBa0M7SUFFbEMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sUUFBUSxDQUFBLENBQUMsZ0RBQWdEO0lBQ2pFLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7SUFFaEMsSUFBSSxZQUFZLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFDaEMsT0FBTyxRQUFRLENBQUEsQ0FBQyxp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