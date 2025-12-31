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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9sZGluZy9icm93c2VyL2ZvbGRpbmdEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFRN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsY0FBYyxFQUNkLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FDbkMsdUJBQXVCLEVBQ3ZCO0lBQ0MsS0FBSyxFQUFFLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUM7SUFDbEQsSUFBSSxFQUFFLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUM7SUFDakQsTUFBTSxFQUFFLElBQUk7SUFDWixPQUFPLEVBQUUsSUFBSTtDQUNiLEVBQ0QsUUFBUSxDQUNQLDBCQUEwQixFQUMxQiwrR0FBK0csQ0FDL0csRUFDRCxJQUFJLENBQ0osQ0FBQTtBQUNELGFBQWEsQ0FDWixrQ0FBa0MsRUFDbEMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUs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