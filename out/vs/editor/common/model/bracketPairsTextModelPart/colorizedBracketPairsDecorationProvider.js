/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../core/range.js';
import { editorBracketHighlightingForeground1, editorBracketHighlightingForeground2, editorBracketHighlightingForeground3, editorBracketHighlightingForeground4, editorBracketHighlightingForeground5, editorBracketHighlightingForeground6, editorBracketHighlightingUnexpectedBracketForeground, } from '../../core/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
export class ColorizedBracketPairsDecorationProvider extends Disposable {
    constructor(textModel) {
        super();
        this.textModel = textModel;
        this.colorProvider = new ColorProvider();
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.colorizationOptions = textModel.getOptions().bracketPairColorizationOptions;
        this._register(textModel.bracketPairs.onDidChange((e) => {
            this.onDidChangeEmitter.fire();
        }));
    }
    //#region TextModel events
    handleDidChangeOptions(e) {
        this.colorizationOptions = this.textModel.getOptions().bracketPairColorizationOptions;
    }
    //#endregion
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations) {
        if (onlyMinimapDecorations) {
            // Bracket pair colorization decorations are not rendered in the minimap
            return [];
        }
        if (ownerId === undefined) {
            return [];
        }
        if (!this.colorizationOptions.enabled) {
            return [];
        }
        const result = this.textModel.bracketPairs
            .getBracketsInRange(range, true)
            .map((bracket) => ({
            id: `bracket${bracket.range.toString()}-${bracket.nestingLevel}`,
            options: {
                description: 'BracketPairColorization',
                inlineClassName: this.colorProvider.getInlineClassName(bracket, this.colorizationOptions.independentColorPoolPerBracketType),
            },
            ownerId: 0,
            range: bracket.range,
        }))
            .toArray();
        return result;
    }
    getAllDecorations(ownerId, filterOutValidation) {
        if (ownerId === undefined) {
            return [];
        }
        if (!this.colorizationOptions.enabled) {
            return [];
        }
        return this.getDecorationsInRange(new Range(1, 1, this.textModel.getLineCount(), 1), ownerId, filterOutValidation);
    }
}
class ColorProvider {
    constructor() {
        this.unexpectedClosingBracketClassName = 'unexpected-closing-bracket';
    }
    getInlineClassName(bracket, independentColorPoolPerBracketType) {
        if (bracket.isInvalid) {
            return this.unexpectedClosingBracketClassName;
        }
        return this.getInlineClassNameOfLevel(independentColorPoolPerBracketType
            ? bracket.nestingLevelOfEqualBracketType
            : bracket.nestingLevel);
    }
    getInlineClassNameOfLevel(level) {
        // To support a dynamic amount of colors up to 6 colors,
        // we use a number that is a lcm of all numbers from 1 to 6.
        return `bracket-highlighting-${level % 30}`;
    }
}
registerThemingParticipant((theme, collector) => {
    const colors = [
        editorBracketHighlightingForeground1,
        editorBracketHighlightingForeground2,
        editorBracketHighlightingForeground3,
        editorBracketHighlightingForeground4,
        editorBracketHighlightingForeground5,
        editorBracketHighlightingForeground6,
    ];
    const colorProvider = new ColorProvider();
    collector.addRule(`.monaco-editor .${colorProvider.unexpectedClosingBracketClassName} { color: ${theme.getColor(editorBracketHighlightingUnexpectedBracketForeground)}; }`);
    const colorValues = colors
        .map((c) => theme.getColor(c))
        .filter((c) => !!c)
        .filter((c) => !c.isTransparent());
    for (let level = 0; level < 30; level++) {
        const color = colorValues[level % colorValues.length];
        collector.addRule(`.monaco-editor .${colorProvider.getInlineClassNameOfLevel(level)} { color: ${color}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JpemVkQnJhY2tldFBhaXJzRGVjb3JhdGlvblByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvY29sb3JpemVkQnJhY2tldFBhaXJzRGVjb3JhdGlvblByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBSzNDLE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvREFBb0QsR0FDcEQsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUc5RixNQUFNLE9BQU8sdUNBQ1osU0FBUSxVQUFVO0lBU2xCLFlBQTZCLFNBQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFBO1FBRHFCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFMaEMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO1FBRW5DLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDekMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBSzFELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsOEJBQThCLENBQUE7UUFFaEYsSUFBSSxDQUFDLFNBQVMsQ0FDYixTQUFTLENBQUMsWUFBWSxD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