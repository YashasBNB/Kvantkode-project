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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9kaWZmRWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBSU4sT0FBTyxFQUNQLHVCQUF1QixFQUN2QixtQkFBbUIsRUFDbkIsZUFBZSxHQUNmLE1BQU0sdUNBQXVDLENBQUE7QUFFOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUtOLFlBQVksRUFDWixVQUFVLEVBQ1YsT0FBTyxJQUFJLHFCQUFxQixFQUNoQyxTQUFTLElBQUksdUJBQXVCLEdBQ3BDLE1BQU0seUNBQXlDLENBQUE7QUFFaEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFHaEcsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFNN0IsSUFBVyxhQUFhO1FBSXZCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBVUQsWUFDQyxPQUFxQyxFQUNkLHFCQUE2RDtRQUE1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBVnBFLHFCQUFnQixHQUFHLGVBQWUsQ0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkQsc0JBQWlCLEdBQUcsbUJBQW1CLENBQ3ZELElBQUksRUFDSixJQUFJLENBQUMscUJBQXFCLENBQUMsZ0NBQWdDLEVBQzNELEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRSxDQUMxRCxDQUFBO1FBYWUscUNBQWdDLEdBQUcsT0FBTyxD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