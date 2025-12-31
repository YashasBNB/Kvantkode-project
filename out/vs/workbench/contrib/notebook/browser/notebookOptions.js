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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va09wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDM0UsT0FBTyxFQUdOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFJTixlQUFlLEdBRWYsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUzRixNQUFNLDhCQUE4QixHQUFHLEVBQUUsQ0FBQTtBQUV6QyxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxDQUFDLENBQUE7QUFpRy9DLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM1QyxrQkFBa0IsRUFBRSxFQUFFO0lBQ3RCLGFBQWEsRUFBRSxFQUFFO0lBQ2pCLHFCQUFxQixFQUFFLENBQUM7SUFDeEIsd0JBQXdC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