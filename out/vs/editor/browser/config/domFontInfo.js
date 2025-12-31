/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FastDomNode } from '../../../base/browser/fastDomNode.js';
export function applyFontInfo(domNode, fontInfo) {
    if (domNode instanceof FastDomNode) {
        domNode.setFontFamily(fontInfo.getMassagedFontFamily());
        domNode.setFontWeight(fontInfo.fontWeight);
        domNode.setFontSize(fontInfo.fontSize);
        domNode.setFontFeatureSettings(fontInfo.fontFeatureSettings);
        domNode.setFontVariationSettings(fontInfo.fontVariationSettings);
        domNode.setLineHeight(fontInfo.lineHeight);
        domNode.setLetterSpacing(fontInfo.letterSpacing);
    }
    else {
        domNode.style.fontFamily = fontInfo.getMassagedFontFamily();
        domNode.style.fontWeight = fontInfo.fontWeight;
        domNode.style.fontSize = fontInfo.fontSize + 'px';
        domNode.style.fontFeatureSettings = fontInfo.fontFeatureSettings;
        domNode.style.fontVariationSettings = fontInfo.fontVariationSettings;
        domNode.style.lineHeight = fontInfo.lineHeight + 'px';
        domNode.style.letterSpacing = fontInfo.letterSpacing + 'px';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tRm9udEluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb25maWcvZG9tRm9udEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2xFLE1BQU0sVUFBVSxhQUFhLENBQzVCLE9BQStDLEVBQy9DLFFBQXNCO0lBRXRCLElBQUksT0FBTyxZQUFZLFdBQVcsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtRQUN2RCxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMxQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QyxPQUFPLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDNUQsT0FBTyxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2hFLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDakQsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUMzRCxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBQzlDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ2pELE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFBO1FBQ2hFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFBO1FBQ3BFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3JELE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzVELENBQUM7QUFDRixDQUFDIn0=