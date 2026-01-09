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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2VuY3J5cHRpb24vY29tbW9uL2VuY3J5cHRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUE7QUFNMUYsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsdUJBQXVCLENBQUMsQ0FBQTtBQWFqRSxtRUFBbUU7QUFDbkUsOERBQThEO0FBQzlELHdEQUF3RDtBQUN4RCxNQUFNLENBQU4sSUFBa0Isc0JBS2pCO0FBTEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLDZDQUFtQixDQUFBO0lBQ25CLCtDQUFxQixDQUFBO0lBQ3JCLDREQUFrQyxDQUFBO0lBQ2xDLHlDQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUxpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBS3ZDO0FBRUQsK0VBQStFO0FBQy9FLE1BQU0sQ0FBTixJQUFrQixvQkFvQmpCO0FBcEJELFdBQWtCLG9CQUFvQjtJQUNyQywyQ0FBbUIsQ0FBQTtJQUNuQixnREFBd0IsQ0FBQTtJQUV4QixRQUFRO0lBQ1IsOENBQXNCLENBQUE7SUFDdEIsMERBQWtDLENBQUE7SUFDbEMsc0RBQThCLENBQUE7SUFDOUIsMkNBQW1CLENBQUE7SUFDbkIsNkNBQXFCLENBQUE7SUFDckIsNkNBQXFCLENBQUE7SUFFckIsb0VBQW9FO0lBQ3BFLGtEQUFrRDtJQUVsRCxVQUFVO0lBQ1YsdUNBQWUsQ0FBQTtJQUVmLFFBQVE7SUFDUiwwREFBa0MsQ0FBQTtBQUNuQyxDQUFDLEVBcEJpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBb0JyQztBQUVELE1BQU0sVUFBVSxTQUFTLENBQUMsT0FBZTtJQUN4QyxPQUFPLENBQ04sT0FBTyxpREFBaUM7UUFDeEMsT0FBTyxtREFBa0M7UUFDekMsT0FBTyxtREFBa0MsQ0FDekMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsT0FBTyxDQUFDLE9BQWU7SUFDdEMsT0FBTyxDQUNOLE9BQU8sb0RBQWtDO1FBQ3pDLE9BQU8sZ0VBQXdDO1FBQy9DLE9BQU8sNERBQXNDLENBQzdDLENBQUE7QUFDRixDQUFDIn0=