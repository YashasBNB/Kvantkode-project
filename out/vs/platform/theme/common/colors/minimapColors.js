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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL2NvbG9ycy9taW5pbWFwQ29sb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsNkJBQTZCO0FBQzdCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUU3RCw0QkFBNEI7QUFDNUIsT0FBTyxFQUNOLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsbUJBQW1CLEVBQ25CLGdCQUFnQixHQUNoQixNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsOEJBQThCLEVBQzlCLCtCQUErQixHQUMvQixNQUFNLGlCQUFpQixDQUFBO0FBRXhCLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FDNUMsNEJBQTRCLEVBQzVCLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUM1RSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHdDQUF3QyxDQUFDLEVBQ25GLElBQUksQ0FDSixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsYUFBYSxDQUMvRCxzQ0FBc0MsRUFDdEMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxF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