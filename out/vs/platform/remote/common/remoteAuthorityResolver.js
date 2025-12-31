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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL3JlbW90ZUF1dGhvcml0eVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxlQUFlLENBQzdELGdDQUFnQyxDQUNoQyxDQUFBO0FBRUQsTUFBTSxDQUFOLElBQWtCLG9CQUdqQjtBQUhELFdBQWtCLG9CQUFvQjtJQUNyQyx5RUFBUyxDQUFBO0lBQ1QscUVBQU8sQ0FBQTtBQUNSLENBQUMsRUFIaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUdyQztBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsWUFBNEIsRUFBVTtRQUFWLE9BQUUsR0FBRixFQUFFLENBQVE7UUFGdEIsU0FBSSx3Q0FBK0I7SUFFVixDQUFDO0lBRW5DLFFBQVE7UUFDZCxPQUFPLFdBQVcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFBO0lBQzdCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFHckMsWUFDaUIsSUFBWSxFQUNaLElBQVk7UUFEWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUpiLFNBQUksMENBQWlDO0lBS2xELENBQUM7SUFFRyxRQUFRO1FBQ2QsT0FBTyxhQUFhLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUFBO0lBQzlDLENBQUM7Q0FDRDtBQWtERCxNQUFNLENBQU4sSUFBWSxnQ0FNWDtBQU5ELFdBQVksZ0NBQWdDO0lBQzNDLHVEQUFtQixDQUFBO0lBQ25CLGlFQUE2QixDQUFBO0lBQzdCLHVGQUFtRCxDQUFBO0lBQ25ELHVFQUFtQyxDQUFBO0lBQ25DLHlFQUFxQyxDQUFBO0FBQ3RDLENBQUMsRUFOVyxnQ0FBZ0MsS0FBaEMsZ0NBQWdDLFFBTTNDO0FBRUQsTUFBTSxPQUFPLDRCQUE2QixTQUFRLGdCQUFnQjtJQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQVE7UUFDcEMsT0FBTyxDQUNOLEdBQUcsWUFBWSw0QkFBNEI7WUFDM0MsR0FBRyxDQUFDLEtBQUssS0FBSyxnQ0FBZ0MsQ0FBQyxZQUFZLENBQzNELENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLHlCQUF5QixDQUFDLEdBQVE7UUFDL0MsT0FBTyxDQUNOLEdBQUcsWUFBWSw0QkFBNEI7WUFDM0MsR0FBRyxDQUFDLEtBQUssS0FBSyxnQ0FBZ0MsQ0FBQyx1QkFBdUIsQ0FDdEUsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBUTtRQUN2QyxPQUFPLENBQ04sR0FBRyxZQUFZLDRCQUE0QjtZQUMzQyxHQUFHLENBQUMsS0FBSyxLQUFLLGdDQUFnQyxDQUFDLGVBQWUsQ0FDOUQsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBUTtRQUN4QyxPQUFPLENBQ04sR0FBRyxZQUFZLDRCQUE0QjtZQUMzQyxHQUFHLENBQUMsS0FBSyxLQUFLLGdDQUFnQyxDQUFDLGdCQUFnQixDQUMvRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBUTtRQUMvQixPQUFPLEdBQUcsWUFBWSw0QkFBNEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFBO0lBQ3BFLENBQUM7SUFRRCxZQUNDLE9BQWdCLEVBQ2hCLE9BQXlDLGdDQUFnQyxDQUFDLE9BQU8sRUFDakYsTUFBWTtRQUVaLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVkLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxLQUFLLGdDQUFnQyxDQUFDLFlBQVksSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFBO1FBRTFGLDRFQUE0RTtRQUM1RSwrSUFBK0k7UUFDL0ksTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDcEUsQ0FBQztDQUNEO0FBNEJELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxlQUF1QjtJQUMvRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlDLElBQUksU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEIsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUNELE9BQU8sZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7QUFDL0MsQ0FBQyJ9