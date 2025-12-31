/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from './decorators.js';
export class LinkedText {
    constructor(nodes) {
        this.nodes = nodes;
    }
    toString() {
        return this.nodes.map((node) => (typeof node === 'string' ? node : node.label)).join('');
    }
}
__decorate([
    memoize
], LinkedText.prototype, "toString", null);
const LINK_REGEX = /\[([^\]]+)\]\(((?:https?:\/\/|command:|file:)[^\)\s]+)(?: (["'])(.+?)(\3))?\)/gi;
export function parseLinkedText(text) {
    const result = [];
    let index = 0;
    let match;
    while ((match = LINK_REGEX.exec(text))) {
        if (match.index - index > 0) {
            result.push(text.substring(index, match.index));
        }
        const [, label, href, , title] = match;
        if (title) {
            result.push({ label, href, title });
        }
        else {
            result.push({ label, href });
        }
        index = match.index + match[0].length;
    }
    if (index < text.length) {
        result.push(text.substring(index));
    }
    return new LinkedText(result);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkVGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2xpbmtlZFRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBVXpDLE1BQU0sT0FBTyxVQUFVO0lBQ3RCLFlBQXFCLEtBQXVCO1FBQXZCLFVBQUssR0FBTCxLQUFLLENBQWtCO0lBQUcsQ0FBQztJQUdoRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3pGLENBQUM7Q0FDRDtBQUhBO0lBREMsT0FBTzswQ0FHUDtBQUdGLE1BQU0sVUFBVSxHQUFHLGlGQUFpRixDQUFBO0FBRXBHLE1BQU0sVUFBVSxlQUFlLENBQUMsSUFBWTtJQUMzQyxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO0lBRW5DLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUNiLElBQUksS0FBNkIsQ0FBQTtJQUVqQyxPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3hDLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxBQUFELEVBQUcsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBRXRDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDOUIsQ0FBQyJ9