/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { derived, derivedConstOnceDefined, observableFromEvent, observableValue, } from '../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { diffEditorDefaultOptions } from '../../../common/config/diffEditor.js';
import { clampedFloat, clampedInt, boolean as validateBooleanOption, stringSet as validateStringSetOption, } from '../../../common/config/editorOptions.js';
import { allowsTrueInlineDiffRendering } from './components/diffEditorViewZones/diffEditorViewZones.js';
let DiffEditorOptions = class DiffEditorOptions {
    get editorOptions() {
        return this._options;
    }
    constructor(options, _accessibilityService) {
        this._accessibilityService = _accessibilityService;
        this._diffEditorWidth = observableValue(this, 0);
        this._screenReaderMode = observableFromEvent(this, this._accessibilityService.onDidChangeScreenReaderOptimized, () => this._accessibilityService.isScreenReaderOptimized());
        this.couldShowInlineViewBecauseOfSize = derived(this, (reader) => this._options.read(reader).renderSideBySide &&
            this._diffEditorWidth.read(reader) <=
                this._options.read(reader).renderSideBySideInlineBreakpoint);
        this.renderOverviewRuler = derived(this, (reader) => this._options.read(reader).renderOverviewRuler);
        this.renderSideBySide = derived(this, (reader) => {
            if (this.compactMode.read(reader)) {
                if (this.shouldRenderInlineViewInSmartMode.read(reader)) {
                    return false;
                }
            }
            return (this._options.read(reader).renderSideBySide &&
                !(this._options.read(reader).useInlineViewWhenSpaceIsLimited &&
                    this.couldShowInlineViewBecauseOfSize.read(reader) &&
                    !this._screenReaderMode.read(reader)));
        });
        this.readOnly = derived(this, (reader) => this._options.read(reader).readOnly);
        this.shouldRenderOldRevertArrows = derived(this, (reader) => {
            if (!this._options.read(reader).renderMarginRevertIcon) {
                return false;
            }
            if (!this.renderSideBySide.read(reader)) {
                return false;
            }
            if (this.readOnly.read(reader)) {
                return false;
            }
            if (this.shouldRenderGutterMenu.read(reader)) {
                return false;
            }
            return true;
        });
        this.shouldRenderGutterMenu = derived(this, (reader) => this._options.read(reader).renderGutterMenu);
        this.renderIndicators = derived(this, (reader) => this._options.read(reader).renderIndicators);
        this.enableSplitViewResizing = derived(this, (reader) => this._options.read(reader).enableSplitViewResizing);
        this.splitViewDefaultRatio = derived(this, (reader) => this._options.read(reader).splitViewDefaultRatio);
        this.ignoreTrimWhitespace = derived(this, (reader) => this._options.read(reader).ignoreTrimWhitespace);
        this.maxComputationTimeMs = derived(this, (reader) => this._options.read(reader).maxComputationTime);
        this.showMoves = derived(this, (reader) => this._options.read(reader).experimental.showMoves && this.renderSideBySide.read(reader));
        this.isInEmbeddedEditor = derived(this, (reader) => this._options.read(reader).isInEmbeddedEditor);
        this.diffWordWrap = derived(this, (reader) => this._options.read(reader).diffWordWrap);
        this.originalEditable = derived(this, (reader) => this._options.read(reader).originalEditable);
        this.diffCodeLens = derived(this, (reader) => this._options.read(reader).diffCodeLens);
        this.accessibilityVerbose = derived(this, (reader) => this._options.read(reader).accessibilityVerbose);
        this.diffAlgorithm = derived(this, (reader) => this._options.read(reader).diffAlgorithm);
        this.showEmptyDecorations = derived(this, (reader) => this._options.read(reader).experimental.showEmptyDecorations);
        this.onlyShowAccessibleDiffViewer = derived(this, (reader) => this._options.read(reader).onlyShowAccessibleDiffViewer);
        this.compactMode = derived(this, (reader) => this._options.read(reader).compactMode);
        this.trueInlineDiffRenderingEnabled = derived(this, (reader) => this._options.read(reader).experimental.useTrueInlineView);
        this.useTrueInlineDiffRendering = derived(this, (reader) => !this.renderSideBySide.read(reader) && this.trueInlineDiffRenderingEnabled.read(reader));
        this.hideUnchangedRegions = derived(this, (reader) => this._options.read(reader).hideUnchangedRegions.enabled);
        this.hideUnchangedRegionsRevealLineCount = derived(this, (reader) => this._options.read(reader).hideUnchangedRegions.revealLineCount);
        this.hideUnchangedRegionsContextLineCount = derived(this, (reader) => this._options.read(reader).hideUnchangedRegions.contextLineCount);
        this.hideUnchangedRegionsMinimumLineCount = derived(this, (reader) => this._options.read(reader).hideUnchangedRegions.minimumLineCount);
        this._model = observableValue(this, undefined);
        this.shouldRenderInlineViewInSmartMode = this._model
            .map(this, (model) => derivedConstOnceDefined(this, (reader) => {
            const diffs = model?.diff.read(reader);
            return diffs
                ? isSimpleDiff(diffs, this.trueInlineDiffRenderingEnabled.read(reader))
                : undefined;
        }))
            .flatten()
            .map(this, (v) => !!v);
        this.inlineViewHideOriginalLineNumbers = this.compactMode;
        const optionsCopy = {
            ...options,
            ...validateDiffEditorOptions(options, diffEditorDefaultOptions),
        };
        this._options = observableValue(this, optionsCopy);
    }
    updateOptions(changedOptions) {
        const newDiffEditorOptions = validateDiffEditorOptions(changedOptions, this._options.get());
        const newOptions = { ...this._options.get(), ...changedOptions, ...newDiffEditorOptions };
        this._options.set(newOptions, undefined, { changedOptions: changedOptions });
    }
    setWidth(width) {
        this._diffEditorWidth.set(width, undefined);
    }
    setModel(model) {
        this._model.set(model, undefined);
    }
};
DiffEditorOptions = __decorate([
    __param(1, IAccessibilityService)
], DiffEditorOptions);
export { DiffEditorOptions };
function isSimpleDiff(diff, supportsTrueDiffRendering) {
    return diff.mappings.every((m) => isInsertion(m.lineRangeMapping) ||
        isDeletion(m.lineRangeMapping) ||
        (supportsTrueDiffRendering && allowsTrueInlineDiffRendering(m.lineRangeMapping)));
}
function isInsertion(mapping) {
    return mapping.original.length === 0;
}
function isDeletion(mapping) {
    return mapping.modified.length === 0;
}
function validateDiffEditorOptions(options, defaults) {
    return {
        enableSplitViewResizing: validateBooleanOption(options.enableSplitViewResizing, defaults.enableSplitViewResizing),
        splitViewDefaultRatio: clampedFloat(options.splitViewDefaultRatio, 0.5, 0.1, 0.9),
        renderSideBySide: validateBooleanOption(options.renderSideBySide, defaults.renderSideBySide),
        renderMarginRevertIcon: validateBooleanOption(options.renderMarginRevertIcon, defaults.renderMarginRevertIcon),
        maxComputationTime: clampedInt(options.maxComputationTime, defaults.maxComputationTime, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        maxFileSize: clampedInt(options.maxFileSize, defaults.maxFileSize, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        ignoreTrimWhitespace: validateBooleanOption(options.ignoreTrimWhitespace, defaults.ignoreTrimWhitespace),
        renderIndicators: validateBooleanOption(options.renderIndicators, defaults.renderIndicators),
        originalEditable: validateBooleanOption(options.originalEditable, defaults.originalEditable),
        diffCodeLens: validateBooleanOption(options.diffCodeLens, defaults.diffCodeLens),
        renderOverviewRuler: validateBooleanOption(options.renderOverviewRuler, defaults.renderOverviewRuler),
        diffWordWrap: validateStringSetOption(options.diffWordWrap, defaults.diffWordWrap, ['off', 'on', 'inherit']),
        diffAlgorithm: validateStringSetOption(options.diffAlgorithm, defaults.diffAlgorithm, ['legacy', 'advanced'], { smart: 'legacy', experimental: 'advanced' }),
        accessibilityVerbose: validateBooleanOption(options.accessibilityVerbose, defaults.accessibilityVerbose),
        experimental: {
            showMoves: validateBooleanOption(options.experimental?.showMoves, defaults.experimental.showMoves),
            showEmptyDecorations: validateBooleanOption(options.experimental?.showEmptyDecorations, defaults.experimental.showEmptyDecorations),
            useTrueInlineView: validateBooleanOption(options.experimental?.useTrueInlineView, defaults.experimental.useTrueInlineView),
        },
        hideUnchangedRegions: {
            enabled: validateBooleanOption(options.hideUnchangedRegions?.enabled ??
                options.experimental?.collapseUnchangedRegions, defaults.hideUnchangedRegions.enabled),
            contextLineCount: clampedInt(options.hideUnchangedRegions?.contextLineCount, defaults.hideUnchangedRegions.contextLineCount, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
            minimumLineCount: clampedInt(options.hideUnchangedRegions?.minimumLineCount, defaults.hideUnchangedRegions.minimumLineCount, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
            revealLineCount: clampedInt(options.hideUnchangedRegions?.revealLineCount, defaults.hideUnchangedRegions.revealLineCount, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        },
        isInEmbeddedEditor: validateBooleanOption(options.isInEmbeddedEditor, defaults.isInEmbeddedEditor),
        onlyShowAccessibleDiffViewer: validateBooleanOption(options.onlyShowAccessibleDiffViewer, defaults.onlyShowAccessibleDiffViewer),
        renderSideBySideInlineBreakpoint: clampedInt(options.renderSideBySideInlineBreakpoint, defaults.renderSideBySideInlineBreakpoint, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        useInlineViewWhenSpaceIsLimited: validateBooleanOption(options.useInlineViewWhenSpaceIsLimited, defaults.useInlineViewWhenSpaceIsLimited),
        renderGutterMenu: validateBooleanOption(options.renderGutterMenu, defaults.renderGutterMenu),
        compactMode: validateBooleanOption(options.compactMode, defaults.compactMode),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2RpZmZFZGl0b3JPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFJTixPQUFPLEVBQ1AsdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUNuQixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBS04sWUFBWSxFQUNaLFVBQVUsRUFDVixPQUFPLElBQUkscUJBQXFCLEVBQ2hDLFNBQVMsSUFBSSx1QkFBdUIsR0FDcEMsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUdoRyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjtJQU03QixJQUFXLGFBQWE7UUFJdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFVRCxZQUNDLE9BQXFDLEVBQ2QscUJBQTZEO1FBQTVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFWcEUscUJBQWdCLEdBQUcsZUFBZSxDQUFTLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuRCxzQkFBaUIsR0FBRyxtQkFBbUIsQ0FDdkQsSUFBSSxFQUNKLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQ0FBZ0MsRUFDM0QsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFLENBQzFELENBQUE7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