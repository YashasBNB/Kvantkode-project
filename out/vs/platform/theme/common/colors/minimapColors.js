/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { editorInfoForeground, editorWarningForeground, editorWarningBorder, editorInfoBorder, } from './editorColors.js';
import { scrollbarSliderBackground, scrollbarSliderHoverBackground, scrollbarSliderActiveBackground, } from './miscColors.js';
export const minimapFindMatch = registerColor('minimap.findMatchHighlight', { light: '#d18616', dark: '#d18616', hcDark: '#AB5A00', hcLight: '#0F4A85' }, nls.localize('minimapFindMatchHighlight', 'Minimap marker color for find matches.'), true);
export const minimapSelectionOccurrenceHighlight = registerColor('minimap.selectionOccurrenceHighlight', { light: '#c9c9c9', dark: '#676767', hcDark: '#ffffff', hcLight: '#0F4A85' }, nls.localize('minimapSelectionOccurrenceHighlight', 'Minimap marker color for repeating editor selections.'), true);
export const minimapSelection = registerColor('minimap.selectionHighlight', { light: '#ADD6FF', dark: '#264F78', hcDark: '#ffffff', hcLight: '#0F4A85' }, nls.localize('minimapSelectionHighlight', 'Minimap marker color for the editor selection.'), true);
export const minimapInfo = registerColor('minimap.infoHighlight', {
    dark: editorInfoForeground,
    light: editorInfoForeground,
    hcDark: editorInfoBorder,
    hcLight: editorInfoBorder,
}, nls.localize('minimapInfo', 'Minimap marker color for infos.'));
export const minimapWarning = registerColor('minimap.warningHighlight', {
    dark: editorWarningForeground,
    light: editorWarningForeground,
    hcDark: editorWarningBorder,
    hcLight: editorWarningBorder,
}, nls.localize('overviewRuleWarning', 'Minimap marker color for warnings.'));
export const minimapError = registerColor('minimap.errorHighlight', {
    dark: new Color(new RGBA(255, 18, 18, 0.7)),
    light: new Color(new RGBA(255, 18, 18, 0.7)),
    hcDark: new Color(new RGBA(255, 50, 50, 1)),
    hcLight: '#B5200D',
}, nls.localize('minimapError', 'Minimap marker color for errors.'));
export const minimapBackground = registerColor('minimap.background', null, nls.localize('minimapBackground', 'Minimap background color.'));
export const minimapForegroundOpacity = registerColor('minimap.foregroundOpacity', Color.fromHex('#000f'), nls.localize('minimapForegroundOpacity', 'Opacity of foreground elements rendered in the minimap. For example, "#000000c0" will render the elements with 75% opacity.'));
export const minimapSliderBackground = registerColor('minimapSlider.background', transparent(scrollbarSliderBackground, 0.5), nls.localize('minimapSliderBackground', 'Minimap slider background color.'));
export const minimapSliderHoverBackground = registerColor('minimapSlider.hoverBackground', transparent(scrollbarSliderHoverBackground, 0.5), nls.localize('minimapSliderHoverBackground', 'Minimap slider background color when hovering.'));
export const minimapSliderActiveBackground = registerColor('minimapSlider.activeBackground', transparent(scrollbarSliderActiveBackground, 0.5), nls.localize('minimapSliderActiveBackground', 'Minimap slider background color when clicked on.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi9jb2xvcnMvbWluaW1hcENvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLDZCQUE2QjtBQUM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFN0QsNEJBQTRCO0FBQzVCLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUNuQixnQkFBZ0IsR0FDaEIsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLDhCQUE4QixFQUM5QiwrQkFBK0IsR0FDL0IsTUFBTSxpQkFBaUIsQ0FBQTtBQUV4QixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQzVDLDRCQUE0QixFQUM1QixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFDNUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx3Q0FBd0MsQ0FBQyxFQUNuRixJQUFJLENBQ0osQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLGFBQWEsQ0FDL0Qsc0NBQXNDLEVBQ3RDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUM1RSxHQUFHLENBQUMsUUFB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