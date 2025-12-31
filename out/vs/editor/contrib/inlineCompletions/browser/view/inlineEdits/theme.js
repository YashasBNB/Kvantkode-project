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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvdGhlbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFDTixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBQ2hCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUNOLGFBQWEsRUFDYixXQUFXLEVBQ1gsTUFBTSxHQUVOLE1BQU0sdURBQXVELENBQUE7QUFFOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFbkUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUNuRCwrQkFBK0IsRUFDL0IsV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsRUFDN0IsUUFBUSxDQUNQLCtCQUErQixFQUMvQix5REFBeUQsQ0FDekQsRUFDRCxJQUFJLENBQ0osQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FDbkQsK0JBQStCLEVBQy9CLFdBQVcsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLEVBQzlCLFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IseURBQXlELENBQ3pELEVBQ0QsSUFBSSxDQUNKLENBQUE7QUFFRCxNQUFNLENBQUMsTUFB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