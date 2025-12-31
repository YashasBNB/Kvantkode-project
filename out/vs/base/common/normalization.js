/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from './map.js';
const nfcCache = new LRUCache(10000); // bounded to 10000 elements
export function normalizeNFC(str) {
    return normalize(str, 'NFC', nfcCache);
}
const nfdCache = new LRUCache(10000); // bounded to 10000 elements
export function normalizeNFD(str) {
    return normalize(str, 'NFD', nfdCache);
}
const nonAsciiCharactersPattern = /[^\u0000-\u0080]/;
function normalize(str, form, normalizedCache) {
    if (!str) {
        return str;
    }
    const cached = normalizedCache.get(str);
    if (cached) {
        return cached;
    }
    let res;
    if (nonAsciiCharactersPattern.test(str)) {
        res = str.normalize(form);
    }
    else {
        res = str;
    }
    // Use the cache for fast lookup
    normalizedCache.set(str, res);
    return res;
}
export const removeAccents = (function () {
    // transform into NFD form and remove accents
    // see: https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript/37511463#37511463
    const regex = /[\u0300-\u036f]/g;
    return function (str) {
        return normalizeNFD(str).replace(regex, '');
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL25vcm1hbGl6YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUVuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBaUIsS0FBSyxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7QUFDakYsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFXO0lBQ3ZDLE9BQU8sU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDdkMsQ0FBQztBQUVELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFpQixLQUFLLENBQUMsQ0FBQSxDQUFDLDRCQUE0QjtBQUNqRixNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQVc7SUFDdkMsT0FBTyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUN2QyxDQUFDO0FBRUQsTUFBTSx5QkFBeUIsR0FBRyxrQkFBa0IsQ0FBQTtBQUNwRCxTQUFTLFNBQVMsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLGVBQXlDO0lBQ3RGLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNaLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELElBQUksR0FBVyxDQUFBO0lBQ2YsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO1NBQU0sQ0FBQztRQUNQLEdBQUcsR0FBRyxHQUFHLENBQUE7SUFDVixDQUFDO0lBRUQsZ0NBQWdDO0lBQ2hDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBRTdCLE9BQU8sR0FBRyxDQUFBO0FBQ1gsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBNEIsQ0FBQztJQUN0RCw2Q0FBNkM7SUFDN0Msd0hBQXdIO0lBQ3hILE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFBO0lBQ2hDLE9BQU8sVUFBVSxHQUFXO1FBQzNCLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFBO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQSJ9