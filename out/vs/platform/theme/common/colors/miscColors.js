/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color } from '../../../../base/common/color.js';
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { contrastBorder, focusBorder } from './baseColors.js';
// ----- sash
export const sashHoverBorder = registerColor('sash.hoverBorder', focusBorder, nls.localize('sashActiveBorder', 'Border color of active sashes.'));
// ----- badge
export const badgeBackground = registerColor('badge.background', { dark: '#4D4D4D', light: '#C4C4C4', hcDark: Color.black, hcLight: '#0F4A85' }, nls.localize('badgeBackground', 'Badge background color. Badges are small information labels, e.g. for search results count.'));
export const badgeForeground = registerColor('badge.foreground', { dark: Color.white, light: '#333', hcDark: Color.white, hcLight: Color.white }, nls.localize('badgeForeground', 'Badge foreground color. Badges are small information labels, e.g. for search results count.'));
export const activityWarningBadgeForeground = registerColor('activityWarningBadge.foreground', {
    dark: Color.black.lighten(0.2),
    light: Color.white,
    hcDark: null,
    hcLight: Color.black.lighten(0.2),
}, nls.localize('activityWarningBadge.foreground', 'Foreground color of the warning activity badge'));
export const activityWarningBadgeBackground = registerColor('activityWarningBadge.background', { dark: '#CCA700', light: '#BF8803', hcDark: null, hcLight: '#CCA700' }, nls.localize('activityWarningBadge.background', 'Background color of the warning activity badge'));
export const activityErrorBadgeForeground = registerColor('activityErrorBadge.foreground', {
    dark: Color.black.lighten(0.2),
    light: Color.white,
    hcDark: null,
    hcLight: Color.black.lighten(0.2),
}, nls.localize('activityErrorBadge.foreground', 'Foreground color of the error activity badge'));
export const activityErrorBadgeBackground = registerColor('activityErrorBadge.background', { dark: '#F14C4C', light: '#E51400', hcDark: null, hcLight: '#F14C4C' }, nls.localize('activityErrorBadge.background', 'Background color of the error activity badge'));
// ----- scrollbar
export const scrollbarShadow = registerColor('scrollbar.shadow', { dark: '#000000', light: '#DDDDDD', hcDark: null, hcLight: null }, nls.localize('scrollbarShadow', 'Scrollbar shadow to indicate that the view is scrolled.'));
export const scrollbarSliderBackground = registerColor('scrollbarSlider.background', {
    dark: Color.fromHex('#797979').transparent(0.4),
    light: Color.fromHex('#646464').transparent(0.4),
    hcDark: transparent(contrastBorder, 0.6),
    hcLight: transparent(contrastBorder, 0.4),
}, nls.localize('scrollbarSliderBackground', 'Scrollbar slider background color.'));
export const scrollbarSliderHoverBackground = registerColor('scrollbarSlider.hoverBackground', {
    dark: Color.fromHex('#646464').transparent(0.7),
    light: Color.fromHex('#646464').transparent(0.7),
    hcDark: transparent(contrastBorder, 0.8),
    hcLight: transparent(contrastBorder, 0.8),
}, nls.localize('scrollbarSliderHoverBackground', 'Scrollbar slider background color when hovering.'));
export const scrollbarSliderActiveBackground = registerColor('scrollbarSlider.activeBackground', {
    dark: Color.fromHex('#BFBFBF').transparent(0.4),
    light: Color.fromHex('#000000').transparent(0.6),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('scrollbarSliderActiveBackground', 'Scrollbar slider background color when clicked on.'));
// ----- progress bar
export const progressBarBackground = registerColor('progressBar.background', {
    dark: Color.fromHex('#0E70C0'),
    light: Color.fromHex('#0E70C0'),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('progressBarBackground', 'Background color of the progress bar that can show for long running operations.'));
// ----- chart
export const chartLine = registerColor('chart.line', { dark: '#236B8E', light: '#236B8E', hcDark: '#236B8E', hcLight: '#236B8E' }, nls.localize('chartLine', 'Line color for the chart.'));
export const chartAxis = registerColor('chart.axis', {
    dark: Color.fromHex('#BFBFBF').transparent(0.4),
    light: Color.fromHex('#000000').transparent(0.6),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('chartAxis', 'Axis color for the chart.'));
export const chartGuide = registerColor('chart.guide', {
    dark: Color.fromHex('#BFBFBF').transparent(0.2),
    light: Color.fromHex('#000000').transparent(0.2),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('chartGuide', 'Guide line for the chart.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzY0NvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi9jb2xvcnMvbWlzY0NvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLDZCQUE2QjtBQUM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUU3RCw0QkFBNEI7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU3RCxhQUFhO0FBRWIsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FDM0Msa0JBQWtCLEVBQ2xCLFdBQVcsRUFDWCxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLGdDQUFnQyxDQUFDLENBQ2xFLENBQUE7QUFFRCxjQUFjO0FBRWQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FDM0Msa0JBQWtCLEVBQ2xCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFDOUUsR0FBRyxDQUFDLFFBQVEsQ0FDWCxpQkFBaUIsRUFDakIsNkZBQTZGLENBQzdGLENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQzNDLGtCQUFrQixFQUNsQixFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FB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