/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
export var UIKind;
(function (UIKind) {
    UIKind[UIKind["Desktop"] = 1] = "Desktop";
    UIKind[UIKind["Web"] = 2] = "Web";
})(UIKind || (UIKind = {}));
export var ExtensionHostExitCode;
(function (ExtensionHostExitCode) {
    // nodejs uses codes 1-13 and exit codes >128 are signal exits
    ExtensionHostExitCode[ExtensionHostExitCode["VersionMismatch"] = 55] = "VersionMismatch";
    ExtensionHostExitCode[ExtensionHostExitCode["UnexpectedError"] = 81] = "UnexpectedError";
})(ExtensionHostExitCode || (ExtensionHostExitCode = {}));
export var MessageType;
(function (MessageType) {
    MessageType[MessageType["Initialized"] = 0] = "Initialized";
    MessageType[MessageType["Ready"] = 1] = "Ready";
    MessageType[MessageType["Terminate"] = 2] = "Terminate";
})(MessageType || (MessageType = {}));
export function createMessageOfType(type) {
    const result = VSBuffer.alloc(1);
    switch (type) {
        case 0 /* MessageType.Initialized */:
            result.writeUInt8(1, 0);
            break;
        case 1 /* MessageType.Ready */:
            result.writeUInt8(2, 0);
            break;
        case 2 /* MessageType.Terminate */:
            result.writeUInt8(3, 0);
            break;
    }
    return result;
}
export function isMessageOfType(message, type) {
    if (message.byteLength !== 1) {
        return false;
    }
    switch (message.readUInt8(0)) {
        case 1:
            return type === 0 /* MessageType.Initialized */;
        case 2:
            return type === 1 /* MessageType.Ready */;
        case 3:
            return type === 2 /* MessageType.Terminate */;
        default:
            return false;
    }
}
export var NativeLogMarkers;
(function (NativeLogMarkers) {
    NativeLogMarkers["Start"] = "START_NATIVE_LOG";
    NativeLogMarkers["End"] = "END_NATIVE_LOG";
})(NativeLogMarkers || (NativeLogMarkers = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb3RvY29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uSG9zdFByb3RvY29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQTRGNUQsTUFBTSxDQUFOLElBQVksTUFHWDtBQUhELFdBQVksTUFBTTtJQUNqQix5Q0FBVyxDQUFBO0lBQ1gsaUNBQU8sQ0FBQTtBQUNSLENBQUMsRUFIVyxNQUFNLEtBQU4sTUFBTSxRQUdqQjtBQUVELE1BQU0sQ0FBTixJQUFrQixxQkFJakI7QUFKRCxXQUFrQixxQkFBcUI7SUFDdEMsOERBQThEO0lBQzlELHdGQUFvQixDQUFBO0lBQ3BCLHdGQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFKaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUl0QztBQWtCRCxNQUFNLENBQU4sSUFBa0IsV0FJakI7QUFKRCxXQUFrQixXQUFXO0lBQzVCLDJEQUFXLENBQUE7SUFDWCwrQ0FBSyxDQUFBO0lBQ0wsdURBQVMsQ0FBQTtBQUNWLENBQUMsRUFKaUIsV0FBVyxLQUFYLFdBQVcsUUFJNUI7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsSUFBaUI7SUFDcEQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVoQyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQ2Q7WUFDQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFLO1FBQ047WUFDQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFLO1FBQ047WUFDQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFLO0lBQ1AsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBaUIsRUFBRSxJQUFpQjtJQUNuRSxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsUUFBUSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUIsS0FBSyxDQUFDO1lBQ0wsT0FBTyxJQUFJLG9DQUE0QixDQUFBO1FBQ3hDLEtBQUssQ0FBQztZQUNMLE9BQU8sSUFBSSw4QkFBc0IsQ0FBQTtRQUNsQyxLQUFLLENBQUM7WUFDTCxPQUFPLElBQUksa0NBQTBCLENBQUE7UUFDdEM7WUFDQyxPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGdCQUdqQjtBQUhELFdBQWtCLGdCQUFnQjtJQUNqQyw4Q0FBMEIsQ0FBQTtJQUMxQiwwQ0FBc0IsQ0FBQTtBQUN2QixDQUFDLEVBSGlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFHakMifQ==