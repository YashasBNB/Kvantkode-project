/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
export function isMousePositionWithinElement(element, posx, posy) {
    const elementRect = dom.getDomNodePagePosition(element);
    if (posx < elementRect.left ||
        posx > elementRect.left + elementRect.width ||
        posy < elementRect.top ||
        posy > elementRect.top + elementRect.height) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvaG92ZXJVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE1BQU0sVUFBVSw0QkFBNEIsQ0FDM0MsT0FBb0IsRUFDcEIsSUFBWSxFQUNaLElBQVk7SUFFWixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDdkQsSUFDQyxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUk7UUFDdkIsSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUs7UUFDM0MsSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHO1FBQ3RCLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQzFDLENBQUM7UUFDRixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==