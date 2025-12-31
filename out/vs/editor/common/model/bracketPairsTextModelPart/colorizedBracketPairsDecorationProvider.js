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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JpemVkQnJhY2tldFBhaXJzRGVjb3JhdGlvblByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2NvbG9yaXplZEJyYWNrZXRQYWlyc0RlY29yYXRpb25Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUszQyxPQUFPLEVBQ04sb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsRUFDcEMsb0RBQW9ELEdBQ3BELE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHOUYsTUFBTSxPQUFPLHVDQUNaLFNBQVEsVUFBVTtJQVNsQixZQUE2QixTQUFvQjtRQUNoRCxLQUFLLEVBQUUsQ0FBQTtRQURxQixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBTGhDLGtCQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQTtRQUVuQyx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ3pDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUsxRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLDhCQUE4QixDQUFBO1FBRWhGLElBQUksQ0FBQyxTQUFTLENBQ2IsU0FBUyxDQUFDLFlBQVksQ0FBQyxX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