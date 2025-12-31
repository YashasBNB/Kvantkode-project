/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
// import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
// import { throttle } from '../../../../base/common/decorators.js';
import { findDiffs } from './helpers/findDiffs.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IUndoRedoService, } from '../../../../platform/undoRedo/common/undoRedo.js';
import { RenderOptions } from '../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
// import { IModelService } from '../../../../editor/common/services/model.js';
import * as dom from '../../../../base/browser/dom.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { IConsistentEditorItemService, IConsistentItemService, } from './helperServices/consistentItemService.js';
import { voidPrefixAndSuffix, ctrlKStream_userMessage, ctrlKStream_systemMessage, defaultQuickEditFimTags, rewriteCode_systemMessage, rewriteCode_userMessage, searchReplaceGivenDescription_systemMessage, searchReplaceGivenDescription_userMessage, tripleTick, } from '../common/prompt/prompts.js';
import { IVoidCommandBarService } from './voidCommandBarService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { VOID_ACCEPT_DIFF_ACTION_ID, VOID_REJECT_DIFF_ACTION_ID } from './actionIDs.js';
import { mountCtrlK } from './react/out/quick-edit-tsx/index.js';
import { extractCodeFromFIM, extractCodeFromRegular, extractSearchReplaceBlocks, } from '../common/helpers/extractCodeFromResult.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { IMetricsService } from '../common/metricsService.js';
import { IEditCodeService, } from './editCodeServiceInterface.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { deepClone } from '../../../../base/common/objects.js';
import { acceptBg, acceptBorder, buttonFontSize, buttonTextColor, rejectBg, rejectBorder, } from '../common/helpers/colors.js';
import { diffAreaSnapshotKeys, } from '../common/editCodeServiceTypes.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
// import { isMacintosh } from '../../../../base/common/platform.js';
// import { VOID_OPEN_SETTINGS_ACTION_ID } from './voidSettingsPane.js';
const numLinesOfStr = (str) => str.split('\n').length;
export const getLengthOfTextPx = ({ tabWidth, spaceWidth, content, }) => {
    let lengthOfTextPx = 0;
    for (const char of content) {
        if (char === '\t') {
            lengthOfTextPx += tabWidth;
        }
        else {
            lengthOfTextPx += spaceWidth;
        }
    }
    return lengthOfTextPx;
};
const getLeadingWhitespacePx = (editor, startLine) => {
    const model = editor.getModel();
    if (!model) {
        return 0;
    }
    // Get the line content, defaulting to empty string if line doesn't exist
    const lineContent = model.getLineContent(startLine) || '';
    // Find the first non-whitespace character
    const firstNonWhitespaceIndex = lineContent.search(/\S/);
    // Extract leading whitespace, handling case where line is all whitespace
    const leadingWhitespace = firstNonWhitespaceIndex === -1 ? lineContent : lineContent.slice(0, firstNonWhitespaceIndex);
    // Get font information from editor render options
    const { tabSize: numSpacesInTab } = model.getFormattingOptions();
    const spaceWidth = editor.getOption(52 /* EditorOption.fontInfo */).spaceWidth;
    const tabWidth = numSpacesInTab * spaceWidth;
    const leftWhitespacePx = getLengthOfTextPx({
        tabWidth,
        spaceWidth,
        content: leadingWhitespace,
    });
    return leftWhitespacePx;
};
// Helper function to remove whitespace except newlines
const removeWhitespaceExceptNewlines = (str) => {
    return str.replace(/[^\S\n]+/g, '');
};
// finds block.orig in fileContents and return its range in file
// startingAtLine is 1-indexed and inclusive
// returns 1-indexed lines
const findTextInCode = (text, fileContents, canFallbackToRemoveWhitespace, opts) => {
    const returnAns = (fileContents, idx) => {
        const startLine = numLinesOfStr(fileContents.substring(0, idx + 1));
        const numLines = numLinesOfStr(text);
        const endLine = startLine + numLines - 1;
        return [startLine, endLine];
    };
    const startingAtLineIdx = (fileContents) => opts?.startingAtLine !== undefined
        ? fileContents.split('\n').slice(0, opts.startingAtLine).join('\n').length // num characters in all lines before startingAtLine
        : 0;
    // idx = starting index in fileContents
    let idx = fileContents.indexOf(text, startingAtLineIdx(fileContents));
    // if idx was found
    if (idx !== -1) {
        return returnAns(fileContents, idx);
    }
    if (!canFallbackToRemoveWhitespace)
        return 'Not found';
    // try to find it ignoring all whitespace this time
    text = removeWhitespaceExceptNewlines(text);
    fileContents = removeWhitespaceExceptNewlines(fileContents);
    idx = fileContents.indexOf(text, startingAtLineIdx(fileContents));
    if (idx === -1)
        return 'Not found';
    const lastIdx = fileContents.lastIndexOf(text);
    if (lastIdx !== idx)
        return 'Not unique';
    return returnAns(fileContents, idx);
};
let EditCodeService = class EditCodeService extends Disposable {
    constructor(_codeEditorService, _modelService, _undoRedoService, _llmMessageService, _consistentItemService, _instantiationService, _consistentEditorItemService, _metricsService, _notificationService, _settingsService, _voidModelService, _convertToLLMMessageService) {
        super();
        this._codeEditorService = _codeEditorService;
        this._modelService = _modelService;
        this._undoRedoService = _undoRedoService;
        this._llmMessageService = _llmMessageService;
        this._consistentItemService = _consistentItemService;
        this._instantiationService = _instantiationService;
        this._consistentEditorItemService = _consistentEditorItemService;
        this._metricsService = _metricsService;
        this._notificationService = _notificationService;
        this._settingsService = _settingsService;
        this._voidModelService = _voidModelService;
        this._convertToLLMMessageService = _convertToLLMMessageService;
        // URI <--> model
        this.diffAreasOfURI = {}; // uri -> diffareaId
        this.diffAreaOfId = {}; // diffareaId -> diffArea
        this.diffOfId = {}; // diffid -> diff (redundant with diffArea._diffOfId)
        // events
        // uri: diffZones  // listen on change diffZones
        this._onDidAddOrDeleteDiffZones = new Emitter();
        this.onDidAddOrDeleteDiffZones = this._onDidAddOrDeleteDiffZones.event;
        // diffZone: [uri], diffs, isStreaming  // listen on change diffs, change streaming (uri is const)
        this._onDidChangeDiffsInDiffZoneNotStreaming = new Emitter();
        this._onDidChangeStreamingInDiffZone = new Emitter();
        this.onDidChangeDiffsInDiffZoneNotStreaming = this._onDidChangeDiffsInDiffZoneNotStreaming.event;
        this.onDidChangeStreamingInDiffZone = this._onDidChangeStreamingInDiffZone.event;
        // ctrlKZone: [uri], isStreaming  // listen on change streaming
        this._onDidChangeStreamingInCtrlKZone = new Emitter();
        this.onDidChangeStreamingInCtrlKZone = this._onDidChangeStreamingInCtrlKZone.event;
        // private _notifyError = (e: Parameters<OnError>[0]) => {
        // 	const details = errorDetails(e.fullError)
        // 	this._notificationService.notify({
        // 		severity: Severity.Warning,
        // 		message: `Void Error: ${e.message}`,
        // 		actions: {
        // 			secondary: [{
        // 				id: 'void.onerror.opensettings',
        // 				enabled: true,
        // 				label: `Open Void's settings`,
        // 				tooltip: '',
        // 				class: undefined,
        // 				run: () => { this._commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID) }
        // 			}]
        // 		},
        // 		source: details ? `(Hold ${isMacintosh ? 'Option' : 'Alt'} to hover) - ${details}\n\nIf this persists, feel free to [report](https://github.com/voideditor/void/issues/new) it.` : undefined
        // 	})
        // }
        // highlight the region
        this._addLineDecoration = (model, startLine, endLine, className, options) => {
            if (model === null)
                return;
            const id = model.changeDecorations((accessor) => accessor.addDecoration({
                startLineNumber: startLine,
                startColumn: 1,
                endLineNumber: endLine,
                endColumn: Number.MAX_SAFE_INTEGER,
            }, {
                className: className,
                description: className,
                isWholeLine: true,
                ...options,
            }));
            const disposeHighlight = () => {
                if (id && !model.isDisposed())
                    model.changeDecorations((accessor) => accessor.removeDecoration(id));
            };
            return disposeHighlight;
        };
        this._addDiffAreaStylesToURI = (uri) => {
            const { model } = this._voidModelService.getModel(uri);
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type === 'DiffZone') {
                    // add sweep styles to the diffZone
                    if (diffArea._streamState.isStreaming) {
                        // sweepLine ... sweepLine
                        const fn1 = this._addLineDecoration(model, diffArea._streamState.line, diffArea._streamState.line, 'void-sweepIdxBG');
                        // sweepLine+1 ... endLine
                        const fn2 = diffArea._streamState.line + 1 <= diffArea.endLine
                            ? this._addLineDecoration(model, diffArea._streamState.line + 1, diffArea.endLine, 'void-sweepBG')
                            : null;
                        diffArea._removeStylesFns.add(() => {
                            fn1?.();
                            fn2?.();
                        });
                    }
                }
                else if (diffArea.type === 'CtrlKZone' && diffArea._linkedStreamingDiffZone === null) {
                    // highlight zone's text
                    const fn = this._addLineDecoration(model, diffArea.startLine, diffArea.endLine, 'void-highlightBG');
                    diffArea._removeStylesFns.add(() => fn?.());
                }
            }
        };
        this._computeDiffsAndAddStylesToURI = (uri) => {
            const { model } = this._voidModelService.getModel(uri);
            if (model === null)
                return;
            const fullFileText = model.getValue(1 /* EndOfLinePreference.LF */);
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type !== 'DiffZone')
                    continue;
                const newDiffAreaCode = fullFileText
                    .split('\n')
                    .slice(diffArea.startLine - 1, diffArea.endLine - 1 + 1)
                    .join('\n');
                const computedDiffs = findDiffs(diffArea.originalCode, newDiffAreaCode);
                for (let computedDiff of computedDiffs) {
                    if (computedDiff.type === 'deletion') {
                        computedDiff.startLine += diffArea.startLine - 1;
                    }
                    if (computedDiff.type === 'edit' || computedDiff.type === 'insertion') {
                        computedDiff.startLine += diffArea.startLine - 1;
                        computedDiff.endLine += diffArea.startLine - 1;
                    }
                    this._addDiff(computedDiff, diffArea);
                }
            }
        };
        this.mostRecentTextOfCtrlKZoneId = {};
        this._addCtrlKZoneInput = (ctrlKZone) => {
            const { editorId } = ctrlKZone;
            const editor = this._codeEditorService.listCodeEditors().find((e) => e.getId() === editorId);
            if (!editor) {
                return null;
            }
            let zoneId = null;
            let viewZone_ = null;
            const textAreaRef = { current: null };
            const paddingLeft = getLeadingWhitespacePx(editor, ctrlKZone.startLine);
            const itemId = this._consistentEditorItemService.addToEditor(editor, () => {
                const domNode = document.createElement('div');
                domNode.style.zIndex = '1';
                domNode.style.height = 'auto';
                domNode.style.paddingLeft = `${paddingLeft}px`;
                const viewZone = {
                    afterLineNumber: ctrlKZone.startLine - 1,
                    domNode: domNode,
                    // heightInPx: 80,
                    suppressMouseDown: false,
                    showInHiddenAreas: true,
                };
                viewZone_ = viewZone;
                // mount zone
                editor.changeViewZones((accessor) => {
                    zoneId = accessor.addZone(viewZone);
                });
                // mount react
                let disposeFn = undefined;
                this._instantiationService.invokeFunction((accessor) => {
                    disposeFn = mountCtrlK(domNode, accessor, {
                        diffareaid: ctrlKZone.diffareaid,
                        textAreaRef: (r) => {
                            textAreaRef.current = r;
                            if (!textAreaRef.current)
                                return;
                            if (!(ctrlKZone.diffareaid in this.mostRecentTextOfCtrlKZoneId)) {
                                // detect first mount this way (a hack)
                                this.mostRecentTextOfCtrlKZoneId[ctrlKZone.diffareaid] = undefined;
                                setTimeout(() => textAreaRef.current?.focus(), 100);
                            }
                        },
                        onChangeHeight(height) {
                            if (height === 0)
                                return; // the viewZone sets this height to the container if it's out of view, ignore it
                            viewZone.heightInPx = height;
                            // re-render with this new height
                            editor.changeViewZones((accessor) => {
                                if (zoneId)
                                    accessor.layoutZone(zoneId);
                            });
                        },
                        onChangeText: (text) => {
                            this.mostRecentTextOfCtrlKZoneId[ctrlKZone.diffareaid] = text;
                        },
                        initText: this.mostRecentTextOfCtrlKZoneId[ctrlKZone.diffareaid] ?? null,
                    })?.dispose;
                });
                // cleanup
                return () => {
                    editor.changeViewZones((accessor) => {
                        if (zoneId)
                            accessor.removeZone(zoneId);
                    });
                    disposeFn?.();
                };
            });
            return {
                textAreaRef,
                refresh: () => editor.changeViewZones((accessor) => {
                    if (zoneId && viewZone_) {
                        viewZone_.afterLineNumber = ctrlKZone.startLine - 1;
                        accessor.layoutZone(zoneId);
                    }
                }),
                dispose: () => {
                    this._consistentEditorItemService.removeFromEditor(itemId);
                },
            };
        };
        this._refreshCtrlKInputs = async (uri) => {
            for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type !== 'CtrlKZone')
                    continue;
                if (!diffArea._mountInfo) {
                    diffArea._mountInfo = this._addCtrlKZoneInput(diffArea);
                    console.log('MOUNTED CTRLK', diffArea.diffareaid);
                }
                else {
                    diffArea._mountInfo.refresh();
                }
            }
        };
        this._addDiffStylesToURI = (uri, diff) => {
            const { type, diffid } = diff;
            const disposeInThisEditorFns = [];
            const { model } = this._voidModelService.getModel(uri);
            // green decoration and minimap decoration
            if (type !== 'deletion') {
                const fn = this._addLineDecoration(model, diff.startLine, diff.endLine, 'void-greenBG', {
                    minimap: { color: { id: 'minimapGutter.addedBackground' }, position: 2 },
                    overviewRuler: { color: { id: 'editorOverviewRuler.addedForeground' }, position: 7 },
                });
                disposeInThisEditorFns.push(() => {
                    fn?.();
                });
            }
            // red in a view zone
            if (type !== 'insertion') {
                const consistentZoneId = this._consistentItemService.addConsistentItemToURI({
                    uri,
                    fn: (editor) => {
                        const domNode = document.createElement('div');
                        domNode.className = 'void-redBG';
                        const renderOptions = RenderOptions.fromEditor(editor);
                        const processedText = diff.originalCode.replace(/\t/g, ' '.repeat(renderOptions.tabSize));
                        const lines = processedText.split('\n');
                        const linesContainer = document.createElement('div');
                        linesContainer.style.fontFamily = renderOptions.fontInfo.fontFamily;
                        linesContainer.style.fontSize = `${renderOptions.fontInfo.fontSize}px`;
                        linesContainer.style.lineHeight = `${renderOptions.fontInfo.lineHeight}px`;
                        // linesContainer.style.tabSize = `${tabWidth}px` // \t
                        linesContainer.style.whiteSpace = 'pre';
                        linesContainer.style.position = 'relative';
                        linesContainer.style.width = '100%';
                        lines.forEach((line) => {
                            // div for current line
                            const lineDiv = document.createElement('div');
                            lineDiv.className = 'view-line';
                            lineDiv.style.whiteSpace = 'pre';
                            lineDiv.style.position = 'relative';
                            lineDiv.style.height = `${renderOptions.fontInfo.lineHeight}px`;
                            // span (this is just how vscode does it)
                            const span = document.createElement('span');
                            span.textContent = line || '\u00a0';
                            span.style.whiteSpace = 'pre';
                            span.style.display = 'inline-block';
                            lineDiv.appendChild(span);
                            linesContainer.appendChild(lineDiv);
                        });
                        domNode.appendChild(linesContainer);
                        // Calculate height based on number of lines and line height
                        const heightInLines = lines.length;
                        const minWidthInPx = Math.max(...lines.map((line) => Math.ceil(renderOptions.fontInfo.typicalFullwidthCharacterWidth * line.length)));
                        const viewZone = {
                            afterLineNumber: diff.startLine - 1,
                            heightInLines,
                            minWidthInPx,
                            domNode,
                            marginDomNode: document.createElement('div'),
                            suppressMouseDown: false,
                            showInHiddenAreas: false,
                        };
                        let zoneId = null;
                        editor.changeViewZones((accessor) => {
                            zoneId = accessor.addZone(viewZone);
                        });
                        return () => editor.changeViewZones((accessor) => {
                            if (zoneId)
                                accessor.removeZone(zoneId);
                        });
                    },
                });
                disposeInThisEditorFns.push(() => {
                    this._consistentItemService.removeConsistentItemFromURI(consistentZoneId);
                });
            }
            const diffZone = this.diffAreaOfId[diff.diffareaid];
            if (diffZone.type === 'DiffZone' && !diffZone._streamState.isStreaming) {
                // Accept | Reject widget
                const consistentWidgetId = this._consistentItemService.addConsistentItemToURI({
                    uri,
                    fn: (editor) => {
                        let startLine;
                        let offsetLines;
                        if (diff.type === 'insertion' || diff.type === 'edit') {
                            startLine = diff.startLine; // green start
                            offsetLines = 0;
                        }
                        else if (diff.type === 'deletion') {
                            // if diff.startLine is out of bounds
                            if (diff.startLine === 1) {
                                const numRedLines = diff.originalEndLine - diff.originalStartLine + 1;
                                startLine = diff.startLine;
                                offsetLines = -numRedLines;
                            }
                            else {
                                startLine = diff.startLine - 1;
                                offsetLines = 1;
                            }
                        }
                        else {
                            throw new Error('Void 1');
                        }
                        const buttonsWidget = this._instantiationService.createInstance(AcceptRejectInlineWidget, {
                            editor,
                            onAccept: () => {
                                this.acceptDiff({ diffid });
                                this._metricsService.capture('Accept Diff', { diffid });
                            },
                            onReject: () => {
                                this.rejectDiff({ diffid });
                                this._metricsService.capture('Reject Diff', { diffid });
                            },
                            diffid: diffid.toString(),
                            startLine,
                            offsetLines,
                        });
                        return () => {
                            buttonsWidget.dispose();
                        };
                    },
                });
                disposeInThisEditorFns.push(() => {
                    this._consistentItemService.removeConsistentItemFromURI(consistentWidgetId);
                });
            }
            const disposeInEditor = () => {
                disposeInThisEditorFns.forEach((f) => f());
            };
            return disposeInEditor;
        };
        this.weAreWriting = false;
        this._getCurrentVoidFileSnapshot = (uri) => {
            const { model } = this._voidModelService.getModel(uri);
            const snapshottedDiffAreaOfId = {};
            for (const diffareaid in this.diffAreaOfId) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea._URI.fsPath !== uri.fsPath)
                    continue;
                snapshottedDiffAreaOfId[diffareaid] = deepClone(Object.fromEntries(diffAreaSnapshotKeys.map((key) => [key, diffArea[key]])));
            }
            const entireFileCode = model ? model.getValue(1 /* EndOfLinePreference.LF */) : '';
            // this._noLongerNeedModelReference(uri)
            return {
                snapshottedDiffAreaOfId,
                entireFileCode, // the whole file's code
            };
        };
        this._restoreVoidFileSnapshot = async (uri, snapshot) => {
            // for each diffarea in this uri, stop streaming if currently streaming
            for (const diffareaid in this.diffAreaOfId) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (diffArea.type === 'DiffZone')
                    this._stopIfStreaming(diffArea);
            }
            // delete all diffareas on this uri (clearing their styles)
            this._deleteAllDiffAreas(uri);
            const { snapshottedDiffAreaOfId, entireFileCode: entireModelCode } = deepClone(snapshot); // don't want to destroy the snapshot
            // restore diffAreaOfId and diffAreasOfModelId
            for (const diffareaid in snapshottedDiffAreaOfId) {
                const snapshottedDiffArea = snapshottedDiffAreaOfId[diffareaid];
                if (snapshottedDiffArea.type === 'DiffZone') {
                    this.diffAreaOfId[diffareaid] = {
                        ...snapshottedDiffArea,
                        type: 'DiffZone',
                        _diffOfId: {},
                        _URI: uri,
                        _streamState: { isStreaming: false }, // when restoring, we will never be streaming
                        _removeStylesFns: new Set(),
                    };
                }
                else if (snapshottedDiffArea.type === 'CtrlKZone') {
                    this.diffAreaOfId[diffareaid] = {
                        ...snapshottedDiffArea,
                        _URI: uri,
                        _removeStylesFns: new Set(),
                        _mountInfo: null,
                        _linkedStreamingDiffZone: null, // when restoring, we will never be streaming
                    };
                }
                this._addOrInitializeDiffAreaAtURI(uri, diffareaid);
            }
            this._onDidAddOrDeleteDiffZones.fire({ uri });
            // restore file content
            this._writeURIText(uri, entireModelCode, 'wholeFileRange', { shouldRealignDiffAreas: false });
            // this._noLongerNeedModelReference(uri)
        };
        this._addOrInitializeDiffAreaAtURI = (uri, diffareaid) => {
            if (!(uri.fsPath in this.diffAreasOfURI))
                this.diffAreasOfURI[uri.fsPath] = new Set();
            this.diffAreasOfURI[uri.fsPath]?.add(diffareaid.toString());
        };
        this._diffareaidPool = 0; // each diffarea has an id
        this._diffidPool = 0; // each diff has an id
        /**
         * Generates a human-readable error message for an invalid ORIGINAL search block.
         */
        this._errContentOfInvalidStr = (str, blockOrig) => {
            const problematicCode = `${tripleTick[0]}\n${JSON.stringify(blockOrig)}\n${tripleTick[1]}`;
            // use a switch for better readability / exhaustiveness check
            let descStr;
            switch (str) {
                case 'Not found':
                    descStr = `The edit was not applied. The text in ORIGINAL must EXACTLY match lines of code in the file, but there was no match for:\n${problematicCode}. Ensure you have the latest version of the file, and ensure the ORIGINAL code matches a code excerpt exactly.`;
                    break;
                case 'Not unique':
                    descStr = `The edit was not applied. The text in ORIGINAL must be unique in the file being edited, but the following ORIGINAL code appears multiple times in the file:\n${problematicCode}. Ensure you have the latest version of the file, and ensure the ORIGINAL code is unique.`;
                    break;
                case 'Has overlap':
                    descStr = `The edit was not applied. The text in the ORIGINAL blocks must not overlap, but the following ORIGINAL code had overlap with another ORIGINAL string:\n${problematicCode}. Ensure you have the latest version of the file, and ensure the ORIGINAL code blocks do not overlap.`;
                    break;
                default:
                    descStr = '';
            }
            return descStr;
        };
        // remove a batch of diffareas all at once (and handle accept/reject of their diffs)
        this.acceptOrRejectAllDiffAreas = async ({ uri, behavior, removeCtrlKs, _addToHistory, }) => {
            const diffareaids = this.diffAreasOfURI[uri.fsPath];
            if ((diffareaids?.size ?? 0) === 0)
                return; // do nothing
            const { onFinishEdit } = _addToHistory === false ? { onFinishEdit: () => { } } : this._addToHistory(uri);
            for (const diffareaid of diffareaids ?? []) {
                const diffArea = this.diffAreaOfId[diffareaid];
                if (!diffArea)
                    continue;
                if (diffArea.type === 'DiffZone') {
                    if (behavior === 'reject') {
                        this._revertDiffZone(diffArea);
                        this._deleteDiffZone(diffArea);
                    }
                    else if (behavior === 'accept')
                        this._deleteDiffZone(diffArea);
                }
                else if (diffArea.type === 'CtrlKZone' && removeCtrlKs) {
                    this._deleteCtrlKZone(diffArea);
                }
            }
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
        };
        // this function initializes data structures and listens for changes
        const registeredModelURIs = new Set();
        const initializeModel = async (model) => {
            await this._voidModelService.initializeModel(model.uri);
            // do not add listeners to the same model twice - important, or will see duplicates
            if (registeredModelURIs.has(model.uri.fsPath))
                return;
            registeredModelURIs.add(model.uri.fsPath);
            if (!(model.uri.fsPath in this.diffAreasOfURI)) {
                this.diffAreasOfURI[model.uri.fsPath] = new Set();
            }
            // when the user types, realign diff areas and re-render them
            this._register(model.onDidChangeContent((e) => {
                // it's as if we just called _write, now all we need to do is realign and refresh
                if (this.weAreWriting)
                    return;
                const uri = model.uri;
                this._onUserChangeContent(uri, e);
            }));
            // when the model first mounts, refresh any diffs that might be on it (happens if diffs were added in the BG)
            this._refreshStylesAndDiffsInURI(model.uri);
        };
        // initialize all existing models + initialize when a new model mounts
        for (let model of this._modelService.getModels()) {
            initializeModel(model);
        }
        this._register(this._modelService.onModelAdded((model) => {
            initializeModel(model);
        }));
        // this function adds listeners to refresh styles when editor changes tab
        let initializeEditor = (editor) => {
            const uri = editor.getModel()?.uri ?? null;
            if (uri)
                this._refreshStylesAndDiffsInURI(uri);
        };
        // add listeners for all existing editors + listen for editor being added
        for (let editor of this._codeEditorService.listCodeEditors()) {
            initializeEditor(editor);
        }
        this._register(this._codeEditorService.onCodeEditorAdd((editor) => {
            initializeEditor(editor);
        }));
    }
    _onUserChangeContent(uri, e) {
        for (const change of e.changes) {
            this._realignAllDiffAreasLines(uri, change.text, change.range);
        }
        this._refreshStylesAndDiffsInURI(uri);
        // if diffarea has no diffs after a user edit, delete it
        const diffAreasToDelete = [];
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] ?? []) {
            const diffArea = this.diffAreaOfId[diffareaid] ?? null;
            const shouldDelete = diffArea?.type === 'DiffZone' && Object.keys(diffArea._diffOfId).length === 0;
            if (shouldDelete) {
                diffAreasToDelete.push(diffArea);
            }
        }
        if (diffAreasToDelete.length !== 0) {
            const { onFinishEdit } = this._addToHistory(uri);
            diffAreasToDelete.forEach((da) => this._deleteDiffZone(da));
            onFinishEdit();
        }
    }
    processRawKeybindingText(keybindingStr) {
        return keybindingStr
            .replace(/Enter/g, '↵') // ⏎
            .replace(/Backspace/g, '⌫');
    }
    _getActiveEditorURI() {
        const editor = this._codeEditorService.getActiveCodeEditor();
        if (!editor)
            return null;
        const uri = editor.getModel()?.uri;
        if (!uri)
            return null;
        return uri;
    }
    _writeURIText(uri, text, range_, { shouldRealignDiffAreas }) {
        const { model } = this._voidModelService.getModel(uri);
        if (!model) {
            this._refreshStylesAndDiffsInURI(uri); // at the end of a write, we still expect to refresh all styles. e.g. sometimes we expect to restore all the decorations even if no edits were made when _writeText is used
            return;
        }
        const range = range_ === 'wholeFileRange'
            ? {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: model.getLineCount(),
                endColumn: Number.MAX_SAFE_INTEGER,
            } // whole file
            : range_;
        // realign is 100% independent from written text (diffareas are nonphysical), can do this first
        if (shouldRealignDiffAreas) {
            const newText = text;
            const oldRange = range;
            this._realignAllDiffAreasLines(uri, newText, oldRange);
        }
        const uriStr = model.getValue(1 /* EndOfLinePreference.LF */);
        // heuristic check
        const dontNeedToWrite = uriStr === text;
        if (dontNeedToWrite) {
            this._refreshStylesAndDiffsInURI(uri); // at the end of a write, we still expect to refresh all styles. e.g. sometimes we expect to restore all the decorations even if no edits were made when _writeText is used
            return;
        }
        this.weAreWriting = true;
        model.applyEdits([{ range, text }]);
        this.weAreWriting = false;
        this._refreshStylesAndDiffsInURI(uri);
    }
    _addToHistory(uri, opts) {
        const beforeSnapshot = this._getCurrentVoidFileSnapshot(uri);
        let afterSnapshot = null;
        const elt = {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: uri,
            label: 'Void Agent',
            code: 'undoredo.editCode',
            undo: async () => {
                opts?.onWillUndo?.();
                await this._restoreVoidFileSnapshot(uri, beforeSnapshot);
            },
            redo: async () => {
                if (afterSnapshot)
                    await this._restoreVoidFileSnapshot(uri, afterSnapshot);
            },
        };
        this._undoRedoService.pushElement(elt);
        const onFinishEdit = async () => {
            afterSnapshot = this._getCurrentVoidFileSnapshot(uri);
            await this._voidModelService.saveModel(uri);
        };
        return { onFinishEdit };
    }
    getVoidFileSnapshot(uri) {
        return this._getCurrentVoidFileSnapshot(uri);
    }
    restoreVoidFileSnapshot(uri, snapshot) {
        this._restoreVoidFileSnapshot(uri, snapshot);
    }
    // delete diffOfId and diffArea._diffOfId
    _deleteDiff(diff) {
        const diffArea = this.diffAreaOfId[diff.diffareaid];
        if (diffArea.type !== 'DiffZone')
            return;
        delete diffArea._diffOfId[diff.diffid];
        delete this.diffOfId[diff.diffid];
    }
    _deleteDiffs(diffZone) {
        for (const diffid in diffZone._diffOfId) {
            const diff = diffZone._diffOfId[diffid];
            this._deleteDiff(diff);
        }
    }
    _clearAllDiffAreaEffects(diffArea) {
        // clear diffZone effects (diffs)
        if (diffArea.type === 'DiffZone')
            this._deleteDiffs(diffArea);
        diffArea._removeStylesFns?.forEach((removeStyles) => removeStyles());
        diffArea._removeStylesFns?.clear();
    }
    // clears all Diffs (and their styles) and all styles of DiffAreas, etc
    _clearAllEffects(uri) {
        for (let diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            this._clearAllDiffAreaEffects(diffArea);
        }
    }
    // delete all diffs, update diffAreaOfId, update diffAreasOfModelId
    _deleteDiffZone(diffZone) {
        this._clearAllDiffAreaEffects(diffZone);
        delete this.diffAreaOfId[diffZone.diffareaid];
        this.diffAreasOfURI[diffZone._URI.fsPath]?.delete(diffZone.diffareaid.toString());
        this._onDidAddOrDeleteDiffZones.fire({ uri: diffZone._URI });
    }
    _deleteTrackingZone(trackingZone) {
        delete this.diffAreaOfId[trackingZone.diffareaid];
        this.diffAreasOfURI[trackingZone._URI.fsPath]?.delete(trackingZone.diffareaid.toString());
    }
    _deleteCtrlKZone(ctrlKZone) {
        this._clearAllEffects(ctrlKZone._URI);
        ctrlKZone._mountInfo?.dispose();
        delete this.diffAreaOfId[ctrlKZone.diffareaid];
        this.diffAreasOfURI[ctrlKZone._URI.fsPath]?.delete(ctrlKZone.diffareaid.toString());
    }
    _deleteAllDiffAreas(uri) {
        const diffAreas = this.diffAreasOfURI[uri.fsPath];
        diffAreas?.forEach((diffareaid) => {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea.type === 'DiffZone')
                this._deleteDiffZone(diffArea);
            else if (diffArea.type === 'CtrlKZone')
                this._deleteCtrlKZone(diffArea);
        });
        this.diffAreasOfURI[uri.fsPath]?.clear();
    }
    _addDiffArea(diffArea) {
        const diffareaid = this._diffareaidPool++;
        const diffArea2 = { ...diffArea, diffareaid };
        this._addOrInitializeDiffAreaAtURI(diffArea._URI, diffareaid);
        this.diffAreaOfId[diffareaid] = diffArea2;
        return diffArea2;
    }
    _addDiff(computedDiff, diffZone) {
        const uri = diffZone._URI;
        const diffid = this._diffidPool++;
        // create a Diff of it
        const newDiff = {
            ...computedDiff,
            diffid: diffid,
            diffareaid: diffZone.diffareaid,
        };
        const fn = this._addDiffStylesToURI(uri, newDiff);
        if (fn)
            diffZone._removeStylesFns.add(fn);
        this.diffOfId[diffid] = newDiff;
        diffZone._diffOfId[diffid] = newDiff;
        return newDiff;
    }
    // changes the start/line locations of all DiffAreas on the page (adjust their start/end based on the change) based on the change that was recently made
    _realignAllDiffAreasLines(uri, text, recentChange) {
        // console.log('recent change', recentChange)
        // compute net number of newlines lines that were added/removed
        const startLine = recentChange.startLineNumber;
        const endLine = recentChange.endLineNumber;
        const newTextHeight = (text.match(/\n/g) || []).length + 1; // number of newlines is number of \n's + 1, e.g. "ab\ncd"
        // compute overlap with each diffArea and shrink/elongate each diffArea accordingly
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            // if the diffArea is entirely above the range, it is not affected
            if (diffArea.endLine < startLine) {
                // console.log('CHANGE FULLY BELOW DA (doing nothing)')
                continue;
            }
            // if a diffArea is entirely below the range, shift the diffArea up/down by the delta amount of newlines
            else if (endLine < diffArea.startLine) {
                // console.log('CHANGE FULLY ABOVE DA')
                const changedRangeHeight = endLine - startLine + 1;
                const deltaNewlines = newTextHeight - changedRangeHeight;
                diffArea.startLine += deltaNewlines;
                diffArea.endLine += deltaNewlines;
            }
            // if the diffArea fully contains the change, elongate it by the delta amount of newlines
            else if (startLine >= diffArea.startLine && endLine <= diffArea.endLine) {
                // console.log('DA FULLY CONTAINS CHANGE')
                const changedRangeHeight = endLine - startLine + 1;
                const deltaNewlines = newTextHeight - changedRangeHeight;
                diffArea.endLine += deltaNewlines;
            }
            // if the change fully contains the diffArea, make the diffArea have the same range as the change
            else if (diffArea.startLine > startLine && diffArea.endLine < endLine) {
                // console.log('CHANGE FULLY CONTAINS DA')
                diffArea.startLine = startLine;
                diffArea.endLine = startLine + newTextHeight;
            }
            // if the change contains only the diffArea's top
            else if (startLine < diffArea.startLine && diffArea.startLine <= endLine) {
                // console.log('CHANGE CONTAINS TOP OF DA ONLY')
                const numOverlappingLines = endLine - diffArea.startLine + 1;
                const numRemainingLinesInDA = diffArea.endLine - diffArea.startLine + 1 - numOverlappingLines;
                const newHeight = numRemainingLinesInDA - 1 + (newTextHeight - 1) + 1;
                diffArea.startLine = startLine;
                diffArea.endLine = startLine + newHeight;
            }
            // if the change contains only the diffArea's bottom
            else if (startLine <= diffArea.endLine && diffArea.endLine < endLine) {
                // console.log('CHANGE CONTAINS BOTTOM OF DA ONLY')
                const numOverlappingLines = diffArea.endLine - startLine + 1;
                diffArea.endLine += newTextHeight - numOverlappingLines;
            }
        }
    }
    _fireChangeDiffsIfNotStreaming(uri) {
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea?.type !== 'DiffZone')
                continue;
            // fire changed diffs (this is the only place Diffs are added)
            if (!diffArea._streamState.isStreaming) {
                this._onDidChangeDiffsInDiffZoneNotStreaming.fire({ uri, diffareaid: diffArea.diffareaid });
            }
        }
    }
    _refreshStylesAndDiffsInURI(uri) {
        // 1. clear DiffArea styles and Diffs
        this._clearAllEffects(uri);
        // 2. style DiffAreas (sweep, etc)
        this._addDiffAreaStylesToURI(uri);
        // 3. add Diffs
        this._computeDiffsAndAddStylesToURI(uri);
        // 4. refresh ctrlK zones
        this._refreshCtrlKInputs(uri);
        // 5. this is the only place where diffs are changed, so can fire here only
        this._fireChangeDiffsIfNotStreaming(uri);
    }
    // @throttle(100)
    _writeStreamedDiffZoneLLMText(uri, originalCode, llmTextSoFar, deltaText, latestMutable) {
        let numNewLines = 0;
        // ----------- 1. Write the new code to the document -----------
        // figure out where to highlight based on where the AI is in the stream right now, use the last diff to figure that out
        const computedDiffs = findDiffs(originalCode, llmTextSoFar);
        // if streaming, use diffs to figure out where to write new code
        // these are two different coordinate systems - new and old line number
        let endLineInLlmTextSoFar; // get file[diffArea.startLine...newFileEndLine] with line=newFileEndLine highlighted
        let startLineInOriginalCode; // get original[oldStartingPoint...] (line in the original code, so starts at 1)
        const lastDiff = computedDiffs.pop();
        if (!lastDiff) {
            // console.log('!lastDiff')
            // if the writing is identical so far, display no changes
            startLineInOriginalCode = 1;
            endLineInLlmTextSoFar = 1;
        }
        else {
            startLineInOriginalCode = lastDiff.originalStartLine;
            if (lastDiff.type === 'insertion' || lastDiff.type === 'edit')
                endLineInLlmTextSoFar = lastDiff.endLine;
            else if (lastDiff.type === 'deletion')
                endLineInLlmTextSoFar = lastDiff.startLine;
            else
                throw new Error(`Void: diff.type not recognized on: ${lastDiff}`);
        }
        // at the start, add a newline between the stream and originalCode to make reasoning easier
        if (!latestMutable.addedSplitYet) {
            this._writeURIText(uri, '\n', {
                startLineNumber: latestMutable.line,
                startColumn: latestMutable.col,
                endLineNumber: latestMutable.line,
                endColumn: latestMutable.col,
            }, { shouldRealignDiffAreas: true });
            latestMutable.addedSplitYet = true;
            numNewLines += 1;
        }
        // insert deltaText at latest line and col
        this._writeURIText(uri, deltaText, {
            startLineNumber: latestMutable.line,
            startColumn: latestMutable.col,
            endLineNumber: latestMutable.line,
            endColumn: latestMutable.col,
        }, { shouldRealignDiffAreas: true });
        const deltaNumNewLines = deltaText.split('\n').length - 1;
        latestMutable.line += deltaNumNewLines;
        const lastNewlineIdx = deltaText.lastIndexOf('\n');
        latestMutable.col =
            lastNewlineIdx === -1
                ? latestMutable.col + deltaText.length
                : deltaText.length - lastNewlineIdx;
        numNewLines += deltaNumNewLines;
        // delete or insert to get original up to speed
        if (latestMutable.originalCodeStartLine < startLineInOriginalCode) {
            // moved up, delete
            const numLinesDeleted = startLineInOriginalCode - latestMutable.originalCodeStartLine;
            this._writeURIText(uri, '', {
                startLineNumber: latestMutable.line,
                startColumn: latestMutable.col,
                endLineNumber: latestMutable.line + numLinesDeleted,
                endColumn: Number.MAX_SAFE_INTEGER,
            }, { shouldRealignDiffAreas: true });
            numNewLines -= numLinesDeleted;
        }
        else if (latestMutable.originalCodeStartLine > startLineInOriginalCode) {
            const newText = '\n' +
                originalCode
                    .split('\n')
                    .slice(startLineInOriginalCode - 1, latestMutable.originalCodeStartLine - 1 - 1 + 1)
                    .join('\n');
            this._writeURIText(uri, newText, {
                startLineNumber: latestMutable.line,
                startColumn: latestMutable.col,
                endLineNumber: latestMutable.line,
                endColumn: latestMutable.col,
            }, { shouldRealignDiffAreas: true });
            numNewLines += newText.split('\n').length - 1;
        }
        latestMutable.originalCodeStartLine = startLineInOriginalCode;
        return { endLineInLlmTextSoFar, numNewLines }; // numNewLines here might not be correct....
    }
    // called first, then call startApplying
    addCtrlKZone({ startLine, endLine, editor }) {
        // don't need to await this, because in order to add a ctrl+K zone must already have the model open on your screen
        // await this._ensureModelExists(uri)
        const uri = editor.getModel()?.uri;
        if (!uri)
            return;
        // check if there's overlap with any other ctrlKZone and if so, focus it
        const overlappingCtrlKZone = this._findOverlappingDiffArea({
            startLine,
            endLine,
            uri,
            filter: (diffArea) => diffArea.type === 'CtrlKZone',
        });
        if (overlappingCtrlKZone) {
            editor.revealLine(overlappingCtrlKZone.startLine); // important
            setTimeout(() => overlappingCtrlKZone._mountInfo?.textAreaRef.current?.focus(), 100);
            return;
        }
        const overlappingDiffZone = this._findOverlappingDiffArea({
            startLine,
            endLine,
            uri,
            filter: (diffArea) => diffArea.type === 'DiffZone',
        });
        if (overlappingDiffZone)
            return;
        editor.revealLine(startLine);
        editor.setSelection({
            startLineNumber: startLine,
            endLineNumber: startLine,
            startColumn: 1,
            endColumn: 1,
        });
        const { onFinishEdit } = this._addToHistory(uri);
        const adding = {
            type: 'CtrlKZone',
            startLine: startLine,
            endLine: endLine,
            editorId: editor.getId(),
            _URI: uri,
            _removeStylesFns: new Set(),
            _mountInfo: null,
            _linkedStreamingDiffZone: null,
        };
        const ctrlKZone = this._addDiffArea(adding);
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
        return ctrlKZone.diffareaid;
    }
    // _remove means delete and also add to history
    removeCtrlKZone({ diffareaid }) {
        const ctrlKZone = this.diffAreaOfId[diffareaid];
        if (!ctrlKZone)
            return;
        if (ctrlKZone.type !== 'CtrlKZone')
            return;
        const uri = ctrlKZone._URI;
        const { onFinishEdit } = this._addToHistory(uri);
        this._deleteCtrlKZone(ctrlKZone);
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
    }
    _getURIBeforeStartApplying(opts) {
        // SR
        if (opts.from === 'ClickApply') {
            const uri = this._uriOfGivenURI(opts.uri);
            if (!uri)
                return;
            return uri;
        }
        else if (opts.from === 'QuickEdit') {
            const { diffareaid } = opts;
            const ctrlKZone = this.diffAreaOfId[diffareaid];
            if (ctrlKZone?.type !== 'CtrlKZone')
                return;
            const { _URI: uri } = ctrlKZone;
            return uri;
        }
        return;
    }
    async callBeforeApplyOrEdit(givenURI) {
        const uri = this._uriOfGivenURI(givenURI);
        if (!uri)
            return;
        await this._voidModelService.initializeModel(uri);
        await this._voidModelService.saveModel(uri); // save the URI
    }
    // the applyDonePromise this returns can reject, and should be caught with .catch
    startApplying(opts) {
        let res = undefined;
        if (opts.from === 'QuickEdit') {
            res = this._initializeWriteoverStream(opts); // rewrite
        }
        else if (opts.from === 'ClickApply') {
            if (this._settingsService.state.globalSettings.enableFastApply) {
                const numCharsInFile = this._fileLengthOfGivenURI(opts.uri);
                if (numCharsInFile === null)
                    return null;
                if (numCharsInFile < 1000) {
                    // slow apply for short files (especially important for empty files)
                    res = this._initializeWriteoverStream(opts);
                }
                else {
                    res = this._initializeSearchAndReplaceStream(opts); // fast apply
                }
            }
            else {
                res = this._initializeWriteoverStream(opts); // rewrite
            }
        }
        if (!res)
            return null;
        const [diffZone, applyDonePromise] = res;
        return [diffZone._URI, applyDonePromise];
    }
    instantlyApplySearchReplaceBlocks({ uri, searchReplaceBlocks, }) {
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef: { current: null },
            startBehavior: 'keep-conflicts',
            linkedCtrlKZone: null,
            onWillUndo: () => { },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        const onDone = () => {
            diffZone._streamState = { isStreaming: false };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        const onError = (e) => {
            // this._notifyError(e)
            onDone();
            this._undoHistory(uri);
            throw e.fullError || new Error(e.message);
        };
        try {
            this._instantlyApplySRBlocks(uri, searchReplaceBlocks);
        }
        catch (e) {
            onError({ message: e + '', fullError: null });
        }
        onDone();
    }
    instantlyRewriteFile({ uri, newContent }) {
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef: { current: null },
            startBehavior: 'keep-conflicts',
            linkedCtrlKZone: null,
            onWillUndo: () => { },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        const onDone = () => {
            diffZone._streamState = { isStreaming: false };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        this._writeURIText(uri, newContent, 'wholeFileRange', { shouldRealignDiffAreas: true });
        onDone();
    }
    _findOverlappingDiffArea({ startLine, endLine, uri, filter, }) {
        // check if there's overlap with any other diffAreas and return early if there is
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (!diffArea)
                continue;
            if (!filter?.(diffArea))
                continue;
            const noOverlap = diffArea.startLine > endLine || diffArea.endLine < startLine;
            if (!noOverlap) {
                return diffArea;
            }
        }
        return null;
    }
    _startStreamingDiffZone({ uri, startBehavior, streamRequestIdRef, linkedCtrlKZone, onWillUndo, }) {
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return;
        // treat like full file, unless linkedCtrlKZone was provided in which case use its diff's range
        const startLine = linkedCtrlKZone ? linkedCtrlKZone.startLine : 1;
        const endLine = linkedCtrlKZone ? linkedCtrlKZone.endLine : model.getLineCount();
        const range = {
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: Number.MAX_SAFE_INTEGER,
        };
        const originalFileStr = model.getValue(1 /* EndOfLinePreference.LF */);
        let originalCode = model.getValueInRange(range, 1 /* EndOfLinePreference.LF */);
        // add to history as a checkpoint, before we start modifying
        const { onFinishEdit } = this._addToHistory(uri, { onWillUndo });
        // clear diffZones so no conflict
        if (startBehavior === 'keep-conflicts') {
            if (linkedCtrlKZone) {
                // ctrlkzone should never have any conflicts
            }
            else {
                // keep conflict on whole file - to keep conflict, revert the change and use those contents as original, then un-revert the file
                this.acceptOrRejectAllDiffAreas({
                    uri,
                    removeCtrlKs: true,
                    behavior: 'reject',
                    _addToHistory: false,
                });
                const oldFileStr = model.getValue(1 /* EndOfLinePreference.LF */); // use this as original code
                this._writeURIText(uri, originalFileStr, 'wholeFileRange', { shouldRealignDiffAreas: true }); // un-revert
                originalCode = oldFileStr;
            }
        }
        else if (startBehavior === 'accept-conflicts' || startBehavior === 'reject-conflicts') {
            const behavior = startBehavior === 'accept-conflicts' ? 'accept' : 'reject';
            this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior, _addToHistory: false });
        }
        const adding = {
            type: 'DiffZone',
            originalCode,
            startLine,
            endLine,
            _URI: uri,
            _streamState: {
                isStreaming: true,
                streamRequestIdRef,
                line: startLine,
            },
            _diffOfId: {}, // added later
            _removeStylesFns: new Set(),
        };
        const diffZone = this._addDiffArea(adding);
        this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
        this._onDidAddOrDeleteDiffZones.fire({ uri });
        // a few items related to the ctrlKZone that started streaming this diffZone
        if (linkedCtrlKZone) {
            const ctrlKZone = linkedCtrlKZone;
            ctrlKZone._linkedStreamingDiffZone = diffZone.diffareaid;
            this._onDidChangeStreamingInCtrlKZone.fire({ uri, diffareaid: ctrlKZone.diffareaid });
        }
        return { diffZone, onFinishEdit };
    }
    _uriIsStreaming(uri) {
        const diffAreas = this.diffAreasOfURI[uri.fsPath];
        if (!diffAreas)
            return false;
        for (const diffareaid of diffAreas) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea?.type !== 'DiffZone')
                continue;
            if (diffArea._streamState.isStreaming)
                return true;
        }
        return false;
    }
    _initializeWriteoverStream(opts) {
        const { from } = opts;
        const featureName = opts.from === 'ClickApply' ? 'Apply' : 'Ctrl+K';
        const overridesOfModel = this._settingsService.state.overridesOfModel;
        const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
        const modelSelectionOptions = modelSelection
            ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]
            : undefined;
        const uri = this._getURIBeforeStartApplying(opts);
        if (!uri)
            return;
        let startRange;
        let ctrlKZoneIfQuickEdit = null;
        if (from === 'ClickApply') {
            startRange = 'fullFile';
        }
        else if (from === 'QuickEdit') {
            const { diffareaid } = opts;
            const ctrlKZone = this.diffAreaOfId[diffareaid];
            if (ctrlKZone?.type !== 'CtrlKZone')
                return;
            ctrlKZoneIfQuickEdit = ctrlKZone;
            const { startLine: startLine_, endLine: endLine_ } = ctrlKZone;
            startRange = [startLine_, endLine_];
        }
        else {
            throw new Error(`Void: diff.type not recognized on: ${from}`);
        }
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return;
        let streamRequestIdRef = { current: null }; // can use this as a proxy to set the diffArea's stream state requestId
        // build messages
        const quickEditFIMTags = defaultQuickEditFimTags; // TODO can eventually let users customize modelFimTags
        const originalFileCode = model.getValue(1 /* EndOfLinePreference.LF */);
        const originalCode = startRange === 'fullFile'
            ? originalFileCode
            : originalFileCode
                .split('\n')
                .slice(startRange[0] - 1, startRange[1] - 1 + 1)
                .join('\n');
        const language = model.getLanguageId();
        let messages;
        let separateSystemMessage;
        if (from === 'ClickApply') {
            const { messages: a, separateSystemMessage: b } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
                systemMessage: rewriteCode_systemMessage,
                simpleMessages: [
                    {
                        role: 'user',
                        content: rewriteCode_userMessage({ originalCode, applyStr: opts.applyStr, language }),
                    },
                ],
                featureName,
                modelSelection,
            });
            messages = a;
            separateSystemMessage = b;
        }
        else if (from === 'QuickEdit') {
            if (!ctrlKZoneIfQuickEdit)
                return;
            const { _mountInfo } = ctrlKZoneIfQuickEdit;
            const instructions = _mountInfo?.textAreaRef.current?.value ?? '';
            const startLine = startRange === 'fullFile' ? 1 : startRange[0];
            const endLine = startRange === 'fullFile' ? model.getLineCount() : startRange[1];
            const { prefix, suffix } = voidPrefixAndSuffix({
                fullFileStr: originalFileCode,
                startLine,
                endLine,
            });
            const userContent = ctrlKStream_userMessage({
                selection: originalCode,
                instructions: instructions,
                prefix,
                suffix,
                fimTags: quickEditFIMTags,
                language,
            });
            const { messages: a, separateSystemMessage: b } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
                systemMessage: ctrlKStream_systemMessage({ quickEditFIMTags: quickEditFIMTags }),
                simpleMessages: [{ role: 'user', content: userContent }],
                featureName,
                modelSelection,
            });
            messages = a;
            separateSystemMessage = b;
        }
        else {
            throw new Error(`featureName ${from} is invalid`);
        }
        // if URI is already streaming, return (should never happen, caller is responsible for checking)
        if (this._uriIsStreaming(uri))
            return;
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef,
            startBehavior: opts.startBehavior,
            linkedCtrlKZone: ctrlKZoneIfQuickEdit,
            onWillUndo: () => {
                if (streamRequestIdRef.current) {
                    this._llmMessageService.abort(streamRequestIdRef.current);
                }
            },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        // helpers
        const onDone = () => {
            console.log('called onDone');
            diffZone._streamState = { isStreaming: false };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            if (ctrlKZoneIfQuickEdit) {
                const ctrlKZone = ctrlKZoneIfQuickEdit;
                ctrlKZone._linkedStreamingDiffZone = null;
                this._onDidChangeStreamingInCtrlKZone.fire({ uri, diffareaid: ctrlKZone.diffareaid });
                this._deleteCtrlKZone(ctrlKZone);
            }
            this._refreshStylesAndDiffsInURI(uri);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        // throws
        const onError = (e) => {
            // this._notifyError(e)
            onDone();
            this._undoHistory(uri);
            throw e.fullError || new Error(e.message);
        };
        const extractText = (fullText, recentlyAddedTextLen) => {
            if (from === 'QuickEdit') {
                return extractCodeFromFIM({
                    text: fullText,
                    recentlyAddedTextLen,
                    midTag: quickEditFIMTags.midTag,
                });
            }
            else if (from === 'ClickApply') {
                return extractCodeFromRegular({ text: fullText, recentlyAddedTextLen });
            }
            throw new Error('Void 1');
        };
        // refresh now in case onText takes a while to get 1st message
        this._refreshStylesAndDiffsInURI(uri);
        const latestStreamLocationMutable = {
            line: diffZone.startLine,
            addedSplitYet: false,
            col: 1,
            originalCodeStartLine: 1,
        };
        // allowed to throw errors - this is called inside a promise that handles everything
        const runWriteover = async () => {
            let shouldSendAnotherMessage = true;
            while (shouldSendAnotherMessage) {
                shouldSendAnotherMessage = false;
                let resMessageDonePromise = () => { };
                const messageDonePromise = new Promise((res_) => {
                    resMessageDonePromise = res_;
                });
                // state used in onText:
                let fullTextSoFar = ''; // so far (INCLUDING ignored suffix)
                let prevIgnoredSuffix = '';
                let aborted = false;
                let weAreAborting = false;
                streamRequestIdRef.current = this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    logging: { loggingName: `Edit (Writeover) - ${from}` },
                    messages,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    separateSystemMessage,
                    chatMode: null, // not chat
                    onText: (params) => {
                        const { fullText: fullText_ } = params;
                        const newText_ = fullText_.substring(fullTextSoFar.length, Infinity);
                        const newText = prevIgnoredSuffix + newText_; // add the previously ignored suffix because it's no longer the suffix!
                        fullTextSoFar += newText; // full text, including ```, etc
                        const [croppedText, deltaCroppedText, croppedSuffix] = extractText(fullTextSoFar, newText.length);
                        const { endLineInLlmTextSoFar } = this._writeStreamedDiffZoneLLMText(uri, originalCode, croppedText, deltaCroppedText, latestStreamLocationMutable);
                        diffZone._streamState.line = diffZone.startLine - 1 + endLineInLlmTextSoFar; // change coordinate systems from originalCode to full file
                        this._refreshStylesAndDiffsInURI(uri);
                        prevIgnoredSuffix = croppedSuffix;
                    },
                    onFinalMessage: (params) => {
                        const { fullText } = params;
                        // console.log('DONE! FULL TEXT\n', extractText(fullText), diffZone.startLine, diffZone.endLine)
                        // at the end, re-write whole thing to make sure no sync errors
                        const [croppedText, _1, _2] = extractText(fullText, 0);
                        this._writeURIText(uri, croppedText, {
                            startLineNumber: diffZone.startLine,
                            startColumn: 1,
                            endLineNumber: diffZone.endLine,
                            endColumn: Number.MAX_SAFE_INTEGER,
                        }, // 1-indexed
                        { shouldRealignDiffAreas: true });
                        onDone();
                        resMessageDonePromise();
                    },
                    onError: (e) => {
                        onError(e);
                    },
                    onAbort: () => {
                        if (weAreAborting)
                            return;
                        // stop the loop to free up the promise, but don't modify state (already handled by whatever stopped it)
                        aborted = true;
                        resMessageDonePromise();
                    },
                });
                // should never happen, just for safety
                if (streamRequestIdRef.current === null) {
                    return;
                }
                await messageDonePromise;
                if (aborted) {
                    throw new Error(`Edit was interrupted by the user.`);
                }
            } // end while
        }; // end writeover
        const applyDonePromise = new Promise((res, rej) => {
            runWriteover().then(res).catch(rej);
        });
        return [diffZone, applyDonePromise];
    }
    _uriOfGivenURI(givenURI) {
        if (givenURI === 'current') {
            const uri_ = this._getActiveEditorURI();
            if (!uri_)
                return;
            return uri_;
        }
        return givenURI;
    }
    _fileLengthOfGivenURI(givenURI) {
        const uri = this._uriOfGivenURI(givenURI);
        if (!uri)
            return null;
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return null;
        const numCharsInFile = model.getValueLength(1 /* EndOfLinePreference.LF */);
        return numCharsInFile;
    }
    _instantlyApplySRBlocks(uri, blocksStr) {
        const blocks = extractSearchReplaceBlocks(blocksStr);
        if (blocks.length === 0)
            throw new Error(`No Search/Replace blocks were received!`);
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            throw new Error(`Error applying Search/Replace blocks: File does not exist.`);
        const modelStr = model.getValue(1 /* EndOfLinePreference.LF */);
        // .split('\n').map(l => '\t' + l).join('\n') // for testing purposes only, remember to remove this
        const modelStrLines = modelStr.split('\n');
        const replacements = [];
        for (const b of blocks) {
            const res = findTextInCode(b.orig, modelStr, true, { returnType: 'lines' });
            if (typeof res === 'string')
                throw new Error(this._errContentOfInvalidStr(res, b.orig));
            let [startLine, endLine] = res;
            startLine -= 1; // 0-index
            endLine -= 1;
            // including newline before start
            const origStart = (startLine !== 0 ? modelStrLines.slice(0, startLine).join('\n') + '\n' : '')
                .length;
            // including endline at end
            const origEnd = modelStrLines.slice(0, endLine + 1).join('\n').length - 1;
            replacements.push({ origStart, origEnd, block: b });
        }
        // sort in increasing order
        replacements.sort((a, b) => a.origStart - b.origStart);
        // ensure no overlap
        for (let i = 1; i < replacements.length; i++) {
            if (replacements[i].origStart <= replacements[i - 1].origEnd) {
                throw new Error(this._errContentOfInvalidStr('Has overlap', replacements[i]?.block?.orig));
            }
        }
        // apply each replacement from right to left (so indexes don't shift)
        let newCode = modelStr;
        for (let i = replacements.length - 1; i >= 0; i--) {
            const { origStart, origEnd, block } = replacements[i];
            newCode = newCode.slice(0, origStart) + block.final + newCode.slice(origEnd + 1, Infinity);
        }
        this._writeURIText(uri, newCode, 'wholeFileRange', { shouldRealignDiffAreas: true });
    }
    _initializeSearchAndReplaceStream(opts) {
        const { from, applyStr } = opts;
        const featureName = 'Apply';
        const overridesOfModel = this._settingsService.state.overridesOfModel;
        const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
        const modelSelectionOptions = modelSelection
            ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]
            : undefined;
        const uri = this._getURIBeforeStartApplying(opts);
        if (!uri)
            return;
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return;
        let streamRequestIdRef = { current: null }; // can use this as a proxy to set the diffArea's stream state requestId
        // build messages - ask LLM to generate search/replace block text
        const originalFileCode = model.getValue(1 /* EndOfLinePreference.LF */);
        const userMessageContent = searchReplaceGivenDescription_userMessage({
            originalCode: originalFileCode,
            applyStr: applyStr,
        });
        const { messages, separateSystemMessage: separateSystemMessage } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
            systemMessage: searchReplaceGivenDescription_systemMessage,
            simpleMessages: [{ role: 'user', content: userMessageContent }],
            featureName,
            modelSelection,
        });
        // if URI is already streaming, return (should never happen, caller is responsible for checking)
        if (this._uriIsStreaming(uri))
            return;
        // start diffzone
        const res = this._startStreamingDiffZone({
            uri,
            streamRequestIdRef,
            startBehavior: opts.startBehavior,
            linkedCtrlKZone: null,
            onWillUndo: () => {
                if (streamRequestIdRef.current) {
                    this._llmMessageService.abort(streamRequestIdRef.current); // triggers onAbort()
                }
            },
        });
        if (!res)
            return;
        const { diffZone, onFinishEdit } = res;
        const convertOriginalRangeToFinalRange = (originalRange) => {
            // adjust based on the changes by computing line offset
            const [originalStart, originalEnd] = originalRange;
            let lineOffset = 0;
            for (const blockDiffArea of addedTrackingZoneOfBlockNum) {
                const { startLine, endLine, metadata: { originalBounds: [originalStart2, originalEnd2], }, } = blockDiffArea;
                if (originalStart2 >= originalEnd)
                    continue;
                const numNewLines = endLine - startLine + 1;
                const numOldLines = originalEnd2 - originalStart2 + 1;
                lineOffset += numNewLines - numOldLines;
            }
            return [originalStart + lineOffset, originalEnd + lineOffset];
        };
        const onDone = () => {
            diffZone._streamState = { isStreaming: false };
            this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
            this._refreshStylesAndDiffsInURI(uri);
            // delete the tracking zones
            for (const trackingZone of addedTrackingZoneOfBlockNum)
                this._deleteTrackingZone(trackingZone);
            onFinishEdit();
            // auto accept
            if (this._settingsService.state.globalSettings.autoAcceptLLMChanges) {
                this.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: false, behavior: 'accept' });
            }
        };
        const onError = (e) => {
            // this._notifyError(e)
            onDone();
            this._undoHistory(uri);
            throw e.fullError || new Error(e.message);
        };
        // refresh now in case onText takes a while to get 1st message
        this._refreshStylesAndDiffsInURI(uri);
        // stream style related - TODO replace these with whatever block we're on initially if already started (if add caching of apply S/R blocks)
        let latestStreamLocationMutable = null;
        let shouldUpdateOrigStreamStyle = true;
        let oldBlocks = [];
        const addedTrackingZoneOfBlockNum = [];
        diffZone._streamState.line = 1;
        const N_RETRIES = 4;
        // allowed to throw errors - this is called inside a promise that handles everything
        const runSearchReplace = async () => {
            // this generates >>>>>>> ORIGINAL <<<<<<< REPLACE blocks and and simultaneously applies it
            let shouldSendAnotherMessage = true;
            let nMessagesSent = 0;
            let currStreamingBlockNum = 0;
            let aborted = false;
            let weAreAborting = false;
            while (shouldSendAnotherMessage) {
                shouldSendAnotherMessage = false;
                nMessagesSent += 1;
                if (nMessagesSent >= N_RETRIES) {
                    const e = {
                        message: `Tried to Fast Apply ${N_RETRIES} times but failed. This may be related to model intelligence, or it may an edit that's too complex. Please retry or disable Fast Apply.`,
                        fullError: null,
                    };
                    onError(e);
                    break;
                }
                let resMessageDonePromise = () => { };
                const messageDonePromise = new Promise((res, rej) => {
                    resMessageDonePromise = res;
                });
                const onText = (params) => {
                    const { fullText } = params;
                    // blocks are [done done done ... {writingFinal|writingOriginal}]
                    //               ^
                    //              currStreamingBlockNum
                    const blocks = extractSearchReplaceBlocks(fullText);
                    for (let blockNum = currStreamingBlockNum; blockNum < blocks.length; blockNum += 1) {
                        const block = blocks[blockNum];
                        if (block.state === 'writingOriginal') {
                            // update stream state to the first line of original if some portion of original has been written
                            if (shouldUpdateOrigStreamStyle && block.orig.trim().length >= 20) {
                                const startingAtLine = diffZone._streamState.line ?? 1; // dont go backwards if already have a stream line
                                const originalRange = findTextInCode(block.orig, originalFileCode, false, {
                                    startingAtLine,
                                    returnType: 'lines',
                                });
                                if (typeof originalRange !== 'string') {
                                    const [startLine, _] = convertOriginalRangeToFinalRange(originalRange);
                                    diffZone._streamState.line = startLine;
                                    shouldUpdateOrigStreamStyle = false;
                                }
                            }
                            // // starting line is at least the number of lines in the generated code minus 1
                            // const numLinesInOrig = numLinesOfStr(block.orig)
                            // const newLine = Math.max(numLinesInOrig - 1, 1, diffZone._streamState.line ?? 1)
                            // if (newLine !== diffZone._streamState.line) {
                            // 	diffZone._streamState.line = newLine
                            // 	this._refreshStylesAndDiffsInURI(uri)
                            // }
                            // must be done writing original to move on to writing streamed content
                            continue;
                        }
                        shouldUpdateOrigStreamStyle = true;
                        // if this is the first time we're seeing this block, add it as a diffarea so we can start streaming in it
                        if (!(blockNum in addedTrackingZoneOfBlockNum)) {
                            const originalBounds = findTextInCode(block.orig, originalFileCode, true, {
                                returnType: 'lines',
                            });
                            // if error
                            // Check for overlap with existing modified ranges
                            const hasOverlap = addedTrackingZoneOfBlockNum.some((trackingZone) => {
                                const [existingStart, existingEnd] = trackingZone.metadata.originalBounds;
                                const hasNoOverlap = endLine < existingStart || startLine > existingEnd;
                                return !hasNoOverlap;
                            });
                            if (typeof originalBounds === 'string' || hasOverlap) {
                                const errorMessage = typeof originalBounds === 'string' ? originalBounds : 'Has overlap';
                                console.log('--------------Error finding text in code:');
                                console.log('originalFileCode', { originalFileCode });
                                console.log('fullText', { fullText });
                                console.log('error:', errorMessage);
                                console.log('block.orig:', block.orig);
                                console.log('---------');
                                const content = this._errContentOfInvalidStr(errorMessage, block.orig);
                                const retryMsg = 'All of your previous outputs have been ignored. Please re-output ALL SEARCH/REPLACE blocks starting from the first one, and avoid the error this time.';
                                messages.push({ role: 'assistant', content: fullText }, // latest output
                                { role: 'user', content: content + '\n' + retryMsg });
                                // REVERT ALL BLOCKS
                                currStreamingBlockNum = 0;
                                latestStreamLocationMutable = null;
                                shouldUpdateOrigStreamStyle = true;
                                oldBlocks = [];
                                for (const trackingZone of addedTrackingZoneOfBlockNum)
                                    this._deleteTrackingZone(trackingZone);
                                addedTrackingZoneOfBlockNum.splice(0, Infinity);
                                this._writeURIText(uri, originalFileCode, 'wholeFileRange', {
                                    shouldRealignDiffAreas: true,
                                });
                                // abort and resolve
                                shouldSendAnotherMessage = true;
                                if (streamRequestIdRef.current) {
                                    weAreAborting = true;
                                    this._llmMessageService.abort(streamRequestIdRef.current);
                                    weAreAborting = false;
                                }
                                diffZone._streamState.line = 1;
                                resMessageDonePromise();
                                this._refreshStylesAndDiffsInURI(uri);
                                return;
                            }
                            const [startLine, endLine] = convertOriginalRangeToFinalRange(originalBounds);
                            // console.log('---------adding-------')
                            // console.log('CURRENT TEXT!!!', { current: model?.getValue(EndOfLinePreference.LF) })
                            // console.log('block', deepClone(block))
                            // console.log('origBounds', originalBounds)
                            // console.log('start end', startLine, endLine)
                            // otherwise if no error, add the position as a diffarea
                            const adding = {
                                type: 'TrackingZone',
                                startLine: startLine,
                                endLine: endLine,
                                _URI: uri,
                                metadata: {
                                    originalBounds: [...originalBounds],
                                    originalCode: block.orig,
                                },
                            };
                            const trackingZone = this._addDiffArea(adding);
                            addedTrackingZoneOfBlockNum.push(trackingZone);
                            latestStreamLocationMutable = {
                                line: startLine,
                                addedSplitYet: false,
                                col: 1,
                                originalCodeStartLine: 1,
                            };
                        } // end adding diffarea
                        // should always be in streaming state here
                        if (!diffZone._streamState.isStreaming) {
                            console.error('DiffZone was not in streaming state in _initializeSearchAndReplaceStream');
                            continue;
                        }
                        // if a block is done, finish it by writing all
                        if (block.state === 'done') {
                            const { startLine: finalStartLine, endLine: finalEndLine } = addedTrackingZoneOfBlockNum[blockNum];
                            this._writeURIText(uri, block.final, {
                                startLineNumber: finalStartLine,
                                startColumn: 1,
                                endLineNumber: finalEndLine,
                                endColumn: Number.MAX_SAFE_INTEGER,
                            }, // 1-indexed
                            { shouldRealignDiffAreas: true });
                            diffZone._streamState.line = finalEndLine + 1;
                            currStreamingBlockNum = blockNum + 1;
                            continue;
                        }
                        // write the added text to the file
                        if (!latestStreamLocationMutable)
                            continue;
                        const oldBlock = oldBlocks[blockNum];
                        const oldFinalLen = (oldBlock?.final ?? '').length;
                        const deltaFinalText = block.final.substring(oldFinalLen, Infinity);
                        this._writeStreamedDiffZoneLLMText(uri, block.orig, block.final, deltaFinalText, latestStreamLocationMutable);
                        oldBlocks = blocks; // oldblocks is only used if writingFinal
                        // const { endLine: currentEndLine } = addedTrackingZoneOfBlockNum[blockNum] // would be bad to do this because a lot of the bottom lines might be the same. more accurate to go with latestStreamLocationMutable
                        // diffZone._streamState.line = currentEndLine
                        diffZone._streamState.line = latestStreamLocationMutable.line;
                    } // end for
                    this._refreshStylesAndDiffsInURI(uri);
                };
                streamRequestIdRef.current = this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    logging: { loggingName: `Edit (Search/Replace) - ${from}` },
                    messages,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    separateSystemMessage,
                    chatMode: null, // not chat
                    onText: (params) => {
                        onText(params);
                    },
                    onFinalMessage: async (params) => {
                        const { fullText } = params;
                        onText(params);
                        const blocks = extractSearchReplaceBlocks(fullText);
                        if (blocks.length === 0) {
                            this._notificationService.info(`Void: We ran Fast Apply, but the LLM didn't output any changes.`);
                        }
                        this._writeURIText(uri, originalFileCode, 'wholeFileRange', {
                            shouldRealignDiffAreas: true,
                        });
                        try {
                            this._instantlyApplySRBlocks(uri, fullText);
                            onDone();
                            resMessageDonePromise();
                        }
                        catch (e) {
                            onError(e);
                        }
                    },
                    onError: (e) => {
                        onError(e);
                    },
                    onAbort: () => {
                        if (weAreAborting)
                            return;
                        // stop the loop to free up the promise, but don't modify state (already handled by whatever stopped it)
                        aborted = true;
                        resMessageDonePromise();
                    },
                });
                // should never happen, just for safety
                if (streamRequestIdRef.current === null) {
                    break;
                }
                await messageDonePromise;
                if (aborted) {
                    throw new Error(`Edit was interrupted by the user.`);
                }
            } // end while
        }; // end retryLoop
        const applyDonePromise = new Promise((res, rej) => {
            runSearchReplace().then(res).catch(rej);
        });
        return [diffZone, applyDonePromise];
    }
    _undoHistory(uri) {
        this._undoRedoService.undo(uri);
    }
    isCtrlKZoneStreaming({ diffareaid }) {
        const ctrlKZone = this.diffAreaOfId[diffareaid];
        if (!ctrlKZone)
            return false;
        if (ctrlKZone.type !== 'CtrlKZone')
            return false;
        return !!ctrlKZone._linkedStreamingDiffZone;
    }
    _stopIfStreaming(diffZone) {
        const uri = diffZone._URI;
        const streamRequestId = diffZone._streamState.streamRequestIdRef?.current;
        if (!streamRequestId)
            return;
        this._llmMessageService.abort(streamRequestId);
        diffZone._streamState = { isStreaming: false };
        this._onDidChangeStreamingInDiffZone.fire({ uri, diffareaid: diffZone.diffareaid });
    }
    // diffareaid of the ctrlKZone (even though the stream state is dictated by the linked diffZone)
    interruptCtrlKStreaming({ diffareaid }) {
        const ctrlKZone = this.diffAreaOfId[diffareaid];
        if (ctrlKZone?.type !== 'CtrlKZone')
            return;
        if (!ctrlKZone._linkedStreamingDiffZone)
            return;
        const linkedStreamingDiffZone = this.diffAreaOfId[ctrlKZone._linkedStreamingDiffZone];
        if (!linkedStreamingDiffZone)
            return;
        if (linkedStreamingDiffZone.type !== 'DiffZone')
            return;
        this._stopIfStreaming(linkedStreamingDiffZone);
        this._undoHistory(linkedStreamingDiffZone._URI);
    }
    interruptURIStreaming({ uri }) {
        if (!this._uriIsStreaming(uri))
            return;
        this._undoHistory(uri);
        // brute force for now is OK
        for (const diffareaid of this.diffAreasOfURI[uri.fsPath] || []) {
            const diffArea = this.diffAreaOfId[diffareaid];
            if (diffArea?.type !== 'DiffZone')
                continue;
            if (!diffArea._streamState.isStreaming)
                continue;
            this._stopIfStreaming(diffArea);
        }
    }
    // public removeDiffZone(diffZone: DiffZone, behavior: 'reject' | 'accept') {
    // 	const uri = diffZone._URI
    // 	const { onFinishEdit } = this._addToHistory(uri)
    // 	if (behavior === 'reject') this._revertAndDeleteDiffZone(diffZone)
    // 	else if (behavior === 'accept') this._deleteDiffZone(diffZone)
    // 	this._refreshStylesAndDiffsInURI(uri)
    // 	onFinishEdit()
    // }
    _revertDiffZone(diffZone) {
        const uri = diffZone._URI;
        const writeText = diffZone.originalCode;
        const toRange = {
            startLineNumber: diffZone.startLine,
            startColumn: 1,
            endLineNumber: diffZone.endLine,
            endColumn: Number.MAX_SAFE_INTEGER,
        };
        this._writeURIText(uri, writeText, toRange, { shouldRealignDiffAreas: true });
    }
    // called on void.acceptDiff
    async acceptDiff({ diffid }) {
        // TODO could use an ITextModelto do this instead, would be much simpler
        const diff = this.diffOfId[diffid];
        if (!diff)
            return;
        const { diffareaid } = diff;
        const diffArea = this.diffAreaOfId[diffareaid];
        if (!diffArea)
            return;
        if (diffArea.type !== 'DiffZone')
            return;
        const uri = diffArea._URI;
        // add to history
        const { onFinishEdit } = this._addToHistory(uri);
        const originalLines = diffArea.originalCode.split('\n');
        let newOriginalCode;
        if (diff.type === 'deletion') {
            newOriginalCode = [
                ...originalLines.slice(0, diff.originalStartLine - 1), // everything before startLine
                // <-- deletion has nothing here
                ...originalLines.slice(diff.originalEndLine - 1 + 1, Infinity), // everything after endLine
            ].join('\n');
        }
        else if (diff.type === 'insertion') {
            newOriginalCode = [
                ...originalLines.slice(0, diff.originalStartLine - 1), // everything before startLine
                diff.code, // code
                ...originalLines.slice(diff.originalStartLine - 1, Infinity), // startLine (inclusive) and on (no +1)
            ].join('\n');
        }
        else if (diff.type === 'edit') {
            newOriginalCode = [
                ...originalLines.slice(0, diff.originalStartLine - 1), // everything before startLine
                diff.code, // code
                ...originalLines.slice(diff.originalEndLine - 1 + 1, Infinity), // everything after endLine
            ].join('\n');
        }
        else {
            throw new Error(`Void error: ${diff}.type not recognized`);
        }
        // console.log('DIFF', diff)
        // console.log('DIFFAREA', diffArea)
        // console.log('ORIGINAL', diffArea.originalCode)
        // console.log('new original Code', newOriginalCode)
        // update code now accepted as original
        diffArea.originalCode = newOriginalCode;
        // delete the diff
        this._deleteDiff(diff);
        // diffArea should be removed if it has no more diffs in it
        if (Object.keys(diffArea._diffOfId).length === 0) {
            this._deleteDiffZone(diffArea);
        }
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
    }
    // called on void.rejectDiff
    async rejectDiff({ diffid }) {
        const diff = this.diffOfId[diffid];
        if (!diff)
            return;
        const { diffareaid } = diff;
        const diffArea = this.diffAreaOfId[diffareaid];
        if (!diffArea)
            return;
        if (diffArea.type !== 'DiffZone')
            return;
        const uri = diffArea._URI;
        // add to history
        const { onFinishEdit } = this._addToHistory(uri);
        let writeText;
        let toRange;
        // if it was a deletion, need to re-insert
        // (this image applies to writeText and toRange, not newOriginalCode)
        //  A
        // |B   <-- deleted here, diff.startLine == diff.endLine
        //  C
        if (diff.type === 'deletion') {
            // if startLine is out of bounds (deleted lines past the diffarea), applyEdit will do a weird rounding thing, to account for that we apply the edit the line before
            if (diff.startLine - 1 === diffArea.endLine) {
                writeText = '\n' + diff.originalCode;
                toRange = {
                    startLineNumber: diff.startLine - 1,
                    startColumn: Number.MAX_SAFE_INTEGER,
                    endLineNumber: diff.startLine - 1,
                    endColumn: Number.MAX_SAFE_INTEGER,
                };
            }
            else {
                writeText = diff.originalCode + '\n';
                toRange = {
                    startLineNumber: diff.startLine,
                    startColumn: 1,
                    endLineNumber: diff.startLine,
                    endColumn: 1,
                };
            }
        }
        // if it was an insertion, need to delete all the lines
        // (this image applies to writeText and toRange, not newOriginalCode)
        // |A   <-- startLine
        //  B|  <-- endLine (we want to delete this whole line)
        //  C
        else if (diff.type === 'insertion') {
            // console.log('REJECTING:', diff)
            // handle the case where the insertion was a newline at end of diffarea (applying to the next line doesnt work because it doesnt exist, vscode just doesnt delete the correct # of newlines)
            if (diff.endLine === diffArea.endLine) {
                // delete the line before instead of after
                writeText = '';
                toRange = {
                    startLineNumber: diff.startLine - 1,
                    startColumn: Number.MAX_SAFE_INTEGER,
                    endLineNumber: diff.endLine,
                    endColumn: 1,
                }; // 1-indexed
            }
            else {
                writeText = '';
                toRange = {
                    startLineNumber: diff.startLine,
                    startColumn: 1,
                    endLineNumber: diff.endLine + 1,
                    endColumn: 1,
                }; // 1-indexed
            }
        }
        // if it was an edit, just edit the range
        // (this image applies to writeText and toRange, not newOriginalCode)
        // |A    <-- startLine
        //  B|   <-- endLine (just swap out these lines for the originalCode)
        //  C
        else if (diff.type === 'edit') {
            writeText = diff.originalCode;
            toRange = {
                startLineNumber: diff.startLine,
                startColumn: 1,
                endLineNumber: diff.endLine,
                endColumn: Number.MAX_SAFE_INTEGER,
            }; // 1-indexed
        }
        else {
            throw new Error(`Void error: ${diff}.type not recognized`);
        }
        // update the file
        this._writeURIText(uri, writeText, toRange, { shouldRealignDiffAreas: true });
        // originalCode does not change!
        // delete the diff
        this._deleteDiff(diff);
        // diffArea should be removed if it has no more diffs in it
        if (Object.keys(diffArea._diffOfId).length === 0) {
            this._deleteDiffZone(diffArea);
        }
        this._refreshStylesAndDiffsInURI(uri);
        onFinishEdit();
    }
};
EditCodeService = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IModelService),
    __param(2, IUndoRedoService),
    __param(3, ILLMMessageService),
    __param(4, IConsistentItemService),
    __param(5, IInstantiationService),
    __param(6, IConsistentEditorItemService),
    __param(7, IMetricsService),
    __param(8, INotificationService),
    __param(9, IVoidSettingsService),
    __param(10, IVoidModelService),
    __param(11, IConvertToLLMMessageService)
], EditCodeService);
registerSingleton(IEditCodeService, EditCodeService, 0 /* InstantiationType.Eager */);
let AcceptRejectInlineWidget = class AcceptRejectInlineWidget extends Widget {
    getId() {
        return this.ID || ''; // Ensure we always return a string
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return null;
    }
    constructor({ editor, onAccept, onReject, diffid, startLine, offsetLines, }, _voidCommandBarService, _keybindingService, _editCodeService) {
        super();
        this._voidCommandBarService = _voidCommandBarService;
        this._keybindingService = _keybindingService;
        this._editCodeService = _editCodeService;
        const uri = editor.getModel()?.uri;
        // Initialize with default values
        this.ID = '';
        this.editor = editor;
        this.startLine = startLine;
        if (!uri) {
            const { dummyDiv } = dom.h('div@dummyDiv');
            this._domNode = dummyDiv;
            return;
        }
        this.ID = uri.fsPath + diffid;
        const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
        const getAcceptRejectText = () => {
            const acceptKeybinding = this._keybindingService.lookupKeybinding(VOID_ACCEPT_DIFF_ACTION_ID);
            const rejectKeybinding = this._keybindingService.lookupKeybinding(VOID_REJECT_DIFF_ACTION_ID);
            // Use the standalone function directly since we're in a nested class that
            // can't access EditCodeService's methods
            const acceptKeybindLabel = this._editCodeService.processRawKeybindingText((acceptKeybinding && acceptKeybinding.getLabel()) || '');
            const rejectKeybindLabel = this._editCodeService.processRawKeybindingText((rejectKeybinding && rejectKeybinding.getLabel()) || '');
            const commandBarStateAtUri = this._voidCommandBarService.stateOfURI[uri.fsPath];
            const selectedDiffIdx = commandBarStateAtUri?.diffIdx ?? 0; // 0th item is selected by default
            const thisDiffIdx = commandBarStateAtUri?.sortedDiffIds.indexOf(diffid) ?? null;
            const showLabel = thisDiffIdx === selectedDiffIdx;
            const acceptText = `Accept${showLabel ? ` ` + acceptKeybindLabel : ''}`;
            const rejectText = `Reject${showLabel ? ` ` + rejectKeybindLabel : ''}`;
            return { acceptText, rejectText };
        };
        const { acceptText, rejectText } = getAcceptRejectText();
        // Create container div with buttons
        const { acceptButton, rejectButton, buttons } = dom.h('div@buttons', [
            dom.h('button@acceptButton', []),
            dom.h('button@rejectButton', []),
        ]);
        // Style the container
        buttons.style.display = 'flex';
        buttons.style.position = 'absolute';
        buttons.style.gap = '4px';
        buttons.style.paddingRight = '4px';
        buttons.style.zIndex = '1';
        buttons.style.transform = `translateY(${offsetLines * lineHeight}px)`;
        buttons.style.justifyContent = 'flex-end';
        buttons.style.width = '100%';
        buttons.style.pointerEvents = 'none';
        // Style accept button
        acceptButton.onclick = onAccept;
        acceptButton.textContent = acceptText;
        acceptButton.style.backgroundColor = acceptBg;
        acceptButton.style.border = acceptBorder;
        acceptButton.style.color = buttonTextColor;
        acceptButton.style.fontSize = buttonFontSize;
        acceptButton.style.borderTop = 'none';
        acceptButton.style.padding = '1px 4px';
        acceptButton.style.borderBottomLeftRadius = '6px';
        acceptButton.style.borderBottomRightRadius = '6px';
        acceptButton.style.borderTopLeftRadius = '0';
        acceptButton.style.borderTopRightRadius = '0';
        acceptButton.style.cursor = 'pointer';
        acceptButton.style.height = '100%';
        acceptButton.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
        acceptButton.style.pointerEvents = 'auto';
        // Style reject button
        rejectButton.onclick = onReject;
        rejectButton.textContent = rejectText;
        rejectButton.style.backgroundColor = rejectBg;
        rejectButton.style.border = rejectBorder;
        rejectButton.style.color = buttonTextColor;
        rejectButton.style.fontSize = buttonFontSize;
        rejectButton.style.borderTop = 'none';
        rejectButton.style.padding = '1px 4px';
        rejectButton.style.borderBottomLeftRadius = '6px';
        rejectButton.style.borderBottomRightRadius = '6px';
        rejectButton.style.borderTopLeftRadius = '0';
        rejectButton.style.borderTopRightRadius = '0';
        rejectButton.style.cursor = 'pointer';
        rejectButton.style.height = '100%';
        rejectButton.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
        rejectButton.style.pointerEvents = 'auto';
        this._domNode = buttons;
        const updateTop = () => {
            const topPx = editor.getTopForLineNumber(this.startLine) - editor.getScrollTop();
            this._domNode.style.top = `${topPx}px`;
        };
        const updateLeft = () => {
            const layoutInfo = editor.getLayoutInfo();
            const minimapWidth = layoutInfo.minimap.minimapWidth;
            const verticalScrollbarWidth = layoutInfo.verticalScrollbarWidth;
            const buttonWidth = this._domNode.offsetWidth;
            const leftPx = layoutInfo.width - minimapWidth - verticalScrollbarWidth - buttonWidth;
            this._domNode.style.left = `${leftPx}px`;
        };
        // Mount first, then update positions
        setTimeout(() => {
            updateTop();
            updateLeft();
        }, 0);
        this._register(editor.onDidScrollChange((e) => {
            updateTop();
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            updateTop();
        }));
        this._register(editor.onDidLayoutChange((e) => {
            updateTop();
            updateLeft();
        }));
        // Listen for state changes in the command bar service
        this._register(this._voidCommandBarService.onDidChangeState((e) => {
            if (uri && e.uri.fsPath === uri.fsPath) {
                const { acceptText, rejectText } = getAcceptRejectText();
                acceptButton.textContent = acceptText;
                rejectButton.textContent = rejectText;
            }
        }));
        // mount this widget
        editor.addOverlayWidget(this);
        // console.log('created elt', this._domNode)
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
};
AcceptRejectInlineWidget = __decorate([
    __param(1, IVoidCommandBarService),
    __param(2, IKeybindingService),
    __param(3, IEditCodeService)
], AcceptRejectInlineWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdENvZGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2VkaXRDb2RlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2xHLHVGQUF1RjtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixvRUFBb0U7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBT2xELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sZ0JBQWdCLEdBRWhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRGQUE0RixDQUFBO0FBQzFILCtFQUErRTtBQUUvRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5RCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHNCQUFzQixHQUN0QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLHlCQUF5QixFQUN6Qix1QkFBdUIsRUFDdkIseUJBQXlCLEVBQ3pCLHVCQUF1QixFQUN2QiwyQ0FBMkMsRUFDM0MseUNBQXlDLEVBQ3pDLFVBQVUsR0FDVixNQUFNLDZCQUE2QixDQUFBO0FBQ3BD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