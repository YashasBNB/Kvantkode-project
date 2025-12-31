/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ProxyIdentifier {
    static { this.count = 0; }
    constructor(sid) {
        this._proxyIdentifierBrand = undefined;
        this.sid = sid;
        this.nid = ++ProxyIdentifier.count;
    }
}
const identifiers = [];
export function createProxyIdentifier(identifier) {
    const result = new ProxyIdentifier(identifier);
    identifiers[result.nid] = result;
    return result;
}
export function getStringIdentifierForProxy(nid) {
    return identifiers[nid].sid;
}
/**
 * Marks the object as containing buffers that should be serialized more efficiently.
 */
export class SerializableObjectWithBuffers {
    constructor(value) {
        this.value = value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlJZGVudGlmaWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL3Byb3h5SWRlbnRpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTZCaEcsTUFBTSxPQUFPLGVBQWU7YUFDYixVQUFLLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFNdkIsWUFBWSxHQUFXO1FBTHZCLDBCQUFxQixHQUFTLFNBQVMsQ0FBQTtRQU10QyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQTtRQUNkLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFBO0lBQ25DLENBQUM7O0FBR0YsTUFBTSxXQUFXLEdBQTJCLEVBQUUsQ0FBQTtBQUU5QyxNQUFNLFVBQVUscUJBQXFCLENBQUksVUFBa0I7SUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUksVUFBVSxDQUFDLENBQUE7SUFDakQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUE7SUFDaEMsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBdUJELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxHQUFXO0lBQ3RELE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtBQUM1QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNkJBQTZCO0lBQ3pDLFlBQTRCLEtBQVE7UUFBUixVQUFLLEdBQUwsS0FBSyxDQUFHO0lBQUcsQ0FBQztDQUN4QyJ9