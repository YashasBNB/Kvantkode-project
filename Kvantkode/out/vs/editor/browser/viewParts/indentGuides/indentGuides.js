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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50R3VpZGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvaW5kZW50R3VpZGVzL2luZGVudEd1aWRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxFQUNwQyx1Q0FBdUMsRUFDdkMsdUNBQXVDLEVBQ3ZDLHVDQUF1QyxFQUN2Qyx1Q0FBdUMsRUFDdkMsdUNBQXVDLEVBQ3ZDLHVDQUF1QyxFQUN2QyxpQ0FBaUMsRUFDakMsaUNBQWlDLEVBQ2pDLGlDQUFpQyxFQUNqQyxpQ0FBaUMsRUFDakMsaUNBQWlDLEVBQ2pDLGlDQUFpQyxFQUNqQyxrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQix3QkFBd0IsRUFDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixFQUN4Qix3QkFBd0IsRUFDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixHQUN4QixNQUFNLDZDQUE2QyxDQUFBO0FBSXBELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSwyQkFBMkIs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