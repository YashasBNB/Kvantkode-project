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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGZJZGYuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi90ZklkZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxTQUFTLFlBQVksQ0FBSSxNQUFtQjtJQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFBO0lBQ2hDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7UUFDNUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNYLENBQUM7QUE0QkQ7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sZUFBZTtJQUE1QjtRQW1EQzs7V0FFRztRQUNLLGVBQVUsR0FBRyxDQUFDLENBQUE7UUFFTCxxQkFBZ0IsR0FBd0IsSUFBSSxHQUFHLEVBRzdELENBQUE7UUFFYyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBS2pDLENBQUE7SUEwR0osQ0FBQztJQTNLQSxlQUFlLENBQUMsS0FBYSxFQUFFLEtBQXdCO1FBQ3RELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUMxQyxNQUFNLE1BQU0sR0FBaUIsRUFBRSxDQUFBO1FBQy9CLHdDQUF3QztRQUN4QyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25DLE9BQU8sRUFBRSxDQUFBO1lBQ1Ys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