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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvdGVzdC9jb21tb24va2V5YmluZGluZ3NUZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFzQixNQUFNLHdDQUF3QyxDQUFBO0FBRTdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZGLE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsaUJBQW9DLEVBQ3BDLEVBQW1CO0lBRW5CLElBQUksaUJBQWlCLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzFELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsTUFBTSxNQUFNLEdBQUcsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzNFLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQyJ9