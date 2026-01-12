/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function countMapFrom(values) {
    const map = new Map();
    for (const value of values) {
        map.set(value, (map.get(value) ?? 0) + 1);
    }
    return map;
}
/**
 * Implementation of tf-idf (term frequency-inverse document frequency) for a set of
 * documents where each document contains one or more chunks of text.
 * Each document is identified by a key, and the score for each document is computed
 * by taking the max score over all the chunks in the document.
 */
export class TfIdfCalculator {
    constructor() {
        /**
         * Total number of chunks
         */
        this.chunkCount = 0;
        this.chunkOccurrences = new Map();
        this.documents = new Map();
    }
    calculateScores(query, token) {
        const embedding = this.computeEmbedding(query);
        const idfCache = new Map();
        const scores = [];
        // For each document, generate one score
        for (const [key, doc] of this.documents) {
            if (token.isCancellationRequested) {
                return [];
            }
            for (const chunk of doc.chunks) {
                const score = this.computeSimilarityScore(chunk, embedding, idfCache);
                if (score > 0) {
                    scores.push({ key, score });
                }
            }
        }
        return scores;
    }
    /**
     * Count how many times each term (word) appears in a string.
     */
    static termFrequencies(input) {
        return countMapFrom(TfIdfCalculator.splitTerms(input));
    }
    /**
     * Break a string into terms (words).
     */
    static *splitTerms(input) {
        const normalize = (word) => word.toLowerCase();
        // Only match on words that are at least 3 characters long and start with a letter
        for (const [word] of input.matchAll(/\b\p{Letter}[\p{Letter}\d]{2,}\b/gu)) {
            yield normalize(word);
            const camelParts = word.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/g);
            if (camelParts.length > 1) {
                for (const part of camelParts) {
                    // Require at least 3 letters in the parts of a camel case word
                    if (part.length > 2 && /\p{Letter}{3,}/gu.test(part)) {
                        yield normalize(part);
                    }
                }
            }
        }
    }
    updateDocuments(documents) {
        for (const { key } of documents) {
            this.deleteDocument(key);
        }
        for (const doc of documents) {
            const chunks = [];
            for (const text of doc.textChunks) {
                // TODO: See if we can compute the tf lazily
                // The challenge is that we need to also update the `chunkOccurrences`
                // and all of those updates need to get flushed before the real TF-IDF of
                // anything is computed.
                const tf = TfIdfCalculator.termFrequencies(text);
                // Update occurrences list
                for (const term of tf.keys()) {
                    this.chunkOccurrences.set(term, (this.chunkOccurrences.get(term) ?? 0) + 1);
                }
                chunks.push({ text, tf });
            }
            this.chunkCount += chunks.length;
            this.documents.set(doc.key, { chunks });
        }
        return this;
    }
    deleteDocument(key) {
        const doc = this.documents.get(key);
        if (!doc) {
            return;
        }
        this.documents.delete(key);
        this.chunkCount -= doc.chunks.length;
        // Update term occurrences for the document
        for (const chunk of doc.chunks) {
            for (const term of chunk.tf.keys()) {
                const currentOccurrences = this.chunkOccurrences.get(term);
                if (typeof currentOccurrences === 'number') {
                    const newOccurrences = currentOccurrences - 1;
                    if (newOccurrences <= 0) {
                        this.chunkOccurrences.delete(term);
                    }
                    else {
                        this.chunkOccurrences.set(term, newOccurrences);
                    }
                }
            }
        }
    }
    computeSimilarityScore(chunk, queryEmbedding, idfCache) {
        // Compute the dot product between the chunk's embedding and the query embedding
        // Note that the chunk embedding is computed lazily on a per-term basis.
        // This lets us skip a large number of calculations because the majority
        // of chunks do not share any terms with the query.
        let sum = 0;
        for (const [term, termTfidf] of Object.entries(queryEmbedding)) {
            const chunkTf = chunk.tf.get(term);
            if (!chunkTf) {
                // Term does not appear in chunk so it has no contribution
                continue;
            }
            let chunkIdf = idfCache.get(term);
            if (typeof chunkIdf !== 'number') {
                chunkIdf = this.computeIdf(term);
                idfCache.set(term, chunkIdf);
            }
            const chunkTfidf = chunkTf * chunkIdf;
            sum += chunkTfidf * termTfidf;
        }
        return sum;
    }
    computeEmbedding(input) {
        const tf = TfIdfCalculator.termFrequencies(input);
        return this.computeTfidf(tf);
    }
    computeIdf(term) {
        const chunkOccurrences = this.chunkOccurrences.get(term) ?? 0;
        return chunkOccurrences > 0 ? Math.log((this.chunkCount + 1) / chunkOccurrences) : 0;
    }
    computeTfidf(termFrequencies) {
        const embedding = Object.create(null);
        for (const [word, occurrences] of termFrequencies) {
            const idf = this.computeIdf(word);
            if (idf > 0) {
                embedding[word] = occurrences * idf;
            }
        }
        return embedding;
    }
}
/**
 * Normalize the scores to be between 0 and 1 and sort them decending.
 * @param scores array of scores from {@link TfIdfCalculator.calculateScores}
 * @returns normalized scores
 */
export function normalizeTfIdfScores(scores) {
    // copy of scores
    const result = scores.slice(0);
    // sort descending
    result.sort((a, b) => b.score - a.score);
    // normalize
    const max = result[0]?.score ?? 0;
    if (max > 0) {
        for (const score of result) {
            score.score /= max;
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3RmSWRmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBUWhHLFNBQVMsWUFBWSxDQUFJLE1BQW1CO0lBQzNDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUE7SUFDaEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM1QixHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFBO0FBQ1gsQ0FBQztBQTRCRDs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxlQUFlO0lBQTVCO1FBbURDOztXQUVHO1FBQ0ssZUFBVSxHQUFHLENBQUMsQ0FBQTtRQUVMLHFCQUFnQixHQUF3QixJQUFJLEdBQUcsRUFHN0QsQ0FBQTtRQUVjLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFLakMsQ0FBQTtJQTBHSixDQUFDO0lBM0tBLGVBQWUsQ0FBQyxLQUFhLEVBQUUsS0FBd0I7UUFDdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1FBQzFDLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUE7UUFDL0Isd0NBQXdDO1FBQ3hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxFQUFFLENBQUE7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