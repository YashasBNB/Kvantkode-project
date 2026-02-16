/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isManagedHoverTooltipMarkdownString(obj) {
    const candidate = obj;
    return (typeof candidate === 'object' &&
        'markdown' in candidate &&
        'markdownNotSupportedFallback' in candidate);
}
export function isManagedHoverTooltipHTMLElement(obj) {
    const candidate = obj;
    return typeof candidate === 'object' && 'element' in candidate;
}
// #endregion Managed hover
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ob3Zlci9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXFZaEcsTUFBTSxVQUFVLG1DQUFtQyxDQUNsRCxHQUFZO0lBRVosTUFBTSxTQUFTLEdBQUcsR0FBeUMsQ0FBQTtJQUMzRCxPQUFPLENBQ04sT0FBTyxTQUFTLEtBQUssUUFBUTtRQUM3QixVQUFVLElBQUksU0FBUztRQUN2Qiw4QkFBOEIsSUFBSSxTQUFTLENBQzNDLENBQUE7QUFDRixDQUFDO0FBTUQsTUFBTSxVQUFVLGdDQUFnQyxDQUMvQyxHQUFZO0lBRVosTUFBTSxTQUFTLEdBQUcsR0FBc0MsQ0FBQTtJQUN4RCxPQUFPLE9BQU8sU0FBUyxLQUFLLFFBQVEsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFBO0FBQy9ELENBQUM7QUFnQ0QsMkJBQTJCIn0=