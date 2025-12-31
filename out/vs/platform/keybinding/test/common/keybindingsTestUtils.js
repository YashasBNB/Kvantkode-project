/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeKeybinding } from '../../../../base/common/keybindings.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
export function createUSLayoutResolvedKeybinding(encodedKeybinding, OS) {
    if (encodedKeybinding === 0) {
        return undefined;
    }
    const keybinding = decodeKeybinding(encodedKeybinding, OS);
    if (!keybinding) {
        return undefined;
    }
    const result = USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    if (result.length > 0) {
        return result[0];
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL3Rlc3QvY29tbW9uL2tleWJpbmRpbmdzVGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBc0IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUU3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV2RixNQUFNLFVBQVUsZ0NBQWdDLENBQy9DLGlCQUFvQyxFQUNwQyxFQUFtQjtJQUVuQixJQUFJLGlCQUFpQixLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMxRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMzRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDdkIsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUMifQ==