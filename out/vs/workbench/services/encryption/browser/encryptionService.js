/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IEncryptionService, } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
export class EncryptionService {
    encrypt(value) {
        return Promise.resolve(value);
    }
    decrypt(value) {
        return Promise.resolve(value);
    }
    isEncryptionAvailable() {
        return Promise.resolve(false);
    }
    getKeyStorageProvider() {
        return Promise.resolve("basic_text" /* KnownStorageProvider.basicText */);
    }
    setUsePlainTextEncryption() {
        return Promise.resolve(undefined);
    }
}
registerSingleton(IEncryptionService, EncryptionService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZW5jcnlwdGlvbi9icm93c2VyL2VuY3J5cHRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsTUFBTSxPQUFPLGlCQUFpQjtJQUc3QixPQUFPLENBQUMsS0FBYTtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUFhO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQscUJBQXFCO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQscUJBQXFCO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sbURBQWdDLENBQUE7SUFDdkQsQ0FBQztJQUVELHlCQUF5QjtRQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLG9DQUE0QixDQUFBIn0=