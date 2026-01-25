/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { observableFromEventOpts } from '../../../../../../base/common/observableInternal/utils.js';
import { localize } from '../../../../../../nls.js';
import { diffRemoved, diffInsertedLine, diffInserted, buttonBackground, buttonForeground, buttonSecondaryBackground, buttonSecondaryForeground, editorBackground, } from '../../../../../../platform/theme/common/colorRegistry.js';
import { registerColor, transparent, darken, } from '../../../../../../platform/theme/common/colorUtils.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
export const originalBackgroundColor = registerColor('inlineEdit.originalBackground', transparent(diffRemoved, 0.2), localize('inlineEdit.originalBackground', 'Background color for the original text in inline edits.'), true);
export const modifiedBackgroundColor = registerColor('inlineEdit.modifiedBackground', transparent(diffInserted, 0.3), localize('inlineEdit.modifiedBackground', 'Background color for the modified text in inline edits.'), true);
export const originalChangedLineBackgroundColor = registerColor('inlineEdit.originalChangedLineBackground', transparent(diffRemoved, 0.8), localize('inlineEdit.originalChangedLineBackground', 'Background color for the changed lines in the original text of inline edits.'), true);
export const originalChangedTextOverlayColor = registerColor('inlineEdit.originalChangedTextBackground', transparent(diffRemoved, 0.8), localize('inlineEdit.originalChangedTextBackground', 'Overlay color for the changed text in the original text of inline edits.'), true);
export const modifiedChangedLineBackgroundColor = registerColor('inlineEdit.modifiedChangedLineBackground', {
    light: transparent(diffInsertedLine, 0.7),
    dark: transparent(diffInsertedLine, 0.7),
    hcDark: diffInsertedLine,
    hcLight: diffInsertedLine,
}, localize('inlineEdit.modifiedChangedLineBackground', 'Background color for the changed lines in the modified text of inline edits.'), true);
export const modifiedChangedTextOverlayColor = registerColor('inlineEdit.modifiedChangedTextBackground', transparent(diffInserted, 0.7), localize('inlineEdit.modifiedChangedTextBackground', 'Overlay color for the changed text in the modified text of inline edits.'), true);
// ------- GUTTER INDICATOR -------
export const inlineEditIndicatorPrimaryForeground = registerColor('inlineEdit.gutterIndicator.primaryForeground', buttonForeground, localize('inlineEdit.gutterIndicator.primaryForeground', 'Foreground color for the primary inline edit gutter indicator.'));
export const inlineEditIndicatorPrimaryBorder = registerColor('inlineEdit.gutterIndicator.primaryBorder', buttonBackground, localize('inlineEdit.gutterIndicator.primaryBorder', 'Border color for the primary inline edit gutter indicator.'));
export const inlineEditIndicatorPrimaryBackground = registerColor('inlineEdit.gutterIndicator.primaryBackground', {
    light: transparent(inlineEditIndicatorPrimaryBorder, 0.5),
    dark: transparent(inlineEditIndicatorPrimaryBorder, 0.4),
    hcDark: transparent(inlineEditIndicatorPrimaryBorder, 0.4),
    hcLight: transparent(inlineEditIndicatorPrimaryBorder, 0.5),
}, localize('inlineEdit.gutterIndicator.primaryBackground', 'Background color for the primary inline edit gutter indicator.'));
export const inlineEditIndicatorSecondaryForeground = registerColor('inlineEdit.gutterIndicator.secondaryForeground', buttonSecondaryForeground, localize('inlineEdit.gutterIndicator.secondaryForeground', 'Foreground color for the secondary inline edit gutter indicator.'));
export const inlineEditIndicatorSecondaryBorder = registerColor('inlineEdit.gutterIndicator.secondaryBorder', buttonSecondaryBackground, localize('inlineEdit.gutterIndicator.secondaryBorder', 'Border color for the secondary inline edit gutter indicator.'));
export const inlineEditIndicatorSecondaryBackground = registerColor('inlineEdit.gutterIndicator.secondaryBackground', inlineEditIndicatorSecondaryBorder, localize('inlineEdit.gutterIndicator.secondaryBackground', 'Background color for the secondary inline edit gutter indicator.'));
export const inlineEditIndicatorsuccessfulForeground = registerColor('inlineEdit.gutterIndicator.successfulForeground', buttonForeground, localize('inlineEdit.gutterIndicator.successfulForeground', 'Foreground color for the successful inline edit gutter indicator.'));
export const inlineEditIndicatorsuccessfulBorder = registerColor('inlineEdit.gutterIndicator.successfulBorder', buttonBackground, localize('inlineEdit.gutterIndicator.successfulBorder', 'Border color for the successful inline edit gutter indicator.'));
export const inlineEditIndicatorsuccessfulBackground = registerColor('inlineEdit.gutterIndicator.successfulBackground', inlineEditIndicatorsuccessfulBorder, localize('inlineEdit.gutterIndicator.successfulBackground', 'Background color for the successful inline edit gutter indicator.'));
export const inlineEditIndicatorBackground = registerColor('inlineEdit.gutterIndicator.background', {
    hcDark: transparent('tab.inactiveBackground', 0.5),
    hcLight: transparent('tab.inactiveBackground', 0.5),
    dark: transparent('tab.inactiveBackground', 0.5),
    light: '#5f5f5f18',
}, localize('inlineEdit.gutterIndicator.background', 'Background color for the inline edit gutter indicator.'));
// ------- BORDER COLORS -------
const originalBorder = registerColor('inlineEdit.originalBorder', {
    light: diffRemoved,
    dark: diffRemoved,
    hcDark: diffRemoved,
    hcLight: diffRemoved,
}, localize('inlineEdit.originalBorder', 'Border color for the original text in inline edits.'));
const modifiedBorder = registerColor('inlineEdit.modifiedBorder', {
    light: darken(diffInserted, 0.6),
    dark: diffInserted,
    hcDark: diffInserted,
    hcLight: diffInserted,
}, localize('inlineEdit.modifiedBorder', 'Border color for the modified text in inline edits.'));
const tabWillAcceptModifiedBorder = registerColor('inlineEdit.tabWillAcceptModifiedBorder', {
    light: darken(modifiedBorder, 0),
    dark: darken(modifiedBorder, 0),
    hcDark: darken(modifiedBorder, 0),
    hcLight: darken(modifiedBorder, 0),
}, localize('inlineEdit.tabWillAcceptModifiedBorder', 'Modified border color for the inline edits widget when tab will accept it.'));
const tabWillAcceptOriginalBorder = registerColor('inlineEdit.tabWillAcceptOriginalBorder', {
    light: darken(originalBorder, 0),
    dark: darken(originalBorder, 0),
    hcDark: darken(originalBorder, 0),
    hcLight: darken(originalBorder, 0),
}, localize('inlineEdit.tabWillAcceptOriginalBorder', 'Original border color for the inline edits widget over the original text when tab will accept it.'));
export function getModifiedBorderColor(tabAction) {
    return tabAction.map((a) => a === InlineEditTabAction.Accept ? tabWillAcceptModifiedBorder : modifiedBorder);
}
export function getOriginalBorderColor(tabAction) {
    return tabAction.map((a) => a === InlineEditTabAction.Accept ? tabWillAcceptOriginalBorder : originalBorder);
}
export function getEditorBlendedColor(colorIdentifier, themeService) {
    let color;
    if (typeof colorIdentifier === 'string') {
        color = observeColor(colorIdentifier, themeService);
    }
    else {
        color = colorIdentifier.map((identifier, reader) => observeColor(identifier, themeService).read(reader));
    }
    const backgroundColor = observeColor(editorBackground, themeService);
    return color.map((c, reader) => c.makeOpaque(backgroundColor.read(reader)));
}
export function observeColor(colorIdentifier, themeService) {
    return observableFromEventOpts({
        owner: { observeColor: colorIdentifier },
        equalsFn: (a, b) => a.equals(b),
    }, themeService.onDidColorThemeChange, () => {
        const color = themeService.getColorTheme().getColor(colorIdentifier);
        if (!color) {
            throw new BugIndicatingError(`Missing color: ${colorIdentifier}`);
        }
        return color;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy90aGVtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUNOLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIseUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6QixnQkFBZ0IsR0FDaEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sYUFBYSxFQUNiLFdBQVcsRUFDWCxNQUFNLEdBRU4sTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVuRSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQ25ELCtCQUErQixFQUMvQixXQUFXLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUM3QixRQUFRLENBQ1AsK0JBQStCLEVBQy9CLHlEQUF5RCxDQUN6RCxFQUNELElBQUksQ0FDSixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUNuRCwrQkFBK0IsRUFDL0IsV0FBVyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsRUFDOUIsUUFBUSxDQUNQLCtCQUErQixFQUMvQix5REFBeUQsQ0FDekQsRUFDRCxJQUFJLENBQ0osQ0FBQTtBQUVELE1BQU0sQ0FB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