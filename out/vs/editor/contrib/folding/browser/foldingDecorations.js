/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { localize } from '../../../../nls.js';
import { editorSelectionBackground, iconForeground, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const foldBackground = registerColor('editor.foldBackground', {
    light: transparent(editorSelectionBackground, 0.3),
    dark: transparent(editorSelectionBackground, 0.3),
    hcDark: null,
    hcLight: null,
}, localize('foldBackgroundBackground', 'Background color behind folded ranges. The color must not be opaque so as not to hide underlying decorations.'), true);
registerColor('editor.foldPlaceholderForeground', { light: '#808080', dark: '#808080', hcDark: null, hcLight: null }, localize('collapsedTextColor', 'Color of the collapsed text after the first line of a folded range.'));
registerColor('editorGutter.foldingControlForeground', iconForeground, localize('editorGutter.foldingControlForeground', 'Color of the folding control in the editor gutter.'));
export const foldingExpandedIcon = registerIcon('folding-expanded', Codicon.chevronDown, localize('foldingExpandedIcon', 'Icon for expanded ranges in the editor glyph margin.'));
export const foldingCollapsedIcon = registerIcon('folding-collapsed', Codicon.chevronRight, localize('foldingCollapsedIcon', 'Icon for collapsed ranges in the editor glyph margin.'));
export const foldingManualCollapsedIcon = registerIcon('folding-manual-collapsed', foldingCollapsedIcon, localize('foldingManualCollapedIcon', 'Icon for manually collapsed ranges in the editor glyph margin.'));
export const foldingManualExpandedIcon = registerIcon('folding-manual-expanded', foldingExpandedIcon, localize('foldingManualExpandedIcon', 'Icon for manually expanded ranges in the editor glyph margin.'));
const foldedBackgroundMinimap = {
    color: themeColorFromId(foldBackground),
    position: 1 /* MinimapPosition.Inline */,
};
const collapsed = localize('linesCollapsed', 'Click to expand the range.');
const expanded = localize('linesExpanded', 'Click to collapse the range.');
export class FoldingDecorationProvider {
    static { this.COLLAPSED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-collapsed-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingCollapsedIcon),
    }); }
    static { this.COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-collapsed-highlighted-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        className: 'folded-background',
        minimap: foldedBackgroundMinimap,
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingCollapsedIcon),
    }); }
    static { this.MANUALLY_COLLAPSED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-collapsed-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingManualCollapsedIcon),
    }); }
    static { this.MANUALLY_COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-collapsed-highlighted-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        className: 'folded-background',
        minimap: foldedBackgroundMinimap,
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingManualCollapsedIcon),
    }); }
    static { this.NO_CONTROLS_COLLAPSED_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-no-controls-range-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
    }); }
    static { this.NO_CONTROLS_COLLAPSED_HIGHLIGHTED_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-no-controls-range-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        afterContentClassName: 'inline-folded',
        className: 'folded-background',
        minimap: foldedBackgroundMinimap,
        isWholeLine: true,
        linesDecorationsTooltip: collapsed,
    }); }
    static { this.EXPANDED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-expanded-visual-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: 'alwaysShowFoldIcons ' + ThemeIcon.asClassName(foldingExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.EXPANDED_AUTO_HIDE_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-expanded-auto-hide-visual-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.MANUALLY_EXPANDED_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-expanded-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: 'alwaysShowFoldIcons ' + ThemeIcon.asClassName(foldingManualExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.MANUALLY_EXPANDED_AUTO_HIDE_VISUAL_DECORATION = ModelDecorationOptions.register({
        description: 'folding-manually-expanded-auto-hide-visual-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        isWholeLine: true,
        firstLineDecorationClassName: ThemeIcon.asClassName(foldingManualExpandedIcon),
        linesDecorationsTooltip: expanded,
    }); }
    static { this.NO_CONTROLS_EXPANDED_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-no-controls-range-decoration',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
        isWholeLine: true,
    }); }
    static { this.HIDDEN_RANGE_DECORATION = ModelDecorationOptions.register({
        description: 'folding-hidden-range-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    }); }
    constructor(editor) {
        this.editor = editor;
        this.showFoldingControls = 'mouseover';
        this.showFoldingHighlights = true;
    }
    getDecorationOption(isCollapsed, isHidden, isManual) {
        if (isHidden) {
            // is inside another collapsed region
            return FoldingDecorationProvider.HIDDEN_RANGE_DECORATION;
        }
        if (this.showFoldingControls === 'never') {
            if (isCollapsed) {
                return this.showFoldingHighlights
                    ? FoldingDecorationProvider.NO_CONTROLS_COLLAPSED_HIGHLIGHTED_RANGE_DECORATION
                    : FoldingDecorationProvider.NO_CONTROLS_COLLAPSED_RANGE_DECORATION;
            }
            return FoldingDecorationProvider.NO_CONTROLS_EXPANDED_RANGE_DECORATION;
        }
        if (isCollapsed) {
            return isManual
                ? this.showFoldingHighlights
                    ? FoldingDecorationProvider.MANUALLY_COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION
                    : FoldingDecorationProvider.MANUALLY_COLLAPSED_VISUAL_DECORATION
                : this.showFoldingHighlights
                    ? FoldingDecorationProvider.COLLAPSED_HIGHLIGHTED_VISUAL_DECORATION
                    : FoldingDecorationProvider.COLLAPSED_VISUAL_DECORATION;
        }
        else if (this.showFoldingControls === 'mouseover') {
            return isManual
                ? FoldingDecorationProvider.MANUALLY_EXPANDED_AUTO_HIDE_VISUAL_DECORATION
                : FoldingDecorationProvider.EXPANDED_AUTO_HIDE_VISUAL_DECORATION;
        }
        else {
            return isManual
                ? FoldingDecorationProvider.MANUALLY_EXPANDED_VISUAL_DECORATION
                : FoldingDecorationProvider.EXPANDED_VISUAL_DECORATION;
        }
    }
    changeDecorations(callback) {
        return this.editor.changeDecorations(callback);
    }
    removeDecorations(decorationIds) {
        this.editor.removeDecorations(decorationIds);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvZm9sZGluZ0RlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVE3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixjQUFjLEVBQ2QsYUFBYSxFQUNiLFdBQVcsR0FDWCxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEUsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUNuQyx1QkFBdUIsRUFDdkI7SUFDQyxLQUFLLEVBQUUsV0FBVyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQztJQUNsRCxJQUFJLEVBQUUsV0FBVyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQztJQUNqRCxNQUFNLEVBQUUsSUFBSTtJQUNaLE9BQU8sRUFBRSxJQUFJO0NBQ2IsRUFDRCxRQUFRLENBQ1AsMEJBQTBCLEVBQzFCLCtHQUErRyxDQUMvRyxFQUNELElBQUksQ0FDSixDQUFBO0FBQ0QsYUFBYSxDQUNaLGtDQUFrQyxFQUNsQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVB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