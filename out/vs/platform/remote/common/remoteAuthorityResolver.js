/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IRemoteAuthorityResolverService = createDecorator('remoteAuthorityResolverService');
export var RemoteConnectionType;
(function (RemoteConnectionType) {
    RemoteConnectionType[RemoteConnectionType["WebSocket"] = 0] = "WebSocket";
    RemoteConnectionType[RemoteConnectionType["Managed"] = 1] = "Managed";
})(RemoteConnectionType || (RemoteConnectionType = {}));
export class ManagedRemoteConnection {
    constructor(id) {
        this.id = id;
        this.type = 1 /* RemoteConnectionType.Managed */;
    }
    toString() {
        return `Managed(${this.id})`;
    }
}
export class WebSocketRemoteConnection {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.type = 0 /* RemoteConnectionType.WebSocket */;
    }
    toString() {
        return `WebSocket(${this.host}:${this.port})`;
    }
}
export var RemoteAuthorityResolverErrorCode;
(function (RemoteAuthorityResolverErrorCode) {
    RemoteAuthorityResolverErrorCode["Unknown"] = "Unknown";
    RemoteAuthorityResolverErrorCode["NotAvailable"] = "NotAvailable";
    RemoteAuthorityResolverErrorCode["TemporarilyNotAvailable"] = "TemporarilyNotAvailable";
    RemoteAuthorityResolverErrorCode["NoResolverFound"] = "NoResolverFound";
    RemoteAuthorityResolverErrorCode["InvalidAuthority"] = "InvalidAuthority";
})(RemoteAuthorityResolverErrorCode || (RemoteAuthorityResolverErrorCode = {}));
export class RemoteAuthorityResolverError extends ErrorNoTelemetry {
    static isNotAvailable(err) {
        return (err instanceof RemoteAuthorityResolverError &&
            err._code === RemoteAuthorityResolverErrorCode.NotAvailable);
    }
    static isTemporarilyNotAvailable(err) {
        return (err instanceof RemoteAuthorityResolverError &&
            err._code === RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable);
    }
    static isNoResolverFound(err) {
        return (err instanceof RemoteAuthorityResolverError &&
            err._code === RemoteAuthorityResolverErrorCode.NoResolverFound);
    }
    static isInvalidAuthority(err) {
        return (err instanceof RemoteAuthorityResolverError &&
            err._code === RemoteAuthorityResolverErrorCode.InvalidAuthority);
    }
    static isHandled(err) {
        return err instanceof RemoteAuthorityResolverError && err.isHandled;
    }
    constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
        super(message);
        this._message = message;
        this._code = code;
        this._detail = detail;
        this.isHandled = code === RemoteAuthorityResolverErrorCode.NotAvailable && detail === true;
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, RemoteAuthorityResolverError.prototype);
    }
}
export function getRemoteAuthorityPrefix(remoteAuthority) {
    const plusIndex = remoteAuthority.indexOf('+');
    if (plusIndex === -1) {
        return remoteAuthority;
    }
    return remoteAuthority.substring(0, plusIndex);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9jb21tb24vcmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGVBQWUsQ0FDN0QsZ0NBQWdDLENBQ2hDLENBQUE7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBR2pCO0FBSEQsV0FBa0Isb0JBQW9CO0lBQ3JDLHlFQUFTLENBQUE7SUFDVCxxRUFBTyxDQUFBO0FBQ1IsQ0FBQyxFQUhpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBR3JDO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUduQyxZQUE0QixFQUFVO1FBQVYsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUZ0QixTQUFJLHdDQUErQjtJQUVWLENBQUM7SUFFbkMsUUFBUTtRQUNkLE9BQU8sV0FBVyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUE7SUFDN0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUdyQyxZQUNpQixJQUFZLEVBQ1osSUFBWTtRQURaLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBSmIsU0FBSSwwQ0FBaUM7SUFLbEQsQ0FBQztJQUVHLFFBQVE7UUFDZCxPQUFPLGFBQWEsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUE7SUFDOUMsQ0FBQztDQUNEO0FBa0RELE1BQU0sQ0FBTixJQUFZLGdDQU1YO0FBTkQsV0FBWSxnQ0FBZ0M7SUFDM0MsdURBQW1CLENBQUE7SUFDbkIsaUVBQTZCLENBQUE7SUFDN0IsdUZBQW1ELENBQUE7SUFDbkQsdUVBQW1DLENBQUE7SUFDbkMseUVBQXFDLENBQUE7QUFDdEMsQ0FBQyxFQU5XLGdDQUFnQyxLQUFoQyxnQ0FBZ0MsUUFNM0M7QUFFRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsZ0JBQWdCO0lBQzFELE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBUTtRQUNwQyxPQUFPLENBQ04sR0FBRyxZQUFZLDRCQUE0QjtZQUMzQyxHQUFHLENBQUMsS0FBSyxLQUFLLGdDQUFnQyxDQUFDLFlBQVksQ0FDM0QsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMseUJBQXlCLENBQUMsR0FBUTtRQUMvQyxPQUFPLENBQ04sR0FBRyxZQUFZLDRCQUE0QjtZQUMzQyxHQUFHLENBQUMsS0FBSyxLQUFLLGdDQUFnQyxDQUFDLHVCQUF1QixDQUN0RSxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFRO1FBQ3ZDLE9BQU8sQ0FDTixHQUFHLFlBQVksNEJBQTRCO1lBQzNDLEdBQUcsQ0FBQyxLQUFLLEtBQUssZ0NBQWdDLENBQUMsZUFBZSxDQUM5RCxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFRO1FBQ3hDLE9BQU8sQ0FDTixHQUFHLFlBQVksNEJBQTRCO1lBQzNDLEdBQUcsQ0FBQyxLQUFLLEtBQUssZ0NBQWdDLENBQUMsZ0JBQWdCLENBQy9ELENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFRO1FBQy9CLE9BQU8sR0FBRyxZQUFZLDRCQUE0QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUE7SUFDcEUsQ0FBQztJQVFELFlBQ0MsT0FBZ0IsRUFDaEIsT0FBeUMsZ0NBQWdDLENBQUMsT0FBTyxFQUNqRixNQUFZO1FBRVosS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRWQsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFFckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEtBQUssZ0NBQWdDLENBQUMsWUFBWSxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUE7UUFFMUYsNEVBQTRFO1FBQzVFLCtJQUErSTtRQUMvSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0NBQ0Q7QUE0QkQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLGVBQXVCO0lBQy9ELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDOUMsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0QixPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBQ0QsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUMvQyxDQUFDIn0=