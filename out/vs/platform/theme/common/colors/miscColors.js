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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzY0NvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL2NvbG9ycy9taXNjQ29sb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsNkJBQTZCO0FBQzdCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRTdELDRCQUE0QjtBQUM1QixPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTdELGFBQWE7QUFFYixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsYUFBYSxDQUMzQyxrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsZ0NBQWdDLENBQUMsQ0FDbEUsQ0FBQTtBQUVELGNBQWM7QUFFZCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsYUFBYSxDQUMzQyxrQkFBa0IsRUFDbEIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUM5RSxHQUFHLENBQUMsUUFBUSxDQUNYLGlCQUFpQixFQUNqQiw2RkFBNkYsQ0FDN0YsQ0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FDM0Msa0JBQWtCLEVBQ2xCLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFB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