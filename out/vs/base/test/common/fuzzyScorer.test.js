/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { compareItemsByFuzzyScore, pieceToQuery, prepareQuery, scoreFuzzy, scoreFuzzy2, scoreItemFuzzy, } from '../../common/fuzzyScorer.js';
import { Schemas } from '../../common/network.js';
import { basename, dirname, posix, sep, win32 } from '../../common/path.js';
import { isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
class ResourceAccessorClass {
    getItemLabel(resource) {
        return basename(resource.fsPath);
    }
    getItemDescription(resource) {
        return dirname(resource.fsPath);
    }
    getItemPath(resource) {
        return resource.fsPath;
    }
}
const ResourceAccessor = new ResourceAccessorClass();
class ResourceWithSlashAccessorClass {
    getItemLabel(resource) {
        return basename(resource.fsPath);
    }
    getItemDescription(resource) {
        return posix.normalize(dirname(resource.path));
    }
    getItemPath(resource) {
        return posix.normalize(resource.path);
    }
}
const ResourceWithSlashAccessor = new ResourceWithSlashAccessorClass();
class ResourceWithBackslashAccessorClass {
    getItemLabel(resource) {
        return basename(resource.fsPath);
    }
    getItemDescription(resource) {
        return win32.normalize(dirname(resource.path));
    }
    getItemPath(resource) {
        return win32.normalize(resource.path);
    }
}
const ResourceWithBackslashAccessor = new ResourceWithBackslashAccessorClass();
class NullAccessorClass {
    getItemLabel(resource) {
        return undefined;
    }
    getItemDescription(resource) {
        return undefined;
    }
    getItemPath(resource) {
        return undefined;
    }
}
function _doScore(target, query, allowNonContiguousMatches) {
    const preparedQuery = prepareQuery(query);
    return scoreFuzzy(target, preparedQuery.normalized, preparedQuery.normalizedLowercase, allowNonContiguousMatches ?? !preparedQuery.expectContiguousMatch);
}
function _doScore2(target, query, matchOffset = 0) {
    const preparedQuery = prepareQuery(query);
    return scoreFuzzy2(target, preparedQuery, 0, matchOffset);
}
function scoreItem(item, query, allowNonContiguousMatches, accessor, cache = Object.create(null)) {
    return scoreItemFuzzy(item, prepareQuery(query), allowNonContiguousMatches, accessor, cache);
}
function compareItemsByScore(itemA, itemB, query, allowNonContiguousMatches, accessor) {
    return compareItemsByFuzzyScore(itemA, itemB, prepareQuery(query), allowNonContiguousMatches, accessor, Object.create(null));
}
const NullAccessor = new NullAccessorClass();
suite('Fuzzy Scorer', () => {
    test('score (fuzzy)', function () {
        const target = 'HelLo-World';
        const scores = [];
        scores.push(_doScore(target, 'HelLo-World', true)); // direct case match
        scores.push(_doScore(target, 'hello-world', true)); // direct mix-case match
        scores.push(_doScore(target, 'HW', true)); // direct case prefix (multiple)
        scores.push(_doScore(target, 'hw', true)); // direct mix-case prefix (multiple)
        scores.push(_doScore(target, 'H', true)); // direct case prefix
        scores.push(_doScore(target, 'h', true)); // direct mix-case prefix
        scores.push(_doScore(target, 'W', true)); // direct case word prefix
        scores.push(_doScore(target, 'Ld', true)); // in-string case match (multiple)
        scores.push(_doScore(target, 'ld', true)); // in-string mix-case match (consecutive, avoids scattered hit)
        scores.push(_doScore(target, 'w', true)); // direct mix-case word prefix
        scores.push(_doScore(target, 'L', true)); // in-string case match
        scores.push(_doScore(target, 'l', true)); // in-string mix-case match
        scores.push(_doScore(target, '4', true)); // no match
        // Assert scoring order
        const sortedScores = scores.concat().sort((a, b) => b[0] - a[0]);
        assert.deepStrictEqual(scores, sortedScores);
        // Assert scoring positions
        // let positions = scores[0][1];
        // assert.strictEqual(positions.length, 'HelLo-World'.length);
        // positions = scores[2][1];
        // assert.strictEqual(positions.length, 'HW'.length);
        // assert.strictEqual(positions[0], 0);
        // assert.strictEqual(positions[1], 6);
    });
    test('score (non fuzzy)', function () {
        const target = 'HelLo-World';
        assert.ok(_doScore(target, 'HelLo-World', false)[0] > 0);
        assert.strictEqual(_doScore(target, 'HelLo-World', false)[1].length, 'HelLo-World'.length);
        assert.ok(_doScore(target, 'hello-world', false)[0] > 0);
        assert.strictEqual(_doScore(target, 'HW', false)[0], 0);
        assert.ok(_doScore(target, 'h', false)[0] > 0);
        assert.ok(_doScore(target, 'ello', false)[0] > 0);
        assert.ok(_doScore(target, 'ld', false)[0] > 0);
        assert.strictEqual(_doScore(target, 'eo', false)[0], 0);
    });
    test('scoreItem - matches are proper', function () {
        let res = scoreItem(null, 'something', true, ResourceAccessor);
        assert.ok(!res.score);
        const resource = URI.file('/xyz/some/path/someFile123.txt');
        res = scoreItem(resource, 'something', true, NullAccessor);
        assert.ok(!res.score);
        // Path Identity
        const identityRes = scoreItem(resource, ResourceAccessor.getItemPath(resource), true, ResourceAccessor);
        assert.ok(identityRes.score);
        assert.strictEqual(identityRes.descriptionMatch.length, 1);
        assert.strictEqual(identityRes.labelMatch.length, 1);
        assert.strictEqual(identityRes.descriptionMatch[0].start, 0);
        assert.strictEqual(identityRes.descriptionMatch[0].end, ResourceAccessor.getItemDescription(resource).length);
        assert.strictEqual(identityRes.labelMatch[0].start, 0);
        assert.strictEqual(identityRes.labelMatch[0].end, ResourceAccessor.getItemLabel(resource).length);
        // Basename Prefix
        const basenamePrefixRes = scoreItem(resource, 'som', true, ResourceAccessor);
        assert.ok(basenamePrefixRes.score);
        assert.ok(!basenamePrefixRes.descriptionMatch);
        assert.strictEqual(basenamePrefixRes.labelMatch.length, 1);
        assert.strictEqual(basenamePrefixRes.labelMatch[0].start, 0);
        assert.strictEqual(basenamePrefixRes.labelMatch[0].end, 'som'.length);
        // Basename Camelcase
        const basenameCamelcaseRes = scoreItem(resource, 'sF', true, ResourceAccessor);
        assert.ok(basenameCamelcaseRes.score);
        assert.ok(!basenameCamelcaseRes.descriptionMatch);
        assert.strictEqual(basenameCamelcaseRes.labelMatch.length, 2);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[0].start, 0);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[0].end, 1);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[1].start, 4);
        assert.strictEqual(basenameCamelcaseRes.labelMatch[1].end, 5);
        // Basename Match
        const basenameRes = scoreItem(resource, 'of', true, ResourceAccessor);
        assert.ok(basenameRes.score);
        assert.ok(!basenameRes.descriptionMatch);
        assert.strictEqual(basenameRes.labelMatch.length, 2);
        assert.strictEqual(basenameRes.labelMatch[0].start, 1);
        assert.strictEqual(basenameRes.labelMatch[0].end, 2);
        assert.strictEqual(basenameRes.labelMatch[1].start, 4);
        assert.strictEqual(basenameRes.labelMatch[1].end, 5);
        // Path Match
        const pathRes = scoreItem(resource, 'xyz123', true, ResourceAccessor);
        assert.ok(pathRes.score);
        assert.ok(pathRes.descriptionMatch);
        assert.ok(pathRes.labelMatch);
        assert.strictEqual(pathRes.labelMatch.length, 1);
        assert.strictEqual(pathRes.labelMatch[0].start, 8);
        assert.strictEqual(pathRes.labelMatch[0].end, 11);
        assert.strictEqual(pathRes.descriptionMatch.length, 1);
        assert.strictEqual(pathRes.descriptionMatch[0].start, 1);
        assert.strictEqual(pathRes.descriptionMatch[0].end, 4);
        // No Match
        const noRes = scoreItem(resource, '987', true, ResourceAccessor);
        assert.ok(!noRes.score);
        assert.ok(!noRes.labelMatch);
        assert.ok(!noRes.descriptionMatch);
        // No Exact Match
        const noExactRes = scoreItem(resource, '"sF"', true, ResourceAccessor);
        assert.ok(!noExactRes.score);
        assert.ok(!noExactRes.labelMatch);
        assert.ok(!noExactRes.descriptionMatch);
        assert.strictEqual(noRes.score, noExactRes.score);
        // Verify Scores
        assert.ok(identityRes.score > basenamePrefixRes.score);
        assert.ok(basenamePrefixRes.score > basenameRes.score);
        assert.ok(basenameRes.score > pathRes.score);
        assert.ok(pathRes.score > noRes.score);
    });
    test('scoreItem - multiple', function () {
        const resource = URI.file('/xyz/some/path/someFile123.txt');
        const res1 = scoreItem(resource, 'xyz some', true, ResourceAccessor);
        assert.ok(res1.score);
        assert.strictEqual(res1.labelMatch?.length, 1);
        assert.strictEqual(res1.labelMatch[0].start, 0);
        assert.strictEqual(res1.labelMatch[0].end, 4);
        assert.strictEqual(res1.descriptionMatch?.length, 1);
        assert.strictEqual(res1.descriptionMatch[0].start, 1);
        assert.strictEqual(res1.descriptionMatch[0].end, 4);
        const res2 = scoreItem(resource, 'some xyz', true, ResourceAccessor);
        assert.ok(res2.score);
        assert.strictEqual(res1.score, res2.score);
        assert.strictEqual(res2.labelMatch?.length, 1);
        assert.strictEqual(res2.labelMatch[0].start, 0);
        assert.strictEqual(res2.labelMatch[0].end, 4);
        assert.strictEqual(res2.descriptionMatch?.length, 1);
        assert.strictEqual(res2.descriptionMatch[0].start, 1);
        assert.strictEqual(res2.descriptionMatch[0].end, 4);
        const res3 = scoreItem(resource, 'some xyz file file123', true, ResourceAccessor);
        assert.ok(res3.score);
        assert.ok(res3.score > res2.score);
        assert.strictEqual(res3.labelMatch?.length, 1);
        assert.strictEqual(res3.labelMatch[0].start, 0);
        assert.strictEqual(res3.labelMatch[0].end, 11);
        assert.strictEqual(res3.descriptionMatch?.length, 1);
        assert.strictEqual(res3.descriptionMatch[0].start, 1);
        assert.strictEqual(res3.descriptionMatch[0].end, 4);
        const res4 = scoreItem(resource, 'path z y', true, ResourceAccessor);
        assert.ok(res4.score);
        assert.ok(res4.score < res2.score);
        assert.strictEqual(res4.labelMatch?.length, 0);
        assert.strictEqual(res4.descriptionMatch?.length, 2);
        assert.strictEqual(res4.descriptionMatch[0].start, 2);
        assert.strictEqual(res4.descriptionMatch[0].end, 4);
        assert.strictEqual(res4.descriptionMatch[1].start, 10);
        assert.strictEqual(res4.descriptionMatch[1].end, 14);
    });
    test('scoreItem - multiple with cache yields different results', function () {
        const resource = URI.file('/xyz/some/path/someFile123.txt');
        const cache = {};
        const res1 = scoreItem(resource, 'xyz sm', true, ResourceAccessor, cache);
        assert.ok(res1.score);
        // from the cache's perspective this should be a totally different query
        const res2 = scoreItem(resource, 'xyz "sm"', true, ResourceAccessor, cache);
        assert.ok(!res2.score);
    });
    test('scoreItem - invalid input', function () {
        let res = scoreItem(null, null, true, ResourceAccessor);
        assert.strictEqual(res.score, 0);
        res = scoreItem(null, 'null', true, ResourceAccessor);
        assert.strictEqual(res.score, 0);
    });
    test('scoreItem - optimize for file paths', function () {
        const resource = URI.file('/xyz/others/spath/some/xsp/file123.txt');
        // xsp is more relevant to the end of the file path even though it matches
        // fuzzy also in the beginning. we verify the more relevant match at the
        // end gets returned.
        const pathRes = scoreItem(resource, 'xspfile123', true, ResourceAccessor);
        assert.ok(pathRes.score);
        assert.ok(pathRes.descriptionMatch);
        assert.ok(pathRes.labelMatch);
        assert.strictEqual(pathRes.labelMatch.length, 1);
        assert.strictEqual(pathRes.labelMatch[0].start, 0);
        assert.strictEqual(pathRes.labelMatch[0].end, 7);
        assert.strictEqual(pathRes.descriptionMatch.length, 1);
        assert.strictEqual(pathRes.descriptionMatch[0].start, 23);
        assert.strictEqual(pathRes.descriptionMatch[0].end, 26);
    });
    test('scoreItem - avoid match scattering (bug #36119)', function () {
        const resource = URI.file('projects/ui/cula/ats/target.mk');
        const pathRes = scoreItem(resource, 'tcltarget.mk', true, ResourceAccessor);
        assert.ok(pathRes.score);
        assert.ok(pathRes.descriptionMatch);
        assert.ok(pathRes.labelMatch);
        assert.strictEqual(pathRes.labelMatch.length, 1);
        assert.strictEqual(pathRes.labelMatch[0].start, 0);
        assert.strictEqual(pathRes.labelMatch[0].end, 9);
    });
    test('scoreItem - prefers more compact matches', function () {
        const resource = URI.file('/1a111d1/11a1d1/something.txt');
        // expect "ad" to be matched towards the end of the file because the
        // match is more compact
        const res = scoreItem(resource, 'ad', true, ResourceAccessor);
        assert.ok(res.score);
        assert.ok(res.descriptionMatch);
        assert.ok(!res.labelMatch.length);
        assert.strictEqual(res.descriptionMatch.length, 2);
        assert.strictEqual(res.descriptionMatch[0].start, 11);
        assert.strictEqual(res.descriptionMatch[0].end, 12);
        assert.strictEqual(res.descriptionMatch[1].start, 13);
        assert.strictEqual(res.descriptionMatch[1].end, 14);
    });
    test('scoreItem - proper target offset', function () {
        const resource = URI.file('etem');
        const res = scoreItem(resource, 'teem', true, ResourceAccessor);
        assert.ok(!res.score);
    });
    test('scoreItem - proper target offset #2', function () {
        const resource = URI.file('ede');
        const res = scoreItem(resource, 'de', true, ResourceAccessor);
        assert.strictEqual(res.labelMatch.length, 1);
        assert.strictEqual(res.labelMatch[0].start, 1);
        assert.strictEqual(res.labelMatch[0].end, 3);
    });
    test('scoreItem - proper target offset #3', function () {
        const resource = URI.file('/src/vs/editor/browser/viewParts/lineNumbers/flipped-cursor-2x.svg');
        const res = scoreItem(resource, 'debug', true, ResourceAccessor);
        assert.strictEqual(res.descriptionMatch.length, 3);
        assert.strictEqual(res.descriptionMatch[0].start, 9);
        assert.strictEqual(res.descriptionMatch[0].end, 10);
        assert.strictEqual(res.descriptionMatch[1].start, 36);
        assert.strictEqual(res.descriptionMatch[1].end, 37);
        assert.strictEqual(res.descriptionMatch[2].start, 40);
        assert.strictEqual(res.descriptionMatch[2].end, 41);
        assert.strictEqual(res.labelMatch.length, 2);
        assert.strictEqual(res.labelMatch[0].start, 9);
        assert.strictEqual(res.labelMatch[0].end, 10);
        assert.strictEqual(res.labelMatch[1].start, 20);
        assert.strictEqual(res.labelMatch[1].end, 21);
    });
    test('scoreItem - no match unless query contained in sequence', function () {
        const resource = URI.file('abcde');
        const res = scoreItem(resource, 'edcda', true, ResourceAccessor);
        assert.ok(!res.score);
    });
    test('scoreItem - match if using slash or backslash (local, remote resource)', function () {
        const localResource = URI.file('abcde/super/duper');
        const remoteResource = URI.from({ scheme: Schemas.vscodeRemote, path: 'abcde/super/duper' });
        for (const resource of [localResource, remoteResource]) {
            let res = scoreItem(resource, 'abcde\\super\\duper', true, ResourceAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde\\super\\duper', true, ResourceWithSlashAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde\\super\\duper', true, ResourceWithBackslashAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde/super/duper', true, ResourceAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde/super/duper', true, ResourceWithSlashAccessor);
            assert.ok(res.score);
            res = scoreItem(resource, 'abcde/super/duper', true, ResourceWithBackslashAccessor);
            assert.ok(res.score);
        }
    });
    test('scoreItem - ensure upper case bonus only applies on non-consecutive matches (bug #134723)', function () {
        const resourceWithUpper = URI.file('ASDFasdfasdf');
        const resourceAllLower = URI.file('asdfasdfasdf');
        assert.ok(scoreItem(resourceAllLower, 'asdf', true, ResourceAccessor).score >
            scoreItem(resourceWithUpper, 'asdf', true, ResourceAccessor).score);
    });
    test('compareItemsByScore - identity', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Full resource A path
        let query = ResourceAccessor.getItemPath(resourceA);
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Full resource B path
        query = ResourceAccessor.getItemPath(resourceB);
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - basename prefix', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Full resource A basename
        let query = ResourceAccessor.getItemLabel(resourceA);
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Full resource B basename
        query = ResourceAccessor.getItemLabel(resourceB);
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - basename camelcase', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // resource A camelcase
        let query = 'fA';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // resource B camelcase
        query = 'fB';
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - basename scores', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Resource A part of basename
        let query = 'fileA';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Resource B part of basename
        query = 'fileB';
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - path scores', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Resource A part of path
        let query = 'pathfileA';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        // Resource B part of path
        query = 'pathfileB';
        res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer shorter basenames', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileBLonger.txt');
        const resourceC = URI.file('/unrelated/the/path/other/fileC.txt');
        // Resource A part of path
        const query = 'somepath';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer shorter basenames (match on basename)', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileBLonger.txt');
        const resourceC = URI.file('/unrelated/the/path/other/fileC.txt');
        // Resource A part of path
        const query = 'file';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
    });
    test('compareFilesByScore - prefer shorter paths', function () {
        const resourceA = URI.file('/some/path/fileA.txt');
        const resourceB = URI.file('/some/path/other/fileB.txt');
        const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');
        // Resource A part of path
        const query = 'somepath';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer shorter paths (bug #17443)', function () {
        const resourceA = URI.file('config/test/t1.js');
        const resourceB = URI.file('config/test.js');
        const resourceC = URI.file('config/test/t2.js');
        const query = 'co/te';
        const res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        assert.strictEqual(res[2], resourceC);
    });
    test('compareFilesByScore - prefer matches in label over description if scores are otherwise equal', function () {
        const resourceA = URI.file('parts/quick/arrow-left-dark.svg');
        const resourceB = URI.file('parts/quickopen/quickopen.ts');
        const query = 'partsquick';
        const res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer camel case matches', function () {
        const resourceA = URI.file('config/test/NullPointerException.java');
        const resourceB = URI.file('config/test/nopointerexception.java');
        for (const query of ['npe', 'NPE']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer more compact camel case matches', function () {
        const resourceA = URI.file('config/test/openthisAnythingHandler.js');
        const resourceB = URI.file('config/test/openthisisnotsorelevantforthequeryAnyHand.js');
        const query = 'AH';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer more compact matches (label)', function () {
        const resourceA = URI.file('config/test/examasdaple.js');
        const resourceB = URI.file('config/test/exampleasdaasd.ts');
        const query = 'xp';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer more compact matches (path)', function () {
        const resourceA = URI.file('config/test/examasdaple/file.js');
        const resourceB = URI.file('config/test/exampleasdaasd/file.ts');
        const query = 'xp';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - prefer more compact matches (label and path)', function () {
        const resourceA = URI.file('config/example/thisfile.ts');
        const resourceB = URI.file('config/24234243244/example/file.js');
        const query = 'exfile';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
    });
    test('compareFilesByScore - avoid match scattering (bug #34210)', function () {
        const resourceA = URI.file('node_modules1/bundle/lib/model/modules/ot1/index.js');
        const resourceB = URI.file('node_modules1/bundle/lib/model/modules/un1/index.js');
        const resourceC = URI.file('node_modules1/bundle/lib/model/modules/modu1/index.js');
        const resourceD = URI.file('node_modules1/bundle/lib/model/modules/oddl1/index.js');
        let query = isWindows ? 'modu1\\index.js' : 'modu1/index.js';
        let res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        query = isWindows ? 'un1\\index.js' : 'un1/index.js';
        res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #21019 1.)', function () {
        const resourceA = URI.file('app/containers/Services/NetworkData/ServiceDetails/ServiceLoad/index.js');
        const resourceB = URI.file('app/containers/Services/NetworkData/ServiceDetails/ServiceDistribution/index.js');
        const resourceC = URI.file('app/containers/Services/NetworkData/ServiceDetailTabs/ServiceTabs/StatVideo/index.js');
        const query = 'StatVideoindex';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
    });
    test('compareFilesByScore - avoid match scattering (bug #21019 2.)', function () {
        const resourceA = URI.file('src/build-helper/store/redux.ts');
        const resourceB = URI.file('src/repository/store/redux.ts');
        const query = 'reproreduxts';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #26649)', function () {
        const resourceA = URI.file('photobook/src/components/AddPagesButton/index.js');
        const resourceB = URI.file('photobook/src/components/ApprovalPageHeader/index.js');
        const resourceC = URI.file('photobook/src/canvasComponents/BookPage/index.js');
        const query = 'bookpageIndex';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceC);
    });
    test('compareFilesByScore - avoid match scattering (bug #33247)', function () {
        const resourceA = URI.file('ui/src/utils/constants.js');
        const resourceB = URI.file('ui/src/ui/Icons/index.js');
        const query = isWindows ? 'ui\\icons' : 'ui/icons';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #33247 comment)', function () {
        const resourceA = URI.file('ui/src/components/IDInput/index.js');
        const resourceB = URI.file('ui/src/ui/Input/index.js');
        const query = isWindows ? 'ui\\input\\index' : 'ui/input/index';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #36166)', function () {
        const resourceA = URI.file('django/contrib/sites/locale/ga/LC_MESSAGES/django.mo');
        const resourceB = URI.file('django/core/signals.py');
        const query = 'djancosig';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #32918)', function () {
        const resourceA = URI.file('adsys/protected/config.php');
        const resourceB = URI.file('adsys/protected/framework/smarty/sysplugins/smarty_internal_config.php');
        const resourceC = URI.file('duowanVideo/wap/protected/config.php');
        const query = 'protectedconfig.php';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
        res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceC);
        assert.strictEqual(res[2], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #14879)', function () {
        const resourceA = URI.file('pkg/search/gradient/testdata/constraint_attrMatchString.yml');
        const resourceB = URI.file('cmd/gradient/main.go');
        const query = 'gradientmain';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #14727 1)', function () {
        const resourceA = URI.file('alpha-beta-cappa.txt');
        const resourceB = URI.file('abc.txt');
        const query = 'abc';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #14727 2)', function () {
        const resourceA = URI.file('xerxes-yak-zubba/index.js');
        const resourceB = URI.file('xyz/index.js');
        const query = 'xyz';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #18381)', function () {
        const resourceA = URI.file('AssymblyInfo.cs');
        const resourceB = URI.file('IAsynchronousTask.java');
        const query = 'async';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #35572)', function () {
        const resourceA = URI.file('static/app/source/angluar/-admin/-organization/-settings/layout/layout.js');
        const resourceB = URI.file('static/app/source/angular/-admin/-project/-settings/_settings/settings.js');
        const query = 'partisettings';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #36810)', function () {
        const resourceA = URI.file('Trilby.TrilbyTV.Web.Portal/Views/Systems/Index.cshtml');
        const resourceB = URI.file('Trilby.TrilbyTV.Web.Portal/Areas/Admins/Views/Tips/Index.cshtml');
        const query = 'tipsindex.cshtml';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - prefer shorter hit (bug #20546)', function () {
        const resourceA = URI.file('editor/core/components/tests/list-view-spec.js');
        const resourceB = URI.file('editor/core/components/list-view.js');
        const query = 'listview';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - avoid match scattering (bug #12095)', function () {
        const resourceA = URI.file('src/vs/workbench/contrib/files/common/explorerViewModel.ts');
        const resourceB = URI.file('src/vs/workbench/contrib/files/browser/views/explorerView.ts');
        const resourceC = URI.file('src/vs/workbench/contrib/files/browser/views/explorerViewer.ts');
        const query = 'filesexplorerview.ts';
        let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceA, resourceC, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - prefer case match (bug #96122)', function () {
        const resourceA = URI.file('lists.php');
        const resourceB = URI.file('lib/Lists.php');
        const query = 'Lists.php';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
    });
    test('compareFilesByScore - prefer shorter match (bug #103052) - foo bar', function () {
        const resourceA = URI.file('app/emails/foo.bar.js');
        const resourceB = URI.file('app/emails/other-footer.other-bar.js');
        for (const query of ['foo bar', 'foobar']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer shorter match (bug #103052) - payment model', function () {
        const resourceA = URI.file('app/components/payment/payment.model.js');
        const resourceB = URI.file('app/components/online-payments-history/online-payments-history.model.js');
        for (const query of ['payment model', 'paymentmodel']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer shorter match (bug #103052) - color', function () {
        const resourceA = URI.file('app/constants/color.js');
        const resourceB = URI.file('app/components/model/input/pick-avatar-color.js');
        for (const query of ['color js', 'colorjs']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceA);
            assert.strictEqual(res[1], resourceB);
        }
    });
    test('compareFilesByScore - prefer strict case prefix', function () {
        const resourceA = URI.file('app/constants/color.js');
        const resourceB = URI.file('app/components/model/input/Color.js');
        let query = 'Color';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceB);
        assert.strictEqual(res[1], resourceA);
        query = 'color';
        res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
    });
    test('compareFilesByScore - prefer prefix (bug #103052)', function () {
        const resourceA = URI.file('test/smoke/src/main.ts');
        const resourceB = URI.file('src/vs/editor/common/services/semantikTokensProviderStyling.ts');
        const query = 'smoke main.ts';
        let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
        res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
        assert.strictEqual(res[0], resourceA);
        assert.strictEqual(res[1], resourceB);
    });
    test('compareFilesByScore - boost better prefix match if multiple queries are used', function () {
        const resourceA = URI.file('src/vs/workbench/services/host/browser/browserHostService.ts');
        const resourceB = URI.file('src/vs/workbench/browser/workbench.ts');
        for (const query of [
            'workbench.ts browser',
            'browser workbench.ts',
            'browser workbench',
            'workbench browser',
        ]) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('compareFilesByScore - boost shorter prefix match if multiple queries are used', function () {
        const resourceA = URI.file('src/vs/workbench/node/actions/windowActions.ts');
        const resourceB = URI.file('src/vs/workbench/electron-node/window.ts');
        for (const query of ['window node', 'window.ts node']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('compareFilesByScore - skip preference on label match when using path sep', function () {
        const resourceA = URI.file('djangosite/ufrela/def.py');
        const resourceB = URI.file('djangosite/urls/default.py');
        for (const query of ['url/def']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('compareFilesByScore - boost shorter prefix match if multiple queries are used (#99171)', function () {
        const resourceA = URI.file('mesh_editor_lifetime_job.h');
        const resourceB = URI.file('lifetime_job.h');
        for (const query of ['m life, life m']) {
            let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
            res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
            assert.strictEqual(res[0], resourceB);
            assert.strictEqual(res[1], resourceA);
        }
    });
    test('prepareQuery', () => {
        assert.strictEqual(prepareQuery(' f*a ').normalized, 'fa');
        assert.strictEqual(prepareQuery('model Tester.ts').original, 'model Tester.ts');
        assert.strictEqual(prepareQuery('model Tester.ts').originalLowercase, 'model Tester.ts'.toLowerCase());
        assert.strictEqual(prepareQuery('model Tester.ts').normalized, 'modelTester.ts');
        assert.strictEqual(prepareQuery('model Tester.ts').expectContiguousMatch, false); // doesn't have quotes in it
        assert.strictEqual(prepareQuery('Model Tester.ts').normalizedLowercase, 'modeltester.ts');
        assert.strictEqual(prepareQuery('ModelTester.ts').containsPathSeparator, false);
        assert.strictEqual(prepareQuery('Model' + sep + 'Tester.ts').containsPathSeparator, true);
        assert.strictEqual(prepareQuery('"hello"').expectContiguousMatch, true);
        assert.strictEqual(prepareQuery('"hello"').normalized, 'hello');
        // with spaces
        let query = prepareQuery('He*llo World');
        assert.strictEqual(query.original, 'He*llo World');
        assert.strictEqual(query.normalized, 'HelloWorld');
        assert.strictEqual(query.normalizedLowercase, 'HelloWorld'.toLowerCase());
        assert.strictEqual(query.values?.length, 2);
        assert.strictEqual(query.values?.[0].original, 'He*llo');
        assert.strictEqual(query.values?.[0].normalized, 'Hello');
        assert.strictEqual(query.values?.[0].normalizedLowercase, 'Hello'.toLowerCase());
        assert.strictEqual(query.values?.[1].original, 'World');
        assert.strictEqual(query.values?.[1].normalized, 'World');
        assert.strictEqual(query.values?.[1].normalizedLowercase, 'World'.toLowerCase());
        const restoredQuery = pieceToQuery(query.values);
        assert.strictEqual(restoredQuery.original, query.original);
        assert.strictEqual(restoredQuery.values?.length, query.values?.length);
        assert.strictEqual(restoredQuery.containsPathSeparator, query.containsPathSeparator);
        // with spaces that are empty
        query = prepareQuery(' Hello   World  	');
        assert.strictEqual(query.original, ' Hello   World  	');
        assert.strictEqual(query.originalLowercase, ' Hello   World  	'.toLowerCase());
        assert.strictEqual(query.normalized, 'HelloWorld');
        assert.strictEqual(query.normalizedLowercase, 'HelloWorld'.toLowerCase());
        assert.strictEqual(query.values?.length, 2);
        assert.strictEqual(query.values?.[0].original, 'Hello');
        assert.strictEqual(query.values?.[0].originalLowercase, 'Hello'.toLowerCase());
        assert.strictEqual(query.values?.[0].normalized, 'Hello');
        assert.strictEqual(query.values?.[0].normalizedLowercase, 'Hello'.toLowerCase());
        assert.strictEqual(query.values?.[1].original, 'World');
        assert.strictEqual(query.values?.[1].originalLowercase, 'World'.toLowerCase());
        assert.strictEqual(query.values?.[1].normalized, 'World');
        assert.strictEqual(query.values?.[1].normalizedLowercase, 'World'.toLowerCase());
        // Path related
        if (isWindows) {
            assert.strictEqual(prepareQuery('C:\\some\\path').pathNormalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:\\some\\path').normalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:\\some\\path').containsPathSeparator, true);
            assert.strictEqual(prepareQuery('C:/some/path').pathNormalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:/some/path').normalized, 'C:\\some\\path');
            assert.strictEqual(prepareQuery('C:/some/path').containsPathSeparator, true);
        }
        else {
            assert.strictEqual(prepareQuery('/some/path').pathNormalized, '/some/path');
            assert.strictEqual(prepareQuery('/some/path').normalized, '/some/path');
            assert.strictEqual(prepareQuery('/some/path').containsPathSeparator, true);
            assert.strictEqual(prepareQuery('\\some\\path').pathNormalized, '/some/path');
            assert.strictEqual(prepareQuery('\\some\\path').normalized, '/some/path');
            assert.strictEqual(prepareQuery('\\some\\path').containsPathSeparator, true);
        }
    });
    test('fuzzyScore2 (matching)', function () {
        const target = 'HelLo-World';
        for (const offset of [0, 3]) {
            let [score, matches] = _doScore2(offset === 0 ? target : `123${target}`, 'HelLo-World', offset);
            assert.ok(score);
            assert.strictEqual(matches.length, 1);
            assert.strictEqual(matches[0].start, 0 + offset);
            assert.strictEqual(matches[0].end, target.length + offset);
            [score, matches] = _doScore2(offset === 0 ? target : `123${target}`, 'HW', offset);
            assert.ok(score);
            assert.strictEqual(matches.length, 2);
            assert.strictEqual(matches[0].start, 0 + offset);
            assert.strictEqual(matches[0].end, 1 + offset);
            assert.strictEqual(matches[1].start, 6 + offset);
            assert.strictEqual(matches[1].end, 7 + offset);
        }
    });
    test('fuzzyScore2 (multiple queries)', function () {
        const target = 'HelLo-World';
        const [firstSingleScore, firstSingleMatches] = _doScore2(target, 'HelLo');
        const [secondSingleScore, secondSingleMatches] = _doScore2(target, 'World');
        const firstAndSecondSingleMatches = [
            ...(firstSingleMatches || []),
            ...(secondSingleMatches || []),
        ];
        let [multiScore, multiMatches] = _doScore2(target, 'HelLo World');
        function assertScore() {
            assert.ok(multiScore ?? 0 >= (firstSingleScore ?? 0) + (secondSingleScore ?? 0));
            for (let i = 0; multiMatches && i < multiMatches.length; i++) {
                const multiMatch = multiMatches[i];
                const firstAndSecondSingleMatch = firstAndSecondSingleMatches[i];
                if (multiMatch && firstAndSecondSingleMatch) {
                    assert.strictEqual(multiMatch.start, firstAndSecondSingleMatch.start);
                    assert.strictEqual(multiMatch.end, firstAndSecondSingleMatch.end);
                }
                else {
                    assert.fail();
                }
            }
        }
        function assertNoScore() {
            assert.strictEqual(multiScore, undefined);
            assert.strictEqual(multiMatches.length, 0);
        }
        assertScore();
        [multiScore, multiMatches] = _doScore2(target, 'World HelLo');
        assertScore();
        [multiScore, multiMatches] = _doScore2(target, 'World HelLo World');
        assertScore();
        [multiScore, multiMatches] = _doScore2(target, 'World HelLo Nothing');
        assertNoScore();
        [multiScore, multiMatches] = _doScore2(target, 'More Nothing');
        assertNoScore();
    });
    test('fuzzyScore2 (#95716)', function () {
        const target = '# ❌ Wow';
        const score = _doScore2(target, '❌');
        assert.ok(score);
        assert.ok(typeof score[0] === 'number');
        assert.ok(score[1].length > 0);
    });
    test('Using quotes should expect contiguous matches match', function () {
        // missing the "i" in the query
        assert.strictEqual(_doScore('contiguous', '"contguous"')[0], 0);
        const score = _doScore('contiguous', '"contiguous"');
        assert.strictEqual(score[0], 253);
    });
    test('Using quotes should highlight contiguous indexes', function () {
        const score = _doScore('2021-7-26.md', '"26"');
        assert.strictEqual(score[0], 13);
        // The indexes of the 2 and 6 of "26"
        assert.strictEqual(score[1][0], 7);
        assert.strictEqual(score[1][1], 8);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV6enlTY29yZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZnV6enlTY29yZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLHdCQUF3QixFQU14QixZQUFZLEVBQ1osWUFBWSxFQUNaLFVBQVUsRUFDVixXQUFXLEVBQ1gsY0FBYyxHQUNkLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsTUFBTSxxQkFBcUI7SUFDMUIsWUFBWSxDQUFDLFFBQWE7UUFDekIsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUFhO1FBQy9CLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWE7UUFDeEIsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFBO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFBO0FBRXBELE1BQU0sOEJBQThCO0lBQ25DLFlBQVksQ0FBQyxRQUFh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QU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkQsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFD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VyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVyQyx1QkFBdUI7UUFDdkIsS0FBSyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUvQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUN2RCxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FDMUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRXJDLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQ3ZELG1CQUFtQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUMxRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNB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QUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVyQyx1QkFBdUI7UUFDdkIsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUVaLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQ3ZELG1CQUFtQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUMxRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFckMsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FDdkQsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQzFELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFD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QUUsU0FBUyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFckMsMEJBQTBCO1FBQzFCLEtBQUssR0FBRyxXQUFXLENBQUE7UUFFbkIsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FDdkQsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQzFELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVyQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUN2RCxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FDMUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FB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dkQsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQzFELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRTtRQUNsRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDbEQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQTtRQUVsRSwwQkFBMEI7UUFDMUIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFBO1FBRXhCLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FDM0QsbUJBQW1CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQzFELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMs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