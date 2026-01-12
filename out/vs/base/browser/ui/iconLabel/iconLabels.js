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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ljb25MYWJlbC9pY29uTGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV4RCxNQUFNLG1CQUFtQixHQUFHLElBQUksTUFBTSxDQUNyQyxpQkFBaUIsU0FBUyxDQUFDLGtCQUFrQixNQUFNLFNBQVMsQ0FBQyxzQkFBc0IsUUFBUSxFQUMzRixHQUFHLENBQ0gsQ0FBQTtBQUNELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxJQUFZO0lBQ2hELE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxFQUE0QixDQUFBO0lBQ3RELElBQUksS0FBNkIsQ0FBQTtJQUVqQyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQ2hCLFFBQVEsR0FBRyxDQUFDLENBQUE7SUFDYixPQUFPLENBQUMsS0FBSyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzFELFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQTtRQUMzQixJQUFJLFNBQVMsR0FBRyxRQUFRLEVBQUUsQ0FBQztZQUMxQixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUNELFNBQVMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUVoRCxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ2xDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFRCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDN0IsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFBO0FBQ2hCLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLElBQWU7SUFDekMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3ZELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9