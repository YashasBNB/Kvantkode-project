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
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { isObject } from '../../../../base/common/types.js';
import { FontMeasurements } from '../../../../editor/browser/config/fontMeasurements.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { BareFontInfo } from '../../../../editor/common/config/fontInfo.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { NotebookSetting, } from '../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../common/notebookExecutionStateService.js';
const SCROLLABLE_ELEMENT_PADDING_TOP = 18;
export const OutputInnerContainerTopPadding = 4;
const defaultConfigConstants = Object.freeze({
    codeCellLeftMargin: 28,
    cellRunGutter: 32,
    markdownCellTopMargin: 8,
    markdownCellBottomMargin: 8,
    markdownCellLeftMargin: 0,
    markdownCellGutter: 32,
    focusIndicatorLeftMargin: 4,
});
const compactConfigConstants = Object.freeze({
    codeCellLeftMargin: 8,
    cellRunGutter: 36,
    markdownCellTopMargin: 6,
    markdownCellBottomMargin: 6,
    markdownCellLeftMargin: 8,
    markdownCellGutter: 36,
    focusIndicatorLeftMargin: 4,
});
let NotebookOptions = class NotebookOptions extends Disposable {
    constructor(targetWindow, isReadonly, overrides, configurationService, notebookExecutionStateService, codeEditorService) {
        super();
        this.targetWindow = targetWindow;
        this.isReadonly = isReadonly;
        this.overrides = overrides;
        this.configurationService = configurationService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.codeEditorService = codeEditorService;
        this._onDidChangeOptions = this._register(new Emitter());
        this.onDidChangeOptions = this._onDidChangeOptions.event;
        this._editorTopPadding = 12;
        this.previousModelToCompare = observableValue('previousModelToCompare', undefined);
        const showCellStatusBar = this.configurationService.getValue(NotebookSetting.showCellStatusBar);
        const globalToolbar = overrides?.globalToolbar ??
            this.configurationService.getValue(NotebookSetting.globalToolbar) ??
            true;
        const stickyScrollEnabled = overrides?.stickyScrollEnabled ??
            this.configurationService.getValue(NotebookSetting.stickyScrollEnabled) ??
            false;
        const stickyScrollMode = this._computeStickyScrollModeOption();
        const consolidatedOutputButton = this.configurationService.getValue(NotebookSetting.consolidatedOutputButton) ?? true;
        const consolidatedRunButton = this.configurationService.getValue(NotebookSetting.consolidatedRunButton) ?? false;
        const dragAndDropEnabled = overrides?.dragAndDropEnabled ??
            this.configurationService.getValue(NotebookSetting.dragAndDropEnabled) ??
            true;
        const cellToolbarLocation = this.configurationService.getValue(NotebookSetting.cellToolbarLocation) ?? { default: 'right' };
        const cellToolbarInteraction = overrides?.cellToolbarInteraction ??
            this.configurationService.getValue(NotebookSetting.cellToolbarVisibility);
        const compactView = this.configurationService.getValue(NotebookSetting.compactView) ?? true;
        const focusIndicator = this._computeFocusIndicatorOption();
        const insertToolbarPosition = this._computeInsertToolbarPositionOption(this.isReadonly);
        const insertToolbarAlignment = this._computeInsertToolbarAlignmentOption();
        const showFoldingControls = this._computeShowFoldingControlsOption();
        // const { bottomToolbarGap, bottomToolbarHeight } = this._computeBottomToolbarDimensions(compactView, insertToolbarPosition, insertToolbarAlignment);
        const fontSize = this.configurationService.getValue('editor.fontSize');
        const markupFontSize = this.configurationService.getValue(NotebookSetting.markupFontSize);
        const markdownLineHeight = this.configurationService.getValue(NotebookSetting.markdownLineHeight);
        let editorOptionsCustomizations = this.configurationService.getValue(NotebookSetting.cellEditorOptionsCustomizations) ?? {};
        editorOptionsCustomizations = isObject(editorOptionsCustomizations)
            ? editorOptionsCustomizations
            : {};
        const interactiveWindowCollapseCodeCells = this.configurationService.getValue(NotebookSetting.interactiveWindowCollapseCodeCells);
        // TOOD @rebornix remove after a few iterations of deprecated setting
        let outputLineHeightSettingValue;
        const deprecatedOutputLineHeightSetting = this.configurationService.getValue(NotebookSetting.outputLineHeightDeprecated);
        if (deprecatedOutputLineHeightSetting !== undefined) {
            this._migrateDeprecatedSetting(NotebookSetting.outputLineHeightDeprecated, NotebookSetting.outputLineHeight);
            outputLineHeightSettingValue = deprecatedOutputLineHeightSetting;
        }
        else {
            outputLineHeightSettingValue = this.configurationService.getValue(NotebookSetting.outputLineHeight);
        }
        let outputFontSize;
        const deprecatedOutputFontSizeSetting = this.configurationService.getValue(NotebookSetting.outputFontSizeDeprecated);
        if (deprecatedOutputFontSizeSetting !== undefined) {
            this._migrateDeprecatedSetting(NotebookSetting.outputFontSizeDeprecated, NotebookSetting.outputFontSize);
            outputFontSize = deprecatedOutputFontSizeSetting;
        }
        else {
            outputFontSize =
                this.configurationService.getValue(NotebookSetting.outputFontSize) || fontSize;
        }
        let outputFontFamily;
        const deprecatedOutputFontFamilySetting = this.configurationService.getValue(NotebookSetting.outputFontFamilyDeprecated);
        if (deprecatedOutputFontFamilySetting !== undefined) {
            this._migrateDeprecatedSetting(NotebookSetting.outputFontFamilyDeprecated, NotebookSetting.outputFontFamily);
            outputFontFamily = deprecatedOutputFontFamilySetting;
        }
        else {
            outputFontFamily = this.configurationService.getValue(NotebookSetting.outputFontFamily);
        }
        let outputScrolling;
        const deprecatedOutputScrollingSetting = this.configurationService.getValue(NotebookSetting.outputScrollingDeprecated);
        if (deprecatedOutputScrollingSetting !== undefined) {
            this._migrateDeprecatedSetting(NotebookSetting.outputScrollingDeprecated, NotebookSetting.outputScrolling);
            outputScrolling = deprecatedOutputScrollingSetting;
        }
        else {
            outputScrolling = this.configurationService.getValue(NotebookSetting.outputScrolling);
        }
        const outputLineHeight = this._computeOutputLineHeight(outputLineHeightSettingValue, outputFontSize);
        const outputWordWrap = this.configurationService.getValue(NotebookSetting.outputWordWrap);
        const outputLineLimit = this.configurationService.getValue(NotebookSetting.textOutputLineLimit) ?? 30;
        const linkifyFilePaths = this.configurationService.getValue(NotebookSetting.LinkifyOutputFilePaths) ?? true;
        const minimalErrors = this.configurationService.getValue(NotebookSetting.minimalErrorRendering);
        const markupFontFamily = this.configurationService.getValue(NotebookSetting.markupFontFamily);
        const editorTopPadding = this._computeEditorTopPadding();
        this._layoutConfiguration = {
            ...(compactView ? compactConfigConstants : defaultConfigConstants),
            cellTopMargin: 6,
            cellBottomMargin: 6,
            cellRightMargin: 16,
            cellStatusBarHeight: 22,
            cellOutputPadding: 8,
            markdownPreviewPadding: 8,
            // bottomToolbarHeight: bottomToolbarHeight,
            // bottomToolbarGap: bottomToolbarGap,
            editorToolbarHeight: 0,
            editorTopPadding: editorTopPadding,
            editorBottomPadding: 4,
            editorBottomPaddingWithoutStatusBar: 12,
            collapsedIndicatorHeight: 28,
            showCellStatusBar,
            globalToolbar,
            stickyScrollEnabled,
            stickyScrollMode,
            consolidatedOutputButton,
            consolidatedRunButton,
            dragAndDropEnabled,
            cellToolbarLocation,
            cellToolbarInteraction,
            compactView,
            focusIndicator,
            insertToolbarPosition,
            insertToolbarAlignment,
            showFoldingControls,
            fontSize,
            outputFontSize,
            outputFontFamily,
            outputLineHeight,
            markupFontSize,
            markdownLineHeight,
            editorOptionsCustomizations,
            focusIndicatorGap: 3,
            interactiveWindowCollapseCodeCells,
            markdownFoldHintHeight: 22,
            outputScrolling: outputScrolling,
            outputWordWrap: outputWordWrap,
            outputLineLimit: outputLineLimit,
            outputLinkifyFilePaths: linkifyFilePaths,
            outputMinimalError: minimalErrors,
            markupFontFamily,
            disableRulers: overrides?.disableRulers,
        };
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            this._updateConfiguration(e);
        }));
    }
    updateOptions(isReadonly) {
        if (this.isReadonly !== isReadonly) {
            this.isReadonly = isReadonly;
            this._updateConfiguration({
                affectsConfiguration(configuration) {
                    return configuration === NotebookSetting.insertToolbarLocation;
                },
                source: 7 /* ConfigurationTarget.DEFAULT */,
                affectedKeys: new Set([NotebookSetting.insertToolbarLocation]),
                change: { keys: [NotebookSetting.insertToolbarLocation], overrides: [] },
            });
        }
    }
    _computeEditorTopPadding() {
        let decorationTriggeredAdjustment = false;
        const updateEditorTopPadding = (top) => {
            this._editorTopPadding = top;
            const configuration = Object.assign({}, this._layoutConfiguration);
            configuration.editorTopPadding = this._editorTopPadding;
            this._layoutConfiguration = configuration;
            this._onDidChangeOptions.fire({ editorTopPadding: true });
        };
        const decorationCheckSet = new Set();
        const onDidAddDecorationType = (e) => {
            if (decorationTriggeredAdjustment) {
                return;
            }
            if (decorationCheckSet.has(e)) {
                return;
            }
            try {
                const options = this.codeEditorService.resolveDecorationOptions(e, true);
                if (options.afterContentClassName || options.beforeContentClassName) {
                    const cssRules = this.codeEditorService.resolveDecorationCSSRules(e);
                    if (cssRules !== null) {
                        for (let i = 0; i < cssRules.length; i++) {
                            // The following ways to index into the list are equivalent
                            if ((cssRules[i].selectorText.endsWith('::after') ||
                                cssRules[i].selectorText.endsWith('::after')) &&
                                cssRules[i].cssText.indexOf('top:') > -1) {
                                // there is a `::before` or `::after` text decoration whose position is above or below current line
                                // we at least make sure that the editor top padding is at least one line
                                const editorOptions = this.configurationService.getValue('editor');
                                updateEditorTopPadding(BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.targetWindow).value).lineHeight + 2);
                                decorationTriggeredAdjustment = true;
                                break;
                            }
                        }
                    }
                }
                decorationCheckSet.add(e);
            }
            catch (_ex) {
                // do not throw and break notebook
            }
        };
        this._register(this.codeEditorService.onDecorationTypeRegistered(onDidAddDecorationType));
        this.codeEditorService.listDecorationTypes().forEach(onDidAddDecorationType);
        return this._editorTopPadding;
    }
    _migrateDeprecatedSetting(deprecatedKey, key) {
        const deprecatedSetting = this.configurationService.inspect(deprecatedKey);
        if (deprecatedSetting.application !== undefined) {
            this.configurationService.updateValue(deprecatedKey, undefined, 1 /* ConfigurationTarget.APPLICATION */);
            this.configurationService.updateValue(key, deprecatedSetting.application.value, 1 /* ConfigurationTarget.APPLICATION */);
        }
        if (deprecatedSetting.user !== undefined) {
            this.configurationService.updateValue(deprecatedKey, undefined, 2 /* ConfigurationTarget.USER */);
            this.configurationService.updateValue(key, deprecatedSetting.user.value, 2 /* ConfigurationTarget.USER */);
        }
        if (deprecatedSetting.userLocal !== undefined) {
            this.configurationService.updateValue(deprecatedKey, undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
            this.configurationService.updateValue(key, deprecatedSetting.userLocal.value, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
        if (deprecatedSetting.userRemote !== undefined) {
            this.configurationService.updateValue(deprecatedKey, undefined, 4 /* ConfigurationTarget.USER_REMOTE */);
            this.configurationService.updateValue(key, deprecatedSetting.userRemote.value, 4 /* ConfigurationTarget.USER_REMOTE */);
        }
        if (deprecatedSetting.workspace !== undefined) {
            this.configurationService.updateValue(deprecatedKey, undefined, 5 /* ConfigurationTarget.WORKSPACE */);
            this.configurationService.updateValue(key, deprecatedSetting.workspace.value, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        if (deprecatedSetting.workspaceFolder !== undefined) {
            this.configurationService.updateValue(deprecatedKey, undefined, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
            this.configurationService.updateValue(key, deprecatedSetting.workspaceFolder.value, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        }
    }
    _computeOutputLineHeight(lineHeight, outputFontSize) {
        const minimumLineHeight = 9;
        if (lineHeight === 0) {
            // use editor line height
            const editorOptions = this.configurationService.getValue('editor');
            const fontInfo = FontMeasurements.readFontInfo(this.targetWindow, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.targetWindow).value));
            lineHeight = fontInfo.lineHeight;
        }
        else if (lineHeight < minimumLineHeight) {
            // Values too small to be line heights in pixels are in ems.
            let fontSize = outputFontSize;
            if (fontSize === 0) {
                fontSize = this.configurationService.getValue('editor.fontSize');
            }
            lineHeight = lineHeight * fontSize;
        }
        // Enforce integer, minimum constraints
        lineHeight = Math.round(lineHeight);
        if (lineHeight < minimumLineHeight) {
            lineHeight = minimumLineHeight;
        }
        return lineHeight;
    }
    _updateConfiguration(e) {
        const cellStatusBarVisibility = e.affectsConfiguration(NotebookSetting.showCellStatusBar);
        const cellToolbarLocation = e.affectsConfiguration(NotebookSetting.cellToolbarLocation);
        const cellToolbarInteraction = e.affectsConfiguration(NotebookSetting.cellToolbarVisibility);
        const compactView = e.affectsConfiguration(NotebookSetting.compactView);
        const focusIndicator = e.affectsConfiguration(NotebookSetting.focusIndicator);
        const insertToolbarPosition = e.affectsConfiguration(NotebookSetting.insertToolbarLocation);
        const insertToolbarAlignment = e.affectsConfiguration(NotebookSetting.experimentalInsertToolbarAlignment);
        const globalToolbar = e.affectsConfiguration(NotebookSetting.globalToolbar);
        const stickyScrollEnabled = e.affectsConfiguration(NotebookSetting.stickyScrollEnabled);
        const stickyScrollMode = e.affectsConfiguration(NotebookSetting.stickyScrollMode);
        const consolidatedOutputButton = e.affectsConfiguration(NotebookSetting.consolidatedOutputButton);
        const consolidatedRunButton = e.affectsConfiguration(NotebookSetting.consolidatedRunButton);
        const showFoldingControls = e.affectsConfiguration(NotebookSetting.showFoldingControls);
        const dragAndDropEnabled = e.affectsConfiguration(NotebookSetting.dragAndDropEnabled);
        const fontSize = e.affectsConfiguration('editor.fontSize');
        const outputFontSize = e.affectsConfiguration(NotebookSetting.outputFontSize);
        const markupFontSize = e.affectsConfiguration(NotebookSetting.markupFontSize);
        const markdownLineHeight = e.affectsConfiguration(NotebookSetting.markdownLineHeight);
        const fontFamily = e.affectsConfiguration('editor.fontFamily');
        const outputFontFamily = e.affectsConfiguration(NotebookSetting.outputFontFamily);
        const editorOptionsCustomizations = e.affectsConfiguration(NotebookSetting.cellEditorOptionsCustomizations);
        const interactiveWindowCollapseCodeCells = e.affectsConfiguration(NotebookSetting.interactiveWindowCollapseCodeCells);
        const outputLineHeight = e.affectsConfiguration(NotebookSetting.outputLineHeight);
        const outputScrolling = e.affectsConfiguration(NotebookSetting.outputScrolling);
        const outputWordWrap = e.affectsConfiguration(NotebookSetting.outputWordWrap);
        const outputLinkifyFilePaths = e.affectsConfiguration(NotebookSetting.LinkifyOutputFilePaths);
        const minimalError = e.affectsConfiguration(NotebookSetting.minimalErrorRendering);
        const markupFontFamily = e.affectsConfiguration(NotebookSetting.markupFontFamily);
        if (!cellStatusBarVisibility &&
            !cellToolbarLocation &&
            !cellToolbarInteraction &&
            !compactView &&
            !focusIndicator &&
            !insertToolbarPosition &&
            !insertToolbarAlignment &&
            !globalToolbar &&
            !stickyScrollEnabled &&
            !stickyScrollMode &&
            !consolidatedOutputButton &&
            !consolidatedRunButton &&
            !showFoldingControls &&
            !dragAndDropEnabled &&
            !fontSize &&
            !outputFontSize &&
            !markupFontSize &&
            !markdownLineHeight &&
            !fontFamily &&
            !outputFontFamily &&
            !editorOptionsCustomizations &&
            !interactiveWindowCollapseCodeCells &&
            !outputLineHeight &&
            !outputScrolling &&
            !outputWordWrap &&
            !outputLinkifyFilePaths &&
            !minimalError &&
            !markupFontFamily) {
            return;
        }
        let configuration = Object.assign({}, this._layoutConfiguration);
        if (cellStatusBarVisibility) {
            configuration.showCellStatusBar = this.configurationService.getValue(NotebookSetting.showCellStatusBar);
        }
        if (cellToolbarLocation) {
            configuration.cellToolbarLocation = this.configurationService.getValue(NotebookSetting.cellToolbarLocation) ?? { default: 'right' };
        }
        if (cellToolbarInteraction && !this.overrides?.cellToolbarInteraction) {
            configuration.cellToolbarInteraction = this.configurationService.getValue(NotebookSetting.cellToolbarVisibility);
        }
        if (focusIndicator) {
            configuration.focusIndicator = this._computeFocusIndicatorOption();
        }
        if (compactView) {
            const compactViewValue = this.configurationService.getValue(NotebookSetting.compactView) ?? true;
            configuration = Object.assign(configuration, {
                ...(compactViewValue ? compactConfigConstants : defaultConfigConstants),
            });
            configuration.compactView = compactViewValue;
        }
        if (insertToolbarAlignment) {
            configuration.insertToolbarAlignment = this._computeInsertToolbarAlignmentOption();
        }
        if (insertToolbarPosition) {
            configuration.insertToolbarPosition = this._computeInsertToolbarPositionOption(this.isReadonly);
        }
        if (globalToolbar && this.overrides?.globalToolbar === undefined) {
            configuration.globalToolbar =
                this.configurationService.getValue(NotebookSetting.globalToolbar) ?? true;
        }
        if (stickyScrollEnabled && this.overrides?.stickyScrollEnabled === undefined) {
            configuration.stickyScrollEnabled =
                this.configurationService.getValue(NotebookSetting.stickyScrollEnabled) ?? false;
        }
        if (stickyScrollMode) {
            configuration.stickyScrollMode =
                this.configurationService.getValue(NotebookSetting.stickyScrollMode) ??
                    'flat';
        }
        if (consolidatedOutputButton) {
            configuration.consolidatedOutputButton =
                this.configurationService.getValue(NotebookSetting.consolidatedOutputButton) ??
                    true;
        }
        if (consolidatedRunButton) {
            configuration.consolidatedRunButton =
                this.configurationService.getValue(NotebookSetting.consolidatedRunButton) ?? true;
        }
        if (showFoldingControls) {
            configuration.showFoldingControls = this._computeShowFoldingControlsOption();
        }
        if (dragAndDropEnabled) {
            configuration.dragAndDropEnabled =
                this.configurationService.getValue(NotebookSetting.dragAndDropEnabled) ?? true;
        }
        if (fontSize) {
            configuration.fontSize = this.configurationService.getValue('editor.fontSize');
        }
        if (outputFontSize || fontSize) {
            configuration.outputFontSize =
                this.configurationService.getValue(NotebookSetting.outputFontSize) ||
                    configuration.fontSize;
        }
        if (markupFontSize) {
            configuration.markupFontSize = this.configurationService.getValue(NotebookSetting.markupFontSize);
        }
        if (markdownLineHeight) {
            configuration.markdownLineHeight = this.configurationService.getValue(NotebookSetting.markdownLineHeight);
        }
        if (outputFontFamily) {
            configuration.outputFontFamily = this.configurationService.getValue(NotebookSetting.outputFontFamily);
        }
        if (editorOptionsCustomizations) {
            configuration.editorOptionsCustomizations = this.configurationService.getValue(NotebookSetting.cellEditorOptionsCustomizations);
        }
        if (interactiveWindowCollapseCodeCells) {
            configuration.interactiveWindowCollapseCodeCells = this.configurationService.getValue(NotebookSetting.interactiveWindowCollapseCodeCells);
        }
        if (outputLineHeight || fontSize || outputFontSize) {
            const lineHeight = this.configurationService.getValue(NotebookSetting.outputLineHeight);
            configuration.outputLineHeight = this._computeOutputLineHeight(lineHeight, configuration.outputFontSize);
        }
        if (outputWordWrap) {
            configuration.outputWordWrap = this.configurationService.getValue(NotebookSetting.outputWordWrap);
        }
        if (outputScrolling) {
            configuration.outputScrolling = this.configurationService.getValue(NotebookSetting.outputScrolling);
        }
        if (outputLinkifyFilePaths) {
            configuration.outputLinkifyFilePaths = this.configurationService.getValue(NotebookSetting.LinkifyOutputFilePaths);
        }
        if (minimalError) {
            configuration.outputMinimalError = this.configurationService.getValue(NotebookSetting.minimalErrorRendering);
        }
        if (markupFontFamily) {
            configuration.markupFontFamily = this.configurationService.getValue(NotebookSetting.markupFontFamily);
        }
        this._layoutConfiguration = Object.freeze(configuration);
        // trigger event
        this._onDidChangeOptions.fire({
            cellStatusBarVisibility,
            cellToolbarLocation,
            cellToolbarInteraction,
            compactView,
            focusIndicator,
            insertToolbarPosition,
            insertToolbarAlignment,
            globalToolbar,
            stickyScrollEnabled,
            stickyScrollMode,
            showFoldingControls,
            consolidatedOutputButton,
            consolidatedRunButton,
            dragAndDropEnabled,
            fontSize,
            outputFontSize,
            markupFontSize,
            markdownLineHeight,
            fontFamily,
            outputFontFamily,
            editorOptionsCustomizations,
            interactiveWindowCollapseCodeCells,
            outputLineHeight,
            outputScrolling,
            outputWordWrap,
            outputLinkifyFilePaths,
            minimalError,
            markupFontFamily,
        });
    }
    _computeInsertToolbarPositionOption(isReadOnly) {
        return isReadOnly
            ? 'hidden'
            : (this.configurationService.getValue(NotebookSetting.insertToolbarLocation) ?? 'both');
    }
    _computeInsertToolbarAlignmentOption() {
        return (this.configurationService.getValue(NotebookSetting.experimentalInsertToolbarAlignment) ?? 'center');
    }
    _computeShowFoldingControlsOption() {
        return (this.configurationService.getValue(NotebookSetting.showFoldingControls) ?? 'mouseover');
    }
    _computeFocusIndicatorOption() {
        return (this.configurationService.getValue(NotebookSetting.focusIndicator) ??
            'gutter');
    }
    _computeStickyScrollModeOption() {
        return (this.configurationService.getValue(NotebookSetting.stickyScrollMode) ??
            'flat');
    }
    getCellCollapseDefault() {
        return this._layoutConfiguration.interactiveWindowCollapseCodeCells === 'never'
            ? {
                codeCell: {
                    inputCollapsed: false,
                },
            }
            : {
                codeCell: {
                    inputCollapsed: true,
                },
            };
    }
    getLayoutConfiguration() {
        return this._layoutConfiguration;
    }
    getDisplayOptions() {
        return this._layoutConfiguration;
    }
    getCellEditorContainerLeftMargin() {
        const { codeCellLeftMargin, cellRunGutter } = this._layoutConfiguration;
        return codeCellLeftMargin + cellRunGutter;
    }
    computeCollapsedMarkdownCellHeight(viewType) {
        const { bottomToolbarGap } = this.computeBottomToolbarDimensions(viewType);
        return (this._layoutConfiguration.markdownCellTopMargin +
            this._layoutConfiguration.collapsedIndicatorHeight +
            bottomToolbarGap +
            this._layoutConfiguration.markdownCellBottomMargin);
    }
    computeBottomToolbarOffset(totalHeight, viewType) {
        const { bottomToolbarGap, bottomToolbarHeight } = this.computeBottomToolbarDimensions(viewType);
        return totalHeight - bottomToolbarGap - bottomToolbarHeight / 2;
    }
    computeCodeCellEditorWidth(outerWidth) {
        return (outerWidth -
            (this._layoutConfiguration.codeCellLeftMargin +
                this._layoutConfiguration.cellRunGutter +
                this._layoutConfiguration.cellRightMargin));
    }
    computeMarkdownCellEditorWidth(outerWidth) {
        return (outerWidth -
            this._layoutConfiguration.markdownCellGutter -
            this._layoutConfiguration.markdownCellLeftMargin -
            this._layoutConfiguration.cellRightMargin);
    }
    computeStatusBarHeight() {
        return this._layoutConfiguration.cellStatusBarHeight;
    }
    _computeBottomToolbarDimensions(compactView, insertToolbarPosition, insertToolbarAlignment, cellToolbar) {
        if (insertToolbarAlignment === 'left' || cellToolbar !== 'hidden') {
            return {
                bottomToolbarGap: 18,
                bottomToolbarHeight: 18,
            };
        }
        if (insertToolbarPosition === 'betweenCells' || insertToolbarPosition === 'both') {
            return compactView
                ? {
                    bottomToolbarGap: 12,
                    bottomToolbarHeight: 20,
                }
                : {
                    bottomToolbarGap: 20,
                    bottomToolbarHeight: 20,
                };
        }
        else {
            return {
                bottomToolbarGap: 0,
                bottomToolbarHeight: 0,
            };
        }
    }
    computeBottomToolbarDimensions(viewType) {
        const configuration = this._layoutConfiguration;
        const cellToolbarPosition = this.computeCellToolbarLocation(viewType);
        const { bottomToolbarGap, bottomToolbarHeight } = this._computeBottomToolbarDimensions(configuration.compactView, configuration.insertToolbarPosition, configuration.insertToolbarAlignment, cellToolbarPosition);
        return {
            bottomToolbarGap,
            bottomToolbarHeight,
        };
    }
    computeCellToolbarLocation(viewType) {
        const cellToolbarLocation = this._layoutConfiguration.cellToolbarLocation;
        if (typeof cellToolbarLocation === 'string') {
            if (cellToolbarLocation === 'left' ||
                cellToolbarLocation === 'right' ||
                cellToolbarLocation === 'hidden') {
                return cellToolbarLocation;
            }
        }
        else {
            if (viewType) {
                const notebookSpecificSetting = cellToolbarLocation[viewType] ?? cellToolbarLocation['default'];
                let cellToolbarLocationForCurrentView = 'right';
                switch (notebookSpecificSetting) {
                    case 'left':
                        cellToolbarLocationForCurrentView = 'left';
                        break;
                    case 'right':
                        cellToolbarLocationForCurrentView = 'right';
                        break;
                    case 'hidden':
                        cellToolbarLocationForCurrentView = 'hidden';
                        break;
                    default:
                        cellToolbarLocationForCurrentView = 'right';
                        break;
                }
                return cellToolbarLocationForCurrentView;
            }
        }
        return 'right';
    }
    computeTopInsertToolbarHeight(viewType) {
        if (this._layoutConfiguration.insertToolbarPosition === 'betweenCells' ||
            this._layoutConfiguration.insertToolbarPosition === 'both') {
            return SCROLLABLE_ELEMENT_PADDING_TOP;
        }
        const cellToolbarLocation = this.computeCellToolbarLocation(viewType);
        if (cellToolbarLocation === 'left' || cellToolbarLocation === 'right') {
            return SCROLLABLE_ELEMENT_PADDING_TOP;
        }
        return 0;
    }
    computeEditorPadding(internalMetadata, cellUri) {
        return {
            top: this._editorTopPadding,
            bottom: this.statusBarIsVisible(internalMetadata, cellUri)
                ? this._layoutConfiguration.editorBottomPadding
                : this._layoutConfiguration.editorBottomPaddingWithoutStatusBar,
        };
    }
    computeEditorStatusbarHeight(internalMetadata, cellUri) {
        return this.statusBarIsVisible(internalMetadata, cellUri) ? this.computeStatusBarHeight() : 0;
    }
    statusBarIsVisible(internalMetadata, cellUri) {
        const exe = this.notebookExecutionStateService.getCellExecution(cellUri);
        if (this._layoutConfiguration.showCellStatusBar === 'visible') {
            return true;
        }
        else if (this._layoutConfiguration.showCellStatusBar === 'visibleAfterExecute') {
            return typeof internalMetadata.lastRunSuccess === 'boolean' || exe !== undefined;
        }
        else {
            return false;
        }
    }
    computeWebviewOptions() {
        return {
            outputNodePadding: this._layoutConfiguration.cellOutputPadding,
            outputNodeLeftPadding: this._layoutConfiguration.cellOutputPadding,
            previewNodePadding: this._layoutConfiguration.markdownPreviewPadding,
            markdownLeftMargin: this._layoutConfiguration.markdownCellGutter +
                this._layoutConfiguration.markdownCellLeftMargin,
            leftMargin: this._layoutConfiguration.codeCellLeftMargin,
            rightMargin: this._layoutConfiguration.cellRightMargin,
            runGutter: this._layoutConfiguration.cellRunGutter,
            dragAndDropEnabled: this._layoutConfiguration.dragAndDropEnabled,
            fontSize: this._layoutConfiguration.fontSize,
            outputFontSize: this._layoutConfiguration.outputFontSize,
            outputFontFamily: this._layoutConfiguration.outputFontFamily,
            markupFontSize: this._layoutConfiguration.markupFontSize,
            markdownLineHeight: this._layoutConfiguration.markdownLineHeight,
            outputLineHeight: this._layoutConfiguration.outputLineHeight,
            outputScrolling: this._layoutConfiguration.outputScrolling,
            outputWordWrap: this._layoutConfiguration.outputWordWrap,
            outputLineLimit: this._layoutConfiguration.outputLineLimit,
            outputLinkifyFilePaths: this._layoutConfiguration.outputLinkifyFilePaths,
            minimalError: this._layoutConfiguration.outputMinimalError,
            markupFontFamily: this._layoutConfiguration.markupFontFamily,
        };
    }
    computeDiffWebviewOptions() {
        return {
            outputNodePadding: this._layoutConfiguration.cellOutputPadding,
            outputNodeLeftPadding: 0,
            previewNodePadding: this._layoutConfiguration.markdownPreviewPadding,
            markdownLeftMargin: 0,
            leftMargin: 32,
            rightMargin: 0,
            runGutter: 0,
            dragAndDropEnabled: false,
            fontSize: this._layoutConfiguration.fontSize,
            outputFontSize: this._layoutConfiguration.outputFontSize,
            outputFontFamily: this._layoutConfiguration.outputFontFamily,
            markupFontSize: this._layoutConfiguration.markupFontSize,
            markdownLineHeight: this._layoutConfiguration.markdownLineHeight,
            outputLineHeight: this._layoutConfiguration.outputLineHeight,
            outputScrolling: this._layoutConfiguration.outputScrolling,
            outputWordWrap: this._layoutConfiguration.outputWordWrap,
            outputLineLimit: this._layoutConfiguration.outputLineLimit,
            outputLinkifyFilePaths: false,
            minimalError: false,
            markupFontFamily: this._layoutConfiguration.markupFontFamily,
        };
    }
    computeIndicatorPosition(totalHeight, foldHintHeight, viewType) {
        const { bottomToolbarGap } = this.computeBottomToolbarDimensions(viewType);
        return {
            bottomIndicatorTop: totalHeight -
                bottomToolbarGap -
                this._layoutConfiguration.cellBottomMargin -
                foldHintHeight,
            verticalIndicatorHeight: totalHeight - bottomToolbarGap - foldHintHeight,
        };
    }
};
NotebookOptions = __decorate([
    __param(3, IConfigurationService),
    __param(4, INotebookExecutionStateService),
    __param(5, ICodeEditorService)
], NotebookOptions);
export { NotebookOptions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMzRSxPQUFPLEVBR04scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUlOLGVBQWUsR0FFZixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTNGLE1BQU0sOEJBQThCLEdBQUcsRUFBRSxDQUFBO0FBRXpDLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLENBQUMsQ0FBQTtBQWlHL0MsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzVDLGtCQUFrQixFQUFFLEVBQUU7SUFDdEIsYUFBYSxFQUFFLEVBQUU7SUFDakIscUJBQXFCLEVBQUUsQ0FBQztJQUN4Qix3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