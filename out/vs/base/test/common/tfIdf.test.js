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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi90ZklkZi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUE2QixNQUFNLHVCQUF1QixDQUFBO0FBQ2xGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRTs7OztHQUlHO0FBQ0gsU0FBUyxTQUFTLENBQUksR0FBUTtJQUM3QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ1osQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQTtJQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMs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