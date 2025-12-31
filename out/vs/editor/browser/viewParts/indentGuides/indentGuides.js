/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './indentGuides.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorBracketHighlightingForeground1, editorBracketHighlightingForeground2, editorBracketHighlightingForeground3, editorBracketHighlightingForeground4, editorBracketHighlightingForeground5, editorBracketHighlightingForeground6, editorBracketPairGuideActiveBackground1, editorBracketPairGuideActiveBackground2, editorBracketPairGuideActiveBackground3, editorBracketPairGuideActiveBackground4, editorBracketPairGuideActiveBackground5, editorBracketPairGuideActiveBackground6, editorBracketPairGuideBackground1, editorBracketPairGuideBackground2, editorBracketPairGuideBackground3, editorBracketPairGuideBackground4, editorBracketPairGuideBackground5, editorBracketPairGuideBackground6, editorIndentGuide1, editorIndentGuide2, editorIndentGuide3, editorIndentGuide4, editorIndentGuide5, editorIndentGuide6, editorActiveIndentGuide1, editorActiveIndentGuide2, editorActiveIndentGuide3, editorActiveIndentGuide4, editorActiveIndentGuide5, editorActiveIndentGuide6, } from '../../../common/core/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Position } from '../../../common/core/position.js';
import { ArrayQueue } from '../../../../base/common/arrays.js';
import { isDefined } from '../../../../base/common/types.js';
import { BracketPairGuidesClassNames } from '../../../common/model/guidesTextModelPart.js';
import { IndentGuide, HorizontalGuidesState } from '../../../common/textModelGuides.js';
/**
 * Indent guides are vertical lines that help identify the indentation level of
 * the code.
 */
export class IndentGuidesOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        this._primaryPosition = null;
        const options = this._context.configuration.options;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._spaceWidth = fontInfo.spaceWidth;
        this._maxIndentLeft =
            wrappingInfo.wrappingColumn === -1
                ? -1
                : wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth;
        this._bracketPairGuideOptions = options.get(16 /* EditorOption.guides */);
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._spaceWidth = fontInfo.spaceWidth;
        this._maxIndentLeft =
            wrappingInfo.wrappingColumn === -1
                ? -1
                : wrappingInfo.wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth;
        this._bracketPairGuideOptions = options.get(16 /* EditorOption.guides */);
        return true;
    }
    onCursorStateChanged(e) {
        const selection = e.selections[0];
        const newPosition = selection.getPosition();
        if (!this._primaryPosition?.equals(newPosition)) {
            this._primaryPosition = newPosition;
            return true;
        }
        return false;
    }
    onDecorationsChanged(e) {
        // true for inline decorations
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged; // || e.scrollWidthChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    onLanguageConfigurationChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (!this._bracketPairGuideOptions.indentation &&
            this._bracketPairGuideOptions.bracketPairs === false) {
            this._renderResult = null;
            return;
        }
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const scrollWidth = ctx.scrollWidth;
        const activeCursorPosition = this._primaryPosition;
        const indents = this.getGuidesByLine(visibleStartLineNumber, Math.min(visibleEndLineNumber + 1, this._context.viewModel.getLineCount()), activeCursorPosition);
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const indent = indents[lineIndex];
            let result = '';
            const leftOffset = ctx.visibleRangeForPosition(new Position(lineNumber, 1))?.left ?? 0;
            for (const guide of indent) {
                const left = guide.column === -1
                    ? leftOffset + (guide.visibleColumn - 1) * this._spaceWidth
                    : ctx.visibleRangeForPosition(new Position(lineNumber, guide.column)).left;
                if (left > scrollWidth || (this._maxIndentLeft > 0 && left > this._maxIndentLeft)) {
                    break;
                }
                const className = guide.horizontalLine
                    ? guide.horizontalLine.top
                        ? 'horizontal-top'
                        : 'horizontal-bottom'
                    : 'vertical';
                const width = guide.horizontalLine
                    ? (ctx.visibleRangeForPosition(new Position(lineNumber, guide.horizontalLine.endColumn))
                        ?.left ?? left + this._spaceWidth) - left
                    : this._spaceWidth;
                result += `<div class="core-guide ${guide.className} ${className}" style="left:${left}px;width:${width}px"></div>`;
            }
            output[lineIndex] = result;
        }
        this._renderResult = output;
    }
    getGuidesByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition) {
        const bracketGuides = this._bracketPairGuideOptions.bracketPairs !== false
            ? this._context.viewModel.getBracketGuidesInRangeByLine(visibleStartLineNumber, visibleEndLineNumber, activeCursorPosition, {
                highlightActive: this._bracketPairGuideOptions.highlightActiveBracketPair,
                horizontalGuides: this._bracketPairGuideOptions.bracketPairsHorizontal === true
                    ? HorizontalGuidesState.Enabled
                    : this._bracketPairGuideOptions.bracketPairsHorizontal === 'active'
                        ? HorizontalGuidesState.EnabledForActive
                        : HorizontalGuidesState.Disabled,
                includeInactive: this._bracketPairGuideOptions.bracketPairs === true,
            })
            : null;
        const indentGuides = this._bracketPairGuideOptions.indentation
            ? this._context.viewModel.getLinesIndentGuides(visibleStartLineNumber, visibleEndLineNumber)
            : null;
        let activeIndentStartLineNumber = 0;
        let activeIndentEndLineNumber = 0;
        let activeIndentLevel = 0;
        if (this._bracketPairGuideOptions.highlightActiveIndentation !== false &&
            activeCursorPosition) {
            const activeIndentInfo = this._context.viewModel.getActiveIndentGuide(activeCursorPosition.lineNumber, visibleStartLineNumber, visibleEndLineNumber);
            activeIndentStartLineNumber = activeIndentInfo.startLineNumber;
            activeIndentEndLineNumber = activeIndentInfo.endLineNumber;
            activeIndentLevel = activeIndentInfo.indent;
        }
        const { indentSize } = this._context.viewModel.model.getOptions();
        const result = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineGuides = new Array();
            result.push(lineGuides);
            const bracketGuidesInLine = bracketGuides
                ? bracketGuides[lineNumber - visibleStartLineNumber]
                : [];
            const bracketGuidesInLineQueue = new ArrayQueue(bracketGuidesInLine);
            const indentGuidesInLine = indentGuides
                ? indentGuides[lineNumber - visibleStartLineNumber]
                : 0;
            for (let indentLvl = 1; indentLvl <= indentGuidesInLine; indentLvl++) {
                const indentGuide = (indentLvl - 1) * indentSize + 1;
                const isActive = 
                // Disable active indent guide if there are bracket guides.
                (this._bracketPairGuideOptions.highlightActiveIndentation === 'always' ||
                    bracketGuidesInLine.length === 0) &&
                    activeIndentStartLineNumber <= lineNumber &&
                    lineNumber <= activeIndentEndLineNumber &&
                    indentLvl === activeIndentLevel;
                lineGuides.push(...(bracketGuidesInLineQueue.takeWhile((g) => g.visibleColumn < indentGuide) || []));
                const peeked = bracketGuidesInLineQueue.peek();
                if (!peeked || peeked.visibleColumn !== indentGuide || peeked.horizontalLine) {
                    lineGuides.push(new IndentGuide(indentGuide, -1, `core-guide-indent lvl-${(indentLvl - 1) % 30}` + (isActive ? ' indent-active' : ''), null, -1, -1));
                }
            }
            lineGuides.push(...(bracketGuidesInLineQueue.takeWhile((g) => true) || []));
        }
        return result;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
function transparentToUndefined(color) {
    if (color && color.isTransparent()) {
        return undefined;
    }
    return color;
}
registerThemingParticipant((theme, collector) => {
    const colors = [
        {
            bracketColor: editorBracketHighlightingForeground1,
            guideColor: editorBracketPairGuideBackground1,
            guideColorActive: editorBracketPairGuideActiveBackground1,
        },
        {
            bracketColor: editorBracketHighlightingForeground2,
            guideColor: editorBracketPairGuideBackground2,
            guideColorActive: editorBracketPairGuideActiveBackground2,
        },
        {
            bracketColor: editorBracketHighlightingForeground3,
            guideColor: editorBracketPairGuideBackground3,
            guideColorActive: editorBracketPairGuideActiveBackground3,
        },
        {
            bracketColor: editorBracketHighlightingForeground4,
            guideColor: editorBracketPairGuideBackground4,
            guideColorActive: editorBracketPairGuideActiveBackground4,
        },
        {
            bracketColor: editorBracketHighlightingForeground5,
            guideColor: editorBracketPairGuideBackground5,
            guideColorActive: editorBracketPairGuideActiveBackground5,
        },
        {
            bracketColor: editorBracketHighlightingForeground6,
            guideColor: editorBracketPairGuideBackground6,
            guideColorActive: editorBracketPairGuideActiveBackground6,
        },
    ];
    const colorProvider = new BracketPairGuidesClassNames();
    const indentColors = [
        { indentColor: editorIndentGuide1, indentColorActive: editorActiveIndentGuide1 },
        { indentColor: editorIndentGuide2, indentColorActive: editorActiveIndentGuide2 },
        { indentColor: editorIndentGuide3, indentColorActive: editorActiveIndentGuide3 },
        { indentColor: editorIndentGuide4, indentColorActive: editorActiveIndentGuide4 },
        { indentColor: editorIndentGuide5, indentColorActive: editorActiveIndentGuide5 },
        { indentColor: editorIndentGuide6, indentColorActive: editorActiveIndentGuide6 },
    ];
    const colorValues = colors
        .map((c) => {
        const bracketColor = theme.getColor(c.bracketColor);
        const guideColor = theme.getColor(c.guideColor);
        const guideColorActive = theme.getColor(c.guideColorActive);
        const effectiveGuideColor = transparentToUndefined(transparentToUndefined(guideColor) ?? bracketColor?.transparent(0.3));
        const effectiveGuideColorActive = transparentToUndefined(transparentToUndefined(guideColorActive) ?? bracketColor);
        if (!effectiveGuideColor || !effectiveGuideColorActive) {
            return undefined;
        }
        return {
            guideColor: effectiveGuideColor,
            guideColorActive: effectiveGuideColorActive,
        };
    })
        .filter(isDefined);
    const indentColorValues = indentColors
        .map((c) => {
        const indentColor = theme.getColor(c.indentColor);
        const indentColorActive = theme.getColor(c.indentColorActive);
        const effectiveIndentColor = transparentToUndefined(indentColor);
        const effectiveIndentColorActive = transparentToUndefined(indentColorActive);
        if (!effectiveIndentColor || !effectiveIndentColorActive) {
            return undefined;
        }
        return {
            indentColor: effectiveIndentColor,
            indentColorActive: effectiveIndentColorActive,
        };
    })
        .filter(isDefined);
    if (colorValues.length > 0) {
        for (let level = 0; level < 30; level++) {
            const colors = colorValues[level % colorValues.length];
            collector.addRule(`.monaco-editor .${colorProvider.getInlineClassNameOfLevel(level).replace(/ /g, '.')} { --guide-color: ${colors.guideColor}; --guide-color-active: ${colors.guideColorActive}; }`);
        }
        collector.addRule(`.monaco-editor .vertical { box-shadow: 1px 0 0 0 var(--guide-color) inset; }`);
        collector.addRule(`.monaco-editor .horizontal-top { border-top: 1px solid var(--guide-color); }`);
        collector.addRule(`.monaco-editor .horizontal-bottom { border-bottom: 1px solid var(--guide-color); }`);
        collector.addRule(`.monaco-editor .vertical.${colorProvider.activeClassName} { box-shadow: 1px 0 0 0 var(--guide-color-active) inset; }`);
        collector.addRule(`.monaco-editor .horizontal-top.${colorProvider.activeClassName} { border-top: 1px solid var(--guide-color-active); }`);
        collector.addRule(`.monaco-editor .horizontal-bottom.${colorProvider.activeClassName} { border-bottom: 1px solid var(--guide-color-active); }`);
    }
    if (indentColorValues.length > 0) {
        for (let level = 0; level < 30; level++) {
            const colors = indentColorValues[level % indentColorValues.length];
            collector.addRule(`.monaco-editor .lines-content .core-guide-indent.lvl-${level} { --indent-color: ${colors.indentColor}; --indent-color-active: ${colors.indentColorActive}; }`);
        }
        collector.addRule(`.monaco-editor .lines-content .core-guide-indent { box-shadow: 1px 0 0 0 var(--indent-color) inset; }`);
        collector.addRule(`.monaco-editor .lines-content .core-guide-indent.indent-active { box-shadow: 1px 0 0 0 var(--indent-color-active) inset; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50R3VpZGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2luZGVudEd1aWRlcy9pbmRlbnRHdWlkZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsRUFDcEMsdUNBQXVDLEVBQ3ZDLHVDQUF1QyxFQUN2Qyx1Q0FBdUMsRUFDdkMsdUNBQXVDLEVBQ3ZDLHVDQUF1QyxFQUN2Qyx1Q0FBdUMsRUFDdkMsaUNBQWlDLEVBQ2pDLGlDQUFpQyxFQUNqQyxpQ0FBaUMsRUFDakMsaUNBQWlDLEVBQ2pDLGlDQUFpQyxFQUNqQyxpQ0FBaUMsRUFDakMsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixFQUN4Qix3QkFBd0IsRUFDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixFQUN4Qix3QkFBd0IsR0FDeEIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUlwRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUs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