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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdENvZGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvZWRpdENvZGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsdUZBQXVGO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLG9FQUFvRTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFPbEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFFTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEZBQTRGLENBQUE7QUFDMUgsK0VBQStFO0FBRS9FLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTlELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsc0JBQXNCLEdBQ3RCLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQix1QkFBdUIsRUFDdkIseUJBQXlCLEVBQ3pCLHVCQUF1QixFQUN2Qix5QkFBeUIsRUFDekIsdUJBQXVCLEVBQ3ZCLDJDQUEyQyxFQUMzQyx5Q0FBeUMsRUFDekMsVUFBVSxHQUNWLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBR2hFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsc0JBQXNCLEVBRXRCLDBCQUEwQixHQUMxQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDN0QsT0FBTyxFQUNOLGdCQUFnQixHQUloQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sUUFBUSxFQUNSLFlBQVksRUFDWixjQUFjLEVBQ2QsZUFBZSxFQUNmLFFBQVEsRUFDUixZQUFZLEdBQ1osTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBTU4sb0JBQW9CLEdBSXBCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UscUVBQXFFO0FBQ3JFLHdFQUF3RTtBQUV4RSxNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUE7QUFFN0QsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxFQUNqQyxRQUFRLEVBQ1IsVUFBVSxFQUNWLE9BQU8sR0FLUCxFQUFFLEVBQUU7SUFDSixJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUE7SUFDdEIsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNuQixjQUFjLElBQUksUUFBUSxDQUFBO1FBQzNCLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYyxJQUFJLFVBQVUsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sY0FBYyxDQUFBO0FBQ3RCLENBQUMsQ0FBQTtBQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxNQUFtQixFQUFFLFNBQWlCLEVBQVUsRUFBRTtJQUNqRixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDL0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRUQseUVBQXlFO0lBQ3pFLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO0lBRXpELDBDQUEwQztJQUMxQyxNQUFNLHVCQUF1QixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFeEQseUVBQXlFO0lBQ3pFLE1BQU0saUJBQWlCLEdBQ3RCLHVCQUF1QixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFFN0Ysa0RBQWtEO0lBQ2xELE1BQU0sRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUE7SUFDaEUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsZ0NBQXVCLENBQUMsVUFBVSxDQUFBO0lBQ3JFLE1BQU0sUUFBUSxHQUFHLGNBQWMsR0FBRyxVQUFVLENBQUE7SUFFNUMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztRQUMxQyxRQUFRO1FBQ1IsVUFBVTtRQUNWLE9BQU8sRUFBRSxpQkFBaUI7S0FDMUIsQ0FBQyxDQUFBO0lBRUYsT0FBTyxnQkFBZ0IsQ0FBQTtBQUN4QixDQUFDLENBQUE7QUFFRCx1REFBdUQ7QUFDdkQsTUFBTSw4QkFBOEIsR0FBRyxDQUFDLEdBQVcsRUFBVSxFQUFFO0lBQzlELE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFDcEMsQ0FBQyxDQUFBO0FBRUQsZ0VBQWdFO0FBQ2hFLDRDQUE0QztBQUM1QywwQkFBMEI7QUFDMUIsTUFBTSxjQUFjLEdBQUcsQ0FDdEIsSUFBWSxFQUNaLFlBQW9CLEVBQ3BCLDZCQUFzQyxFQUN0QyxJQUFzRCxFQUNyRCxFQUFFO0lBQ0gsTUFBTSxTQUFTLEdBQUcsQ0FBQyxZQUFvQixFQUFFLEdBQVcsRUFBRSxFQUFFO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRSxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsTUFBTSxPQUFPLEdBQUcsU0FBUyxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFFeEMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQVUsQ0FBQTtJQUNyQyxDQUFDLENBQUE7SUFFRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsWUFBb0IsRUFBRSxFQUFFLENBQ2xELElBQUksRUFBRSxjQUFjLEtBQUssU0FBUztRQUNqQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLG9EQUFvRDtRQUMvSCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUwsdUNBQXVDO0lBQ3ZDLElBQUksR0FBRyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFFckUsbUJBQW1CO0lBQ25CLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDaEIsT0FBTyxTQUFTLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFJLENBQUMsNkJBQTZCO1FBQUUsT0FBTyxXQUFvQixDQUFBO0lBRS9ELG1EQUFtRDtJQUNuRCxJQUFJLEdBQUcsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0MsWUFBWSxHQUFHLDhCQUE4QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNELEdBQUcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBRWpFLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQztRQUFFLE9BQU8sV0FBb0IsQ0FBQTtJQUMzQyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlDLElBQUksT0FBTyxLQUFLLEdBQUc7UUFBRSxPQUFPLFlBQXFCLENBQUE7SUFFakQsT0FBTyxTQUFTLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ3BDLENBQUMsQ0FBQTtBQVVELElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsVUFBVTtJQStCdkMsWUFFcUIsa0JBQXVELEVBQzVELGFBQTZDLEVBQzFDLGdCQUFtRCxFQUNqRCxrQkFBdUQsRUFDbkQsc0JBQStELEVBQ2hFLHFCQUE2RCxFQUVwRiw0QkFBMkUsRUFDMUQsZUFBaUQsRUFDNUMsb0JBQTJELEVBRTNELGdCQUF1RCxFQUUxRCxpQkFBcUQsRUFFeEUsMkJBQXlFO1FBRXpFLEtBQUssRUFBRSxDQUFBO1FBakI4Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQzNDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDaEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNsQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQy9DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFbkUsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUE4QjtRQUN6QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDM0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUUxQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXNCO1FBRXpDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFFdkQsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQTdDMUUsaUJBQWlCO1FBQ2pCLG1CQUFjLEdBQTRDLEVBQUUsQ0FBQSxDQUFDLG9CQUFvQjtRQUVqRixpQkFBWSxHQUE2QixFQUFFLENBQUEsQ0FBQyx5QkFBeUI7UUFDckUsYUFBUSxHQUF5QixFQUFFLENBQUEsQ0FBQyxxREFBcUQ7UUFFekYsU0FBUztRQUVULGdEQUFnRDtRQUMvQiwrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQTtRQUN6RSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBRWpFLGtHQUFrRztRQUNqRiw0Q0FBdUMsR0FBRyxJQUFJLE9BQU8sRUFHbEUsQ0FBQTtRQUNhLG9DQUErQixHQUFHLElBQUksT0FBTyxFQUFvQyxDQUFBO1FBQ2xHLDJDQUFzQyxHQUFHLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxLQUFLLENBQUE7UUFDM0YsbUNBQThCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUssQ0FBQTtRQUUzRSwrREFBK0Q7UUFDOUMscUNBQWdDLEdBQUcsSUFBSSxPQUFPLEVBRzNELENBQUE7UUFDSixvQ0FBK0IsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFBO1FBeUc3RSwwREFBMEQ7UUFDMUQsNkNBQTZDO1FBQzdDLHNDQUFzQztRQUN0QyxnQ0FBZ0M7UUFDaEMseUNBQXlDO1FBQ3pDLGVBQWU7UUFDZixtQkFBbUI7UUFDbkIsdUNBQXVDO1FBQ3ZDLHFCQUFxQjtRQUNyQixxQ0FBcUM7UUFDckMsbUJBQW1CO1FBQ25CLHdCQUF3QjtRQUN4Qix1RkFBdUY7UUFDdkYsUUFBUTtRQUNSLE9BQU87UUFDUCxpTUFBaU07UUFDak0sTUFBTTtRQUNOLElBQUk7UUFFSix1QkFBdUI7UUFDZix1QkFBa0IsR0FBRyxDQUM1QixLQUF3QixFQUN4QixTQUFpQixFQUNqQixPQUFlLEVBQ2YsU0FBaUIsRUFDakIsT0FBMEMsRUFDekMsRUFBRTtZQUNILElBQUksS0FBSyxLQUFLLElBQUk7Z0JBQUUsT0FBTTtZQUMxQixNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUMvQyxRQUFRLENBQUMsYUFBYSxDQUNyQjtnQkFDQyxlQUFlLEVBQUUsU0FBUztnQkFDMUIsV0FBVyxFQUFFLENBQUM7Z0JBQ2QsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLFNBQVMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2FBQ2xDLEVBQ0Q7Z0JBQ0MsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixXQUFXLEVBQUUsSUFBSTtnQkFDakIsR0FBRyxPQUFPO2FBQ1YsQ0FDRCxDQUNELENBQUE7WUFDRCxNQUFNLGdCQUFnQixHQUFHLEdBQUcsRUFBRTtnQkFDN0IsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFO29CQUM1QixLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLENBQUMsQ0FBQTtZQUNELE9BQU8sZ0JBQWdCLENBQUE7UUFDeEIsQ0FBQyxDQUFBO1FBRU8sNEJBQXVCLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRTtZQUM5QyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUV0RCxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUU5QyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ2xDLG1DQUFtQztvQkFDbkMsSUFBSSxRQUFRLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUN2QywwQkFBMEI7d0JBQzFCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDbEMsS0FBSyxFQUNMLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUMxQixRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksRUFDMUIsaUJBQWlCLENBQ2pCLENBQUE7d0JBQ0QsMEJBQTBCO3dCQUMxQixNQUFNLEdBQUcsR0FDUixRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU87NEJBQ2pELENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLEtBQUssRUFDTCxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQzlCLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLGNBQWMsQ0FDZDs0QkFDRixDQUFDLENBQUMsSUFBSSxDQUFBO3dCQUNSLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFOzRCQUNsQyxHQUFHLEVBQUUsRUFBRSxDQUFBOzRCQUNQLEdBQUcsRUFBRSxFQUFFLENBQUE7d0JBQ1IsQ0FBQyxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksUUFBUSxDQUFDLHdCQUF3QixLQUFLLElBQUksRUFBRSxDQUFDO29CQUN4Rix3QkFBd0I7b0JBQ3hCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDakMsS0FBSyxFQUNMLFFBQVEsQ0FBQyxTQUFTLEVBQ2xCLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLGtCQUFrQixDQUNsQixDQUFBO29CQUNELFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVPLG1DQUE4QixHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDckQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEQsSUFBSSxLQUFLLEtBQUssSUFBSTtnQkFBRSxPQUFNO1lBQzFCLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixDQUFBO1lBRTNELEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQ2hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzlDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVO29CQUFFLFNBQVE7Z0JBRTFDLE1BQU0sZUFBZSxHQUFHLFlBQVk7cUJBQ2xDLEtBQUssQ0FBQyxJQUFJLENBQUM7cUJBQ1gsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNaLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUN2RSxLQUFLLElBQUksWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUN4QyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7d0JBQ3RDLFlBQVksQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7b0JBQ2pELENBQUM7b0JBQ0QsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO3dCQUN2RSxZQUFZLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO3dCQUNoRCxZQUFZLENBQUMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO29CQUMvQyxDQUFDO29CQUNELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELGdDQUEyQixHQUF1QyxFQUFFLENBQUE7UUFDNUQsdUJBQWtCLEdBQUcsQ0FBQyxTQUFvQixFQUFFLEVBQUU7WUFDckQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQTtZQUM5QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUE7WUFDNUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELElBQUksTUFBTSxHQUFrQixJQUFJLENBQUE7WUFDaEMsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQTtZQUN0QyxNQUFNLFdBQVcsR0FBNEMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFFOUUsTUFBTSxXQUFXLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUV2RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ3pFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzdDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQTtnQkFDMUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO2dCQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxHQUFHLFdBQVcsSUFBSSxDQUFBO2dCQUM5QyxNQUFNLFFBQVEsR0FBYztvQkFDM0IsZUFBZSxFQUFFLFNBQVMsQ0FBQyxTQUFTLEdBQUcsQ0FBQztvQkFDeEMsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLGtCQUFrQjtvQkFDbEIsaUJBQWlCLEVBQUUsS0FBSztvQkFDeEIsaUJBQWlCLEVBQUUsSUFBSTtpQkFDdkIsQ0FBQTtnQkFDRCxTQUFTLEdBQUcsUUFBUSxDQUFBO2dCQUVwQixhQUFhO2dCQUNiLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQkFDbkMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3BDLENBQUMsQ0FBQyxDQUFBO2dCQUVGLGNBQWM7Z0JBQ2QsSUFBSSxTQUFTLEdBQTZCLFNBQVMsQ0FBQTtnQkFDbkQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN0RCxTQUFTLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUU7d0JBQ3pDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTt3QkFFaEMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7NEJBQ2xCLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFBOzRCQUN2QixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU87Z0NBQUUsT0FBTTs0QkFFaEMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDO2dDQUNqRSx1Q0FBdUM7Z0NBQ3ZDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsU0FBUyxDQUFBO2dDQUNsRSxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTs0QkFDcEQsQ0FBQzt3QkFDRixDQUFDO3dCQUNELGNBQWMsQ0FBQyxNQUFNOzRCQUNwQixJQUFJLE1BQU0sS0FBSyxDQUFDO2dDQUFFLE9BQU0sQ0FBQyxnRkFBZ0Y7NEJBQ3pHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFBOzRCQUM1QixpQ0FBaUM7NEJBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQ0FDbkMsSUFBSSxNQUFNO29DQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7NEJBQ3hDLENBQUMsQ0FBQyxDQUFBO3dCQUNILENBQUM7d0JBQ0QsWUFBWSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7NEJBQ3RCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFBO3dCQUM5RCxDQUFDO3dCQUNELFFBQVEsRUFBRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUk7cUJBQzNDLENBQUMsRUFBRSxPQUFPLENBQUE7Z0JBQ3pDLENBQUMsQ0FBQyxDQUFBO2dCQUVGLFVBQVU7Z0JBQ1YsT0FBTyxHQUFHLEVBQUU7b0JBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO3dCQUNuQyxJQUFJLE1BQU07NEJBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDeEMsQ0FBQyxDQUFDLENBQUE7b0JBQ0YsU0FBUyxFQUFFLEVBQUUsQ0FBQTtnQkFDZCxDQUFDLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUVGLE9BQU87Z0JBQ04sV0FBVztnQkFDWCxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQ2IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUNuQyxJQUFJLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDekIsU0FBUyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTt3QkFDbkQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDNUIsQ0FBQztnQkFDRixDQUFDLENBQUM7Z0JBQ0gsT0FBTyxFQUFFLEdBQUcsRUFBRTtvQkFDYixJQUFJLENBQUMsNEJBQTRCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzNELENBQUM7YUFDaUMsQ0FBQTtRQUNwQyxDQUFDLENBQUE7UUFFTyx3QkFBbUIsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDaEQsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFdBQVc7b0JBQUUsU0FBUTtnQkFDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDMUIsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDbEQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRU8sd0JBQW1CLEdBQUcsQ0FBQyxHQUFRLEVBQUUsSUFBVSxFQUFFLEVBQUU7WUFDdEQsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUE7WUFFN0IsTUFBTSxzQkFBc0IsR0FBbUIsRUFBRSxDQUFBO1lBRWpELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXRELDBDQUEwQztZQUMxQyxJQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFO29CQUN2RixPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsK0JBQStCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFO29CQUN4RSxhQUFhLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUscUNBQXFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFO2lCQUNwRixDQUFDLENBQUE7Z0JBQ0Ysc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDaEMsRUFBRSxFQUFFLEVBQUUsQ0FBQTtnQkFDUCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxxQkFBcUI7WUFDckIsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHNCQUFzQixDQUFDO29CQUMzRSxHQUFHO29CQUNILEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUNkLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQzdDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFBO3dCQUVoQyxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO3dCQUV0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTt3QkFFekYsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFFdkMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDcEQsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7d0JBQ25FLGNBQWMsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQTt3QkFDdEUsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSSxDQUFBO3dCQUMxRSx1REFBdUQ7d0JBQ3ZELGNBQWMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTt3QkFDdkMsY0FBYyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFBO3dCQUMxQyxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUE7d0JBRW5DLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTs0QkFDdEIsdUJBQXVCOzRCQUN2QixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBOzRCQUM3QyxPQUFPLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQTs0QkFDL0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBOzRCQUNoQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7NEJBQ25DLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLElBQUksQ0FBQTs0QkFFL0QseUNBQXlDOzRCQUN6QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBOzRCQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksSUFBSSxRQUFRLENBQUE7NEJBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTs0QkFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFBOzRCQUVuQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBOzRCQUN6QixjQUFjLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUNwQyxDQUFDLENBQUMsQ0FBQTt3QkFFRixPQUFPLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO3dCQUVuQyw0REFBNEQ7d0JBQzVELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7d0JBQ2xDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQzlFLENBQ0QsQ0FBQTt3QkFFRCxNQUFNLFFBQVEsR0FBYzs0QkFDM0IsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQzs0QkFDbkMsYUFBYTs0QkFDYixZQUFZOzRCQUNaLE9BQU87NEJBQ1AsYUFBYSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDOzRCQUM1QyxpQkFBaUIsRUFBRSxLQUFLOzRCQUN4QixpQkFBaUIsRUFBRSxLQUFLO3lCQUN4QixDQUFBO3dCQUVELElBQUksTUFBTSxHQUFrQixJQUFJLENBQUE7d0JBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDbkMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7d0JBQ3BDLENBQUMsQ0FBQyxDQUFBO3dCQUNGLE9BQU8sR0FBRyxFQUFFLENBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOzRCQUNuQyxJQUFJLE1BQU07Z0NBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTt3QkFDeEMsQ0FBQyxDQUFDLENBQUE7b0JBQ0osQ0FBQztpQkFDRCxDQUFDLENBQUE7Z0JBRUYsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDaEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQzFFLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ25ELElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN4RSx5QkFBeUI7Z0JBQ3pCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHNCQUFzQixDQUFDO29CQUM3RSxHQUFHO29CQUNILEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUNkLElBQUksU0FBaUIsQ0FBQTt3QkFDckIsSUFBSSxXQUFtQixDQUFBO3dCQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7NEJBQ3ZELFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBLENBQUMsY0FBYzs0QkFDekMsV0FBVyxHQUFHLENBQUMsQ0FBQTt3QkFDaEIsQ0FBQzs2QkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7NEJBQ3JDLHFDQUFxQzs0QkFDckMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO2dDQUMxQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUE7Z0NBQ3JFLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO2dDQUMxQixXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUE7NEJBQzNCLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7Z0NBQzlCLFdBQVcsR0FBRyxDQUFDLENBQUE7NEJBQ2hCLENBQUM7d0JBQ0YsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7d0JBQzFCLENBQUM7d0JBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDOUQsd0JBQXdCLEVBQ3hCOzRCQUNDLE1BQU07NEJBQ04sUUFBUSxFQUFFLEdBQUcsRUFBRTtnQ0FDZCxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtnQ0FDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTs0QkFDeEQsQ0FBQzs0QkFDRCxRQUFRLEVBQUUsR0FBRyxFQUFFO2dDQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO2dDQUMzQixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBOzRCQUN4RCxDQUFDOzRCQUNELE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFOzRCQUN6QixTQUFTOzRCQUNULFdBQVc7eUJBQ1gsQ0FDRCxDQUFBO3dCQUNELE9BQU8sR0FBRyxFQUFFOzRCQUNYLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTt3QkFDeEIsQ0FBQyxDQUFBO29CQUNGLENBQUM7aUJBQ0QsQ0FBQyxDQUFBO2dCQUNGLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQywyQkFBMkIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUM1RSxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7Z0JBQzVCLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMzQyxDQUFDLENBQUE7WUFDRCxPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDLENBQUE7UUFVRCxpQkFBWSxHQUFHLEtBQUssQ0FBQTtRQThDWixnQ0FBMkIsR0FBRyxDQUFDLEdBQVEsRUFBb0IsRUFBRTtZQUNwRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN0RCxNQUFNLHVCQUF1QixHQUEwQyxFQUFFLENBQUE7WUFFekUsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBRTlDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxDQUFDLE1BQU07b0JBQUUsU0FBUTtnQkFFakQsdUJBQXVCLENBQUMsVUFBVSxDQUFDLEdBQUcsU0FBUyxDQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFBO1lBQzNCLENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFFMUUsd0NBQXdDO1lBQ3hDLE9BQU87Z0JBQ04sdUJBQXVCO2dCQUN2QixjQUFjLEVBQUUsd0JBQXdCO2FBQ3hDLENBQUE7UUFDRixDQUFDLENBQUE7UUFFTyw2QkFBd0IsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLFFBQTBCLEVBQUUsRUFBRTtZQUNqRix1RUFBdUU7WUFDdkUsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzlDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVO29CQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1lBRUQsMkRBQTJEO1lBQzNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUU3QixNQUFNLEVBQUUsdUJBQXVCLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQSxDQUFDLHFDQUFxQztZQUU5SCw4Q0FBOEM7WUFDOUMsS0FBSyxNQUFNLFVBQVUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO2dCQUNsRCxNQUFNLG1CQUFtQixHQUFHLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUUvRCxJQUFJLG1CQUFtQixDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDN0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRzt3QkFDL0IsR0FBSSxtQkFBdUQ7d0JBQzNELElBQUksRUFBRSxVQUFVO3dCQUNoQixTQUFTLEVBQUUsRUFBRTt3QkFDYixJQUFJLEVBQUUsR0FBRzt3QkFDVCxZQUFZLEVBQUUsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUUsNkNBQTZDO3dCQUNuRixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtxQkFDM0IsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLElBQUksbUJBQW1CLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO29CQUNyRCxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHO3dCQUMvQixHQUFJLG1CQUF3RDt3QkFDNUQsSUFBSSxFQUFFLEdBQUc7d0JBQ1QsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQVk7d0JBQ3JDLFVBQVUsRUFBRSxJQUFJO3dCQUNoQix3QkFBd0IsRUFBRSxJQUFJLEVBQUUsNkNBQTZDO3FCQUM3RSxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1lBQ0QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFFN0MsdUJBQXVCO1lBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLHNCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDN0Ysd0NBQXdDO1FBQ3pDLENBQUMsQ0FBQTtRQWlHTyxrQ0FBNkIsR0FBRyxDQUFDLEdBQVEsRUFBRSxVQUEyQixFQUFFLEVBQUU7WUFDakYsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7WUFDckYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzVELENBQUMsQ0FBQTtRQUVPLG9CQUFlLEdBQUcsQ0FBQyxDQUFBLENBQUMsMEJBQTBCO1FBUzlDLGdCQUFXLEdBQUcsQ0FBQyxDQUFBLENBQUMsc0JBQXNCO1FBdXpCOUM7O1dBRUc7UUFDSyw0QkFBdUIsR0FBRyxDQUNqQyxHQUErQyxFQUMvQyxTQUFpQixFQUNSLEVBQUU7WUFDWCxNQUFNLGVBQWUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBRTFGLDZEQUE2RDtZQUM3RCxJQUFJLE9BQWUsQ0FBQTtZQUNuQixRQUFRLEdBQUcsRUFBRSxDQUFDO2dCQUNiLEtBQUssV0FBVztvQkFDZixPQUFPLEdBQUcsNkhBQTZILGVBQWUsZ0hBQWdILENBQUE7b0JBQ3RRLE1BQUs7Z0JBQ04sS0FBSyxZQUFZO29CQUNoQixPQUFPLEdBQUcsZ0tBQWdLLGVBQWUsMkZBQTJGLENBQUE7b0JBQ3BSLE1BQUs7Z0JBQ04sS0FBSyxhQUFhO29CQUNqQixPQUFPLEdBQUcsMEpBQTBKLGVBQWUsdUdBQXVHLENBQUE7b0JBQzFSLE1BQUs7Z0JBQ047b0JBQ0MsT0FBTyxHQUFHLEVBQUUsQ0FBQTtZQUNkLENBQUM7WUFDRCxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUMsQ0FBQTtRQTBmRCxvRkFBb0Y7UUFDN0UsK0JBQTBCLEdBQW1ELEtBQUssRUFBRSxFQUMxRixHQUFHLEVBQ0gsUUFBUSxFQUNSLFlBQVksRUFDWixhQUFhLEdBQ2IsRUFBRSxFQUFFO1lBQ0osTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkQsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFBRSxPQUFNLENBQUMsYUFBYTtZQUV4RCxNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQ3JCLGFBQWEsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRS9FLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLENBQUMsUUFBUTtvQkFBRSxTQUFRO2dCQUV2QixJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ2xDLElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO3dCQUMzQixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO3dCQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUMvQixDQUFDO3lCQUFNLElBQUksUUFBUSxLQUFLLFFBQVE7d0JBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztxQkFBTSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUMxRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLFlBQVksRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFBO1FBdGhFQSxvRUFBb0U7UUFDcEUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQzdDLE1BQU0sZUFBZSxHQUFHLEtBQUssRUFBRSxLQUFpQixFQUFFLEVBQUU7WUFDbkQsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUV2RCxtRkFBbUY7WUFDbkYsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0JBQUUsT0FBTTtZQUNyRCxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUV6QyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7WUFDbEQsQ0FBQztZQUVELDZEQUE2RDtZQUM3RCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM5QixpRkFBaUY7Z0JBQ2pGLElBQUksSUFBSSxDQUFDLFlBQVk7b0JBQUUsT0FBTTtnQkFDN0IsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQTtnQkFDckIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNsQyxDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsNkdBQTZHO1lBQzdHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFBO1FBQ0Qsc0VBQXNFO1FBQ3RFLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ2xELGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3pDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQseUVBQXlFO1FBQ3pFLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxNQUFtQixFQUFFLEVBQUU7WUFDOUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsSUFBSSxJQUFJLENBQUE7WUFDMUMsSUFBSSxHQUFHO2dCQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQyxDQUFDLENBQUE7UUFFRCx5RUFBeUU7UUFDekUsS0FBSyxJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM5RCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxHQUFRLEVBQUUsQ0FBNEI7UUFDbEUsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXJDLHdEQUF3RDtRQUN4RCxNQUFNLGlCQUFpQixHQUFlLEVBQUUsQ0FBQTtRQUN4QyxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFBO1lBQ3RELE1BQU0sWUFBWSxHQUNqQixRQUFRLEVBQUUsSUFBSSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO1lBQzlFLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hELGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNELFlBQVksRUFBRSxDQUFBO1FBQ2YsQ0FBQztJQUNGLENBQUM7SUFFTSx3QkFBd0IsQ0FBQyxhQUFxQjtRQUNwRCxPQUFPLGFBQWE7YUFDbEIsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJO2FBQzNCLE9BQU8sQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQTBYTyxtQkFBbUI7UUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDNUQsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPLElBQUksQ0FBQTtRQUN4QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTyxJQUFJLENBQUE7UUFDckIsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBR08sYUFBYSxDQUNwQixHQUFRLEVBQ1IsSUFBWSxFQUNaLE1BQWlDLEVBQ2pDLEVBQUUsc0JBQXNCLEVBQXVDO1FBRS9ELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFDLDJLQUEySztZQUNqTixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUNWLE1BQU0sS0FBSyxnQkFBZ0I7WUFDMUIsQ0FBQyxDQUFDO2dCQUNBLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixXQUFXLEVBQUUsQ0FBQztnQkFDZCxhQUFhLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRTtnQkFDbkMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7YUFDbEMsQ0FBQyxhQUFhO1lBQ2hCLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFFViwrRkFBK0Y7UUFDL0YsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNwQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUE7WUFDdEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixDQUFBO1FBRXJELGtCQUFrQjtRQUNsQixNQUFNLGVBQWUsR0FBRyxNQUFNLEtBQUssSUFBSSxDQUFBO1FBQ3ZDLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsMktBQTJLO1lBQ2pOLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUV6QixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQW9FTyxhQUFhLENBQUMsR0FBUSxFQUFFLElBQWtDO1FBQ2pFLE1BQU0sY0FBYyxHQUFxQixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDOUUsSUFBSSxhQUFhLEdBQTRCLElBQUksQ0FBQTtRQUVqRCxNQUFNLEdBQUcsR0FBcUI7WUFDN0IsSUFBSSxzQ0FBOEI7WUFDbEMsUUFBUSxFQUFFLEdBQUc7WUFDYixLQUFLLEVBQUUsWUFBWTtZQUNuQixJQUFJLEVBQUUsbUJBQW1CO1lBQ3pCLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDaEIsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUE7Z0JBQ3BCLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1lBQ0QsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNoQixJQUFJLGFBQWE7b0JBQUUsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzNFLENBQUM7U0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUV0QyxNQUFNLFlBQVksR0FBRyxLQUFLLElBQUksRUFBRTtZQUMvQixhQUFhLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUE7UUFDRCxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUE7SUFDeEIsQ0FBQztJQUVNLG1CQUFtQixDQUFDLEdBQVE7UUFDbEMsT0FBTyxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVNLHVCQUF1QixDQUFDLEdBQVEsRUFBRSxRQUEwQjtRQUNsRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCx5Q0FBeUM7SUFDakMsV0FBVyxDQUFDLElBQVU7UUFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkQsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVU7WUFBRSxPQUFNO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sWUFBWSxDQUFDLFFBQWtCO1FBQ3RDLEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdCQUF3QixDQUFDLFFBQWtCO1FBQ2xELGlDQUFpQztRQUNqQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssVUFBVTtZQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFN0QsUUFBUSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUNwRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVELHVFQUF1RTtJQUMvRCxnQkFBZ0IsQ0FBQyxHQUFRO1FBQ2hDLEtBQUssSUFBSSxVQUFVLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDOUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDeEMsQ0FBQztJQUNGLENBQUM7SUFFRCxtRUFBbUU7SUFDM0QsZUFBZSxDQUFDLFFBQWtCO1FBQ3pDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFlBQW1DO1FBQzlELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDMUYsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQW9CO1FBQzVDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsU0FBUyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUMvQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxHQUFRO1FBQ25DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2pELFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNqQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzlDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVO2dCQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7aUJBQzNELElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxXQUFXO2dCQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4RSxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFRTyxZQUFZLENBQXFCLFFBQStCO1FBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFNBQVMsR0FBRyxFQUFFLEdBQUcsUUFBUSxFQUFFLFVBQVUsRUFBTyxDQUFBO1FBQ2xELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsU0FBUyxDQUFBO1FBQ3pDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFHTyxRQUFRLENBQUMsWUFBMEIsRUFBRSxRQUFrQjtRQUM5RCxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFBO1FBQ3pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUVqQyxzQkFBc0I7UUFDdEIsTUFBTSxPQUFPLEdBQVM7WUFDckIsR0FBRyxZQUFZO1lBQ2YsTUFBTSxFQUFFLE1BQU07WUFDZCxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7U0FDL0IsQ0FBQTtRQUVELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDakQsSUFBSSxFQUFFO1lBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUV6QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQTtRQUMvQixRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQTtRQUVwQyxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCx3SkFBd0o7SUFDaEoseUJBQXlCLENBQ2hDLEdBQVEsRUFDUixJQUFZLEVBQ1osWUFBZ0U7UUFFaEUsNkNBQTZDO1FBRTdDLCtEQUErRDtRQUMvRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFBO1FBQzlDLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUE7UUFFMUMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUEsQ0FBQywwREFBMEQ7UUFFckgsbUZBQW1GO1FBQ25GLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUU5QyxrRUFBa0U7WUFDbEUsSUFBSSxRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyx1REFBdUQ7Z0JBQ3ZELFNBQVE7WUFDVCxDQUFDO1lBQ0Qsd0dBQXdHO2lCQUNuRyxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZDLHVDQUF1QztnQkFDdkMsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxhQUFhLEdBQUcsYUFBYSxHQUFHLGtCQUFrQixDQUFBO2dCQUN4RCxRQUFRLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQTtnQkFDbkMsUUFBUSxDQUFDLE9BQU8sSUFBSSxhQUFhLENBQUE7WUFDbEMsQ0FBQztZQUNELHlGQUF5RjtpQkFDcEYsSUFBSSxTQUFTLElBQUksUUFBUSxDQUFDLFNBQVMsSUFBSSxPQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN6RSwwQ0FBMEM7Z0JBQzFDLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sYUFBYSxHQUFHLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQTtnQkFDeEQsUUFBUSxDQUFDLE9BQU8sSUFBSSxhQUFhLENBQUE7WUFDbEMsQ0FBQztZQUNELGlHQUFpRztpQkFDNUYsSUFBSSxRQUFRLENBQUMsU0FBUyxHQUFHLFNBQVMsSUFBSSxRQUFRLENBQUMsT0FBTyxHQUFHLE9BQU8sRUFBRSxDQUFDO2dCQUN2RSwwQ0FBMEM7Z0JBQzFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO2dCQUM5QixRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsR0FBRyxhQUFhLENBQUE7WUFDN0MsQ0FBQztZQUNELGlEQUFpRDtpQkFDNUMsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsU0FBUyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUMxRSxnREFBZ0Q7Z0JBQ2hELE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO2dCQUM1RCxNQUFNLHFCQUFxQixHQUMxQixRQUFRLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLG1CQUFtQixDQUFBO2dCQUNoRSxNQUFNLFNBQVMsR0FBRyxxQkFBcUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNyRSxRQUFRLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtnQkFDOUIsUUFBUSxDQUFDLE9BQU8sR0FBRyxTQUFTLEdBQUcsU0FBUyxDQUFBO1lBQ3pDLENBQUM7WUFDRCxvREFBb0Q7aUJBQy9DLElBQUksU0FBUyxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sR0FBRyxPQUFPLEVBQUUsQ0FBQztnQkFDdEUsbURBQW1EO2dCQUNuRCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxPQUFPLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQTtnQkFDNUQsUUFBUSxDQUFDLE9BQU8sSUFBSSxhQUFhLEdBQUcsbUJBQW1CLENBQUE7WUFDeEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sOEJBQThCLENBQUMsR0FBUTtRQUM5QyxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUMsSUFBSSxRQUFRLEVBQUUsSUFBSSxLQUFLLFVBQVU7Z0JBQUUsU0FBUTtZQUMzQyw4REFBOEQ7WUFDOUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBQzVGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQixDQUFDLEdBQVE7UUFDM0MscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUUxQixrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWpDLGVBQWU7UUFDZixJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFeEMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUU3QiwyRUFBMkU7UUFDM0UsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxpQkFBaUI7SUFDVCw2QkFBNkIsQ0FDcEMsR0FBUSxFQUNSLFlBQW9CLEVBQ3BCLFlBQW9CLEVBQ3BCLFNBQWlCLEVBQ2pCLGFBQW9DO1FBRXBDLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUVuQixnRUFBZ0U7UUFDaEUsdUhBQXVIO1FBQ3ZILE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFM0QsZ0VBQWdFO1FBQ2hFLHVFQUF1RTtRQUN2RSxJQUFJLHFCQUE2QixDQUFBLENBQUMscUZBQXFGO1FBQ3ZILElBQUksdUJBQStCLENBQUEsQ0FBQyxnRkFBZ0Y7UUFFcEgsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRXBDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLDJCQUEyQjtZQUMzQix5REFBeUQ7WUFDekQsdUJBQXVCLEdBQUcsQ0FBQyxDQUFBO1lBQzNCLHFCQUFxQixHQUFHLENBQUMsQ0FBQTtRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNQLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQTtZQUNwRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssTUFBTTtnQkFDNUQscUJBQXFCLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQTtpQkFDcEMsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVU7Z0JBQUUscUJBQXFCLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQTs7Z0JBQzVFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUVELDJGQUEyRjtRQUMzRixJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxhQUFhLENBQ2pCLEdBQUcsRUFDSCxJQUFJLEVBQ0o7Z0JBQ0MsZUFBZSxFQUFFLGFBQWEsQ0FBQyxJQUFJO2dCQUNuQyxXQUFXLEVBQUUsYUFBYSxDQUFDLEdBQUc7Z0JBQzlCLGFBQWEsRUFBRSxhQUFhLENBQUMsSUFBSTtnQkFDakMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxHQUFHO2FBQzVCLEVBQ0QsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FDaEMsQ0FBQTtZQUNELGFBQWEsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1lBQ2xDLFdBQVcsSUFBSSxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUVELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsYUFBYSxDQUNqQixHQUFHLEVBQ0gsU0FBUyxFQUNUO1lBQ0MsZUFBZSxFQUFFLGFBQWEsQ0FBQyxJQUFJO1lBQ25DLFdBQVcsRUFBRSxhQUFhLENBQUMsR0FBRztZQUM5QixhQUFhLEVBQUUsYUFBYSxDQUFDLElBQUk7WUFDakMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxHQUFHO1NBQzVCLEVBQ0QsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FDaEMsQ0FBQTtRQUNELE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELGFBQWEsQ0FBQyxJQUFJLElBQUksZ0JBQWdCLENBQUE7UUFDdEMsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsRCxhQUFhLENBQUMsR0FBRztZQUNoQixjQUFjLEtBQUssQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTTtnQkFDdEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFBO1FBQ3JDLFdBQVcsSUFBSSxnQkFBZ0IsQ0FBQTtRQUUvQiwrQ0FBK0M7UUFDL0MsSUFBSSxhQUFhLENBQUMscUJBQXFCLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQztZQUNuRSxtQkFBbUI7WUFDbkIsTUFBTSxlQUFlLEdBQUcsdUJBQXVCLEdBQUcsYUFBYSxDQUFDLHFCQUFxQixDQUFBO1lBQ3JGLElBQUksQ0FBQyxhQUFhLENBQ2pCLEdBQUcsRUFDSCxFQUFFLEVBQ0Y7Z0JBQ0MsZUFBZSxFQUFFLGFBQWEsQ0FBQyxJQUFJO2dCQUNuQyxXQUFXLEVBQUUsYUFBYSxDQUFDLEdBQUc7Z0JBQzlCLGFBQWEsRUFBRSxhQUFhLENBQUMsSUFBSSxHQUFHLGVBQWU7Z0JBQ25ELFNBQVMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2FBQ2xDLEVBQ0QsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FDaEMsQ0FBQTtZQUNELFdBQVcsSUFBSSxlQUFlLENBQUE7UUFDL0IsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLHFCQUFxQixHQUFHLHVCQUF1QixFQUFFLENBQUM7WUFDMUUsTUFBTSxPQUFPLEdBQ1osSUFBSTtnQkFDSixZQUFZO3FCQUNWLEtBQUssQ0FBQyxJQUFJLENBQUM7cUJBQ1gsS0FBSyxDQUFDLHVCQUF1QixHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMscUJBQXFCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ25GLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNiLElBQUksQ0FBQyxhQUFhLENBQ2pCLEdBQUcsRUFDSCxPQUFPLEVBQ1A7Z0JBQ0MsZUFBZSxFQUFFLGFBQWEsQ0FBQyxJQUFJO2dCQUNuQyxXQUFXLEVBQUUsYUFBYSxDQUFDLEdBQUc7Z0JBQzlCLGFBQWEsRUFBRSxhQUFhLENBQUMsSUFBSTtnQkFDakMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxHQUFHO2FBQzVCLEVBQ0QsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FDaEMsQ0FBQTtZQUNELFdBQVcsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELGFBQWEsQ0FBQyxxQkFBcUIsR0FBRyx1QkFBdUIsQ0FBQTtRQUU3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLENBQUEsQ0FBQyw0Q0FBNEM7SUFDM0YsQ0FBQztJQUVELHdDQUF3QztJQUNqQyxZQUFZLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBZ0I7UUFDL0Qsa0hBQWtIO1FBQ2xILHFDQUFxQztRQUVyQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTTtRQUVoQix3RUFBd0U7UUFDeEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUM7WUFDMUQsU0FBUztZQUNULE9BQU87WUFDUCxHQUFHO1lBQ0gsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLFdBQVc7U0FDbkQsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUEsQ0FBQyxZQUFZO1lBQzlELFVBQVUsQ0FDVCxHQUFHLEVBQUUsQ0FBRSxvQkFBa0MsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFDbEYsR0FBRyxDQUNILENBQUE7WUFDRCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDO1lBQ3pELFNBQVM7WUFDVCxPQUFPO1lBQ1AsR0FBRztZQUNILE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVO1NBQ2xELENBQUMsQ0FBQTtRQUNGLElBQUksbUJBQW1CO1lBQUUsT0FBTTtRQUUvQixNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDbkIsZUFBZSxFQUFFLFNBQVM7WUFDMUIsYUFBYSxFQUFFLFNBQVM7WUFDeEIsV0FBVyxFQUFFLENBQUM7WUFDZCxTQUFTLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQTtRQUVGLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWhELE1BQU0sTUFBTSxHQUFrQztZQUM3QyxJQUFJLEVBQUUsV0FBVztZQUNqQixTQUFTLEVBQUUsU0FBUztZQUNwQixPQUFPLEVBQUUsT0FBTztZQUNoQixRQUFRLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRTtZQUN4QixJQUFJLEVBQUUsR0FBRztZQUNULGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO1lBQzNCLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLHdCQUF3QixFQUFFLElBQUk7U0FDOUIsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXJDLFlBQVksRUFBRSxDQUFBO1FBQ2QsT0FBTyxTQUFTLENBQUMsVUFBVSxDQUFBO0lBQzVCLENBQUM7SUFFRCwrQ0FBK0M7SUFDeEMsZUFBZSxDQUFDLEVBQUUsVUFBVSxFQUEwQjtRQUM1RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxTQUFTO1lBQUUsT0FBTTtRQUN0QixJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVztZQUFFLE9BQU07UUFFMUMsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQTtRQUMxQixNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLFlBQVksRUFBRSxDQUFBO0lBQ2YsQ0FBQztJQUVPLDBCQUEwQixDQUFDLElBQWlDO1FBQ25FLEtBQUs7UUFDTCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDekMsSUFBSSxDQUFDLEdBQUc7Z0JBQUUsT0FBTTtZQUNoQixPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdEMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQTtZQUMzQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQy9DLElBQUksU0FBUyxFQUFFLElBQUksS0FBSyxXQUFXO2dCQUFFLE9BQU07WUFDM0MsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUE7WUFDL0IsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQ0QsT0FBTTtJQUNQLENBQUM7SUFFTSxLQUFLLENBQUMscUJBQXFCLENBQUMsUUFBeUI7UUFDM0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU07UUFDaEIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFDLGVBQWU7SUFDNUQsQ0FBQztJQUVELGlGQUFpRjtJQUMxRSxhQUFhLENBQUMsSUFBdUI7UUFDM0MsSUFBSSxHQUFHLEdBQTBDLFNBQVMsQ0FBQTtRQUUxRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDL0IsR0FBRyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLFVBQVU7UUFDdkQsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN2QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLGNBQWMsS0FBSyxJQUFJO29CQUFFLE9BQU8sSUFBSSxDQUFBO2dCQUN4QyxJQUFJLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQztvQkFDM0Isb0VBQW9FO29CQUNwRSxHQUFHLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM1QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsR0FBRyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLGFBQWE7Z0JBQ2pFLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsR0FBRyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLFVBQVU7WUFDdkQsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxHQUFHLENBQUE7UUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU0saUNBQWlDLENBQUMsRUFDeEMsR0FBRyxFQUNILG1CQUFtQixHQUluQjtRQUNBLGlCQUFpQjtRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDeEMsR0FBRztZQUNILGtCQUFrQixFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUNyQyxhQUFhLEVBQUUsZ0JBQWdCO1lBQy9CLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFVBQVUsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ3BCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTTtRQUNoQixNQUFNLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxHQUFHLEdBQUcsQ0FBQTtRQUV0QyxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDbkIsUUFBUSxDQUFDLFlBQVksR0FBRyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUM5QyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtZQUNuRixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckMsWUFBWSxFQUFFLENBQUE7WUFFZCxjQUFjO1lBQ2QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUNyRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNsRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUErQyxFQUFFLEVBQUU7WUFDbkUsdUJBQXVCO1lBQ3ZCLE1BQU0sRUFBRSxDQUFBO1lBQ1IsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN0QixNQUFNLENBQUMsQ0FBQyxTQUFTLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzFDLENBQUMsQ0FBQTtRQUVELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLENBQUM7UUFFRCxNQUFNLEVBQUUsQ0FBQTtJQUNULENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQW9DO1FBQ2hGLGlCQUFpQjtRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDeEMsR0FBRztZQUNILGtCQUFrQixFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUNyQyxhQUFhLEVBQUUsZ0JBQWdCO1lBQy9CLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFVBQVUsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ3BCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTTtRQUNoQixNQUFNLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxHQUFHLEdBQUcsQ0FBQTtRQUV0QyxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDbkIsUUFBUSxDQUFDLFlBQVksR0FBRyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUM5QyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtZQUNuRixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckMsWUFBWSxFQUFFLENBQUE7WUFFZCxjQUFjO1lBQ2QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUNyRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNsRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RixNQUFNLEVBQUUsQ0FBQTtJQUNULENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxFQUNoQyxTQUFTLEVBQ1QsT0FBTyxFQUNQLEdBQUcsRUFDSCxNQUFNLEdBTU47UUFDQSxpRkFBaUY7UUFDakYsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxRQUFRO2dCQUFFLFNBQVE7WUFDdkIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFBRSxTQUFRO1lBQ2pDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsT0FBTyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFBO1lBQzlFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxFQUMvQixHQUFHLEVBQ0gsYUFBYSxFQUNiLGtCQUFrQixFQUNsQixlQUFlLEVBQ2YsVUFBVSxHQU9WO1FBQ0EsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFNO1FBRWxCLCtGQUErRjtRQUUvRixNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNoRixNQUFNLEtBQUssR0FBRztZQUNiLGVBQWUsRUFBRSxTQUFTO1lBQzFCLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLE9BQU87WUFDdEIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7U0FDbEMsQ0FBQTtRQUVELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixDQUFBO1FBQzlELElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxpQ0FBeUIsQ0FBQTtRQUV2RSw0REFBNEQ7UUFDNUQsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUVoRSxpQ0FBaUM7UUFDakMsSUFBSSxhQUFhLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQiw0Q0FBNEM7WUFDN0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGdJQUFnSTtnQkFDaEksSUFBSSxDQUFDLDBCQUEwQixDQUFDO29CQUMvQixHQUFHO29CQUNILFlBQVksRUFBRSxJQUFJO29CQUNsQixRQUFRLEVBQUUsUUFBUTtvQkFDbEIsYUFBYSxFQUFFLEtBQUs7aUJBQ3BCLENBQUMsQ0FBQTtnQkFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsQ0FBQSxDQUFDLDRCQUE0QjtnQkFDdEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQSxDQUFDLFlBQVk7Z0JBQ3pHLFlBQVksR0FBRyxVQUFVLENBQUE7WUFDMUIsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLGFBQWEsS0FBSyxrQkFBa0IsSUFBSSxhQUFhLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztZQUN6RixNQUFNLFFBQVEsR0FBRyxhQUFhLEtBQUssa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1lBQzNFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM3RixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQWlDO1lBQzVDLElBQUksRUFBRSxVQUFVO1lBQ2hCLFlBQVk7WUFDWixTQUFTO1lBQ1QsT0FBTztZQUNQLElBQUksRUFBRSxHQUFHO1lBQ1QsWUFBWSxFQUFFO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixrQkFBa0I7Z0JBQ2xCLElBQUksRUFBRSxTQUFTO2FBQ2Y7WUFDRCxTQUFTLEVBQUUsRUFBRSxFQUFFLGNBQWM7WUFDN0IsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7U0FDM0IsQ0FBQTtRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFFN0MsNEVBQTRFO1FBQzVFLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFBO1lBQ2pDLFNBQVMsQ0FBQyx3QkFBd0IsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO1lBQ3hELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ3RGLENBQUM7UUFFRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFTyxlQUFlLENBQUMsR0FBUTtRQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU8sS0FBSyxDQUFBO1FBQzVCLEtBQUssTUFBTSxVQUFVLElBQUksU0FBUyxFQUFFLENBQUM7WUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5QyxJQUFJLFFBQVEsRUFBRSxJQUFJLEtBQUssVUFBVTtnQkFBRSxTQUFRO1lBQzNDLElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxXQUFXO2dCQUFFLE9BQU8sSUFBSSxDQUFBO1FBQ25ELENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTywwQkFBMEIsQ0FDakMsSUFBdUI7UUFFdkIsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQTtRQUNyQixNQUFNLFdBQVcsR0FBZ0IsSUFBSSxDQUFDLElBQUksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ2hGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0scUJBQXFCLEdBQUcsY0FBYztZQUMzQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FDaEUsY0FBYyxDQUFDLFlBQVksQ0FDM0IsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDOUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVaLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU07UUFFaEIsSUFBSSxVQUF5QyxDQUFBO1FBQzdDLElBQUksb0JBQW9CLEdBQXFCLElBQUksQ0FBQTtRQUVqRCxJQUFJLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUMzQixVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQ3hCLENBQUM7YUFBTSxJQUFJLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNqQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFBO1lBQzNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0MsSUFBSSxTQUFTLEVBQUUsSUFBSSxLQUFLLFdBQVc7Z0JBQUUsT0FBTTtZQUMzQyxvQkFBb0IsR0FBRyxTQUFTLENBQUE7WUFDaEMsTUFBTSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQTtZQUM5RCxVQUFVLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU07UUFFbEIsSUFBSSxrQkFBa0IsR0FBK0IsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUEsQ0FBQyx1RUFBdUU7UUFFOUksaUJBQWlCO1FBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLENBQUEsQ0FBQyx1REFBdUQ7UUFDeEcsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsQ0FBQTtRQUMvRCxNQUFNLFlBQVksR0FDakIsVUFBVSxLQUFLLFVBQVU7WUFDeEIsQ0FBQyxDQUFDLGdCQUFnQjtZQUNsQixDQUFDLENBQUMsZ0JBQWdCO2lCQUNmLEtBQUssQ0FBQyxJQUFJLENBQUM7aUJBQ1gsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNmLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLFFBQTBCLENBQUE7UUFDOUIsSUFBSSxxQkFBeUMsQ0FBQTtRQUM3QyxJQUFJLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUMzQixNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsR0FDOUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLHdCQUF3QixDQUFDO2dCQUN6RCxhQUFhLEVBQUUseUJBQXlCO2dCQUN4QyxjQUFjLEVBQUU7b0JBQ2Y7d0JBQ0MsSUFBSSxFQUFFLE1BQU07d0JBQ1osT0FBTyxFQUFFLHVCQUF1QixDQUFDLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDO3FCQUNyRjtpQkFDRDtnQkFDRCxXQUFXO2dCQUNYLGNBQWM7YUFDZCxDQUFDLENBQUE7WUFDSCxRQUFRLEdBQUcsQ0FBQyxDQUFBO1lBQ1oscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLENBQUM7YUFBTSxJQUFJLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsb0JBQW9CO2dCQUFFLE9BQU07WUFDakMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLG9CQUFvQixDQUFBO1lBQzNDLE1BQU0sWUFBWSxHQUFHLFVBQVUsRUFBRSxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUE7WUFFakUsTUFBTSxTQUFTLEdBQUcsVUFBVSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0QsTUFBTSxPQUFPLEdBQUcsVUFBVSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEYsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQztnQkFDOUMsV0FBVyxFQUFFLGdCQUFnQjtnQkFDN0IsU0FBUztnQkFDVCxPQUFPO2FBQ1AsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxXQUFXLEdBQUcsdUJBQXVCLENBQUM7Z0JBQzNDLFNBQVMsRUFBRSxZQUFZO2dCQUN2QixZQUFZLEVBQUUsWUFBWTtnQkFDMUIsTUFBTTtnQkFDTixNQUFNO2dCQUNOLE9BQU8sRUFBRSxnQkFBZ0I7Z0JBQ3pCLFFBQVE7YUFDUixDQUFDLENBQUE7WUFFRixNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsR0FDOUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLHdCQUF3QixDQUFDO2dCQUN6RCxhQUFhLEVBQUUseUJBQXlCLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNoRixjQUFjLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO2dCQUN4RCxXQUFXO2dCQUNYLGNBQWM7YUFDZCxDQUFDLENBQUE7WUFDSCxRQUFRLEdBQUcsQ0FBQyxDQUFBO1lBQ1oscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLElBQUksYUFBYSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELGdHQUFnRztRQUNoRyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDO1lBQUUsT0FBTTtRQUVyQyxpQkFBaUI7UUFDakIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQ3hDLEdBQUc7WUFDSCxrQkFBa0I7WUFDbEIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGVBQWUsRUFBRSxvQkFBb0I7WUFDckMsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDaEIsSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDaEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDMUQsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsR0FBRztZQUFFLE9BQU07UUFDaEIsTUFBTSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsR0FBRyxHQUFHLENBQUE7UUFFdEMsVUFBVTtRQUNWLE1BQU0sTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzVCLFFBQVEsQ0FBQyxZQUFZLEdBQUcsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDOUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7WUFFbkYsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO2dCQUMxQixNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQTtnQkFFdEMsU0FBUyxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQTtnQkFDekMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7Z0JBQ3JGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLFlBQVksRUFBRSxDQUFBO1lBRWQsY0FBYztZQUNkLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDckUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDbEYsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELFNBQVM7UUFDVCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQStDLEVBQUUsRUFBRTtZQUNuRSx1QkFBdUI7WUFDdkIsTUFBTSxFQUFFLENBQUE7WUFDUixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RCLE1BQU0sQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQyxDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxRQUFnQixFQUFFLG9CQUE0QixFQUFFLEVBQUU7WUFDdEUsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sa0JBQWtCLENBQUM7b0JBQ3pCLElBQUksRUFBRSxRQUFRO29CQUNkLG9CQUFvQjtvQkFDcEIsTUFBTSxFQUFFLGdCQUFnQixDQUFDLE1BQU07aUJBQy9CLENBQUMsQ0FBQTtZQUNILENBQUM7aUJBQU0sSUFBSSxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sc0JBQXNCLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQTtZQUN4RSxDQUFDO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQixDQUFDLENBQUE7UUFFRCw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXJDLE1BQU0sMkJBQTJCLEdBQTBCO1lBQzFELElBQUksRUFBRSxRQUFRLENBQUMsU0FBUztZQUN4QixhQUFhLEVBQUUsS0FBSztZQUNwQixHQUFHLEVBQUUsQ0FBQztZQUNOLHFCQUFxQixFQUFFLENBQUM7U0FDeEIsQ0FBQTtRQUVELG9GQUFvRjtRQUNwRixNQUFNLFlBQVksR0FBRyxLQUFLLElBQUksRUFBRTtZQUMvQixJQUFJLHdCQUF3QixHQUFHLElBQUksQ0FBQTtZQUNuQyxPQUFPLHdCQUF3QixFQUFFLENBQUM7Z0JBQ2pDLHdCQUF3QixHQUFHLEtBQUssQ0FBQTtnQkFFaEMsSUFBSSxxQkFBcUIsR0FBZSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDckQscUJBQXFCLEdBQUcsSUFBSSxDQUFBO2dCQUM3QixDQUFDLENBQUMsQ0FBQTtnQkFFRix3QkFBd0I7Z0JBQ3hCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQSxDQUFDLG9DQUFvQztnQkFDM0QsSUFBSSxpQkFBaUIsR0FBRyxFQUFFLENBQUE7Z0JBQzFCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtnQkFDbkIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO2dCQUV6QixrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQztvQkFDbkUsWUFBWSxFQUFFLGNBQWM7b0JBQzVCLE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsSUFBSSxFQUFFLEVBQUU7b0JBQ3RELFFBQVE7b0JBQ1IsY0FBYztvQkFDZCxxQkFBcUI7b0JBQ3JCLGdCQUFnQjtvQkFDaEIscUJBQXFCO29CQUNyQixRQUFRLEVBQUUsSUFBSSxFQUFFLFdBQVc7b0JBQzNCLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUNsQixNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sQ0FBQTt3QkFDdEMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO3dCQUVwRSxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsR0FBRyxRQUFRLENBQUEsQ0FBQyx1RUFBdUU7d0JBQ3BILGFBQWEsSUFBSSxPQUFPLENBQUEsQ0FBQyxnQ0FBZ0M7d0JBRXpELE1BQU0sQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLEdBQUcsV0FBVyxDQUNqRSxhQUFhLEVBQ2IsT0FBTyxDQUFDLE1BQU0sQ0FDZCxDQUFBO3dCQUNELE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FDbkUsR0FBRyxFQUNILFlBQVksRUFDWixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLDJCQUEyQixDQUMzQixDQUFBO3dCQUNELFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLHFCQUFxQixDQUFBLENBQUMsMkRBQTJEO3dCQUV2SSxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBRXJDLGlCQUFpQixHQUFHLGFBQWEsQ0FBQTtvQkFDbEMsQ0FBQztvQkFDRCxjQUFjLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDMUIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sQ0FBQTt3QkFDM0IsZ0dBQWdHO3dCQUNoRywrREFBK0Q7d0JBQy9ELE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQ3RELElBQUksQ0FBQyxhQUFhLENBQ2pCLEdBQUcsRUFDSCxXQUFXLEVBQ1g7NEJBQ0MsZUFBZSxFQUFFLFFBQVEsQ0FBQyxTQUFTOzRCQUNuQyxXQUFXLEVBQUUsQ0FBQzs0QkFDZCxhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU87NEJBQy9CLFNBQVMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO3lCQUNsQyxFQUFFLFlBQVk7d0JBQ2YsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsQ0FDaEMsQ0FBQTt3QkFFRCxNQUFNLEVBQUUsQ0FBQTt3QkFDUixxQkFBcUIsRUFBRSxDQUFBO29CQUN4QixDQUFDO29CQUNELE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO3dCQUNkLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDWCxDQUFDO29CQUNELE9BQU8sRUFBRSxHQUFHLEVBQUU7d0JBQ2IsSUFBSSxhQUFhOzRCQUFFLE9BQU07d0JBQ3pCLHdHQUF3Rzt3QkFDeEcsT0FBTyxHQUFHLElBQUksQ0FBQTt3QkFDZCxxQkFBcUIsRUFBRSxDQUFBO29CQUN4QixDQUFDO2lCQUNELENBQUMsQ0FBQTtnQkFDRix1Q0FBdUM7Z0JBQ3ZDLElBQUksa0JBQWtCLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUN6QyxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsTUFBTSxrQkFBa0IsQ0FBQTtnQkFDeEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUE7Z0JBQ3JELENBQUM7WUFDRixDQUFDLENBQUMsWUFBWTtRQUNmLENBQUMsQ0FBQSxDQUFDLGdCQUFnQjtRQUVsQixNQUFNLGdCQUFnQixHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3ZELFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUF5QjtRQUN2QyxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtZQUN2QyxJQUFJLENBQUMsSUFBSTtnQkFBRSxPQUFNO1lBQ2pCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFDRCxxQkFBcUIsQ0FBQyxRQUF5QjtRQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTyxJQUFJLENBQUE7UUFDckIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPLElBQUksQ0FBQTtRQUN2QixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsY0FBYyxnQ0FBd0IsQ0FBQTtRQUNuRSxPQUFPLGNBQWMsQ0FBQTtJQUN0QixDQUFDO0lBNkJPLHVCQUF1QixDQUFDLEdBQVEsRUFBRSxTQUFpQjtRQUMxRCxNQUFNLE1BQU0sR0FBRywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtRQUVuRixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsS0FBSztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQTtRQUN6RixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsQ0FBQTtRQUN2RCxtR0FBbUc7UUFDbkcsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUUxQyxNQUFNLFlBQVksR0FJWixFQUFFLENBQUE7UUFDUixLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUMzRSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVE7Z0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ3ZGLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFBO1lBQzlCLFNBQVMsSUFBSSxDQUFDLENBQUEsQ0FBQyxVQUFVO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLENBQUE7WUFFWixpQ0FBaUM7WUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7aUJBQzVGLE1BQU0sQ0FBQTtZQUVSLDJCQUEyQjtZQUMzQixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFFekUsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUNELDJCQUEyQjtRQUMzQixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFdEQsb0JBQW9CO1FBQ3BCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzlELE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDM0YsQ0FBQztRQUNGLENBQUM7UUFFRCxxRUFBcUU7UUFDckUsSUFBSSxPQUFPLEdBQVcsUUFBUSxDQUFBO1FBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyRCxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDM0YsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLHNCQUFzQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVPLGlDQUFpQyxDQUN4QyxJQUFnRDtRQUVoRCxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUMvQixNQUFNLFdBQVcsR0FBZ0IsT0FBTyxDQUFBO1FBQ3hDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0scUJBQXFCLEdBQUcsY0FBYztZQUMzQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FDaEUsY0FBYyxDQUFDLFlBQVksQ0FDM0IsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDOUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVaLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU07UUFFaEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFNO1FBRWxCLElBQUksa0JBQWtCLEdBQStCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFBLENBQUMsdUVBQXVFO1FBRTlJLGlFQUFpRTtRQUNqRSxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixDQUFBO1FBQy9ELE1BQU0sa0JBQWtCLEdBQUcseUNBQXlDLENBQUM7WUFDcEUsWUFBWSxFQUFFLGdCQUFnQjtZQUM5QixRQUFRLEVBQUUsUUFBUTtTQUNsQixDQUFDLENBQUE7UUFFRixNQUFNLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLEdBQy9ELElBQUksQ0FBQywyQkFBMkIsQ0FBQyx3QkFBd0IsQ0FBQztZQUN6RCxhQUFhLEVBQUUsMkNBQTJDO1lBQzFELGNBQWMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztZQUMvRCxXQUFXO1lBQ1gsY0FBYztTQUNkLENBQUMsQ0FBQTtRQUVILGdHQUFnRztRQUNoRyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDO1lBQUUsT0FBTTtRQUVyQyxpQkFBaUI7UUFDakIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1lBQ3hDLEdBQUc7WUFDSCxrQkFBa0I7WUFDbEIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLElBQUksa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUEsQ0FBQyxxQkFBcUI7Z0JBQ2hGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEdBQUc7WUFBRSxPQUFNO1FBQ2hCLE1BQU0sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLEdBQUcsR0FBRyxDQUFBO1FBT3RDLE1BQU0sZ0NBQWdDLEdBQUcsQ0FDeEMsYUFBd0MsRUFDckIsRUFBRTtZQUNyQix1REFBdUQ7WUFDdkQsTUFBTSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsR0FBRyxhQUFhLENBQUE7WUFDbEQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO1lBQ2xCLEtBQUssTUFBTSxhQUFhLElBQUksMkJBQTJCLEVBQUUsQ0FBQztnQkFDekQsTUFBTSxFQUNMLFNBQVMsRUFDVCxPQUFPLEVBQ1AsUUFBUSxFQUFFLEVBQ1QsY0FBYyxFQUFFLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxHQUM5QyxHQUNELEdBQUcsYUFBYSxDQUFBO2dCQUNqQixJQUFJLGNBQWMsSUFBSSxXQUFXO29CQUFFLFNBQVE7Z0JBQzNDLE1BQU0sV0FBVyxHQUFHLE9BQU8sR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLFdBQVcsR0FBRyxZQUFZLEdBQUcsY0FBYyxHQUFHLENBQUMsQ0FBQTtnQkFDckQsVUFBVSxJQUFJLFdBQVcsR0FBRyxXQUFXLENBQUE7WUFDeEMsQ0FBQztZQUNELE9BQU8sQ0FBQyxhQUFhLEdBQUcsVUFBVSxFQUFFLFdBQVcsR0FBRyxVQUFVLENBQUMsQ0FBQTtRQUM5RCxDQUFDLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDbkIsUUFBUSxDQUFDLFlBQVksR0FBRyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUM5QyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtZQUNuRixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFckMsNEJBQTRCO1lBQzVCLEtBQUssTUFBTSxZQUFZLElBQUksMkJBQTJCO2dCQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUU5RixZQUFZLEVBQUUsQ0FBQTtZQUVkLGNBQWM7WUFDZCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3JFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQStDLEVBQUUsRUFBRTtZQUNuRSx1QkFBdUI7WUFDdkIsTUFBTSxFQUFFLENBQUE7WUFDUixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RCLE1BQU0sQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQyxDQUFBO1FBRUQsOERBQThEO1FBQzlELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVyQywySUFBMkk7UUFDM0ksSUFBSSwyQkFBMkIsR0FBaUMsSUFBSSxDQUFBO1FBQ3BFLElBQUksMkJBQTJCLEdBQUcsSUFBSSxDQUFBO1FBQ3RDLElBQUksU0FBUyxHQUFrQyxFQUFFLENBQUE7UUFDakQsTUFBTSwyQkFBMkIsR0FBa0QsRUFBRSxDQUFBO1FBQ3JGLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUU5QixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFFbkIsb0ZBQW9GO1FBQ3BGLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDbkMsMkZBQTJGO1lBQzNGLElBQUksd0JBQXdCLEdBQUcsSUFBSSxDQUFBO1lBQ25DLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtZQUNyQixJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQTtZQUM3QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDbkIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO1lBQ3pCLE9BQU8sd0JBQXdCLEVBQUUsQ0FBQztnQkFDakMsd0JBQXdCLEdBQUcsS0FBSyxDQUFBO2dCQUNoQyxhQUFhLElBQUksQ0FBQyxDQUFBO2dCQUNsQixJQUFJLGFBQWEsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxDQUFDLEdBQUc7d0JBQ1QsT0FBTyxFQUFFLHVCQUF1QixTQUFTLHlJQUF5STt3QkFDbEwsU0FBUyxFQUFFLElBQUk7cUJBQ2YsQ0FBQTtvQkFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ1YsTUFBSztnQkFDTixDQUFDO2dCQUVELElBQUkscUJBQXFCLEdBQWUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLGtCQUFrQixHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO29CQUN6RCxxQkFBcUIsR0FBRyxHQUFHLENBQUE7Z0JBQzVCLENBQUMsQ0FBQyxDQUFBO2dCQUVGLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBbUQsRUFBRSxFQUFFO29CQUN0RSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFBO29CQUMzQixpRUFBaUU7b0JBQ2pFLGtCQUFrQjtvQkFDbEIscUNBQXFDO29CQUVyQyxNQUFNLE1BQU0sR0FBRywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFFbkQsS0FBSyxJQUFJLFFBQVEsR0FBRyxxQkFBcUIsRUFBRSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ3BGLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTt3QkFFOUIsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLGlCQUFpQixFQUFFLENBQUM7NEJBQ3ZDLGlHQUFpRzs0QkFDakcsSUFBSSwyQkFBMkIsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sSUFBSSxFQUFFLEVBQUUsQ0FBQztnQ0FDbkUsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFBLENBQUMsa0RBQWtEO2dDQUN6RyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUU7b0NBQ3pFLGNBQWM7b0NBQ2QsVUFBVSxFQUFFLE9BQU87aUNBQ25CLENBQUMsQ0FBQTtnQ0FDRixJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRSxDQUFDO29DQUN2QyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLGdDQUFnQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO29DQUN0RSxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUE7b0NBQ3RDLDJCQUEyQixHQUFHLEtBQUssQ0FBQTtnQ0FDcEMsQ0FBQzs0QkFDRixDQUFDOzRCQUVELGlGQUFpRjs0QkFDakYsbURBQW1EOzRCQUNuRCxtRkFBbUY7NEJBQ25GLGdEQUFnRDs0QkFDaEQsd0NBQXdDOzRCQUN4Qyx5Q0FBeUM7NEJBQ3pDLElBQUk7NEJBRUosdUVBQXVFOzRCQUN2RSxTQUFRO3dCQUNULENBQUM7d0JBQ0QsMkJBQTJCLEdBQUcsSUFBSSxDQUFBO3dCQUVsQywwR0FBMEc7d0JBQzFHLElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSwyQkFBMkIsQ0FBQyxFQUFFLENBQUM7NEJBQ2hELE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtnQ0FDekUsVUFBVSxFQUFFLE9BQU87NkJBQ25CLENBQUMsQ0FBQTs0QkFDRixXQUFXOzRCQUNYLGtEQUFrRDs0QkFDbEQsTUFBTSxVQUFVLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7Z0NBQ3BFLE1BQU0sQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUE7Z0NBQ3pFLE1BQU0sWUFBWSxHQUFHLE9BQU8sR0FBRyxhQUFhLElBQUksU0FBUyxHQUFHLFdBQVcsQ0FBQTtnQ0FDdkUsT0FBTyxDQUFDLFlBQVksQ0FBQTs0QkFDckIsQ0FBQyxDQUFDLENBQUE7NEJBRUYsSUFBSSxPQUFPLGNBQWMsS0FBSyxRQUFRLElBQUksVUFBVSxFQUFFLENBQUM7Z0NBQ3RELE1BQU0sWUFBWSxHQUNqQixPQUFPLGNBQWMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUUsYUFBdUIsQ0FBQTtnQ0FFL0UsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO2dDQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO2dDQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0NBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFBO2dDQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7Z0NBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7Z0NBQ3hCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO2dDQUN0RSxNQUFNLFFBQVEsR0FDYix3SkFBd0osQ0FBQTtnQ0FDekosUUFBUSxDQUFDLElBQUksQ0FDWixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLGdCQUFnQjtnQ0FDMUQsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEdBQUcsSUFBSSxHQUFHLFFBQVEsRUFBRSxDQUNwRCxDQUFBO2dDQUVELG9CQUFvQjtnQ0FDcEIscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO2dDQUN6QiwyQkFBMkIsR0FBRyxJQUFJLENBQUE7Z0NBQ2xDLDJCQUEyQixHQUFHLElBQUksQ0FBQTtnQ0FDbEMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtnQ0FDZCxLQUFLLE1BQU0sWUFBWSxJQUFJLDJCQUEyQjtvQ0FDckQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFBO2dDQUN2QywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dDQUUvQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRTtvQ0FDM0Qsc0JBQXNCLEVBQUUsSUFBSTtpQ0FDNUIsQ0FBQyxDQUFBO2dDQUVGLG9CQUFvQjtnQ0FDcEIsd0JBQXdCLEdBQUcsSUFBSSxDQUFBO2dDQUMvQixJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO29DQUNoQyxhQUFhLEdBQUcsSUFBSSxDQUFBO29DQUNwQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO29DQUN6RCxhQUFhLEdBQUcsS0FBSyxDQUFBO2dDQUN0QixDQUFDO2dDQUNELFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtnQ0FDOUIscUJBQXFCLEVBQUUsQ0FBQTtnQ0FDdkIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO2dDQUNyQyxPQUFNOzRCQUNQLENBQUM7NEJBRUQsTUFBTSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxnQ0FBZ0MsQ0FBQyxjQUFjLENBQUMsQ0FBQTs0QkFFN0Usd0NBQXdDOzRCQUN4Qyx1RkFBdUY7NEJBQ3ZGLHlDQUF5Qzs0QkFDekMsNENBQTRDOzRCQUM1QywrQ0FBK0M7NEJBRS9DLHdEQUF3RDs0QkFDeEQsTUFBTSxNQUFNLEdBQW9FO2dDQUMvRSxJQUFJLEVBQUUsY0FBYztnQ0FDcEIsU0FBUyxFQUFFLFNBQVM7Z0NBQ3BCLE9BQU8sRUFBRSxPQUFPO2dDQUNoQixJQUFJLEVBQUUsR0FBRztnQ0FDVCxRQUFRLEVBQUU7b0NBQ1QsY0FBYyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUM7b0NBQ25DLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSTtpQ0FDeEI7NkJBQ0QsQ0FBQTs0QkFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBOzRCQUM5QywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7NEJBQzlDLDJCQUEyQixHQUFHO2dDQUM3QixJQUFJLEVBQUUsU0FBUztnQ0FDZixhQUFhLEVBQUUsS0FBSztnQ0FDcEIsR0FBRyxFQUFFLENBQUM7Z0NBQ04scUJBQXFCLEVBQUUsQ0FBQzs2QkFDeEIsQ0FBQTt3QkFDRixDQUFDLENBQUMsc0JBQXNCO3dCQUV4QiwyQ0FBMkM7d0JBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRCQUN4QyxPQUFPLENBQUMsS0FBSyxDQUNaLDBFQUEwRSxDQUMxRSxDQUFBOzRCQUNELFNBQVE7d0JBQ1QsQ0FBQzt3QkFFRCwrQ0FBK0M7d0JBQy9DLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxNQUFNLEVBQUUsQ0FBQzs0QkFDNUIsTUFBTSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxHQUN6RCwyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQTs0QkFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FDakIsR0FBRyxFQUNILEtBQUssQ0FBQyxLQUFLLEVBQ1g7Z0NBQ0MsZUFBZSxFQUFFLGNBQWM7Z0NBQy9CLFdBQVcsRUFBRSxDQUFDO2dDQUNkLGFBQWEsRUFBRSxZQUFZO2dDQUMzQixTQUFTLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjs2QkFDbEMsRUFBRSxZQUFZOzRCQUNmLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLENBQ2hDLENBQUE7NEJBQ0QsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQTs0QkFDN0MscUJBQXFCLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQTs0QkFDcEMsU0FBUTt3QkFDVCxDQUFDO3dCQUVELG1DQUFtQzt3QkFDbkMsSUFBSSxDQUFDLDJCQUEyQjs0QkFBRSxTQUFRO3dCQUMxQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7d0JBQ3BDLE1BQU0sV0FBVyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUE7d0JBQ2xELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTt3QkFFbkUsSUFBSSxDQUFDLDZCQUE2QixDQUNqQyxHQUFHLEVBQ0gsS0FBSyxDQUFDLElBQUksRUFDVixLQUFLLENBQUMsS0FBSyxFQUNYLGNBQWMsRUFDZCwyQkFBMkIsQ0FDM0IsQ0FBQTt3QkFDRCxTQUFTLEdBQUcsTUFBTSxDQUFBLENBQUMseUNBQXlDO3dCQUU1RCxpTkFBaU47d0JBQ2pOLDhDQUE4Qzt3QkFDOUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFBO29CQUM5RCxDQUFDLENBQUMsVUFBVTtvQkFFWixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3RDLENBQUMsQ0FBQTtnQkFFRCxrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQztvQkFDbkUsWUFBWSxFQUFFLGNBQWM7b0JBQzVCLE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSwyQkFBMkIsSUFBSSxFQUFFLEVBQUU7b0JBQzNELFFBQVE7b0JBQ1IsY0FBYztvQkFDZCxxQkFBcUI7b0JBQ3JCLGdCQUFnQjtvQkFDaEIscUJBQXFCO29CQUNyQixRQUFRLEVBQUUsSUFBSSxFQUFFLFdBQVc7b0JBQzNCLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUNsQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2YsQ0FBQztvQkFDRCxjQUFjLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO3dCQUNoQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFBO3dCQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7d0JBRWQsTUFBTSxNQUFNLEdBQUcsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUE7d0JBQ25ELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQzs0QkFDekIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FDN0IsaUVBQWlFLENBQ2pFLENBQUE7d0JBQ0YsQ0FBQzt3QkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRTs0QkFDM0Qsc0JBQXNCLEVBQUUsSUFBSTt5QkFDNUIsQ0FBQyxDQUFBO3dCQUVGLElBQUksQ0FBQzs0QkFDSixJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBOzRCQUMzQyxNQUFNLEVBQUUsQ0FBQTs0QkFDUixxQkFBcUIsRUFBRSxDQUFBO3dCQUN4QixDQUFDO3dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7NEJBQ1osT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUNYLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTt3QkFDZCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ1gsQ0FBQztvQkFDRCxPQUFPLEVBQUUsR0FBRyxFQUFFO3dCQUNiLElBQUksYUFBYTs0QkFBRSxPQUFNO3dCQUN6Qix3R0FBd0c7d0JBQ3hHLE9BQU8sR0FBRyxJQUFJLENBQUE7d0JBQ2QscUJBQXFCLEVBQUUsQ0FBQTtvQkFDeEIsQ0FBQztpQkFDRCxDQUFDLENBQUE7Z0JBRUYsdUNBQXVDO2dCQUN2QyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDekMsTUFBSztnQkFDTixDQUFDO2dCQUVELE1BQU0sa0JBQWtCLENBQUE7Z0JBQ3hCLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO2dCQUNyRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLFlBQVk7UUFDZixDQUFDLENBQUEsQ0FBQyxnQkFBZ0I7UUFFbEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sQ0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN2RCxnQkFBZ0IsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFlBQVksQ0FBQyxHQUFRO1FBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELG9CQUFvQixDQUFDLEVBQUUsVUFBVSxFQUEwQjtRQUMxRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxTQUFTO1lBQUUsT0FBTyxLQUFLLENBQUE7UUFDNUIsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVc7WUFBRSxPQUFPLEtBQUssQ0FBQTtRQUNoRCxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUE7SUFDNUMsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFFBQWtCO1FBQzFDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUE7UUFFekIsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUE7UUFDekUsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFNO1FBRTVCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFOUMsUUFBUSxDQUFDLFlBQVksR0FBRyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUM5QyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRUQsZ0dBQWdHO0lBQ2hHLHVCQUF1QixDQUFDLEVBQUUsVUFBVSxFQUEwQjtRQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQy9DLElBQUksU0FBUyxFQUFFLElBQUksS0FBSyxXQUFXO1lBQUUsT0FBTTtRQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QjtZQUFFLE9BQU07UUFFL0MsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyx1QkFBdUI7WUFBRSxPQUFNO1FBQ3BDLElBQUksdUJBQXVCLENBQUMsSUFBSSxLQUFLLFVBQVU7WUFBRSxPQUFNO1FBRXZELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELHFCQUFxQixDQUFDLEVBQUUsR0FBRyxFQUFnQjtRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUM7WUFBRSxPQUFNO1FBQ3RDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEIsNEJBQTRCO1FBQzVCLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5QyxJQUFJLFFBQVEsRUFBRSxJQUFJLEtBQUssVUFBVTtnQkFBRSxTQUFRO1lBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFdBQVc7Z0JBQUUsU0FBUTtZQUNoRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFFRCw2RUFBNkU7SUFDN0UsNkJBQTZCO0lBQzdCLG9EQUFvRDtJQUVwRCxzRUFBc0U7SUFDdEUsa0VBQWtFO0lBRWxFLHlDQUF5QztJQUN6QyxrQkFBa0I7SUFDbEIsSUFBSTtJQUVJLGVBQWUsQ0FBQyxRQUFrQjtRQUN6QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFBO1FBRXpCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUE7UUFDdkMsTUFBTSxPQUFPLEdBQVc7WUFDdkIsZUFBZSxFQUFFLFFBQVEsQ0FBQyxTQUFTO1lBQ25DLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPO1lBQy9CLFNBQVMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO1NBQ2xDLENBQUE7UUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBaUNELDRCQUE0QjtJQUNyQixLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFzQjtRQUNyRCx3RUFBd0U7UUFFeEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU07UUFFakIsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUMzQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxRQUFRO1lBQUUsT0FBTTtRQUVyQixJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssVUFBVTtZQUFFLE9BQU07UUFFeEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQTtRQUV6QixpQkFBaUI7UUFDakIsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFaEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkQsSUFBSSxlQUF1QixDQUFBO1FBRTNCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUM5QixlQUFlLEdBQUc7Z0JBQ2pCLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLDhCQUE4QjtnQkFDckYsZ0NBQWdDO2dCQUNoQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLDJCQUEyQjthQUMzRixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNiLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdEMsZUFBZSxHQUFHO2dCQUNqQixHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsRUFBRSw4QkFBOEI7Z0JBQ3JGLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTztnQkFDbEIsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQUUsdUNBQXVDO2FBQ3JHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2IsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNqQyxlQUFlLEdBQUc7Z0JBQ2pCLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLDhCQUE4QjtnQkFDckYsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPO2dCQUNsQixHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLDJCQUEyQjthQUMzRixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLElBQUksc0JBQXNCLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLG9DQUFvQztRQUNwQyxpREFBaUQ7UUFDakQsb0RBQW9EO1FBRXBELHVDQUF1QztRQUN2QyxRQUFRLENBQUMsWUFBWSxHQUFHLGVBQWUsQ0FBQTtRQUV2QyxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QiwyREFBMkQ7UUFDM0QsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXJDLFlBQVksRUFBRSxDQUFBO0lBQ2YsQ0FBQztJQUVELDRCQUE0QjtJQUNyQixLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFzQjtRQUNyRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTTtRQUVqQixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFBO1FBQzNCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVE7WUFBRSxPQUFNO1FBRXJCLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVO1lBQUUsT0FBTTtRQUV4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFBO1FBRXpCLGlCQUFpQjtRQUNqQixNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVoRCxJQUFJLFNBQWlCLENBQUE7UUFDckIsSUFBSSxPQUFlLENBQUE7UUFFbkIsMENBQTBDO1FBQzFDLHFFQUFxRTtRQUNyRSxLQUFLO1FBQ0wsd0RBQXdEO1FBQ3hELEtBQUs7UUFDTCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDOUIsbUtBQW1LO1lBQ25LLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM3QyxTQUFTLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7Z0JBQ3BDLE9BQU8sR0FBRztvQkFDVCxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDO29CQUNuQyxXQUFXLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDcEMsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQztvQkFDakMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7aUJBQ2xDLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUNwQyxPQUFPLEdBQUc7b0JBQ1QsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTO29CQUMvQixXQUFXLEVBQUUsQ0FBQztvQkFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVM7b0JBQzdCLFNBQVMsRUFBRSxDQUFDO2lCQUNaLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELHVEQUF1RDtRQUN2RCxxRUFBcUU7UUFDckUscUJBQXFCO1FBQ3JCLHVEQUF1RDtRQUN2RCxLQUFLO2FBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLGtDQUFrQztZQUNsQyw0TEFBNEw7WUFDNUwsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdkMsMENBQTBDO2dCQUMxQyxTQUFTLEdBQUcsRUFBRSxDQUFBO2dCQUNkLE9BQU8sR0FBRztvQkFDVCxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDO29CQUNuQyxXQUFXLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDcEMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPO29CQUMzQixTQUFTLEVBQUUsQ0FBQztpQkFDWixDQUFBLENBQUMsWUFBWTtZQUNmLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxTQUFTLEdBQUcsRUFBRSxDQUFBO2dCQUNkLE9BQU8sR0FBRztvQkFDVCxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVM7b0JBQy9CLFdBQVcsRUFBRSxDQUFDO29CQUNkLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUM7b0JBQy9CLFNBQVMsRUFBRSxDQUFDO2lCQUNaLENBQUEsQ0FBQyxZQUFZO1lBQ2YsQ0FBQztRQUNGLENBQUM7UUFDRCx5Q0FBeUM7UUFDekMscUVBQXFFO1FBQ3JFLHNCQUFzQjtRQUN0QixxRUFBcUU7UUFDckUsS0FBSzthQUNBLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUMvQixTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtZQUM3QixPQUFPLEdBQUc7Z0JBQ1QsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUMvQixXQUFXLEVBQUUsQ0FBQztnQkFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQzNCLFNBQVMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2FBQ2xDLENBQUEsQ0FBQyxZQUFZO1FBQ2YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsSUFBSSxzQkFBc0IsQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFLHNCQUFzQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFN0UsZ0NBQWdDO1FBRWhDLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRCLDJEQUEyRDtRQUMzRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFckMsWUFBWSxFQUFFLENBQUE7SUFDZixDQUFDO0NBQ0QsQ0FBQTtBQXJ2RUssZUFBZTtJQWlDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSw0QkFBNEIsQ0FBQTtJQUU1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsb0JBQW9CLENBQUE7SUFFcEIsV0FBQSxvQkFBb0IsQ0FBQTtJQUVwQixZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsMkJBQTJCLENBQUE7R0EvQ3hCLGVBQWUsQ0FxdkVwQjtBQUVELGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLGVBQWUsa0NBQTBCLENBQUE7QUFFN0UsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxNQUFNO0lBQ3JDLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFBLENBQUMsbUNBQW1DO0lBQ3pELENBQUM7SUFDTSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBQ00sV0FBVztRQUNqQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFPRCxZQUNDLEVBQ0MsTUFBTSxFQUNOLFFBQVEsRUFDUixRQUFRLEVBQ1IsTUFBTSxFQUNOLFNBQVMsRUFDVCxXQUFXLEdBUVgsRUFDd0Msc0JBQThDLEVBQ2xELGtCQUFzQyxFQUN4QyxnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFKa0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQUNsRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFJckUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQTtRQUNsQyxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDWixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUUxQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFFN0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsa0NBQXlCLENBQUE7UUFFNUQsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLEVBQUU7WUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUM3RixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1lBRTdGLDBFQUEwRTtZQUMxRSx5Q0FBeUM7WUFDekMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQ3hFLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQ3ZELENBQUE7WUFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FDeEUsQ0FBQyxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FDdkQsQ0FBQTtZQUVELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDL0UsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQSxDQUFDLGtDQUFrQztZQUM3RixNQUFNLFdBQVcsR0FBRyxvQkFBb0IsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQTtZQUUvRSxNQUFNLFNBQVMsR0FBRyxXQUFXLEtBQUssZUFBZSxDQUFBO1lBRWpELE1BQU0sVUFBVSxHQUFHLFNBQVMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFBO1lBQ3ZFLE1BQU0sVUFBVSxHQUFHLFNBQVMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFBO1lBRXZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLENBQUE7UUFDbEMsQ0FBQyxDQUFBO1FBRUQsTUFBTSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxDQUFBO1FBRXhELG9DQUFvQztRQUNwQyxNQUFNLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRTtZQUNwRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQztZQUNoQyxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUE7UUFFRixzQkFBc0I7UUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQTtRQUNuQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUE7UUFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO1FBQ2xDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQTtRQUMxQixPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxjQUFjLFdBQVcsR0FBRyxVQUFVLEtBQUssQ0FBQTtRQUNyRSxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUE7UUFDekMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFBO1FBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQTtRQUVwQyxzQkFBc0I7UUFDdEIsWUFBWSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUE7UUFDL0IsWUFBWSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDckMsWUFBWSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFBO1FBQzdDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQTtRQUN4QyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUE7UUFDMUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFBO1FBQzVDLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQTtRQUNyQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7UUFDdEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFDakQsWUFBWSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxLQUFLLENBQUE7UUFDbEQsWUFBWSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUE7UUFDNUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxHQUFHLENBQUE7UUFDN0MsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1FBQ3JDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNsQyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRywyQkFBMkIsQ0FBQTtRQUMxRCxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUE7UUFFekMsc0JBQXNCO1FBQ3RCLFlBQVksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFBO1FBQy9CLFlBQVksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQ3JDLFlBQVksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQTtRQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUE7UUFDeEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFBO1FBQzFDLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQTtRQUM1QyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUE7UUFDckMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFBO1FBQ3RDLFlBQVksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFBO1FBQ2pELFlBQVksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFBO1FBQ2xELFlBQVksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxDQUFBO1FBQzVDLFlBQVksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEdBQUcsR0FBRyxDQUFBO1FBQzdDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUNyQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFDbEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsMkJBQTJCLENBQUE7UUFDMUQsWUFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFBO1FBRXpDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBRXZCLE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtZQUN0QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNoRixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQTtRQUN2QyxDQUFDLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBRyxHQUFHLEVBQUU7WUFDdkIsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3pDLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFBO1lBQ3BELE1BQU0sc0JBQXNCLEdBQUcsVUFBVSxDQUFDLHNCQUFzQixDQUFBO1lBQ2hFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFBO1lBRTdDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEdBQUcsWUFBWSxHQUFHLHNCQUFzQixHQUFHLFdBQVcsQ0FBQTtZQUNyRixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQTtRQUN6QyxDQUFDLENBQUE7UUFFRCxxQ0FBcUM7UUFDckMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLFNBQVMsRUFBRSxDQUFBO1lBQ1gsVUFBVSxFQUFFLENBQUE7UUFDYixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFTCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlCLFNBQVMsRUFBRSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsU0FBUyxFQUFFLENBQUE7UUFDWixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM5QixTQUFTLEVBQUUsQ0FBQTtZQUNYLFVBQVUsRUFBRSxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2xELElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxDQUFBO2dCQUV4RCxZQUFZLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtnQkFDckMsWUFBWSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxvQkFBb0I7UUFFcEIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLDRDQUE0QztJQUM3QyxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQW5NSyx3QkFBd0I7SUFnQzNCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGdCQUFnQixDQUFBO0dBbENiLHdCQUF3QixDQW1NN0IifQ==