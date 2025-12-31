/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from './arrays.js';
import { Iterable } from './iterator.js';
import { generateUuid } from './uuid.js';
export function createStringDataTransferItem(stringOrPromise, id) {
    return {
        id,
        asString: async () => stringOrPromise,
        asFile: () => undefined,
        value: typeof stringOrPromise === 'string' ? stringOrPromise : undefined,
    };
}
export function createFileDataTransferItem(fileName, uri, data, id) {
    const file = { id: generateUuid(), name: fileName, uri, data };
    return {
        id,
        asString: async () => '',
        asFile: () => file,
        value: undefined,
    };
}
export class VSDataTransfer {
    constructor() {
        this._entries = new Map();
    }
    get size() {
        let size = 0;
        for (const _ of this._entries) {
            size++;
        }
        return size;
    }
    has(mimeType) {
        return this._entries.has(this.toKey(mimeType));
    }
    matches(pattern) {
        const mimes = [...this._entries.keys()];
        if (Iterable.some(this, ([_, item]) => item.asFile())) {
            mimes.push('files');
        }
        return matchesMimeType_normalized(normalizeMimeType(pattern), mimes);
    }
    get(mimeType) {
        return this._entries.get(this.toKey(mimeType))?.[0];
    }
    /**
     * Add a new entry to this data transfer.
     *
     * This does not replace existing entries for `mimeType`.
     */
    append(mimeType, value) {
        const existing = this._entries.get(mimeType);
        if (existing) {
            existing.push(value);
        }
        else {
            this._entries.set(this.toKey(mimeType), [value]);
        }
    }
    /**
     * Set the entry for a given mime type.
     *
     * This replaces all existing entries for `mimeType`.
     */
    replace(mimeType, value) {
        this._entries.set(this.toKey(mimeType), [value]);
    }
    /**
     * Remove all entries for `mimeType`.
     */
    delete(mimeType) {
        this._entries.delete(this.toKey(mimeType));
    }
    /**
     * Iterate over all `[mime, item]` pairs in this data transfer.
     *
     * There may be multiple entries for each mime type.
     */
    *[Symbol.iterator]() {
        for (const [mine, items] of this._entries) {
            for (const item of items) {
                yield [mine, item];
            }
        }
    }
    toKey(mimeType) {
        return normalizeMimeType(mimeType);
    }
}
function normalizeMimeType(mimeType) {
    return mimeType.toLowerCase();
}
export function matchesMimeType(pattern, mimeTypes) {
    return matchesMimeType_normalized(normalizeMimeType(pattern), mimeTypes.map(normalizeMimeType));
}
function matchesMimeType_normalized(normalizedPattern, normalizedMimeTypes) {
    // Anything wildcard
    if (normalizedPattern === '*/*') {
        return normalizedMimeTypes.length > 0;
    }
    // Exact match
    if (normalizedMimeTypes.includes(normalizedPattern)) {
        return true;
    }
    // Wildcard, such as `image/*`
    const wildcard = normalizedPattern.match(/^([a-z]+)\/([a-z]+|\*)$/i);
    if (!wildcard) {
        return false;
    }
    const [_, type, subtype] = wildcard;
    if (subtype === '*') {
        return normalizedMimeTypes.some((mime) => mime.startsWith(type + '/'));
    }
    return false;
}
export const UriList = Object.freeze({
    // http://amundsen.com/hypermedia/urilist/
    create: (entries) => {
        return distinct(entries.map((x) => x.toString())).join('\r\n');
    },
    split: (str) => {
        return str.split('\r\n');
    },
    parse: (str) => {
        return UriList.split(str).filter((value) => !value.startsWith('#'));
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVRyYW5zZmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZGF0YVRyYW5zZmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBZ0J4QyxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLGVBQXlDLEVBQ3pDLEVBQVc7SUFFWCxPQUFPO1FBQ04sRUFBRTtRQUNGLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLGVBQWU7UUFDckMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7UUFDdkIsS0FBSyxFQUFFLE9BQU8sZUFBZSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQ3hFLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxRQUFnQixFQUNoQixHQUFvQixFQUNwQixJQUErQixFQUMvQixFQUFXO0lBRVgsTUFBTSxJQUFJLEdBQUcsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDOUQsT0FBTztRQUNOLEVBQUU7UUFDRixRQUFRLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1FBQ3hCLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1FBQ2xCLEtBQUssRUFBRSxTQUFTO0tBQ2hCLENBQUE7QUFDRixDQUFDO0FBZ0NELE1BQU0sT0FBTyxjQUFjO0lBQTNCO1FBQ2tCLGFBQVEsR0FBRyxJQUFJLEdBQUcs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