/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { ThemeIcon } from '../../../common/themables.js';
const labelWithIconsRegex = new RegExp(`(\\\\)?\\$\\((${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?)\\)`, 'g');
export function renderLabelWithIcons(text) {
    const elements = new Array();
    let match;
    let textStart = 0, textStop = 0;
    while ((match = labelWithIconsRegex.exec(text)) !== null) {
        textStop = match.index || 0;
        if (textStart < textStop) {
            elements.push(text.substring(textStart, textStop));
        }
        textStart = (match.index || 0) + match[0].length;
        const [, escaped, codicon] = match;
        elements.push(escaped ? `$(${codicon})` : renderIcon({ id: codicon }));
    }
    if (textStart < text.length) {
        elements.push(text.substring(textStart));
    }
    return elements;
}
export function renderIcon(icon) {
    const node = dom.$(`span`);
    node.classList.add(...ThemeIcon.asClassNameArray(icon));
    return node;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9pY29uTGFiZWwvaWNvbkxhYmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFeEQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLE1BQU0sQ0FDckMsaUJBQWlCLFNBQVMsQ0FBQyxrQkFBa0IsTUFBTSxTQUFTLENBQUMsc0JBQXNCLFFBQVEsRUFDM0YsR0FBRyxDQUNILENBQUE7QUFDRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWTtJQUNoRCxNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssRUFBNEIsQ0FBQTtJQUN0RCxJQUFJLEtBQTZCLENBQUE7SUFFakMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUNoQixRQUFRLEdBQUcsQ0FBQyxDQUFBO0lBQ2IsT0FBTyxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUMxRCxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUE7UUFDM0IsSUFBSSxTQUFTLEdBQUcsUUFBUSxFQUFFLENBQUM7WUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFDRCxTQUFTLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFFaEQsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUNsQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFDRCxPQUFPLFFBQVEsQ0FBQTtBQUNoQixDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFlO0lBQ3pDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUN2RCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==