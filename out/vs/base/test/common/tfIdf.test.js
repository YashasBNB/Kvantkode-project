/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../common/cancellation.js';
import { TfIdfCalculator } from '../../common/tfIdf.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
/**
 * Generates all permutations of an array.
 *
 * This is useful for testing to make sure order does not effect the result.
 */
function permutate(arr) {
    if (arr.length === 0) {
        return [[]];
    }
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const permutationsRest = permutate(rest);
        for (let j = 0; j < permutationsRest.length; j++) {
            result.push([arr[i], ...permutationsRest[j]]);
        }
    }
    return result;
}
function assertScoreOrdersEqual(actualScores, expectedScoreKeys) {
    actualScores.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
    assert.strictEqual(actualScores.length, expectedScoreKeys.length);
    for (let i = 0; i < expectedScoreKeys.length; i++) {
        assert.strictEqual(actualScores[i].key, expectedScoreKeys[i]);
    }
}
suite('TF-IDF Calculator', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Should return no scores when no documents are given', () => {
        const tfidf = new TfIdfCalculator();
        const scores = tfidf.calculateScores('something', CancellationToken.None);
        assertScoreOrdersEqual(scores, []);
    });
    test('Should return no scores for term not in document', () => {
        const tfidf = new TfIdfCalculator().updateDocuments([makeDocument('A', 'cat dog fish')]);
        const scores = tfidf.calculateScores('elepant', CancellationToken.None);
        assertScoreOrdersEqual(scores, []);
    });
    test('Should return scores for document with exact match', () => {
        for (const docs of permutate([
            makeDocument('A', 'cat dog cat'),
            makeDocument('B', 'cat fish'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['A']);
        }
    });
    test('Should return document with more matches first', () => {
        for (const docs of permutate([
            makeDocument('/A', 'cat dog cat'),
            makeDocument('/B', 'cat fish'),
            makeDocument('/C', 'frog'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B']);
        }
    });
    test('Should return document with more matches first when term appears in all documents', () => {
        for (const docs of permutate([
            makeDocument('/A', 'cat dog cat cat'),
            makeDocument('/B', 'cat fish'),
            makeDocument('/C', 'frog cat cat'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/C', '/B']);
        }
    });
    test('Should weigh less common term higher', () => {
        for (const docs of permutate([
            makeDocument('/A', 'cat dog cat'),
            makeDocument('/B', 'fish'),
            makeDocument('/C', 'cat cat cat cat'),
            makeDocument('/D', 'cat fish'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat the dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/C', '/D']);
        }
    });
    test('Should weigh chunks with less common terms higher', () => {
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog']),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/B', '/A']);
        }
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog']),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B', '/B']);
        }
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog']),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('cat the dog', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/B', '/A', '/B']);
        }
        for (const docs of permutate([
            makeDocument('/A', ['cat dog cat', 'fish']),
            makeDocument('/B', ['cat cat cat cat dog', 'dog']),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('lake fish', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A']);
        }
    });
    test('Should ignore case and punctuation', () => {
        for (const docs of permutate([
            makeDocument('/A', 'Cat doG.cat'),
            makeDocument('/B', 'cAt fiSH'),
            makeDocument('/C', 'frOg'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('. ,CaT!  ', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B']);
        }
    });
    test('Should match on camelCase words', () => {
        for (const docs of permutate([
            makeDocument('/A', 'catDog cat'),
            makeDocument('/B', 'fishCatFish'),
            makeDocument('/C', 'frogcat'),
        ])) {
            const tfidf = new TfIdfCalculator().updateDocuments(docs);
            const scores = tfidf.calculateScores('catDOG', CancellationToken.None);
            assertScoreOrdersEqual(scores, ['/A', '/B']);
        }
    });
    test('Should not match document after delete', () => {
        const docA = makeDocument('/A', 'cat dog cat');
        const docB = makeDocument('/B', 'cat fish');
        const docC = makeDocument('/C', 'frog');
        const tfidf = new TfIdfCalculator().updateDocuments([docA, docB, docC]);
        let scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, ['/A', '/B']);
        tfidf.deleteDocument(docA.key);
        scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, ['/B']);
        tfidf.deleteDocument(docC.key);
        scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, ['/B']);
        tfidf.deleteDocument(docB.key);
        scores = tfidf.calculateScores('cat', CancellationToken.None);
        assertScoreOrdersEqual(scores, []);
    });
});
function makeDocument(key, content) {
    return {
        key,
        textChunks: Array.isArray(content) ? content : [content],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdGZJZGYudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBNkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUNsRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEU7Ozs7R0FJRztBQUNILFNBQVMsU0FBUyxDQUFJLEdBQVE7SUFDN0IsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUE7SUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMs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