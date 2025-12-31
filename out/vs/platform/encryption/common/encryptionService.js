/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IEncryptionService = createDecorator('encryptionService');
export const IEncryptionMainService = createDecorator('encryptionMainService');
// The values provided to the `password-store` command line switch.
// Notice that they are not the same as the values returned by
// `getSelectedStorageBackend` in the `safeStorage` API.
export var PasswordStoreCLIOption;
(function (PasswordStoreCLIOption) {
    PasswordStoreCLIOption["kwallet"] = "kwallet";
    PasswordStoreCLIOption["kwallet5"] = "kwallet5";
    PasswordStoreCLIOption["gnomeLibsecret"] = "gnome-libsecret";
    PasswordStoreCLIOption["basic"] = "basic";
})(PasswordStoreCLIOption || (PasswordStoreCLIOption = {}));
// The values returned by `getSelectedStorageBackend` in the `safeStorage` API.
export var KnownStorageProvider;
(function (KnownStorageProvider) {
    KnownStorageProvider["unknown"] = "unknown";
    KnownStorageProvider["basicText"] = "basic_text";
    // Linux
    KnownStorageProvider["gnomeAny"] = "gnome_any";
    KnownStorageProvider["gnomeLibsecret"] = "gnome_libsecret";
    KnownStorageProvider["gnomeKeyring"] = "gnome_keyring";
    KnownStorageProvider["kwallet"] = "kwallet";
    KnownStorageProvider["kwallet5"] = "kwallet5";
    KnownStorageProvider["kwallet6"] = "kwallet6";
    // The rest of these are not returned by `getSelectedStorageBackend`
    // but these were added for platform completeness.
    // Windows
    KnownStorageProvider["dplib"] = "dpapi";
    // macOS
    KnownStorageProvider["keychainAccess"] = "keychain_access";
})(KnownStorageProvider || (KnownStorageProvider = {}));
export function isKwallet(backend) {
    return (backend === "kwallet" /* KnownStorageProvider.kwallet */ ||
        backend === "kwallet5" /* KnownStorageProvider.kwallet5 */ ||
        backend === "kwallet6" /* KnownStorageProvider.kwallet6 */);
}
export function isGnome(backend) {
    return (backend === "gnome_any" /* KnownStorageProvider.gnomeAny */ ||
        backend === "gnome_libsecret" /* KnownStorageProvider.gnomeLibsecret */ ||
        backend === "gnome_keyring" /* KnownStorageProvider.gnomeKeyring */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbmNyeXB0aW9uL2NvbW1vbi9lbmNyeXB0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFBO0FBTTFGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFhakUsbUVBQW1FO0FBQ25FLDhEQUE4RDtBQUM5RCx3REFBd0Q7QUFDeEQsTUFBTSxDQUFOLElBQWtCLHNCQUtqQjtBQUxELFdBQWtCLHNCQUFzQjtJQUN2Qyw2Q0FBbUIsQ0FBQTtJQUNuQiwrQ0FBcUIsQ0FBQTtJQUNyQiw0REFBa0MsQ0FBQTtJQUNsQyx5Q0FBZSxDQUFBO0FBQ2hCLENBQUMsRUFMaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUt2QztBQUVELCtFQUErRTtBQUMvRSxNQUFNLENBQU4sSUFBa0Isb0JBb0JqQjtBQXBCRCxXQUFrQixvQkFBb0I7SUFDckMsMkNBQW1CLENBQUE7SUFDbkIsZ0RBQXdCLENBQUE7SUFFeEIsUUFBUTtJQUNSLDhDQUFzQixDQUFBO0lBQ3RCLDBEQUFrQyxDQUFBO0lBQ2xDLHNEQUE4QixDQUFBO0lBQzlCLDJDQUFtQixDQUFBO0lBQ25CLDZDQUFxQixDQUFBO0lBQ3JCLDZDQUFxQixDQUFBO0lBRXJCLG9FQUFvRTtJQUNwRSxrREFBa0Q7SUFFbEQsVUFBVTtJQUNWLHVDQUFlLENBQUE7SUFFZixRQUFRO0lBQ1IsMERBQWtDLENBQUE7QUFDbkMsQ0FBQyxFQXBCaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQW9CckM7QUFFRCxNQUFNLFVBQVUsU0FBUyxDQUFDLE9BQWU7SUFDeEMsT0FBTyxDQUNOLE9BQU8saURBQWlDO1FBQ3hDLE9BQU8sbURBQWtDO1FBQ3pDLE9BQU8sbURBQWtDLENBQ3pDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxPQUFlO0lBQ3RDLE9BQU8sQ0FDTixPQUFPLG9EQUFrQztRQUN6QyxPQUFPLGdFQUF3QztRQUMvQyxPQUFPLDREQUFzQyxDQUM3QyxDQUFBO0FBQ0YsQ0FBQyJ9