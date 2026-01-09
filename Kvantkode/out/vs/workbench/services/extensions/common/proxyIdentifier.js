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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlJZGVudGlmaWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vcHJveHlJZGVudGlmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNkJoRyxNQUFNLE9BQU8sZUFBZTthQUNiLFVBQUssR0FBRyxDQUFDLEFBQUosQ0FBSTtJQU12QixZQUFZLEdBQVc7UUFMdkIsMEJBQXFCLEdBQVMsU0FBUyxDQUFBO1FBTXRDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2QsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUE7SUFDbkMsQ0FBQzs7QUFHRixNQUFNLFdBQVcsR0FBMkIsRUFBRSxDQUFBO0FBRTlDLE1BQU0sVUFBVSxxQkFBcUIsQ0FBSSxVQUFrQjtJQUMxRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBSSxVQUFVLENBQUMsQ0FBQTtJQUNqRCxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtJQUNoQyxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUF1QkQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLEdBQVc7SUFDdEQsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFBO0FBQzVCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyw2QkFBNkI7SUFDekMsWUFBNEIsS0FBUTtRQUFSLFVBQUssR0FBTCxLQUFLLENBQUc7SUFBRyxDQUFDO0NBQ3hDIn0=