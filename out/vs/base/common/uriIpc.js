/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from './buffer.js';
import { URI } from './uri.js';
function toJSON(uri) {
    return uri.toJSON();
}
export class URITransformer {
    constructor(uriTransformer) {
        this._uriTransformer = uriTransformer;
    }
    transformIncoming(uri) {
        const result = this._uriTransformer.transformIncoming(uri);
        return result === uri ? uri : toJSON(URI.from(result));
    }
    transformOutgoing(uri) {
        const result = this._uriTransformer.transformOutgoing(uri);
        return result === uri ? uri : toJSON(URI.from(result));
    }
    transformOutgoingURI(uri) {
        const result = this._uriTransformer.transformOutgoing(uri);
        return result === uri ? uri : URI.from(result);
    }
    transformOutgoingScheme(scheme) {
        return this._uriTransformer.transformOutgoingScheme(scheme);
    }
}
export const DefaultURITransformer = new (class {
    transformIncoming(uri) {
        return uri;
    }
    transformOutgoing(uri) {
        return uri;
    }
    transformOutgoingURI(uri) {
        return uri;
    }
    transformOutgoingScheme(scheme) {
        return scheme;
    }
})();
function _transformOutgoingURIs(obj, transformer, depth) {
    if (!obj || depth > 200) {
        return null;
    }
    if (typeof obj === 'object') {
        if (obj instanceof URI) {
            return transformer.transformOutgoing(obj);
        }
        // walk object (or array)
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const r = _transformOutgoingURIs(obj[key], transformer, depth + 1);
                if (r !== null) {
                    obj[key] = r;
                }
            }
        }
    }
    return null;
}
export function transformOutgoingURIs(obj, transformer) {
    const result = _transformOutgoingURIs(obj, transformer, 0);
    if (result === null) {
        // no change
        return obj;
    }
    return result;
}
function _transformIncomingURIs(obj, transformer, revive, depth) {
    if (!obj || depth > 200) {
        return null;
    }
    if (typeof obj === 'object') {
        if (obj.$mid === 1 /* MarshalledId.Uri */) {
            return revive
                ? URI.revive(transformer.transformIncoming(obj))
                : transformer.transformIncoming(obj);
        }
        if (obj instanceof VSBuffer) {
            return null;
        }
        // walk object (or array)
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const r = _transformIncomingURIs(obj[key], transformer, revive, depth + 1);
                if (r !== null) {
                    obj[key] = r;
                }
            }
        }
    }
    return null;
}
export function transformIncomingURIs(obj, transformer) {
    const result = _transformIncomingURIs(obj, transformer, false, 0);
    if (result === null) {
        // no change
        return obj;
    }
    return result;
}
export function transformAndReviveIncomingURIs(obj, transformer) {
    const result = _transformIncomingURIs(obj, transformer, true, 0);
    if (result === null) {
        // no change
        return obj;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdXJpSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHdEMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxVQUFVLENBQUE7QUF1QjdDLFNBQVMsTUFBTSxDQUFDLEdBQVE7SUFDdkIsT0FBNEIsR0FBRyxDQUFDLE1BQU0sRUFBRyxDQUFBO0FBQzFDLENBQUM7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUcxQixZQUFZLGNBQWtDO1FBQzdDLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO0lBQ3RDLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxHQUFrQjtRQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFELE9BQU8sTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxHQUFrQjtRQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFELE9BQU8sTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxHQUFRO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMs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