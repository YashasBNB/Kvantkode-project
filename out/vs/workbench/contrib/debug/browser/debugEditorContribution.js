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
import { addDisposableListener, isKeyboardEvent } from '../../../../base/browser/dom.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { illegalArgument, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { visit } from '../../../../base/common/json.js';
import { setProperty } from '../../../../base/common/jsonEdit.js';
import { DisposableStore, MutableDisposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { basename } from '../../../../base/common/path.js';
import * as env from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { assertType, isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { CoreEditingCommands } from '../../../../editor/browser/coreCommands.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { DEFAULT_WORD_REGEXP } from '../../../../editor/common/core/wordHelper.js';
import { InjectedTextCursorStops, } from '../../../../editor/common/model.js';
import { ILanguageFeatureDebounceService, } from '../../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DebugHoverWidget } from './debugHover.js';
import { ExceptionWidget } from './exceptionWidget.js';
import { CONTEXT_EXCEPTION_WIDGET_VISIBLE, IDebugService, } from '../common/debug.js';
import { Expression } from '../common/debugModel.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
const MAX_NUM_INLINE_VALUES = 100; // JS Global scope can have 700+ entries. We want to limit ourselves for perf reasons
const MAX_INLINE_DECORATOR_LENGTH = 150; // Max string length of each inline decorator when debugging. If exceeded ... is added
const MAX_TOKENIZATION_LINE_LEN = 500; // If line is too long, then inline values for the line are skipped
const DEAFULT_INLINE_DEBOUNCE_DELAY = 200;
export const debugInlineForeground = registerColor('editor.inlineValuesForeground', {
    dark: '#ffffff80',
    light: '#00000080',
    hcDark: '#ffffff80',
    hcLight: '#00000080',
}, nls.localize('editor.inlineValuesForeground', 'Color for the debug inline value text.'));
export const debugInlineBackground = registerColor('editor.inlineValuesBackground', '#ffc80033', nls.localize('editor.inlineValuesBackground', 'Color for the debug inline value background.'));
class InlineSegment {
    constructor(column, text) {
        this.column = column;
        this.text = text;
    }
}
export function formatHoverContent(contentText) {
    if (contentText.includes(',') && contentText.includes('=')) {
        // Custom split: for each equals sign after the first, backtrack to the nearest comma
        const customSplit = (text) => {
            const splits = [];
            let equalsFound = 0;
            let start = 0;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '=') {
                    if (equalsFound === 0) {
                        equalsFound++;
                        continue;
                    }
                    const commaIndex = text.lastIndexOf(',', i);
                    if (commaIndex !== -1 && commaIndex >= start) {
                        splits.push(commaIndex);
                        start = commaIndex + 1;
                    }
                    equalsFound++;
                }
            }
            const result = [];
            let s = 0;
            for (const index of splits) {
                result.push(text.substring(s, index).trim());
                s = index + 1;
            }
            if (s < text.length) {
                result.push(text.substring(s).trim());
            }
            return result;
        };
        const pairs = customSplit(contentText);
        const formattedPairs = pairs.map((pair) => {
            const equalsIndex = pair.indexOf('=');
            if (equalsIndex !== -1) {
                const indent = ' '.repeat(equalsIndex + 2);
                const [firstLine, ...restLines] = pair.split(/\r?\n/);
                return [firstLine, ...restLines.map((line) => indent + line)].join('\n');
            }
            return pair;
        });
        return new MarkdownString().appendCodeblock('', formattedPairs.join(',\n'));
    }
    return new MarkdownString().appendCodeblock('', contentText);
}
export function createInlineValueDecoration(lineNumber, contentText, classNamePrefix, column = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, viewportMaxCol = MAX_INLINE_DECORATOR_LENGTH) {
    const rawText = contentText; // store raw text for hover message
    // Truncate contentText if it exceeds the viewport max column
    if (contentText.length > viewportMaxCol) {
        contentText = contentText.substring(0, viewportMaxCol) + '...';
    }
    return [
        {
            range: {
                startLineNumber: lineNumber,
                endLineNumber: lineNumber,
                startColumn: column,
                endColumn: column,
            },
            options: {
                description: `${classNamePrefix}-inline-value-decoration-spacer`,
                after: {
                    content: strings.noBreakWhitespace,
                    cursorStops: InjectedTextCursorStops.None,
                },
                showIfCollapsed: true,
            },
        },
        {
            range: {
                startLineNumber: lineNumber,
                endLineNumber: lineNumber,
                startColumn: column,
                endColumn: column,
            },
            options: {
                description: `${classNamePrefix}-inline-value-decoration`,
                after: {
                    content: replaceWsWithNoBreakWs(contentText),
                    inlineClassName: `${classNamePrefix}-inline-value`,
                    inlineClassNameAffectsLetterSpacing: true,
                    cursorStops: InjectedTextCursorStops.None,
                },
                showIfCollapsed: true,
                hoverMessage: formatHoverContent(rawText),
            },
        },
    ];
}
function replaceWsWithNoBreakWs(str) {
    return str.replace(/[ \t\n]/g, strings.noBreakWhitespace);
}
function createInlineValueDecorationsInsideRange(expressions, ranges, model, wordToLineNumbersMap) {
    const nameValueMap = new Map();
    for (const expr of expressions) {
        nameValueMap.set(expr.name, expr.value);
        // Limit the size of map. Too large can have a perf impact
        if (nameValueMap.size >= MAX_NUM_INLINE_VALUES) {
            break;
        }
    }
    const lineToNamesMap = new Map();
    // Compute unique set of names on each line
    nameValueMap.forEach((_value, name) => {
        const lineNumbers = wordToLineNumbersMap.get(name);
        if (lineNumbers) {
            for (const lineNumber of lineNumbers) {
                if (ranges.some((r) => lineNumber >= r.startLineNumber && lineNumber <= r.endLineNumber)) {
                    if (!lineToNamesMap.has(lineNumber)) {
                        lineToNamesMap.set(lineNumber, []);
                    }
                    if (lineToNamesMap.get(lineNumber).indexOf(name) === -1) {
                        lineToNamesMap.get(lineNumber).push(name);
                    }
                }
            }
        }
    });
    // Compute decorators for each line
    return [...lineToNamesMap].map(([line, names]) => ({
        line,
        variables: names
            .sort((first, second) => {
            const content = model.getLineContent(line);
            return content.indexOf(first) - content.indexOf(second);
        })
            .map((name) => ({ name, value: nameValueMap.get(name) })),
    }));
}
function getWordToLineNumbersMap(model, lineNumber, result) {
    const lineLength = model.getLineLength(lineNumber);
    // If line is too long then skip the line
    if (lineLength > MAX_TOKENIZATION_LINE_LEN) {
        return;
    }
    const lineContent = model.getLineContent(lineNumber);
    model.tokenization.forceTokenization(lineNumber);
    const lineTokens = model.tokenization.getLineTokens(lineNumber);
    for (let tokenIndex = 0, tokenCount = lineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
        const tokenType = lineTokens.getStandardTokenType(tokenIndex);
        // Token is a word and not a comment
        if (tokenType === 0 /* StandardTokenType.Other */) {
            DEFAULT_WORD_REGEXP.lastIndex = 0; // We assume tokens will usually map 1:1 to words if they match
            const tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
            const tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
            const tokenStr = lineContent.substring(tokenStartOffset, tokenEndOffset);
            const wordMatch = DEFAULT_WORD_REGEXP.exec(tokenStr);
            if (wordMatch) {
                const word = wordMatch[0];
                if (!result.has(word)) {
                    result.set(word, []);
                }
                result.get(word).push(lineNumber);
            }
        }
    }
}
let DebugEditorContribution = class DebugEditorContribution {
    constructor(editor, debugService, instantiationService, commandService, configurationService, hostService, uriIdentityService, contextKeyService, languageFeaturesService, featureDebounceService) {
        this.editor = editor;
        this.debugService = debugService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.uriIdentityService = uriIdentityService;
        this.languageFeaturesService = languageFeaturesService;
        this.mouseDown = false;
        this.gutterIsHovered = false;
        this.altListener = new MutableDisposable();
        this.altPressed = false;
        this.displayedStore = new DisposableStore();
        // Holds a Disposable that prevents the default editor hover behavior while it exists.
        this.defaultHoverLockout = new MutableDisposable();
        this.oldDecorations = this.editor.createDecorationsCollection();
        this.debounceInfo = featureDebounceService.for(languageFeaturesService.inlineValuesProvider, 'InlineValues', { min: DEAFULT_INLINE_DEBOUNCE_DELAY });
        this.hoverWidget = this.instantiationService.createInstance(DebugHoverWidget, this.editor);
        this.toDispose = [this.defaultHoverLockout, this.altListener, this.displayedStore];
        this.registerListeners();
        this.exceptionWidgetVisible = CONTEXT_EXCEPTION_WIDGET_VISIBLE.bindTo(contextKeyService);
        this.toggleExceptionWidget();
    }
    registerListeners() {
        this.toDispose.push(this.debugService
            .getViewModel()
            .onDidFocusStackFrame((e) => this.onFocusStackFrame(e.stackFrame)));
        // hover listeners & hover widget
        this.toDispose.push(this.editor.onMouseDown((e) => this.onEditorMouseDown(e)));
        this.toDispose.push(this.editor.onMouseUp(() => (this.mouseDown = false)));
        this.toDispose.push(this.editor.onMouseMove((e) => this.onEditorMouseMove(e)));
        this.toDispose.push(this.editor.onMouseLeave((e) => {
            const hoverDomNode = this.hoverWidget.getDomNode();
            if (!hoverDomNode) {
                return;
            }
            const rect = hoverDomNode.getBoundingClientRect();
            // Only hide the hover widget if the editor mouse leave event is outside the hover widget #3528
            if (e.event.posx < rect.left ||
                e.event.posx > rect.right ||
                e.event.posy < rect.top ||
                e.event.posy > rect.bottom) {
                this.hideHoverWidget();
            }
        }));
        this.toDispose.push(this.editor.onKeyDown((e) => this.onKeyDown(e)));
        this.toDispose.push(this.editor.onDidChangeModelContent(() => {
            this._wordToLineNumbersMap = undefined;
            this.updateInlineValuesScheduler.schedule();
        }));
        this.toDispose.push(this.debugService
            .getViewModel()
            .onWillUpdateViews(() => this.updateInlineValuesScheduler.schedule()));
        this.toDispose.push(this.debugService
            .getViewModel()
            .onDidEvaluateLazyExpression(() => this.updateInlineValuesScheduler.schedule()));
        this.toDispose.push(this.editor.onDidChangeModel(async () => {
            this.addDocumentListeners();
            this.toggleExceptionWidget();
            this.hideHoverWidget();
            this._wordToLineNumbersMap = undefined;
            const stackFrame = this.debugService.getViewModel().focusedStackFrame;
            await this.updateInlineValueDecorations(stackFrame);
        }));
        this.toDispose.push(this.editor.onDidScrollChange(() => {
            this.hideHoverWidget();
            // Inline value provider should get called on view port change
            const model = this.editor.getModel();
            if (model && this.languageFeaturesService.inlineValuesProvider.has(model)) {
                this.updateInlineValuesScheduler.schedule();
            }
        }));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.hover')) {
                this.updateHoverConfiguration();
            }
        }));
        this.toDispose.push(this.debugService.onDidChangeState((state) => {
            if (state !== 2 /* State.Stopped */) {
                this.toggleExceptionWidget();
            }
        }));
        this.updateHoverConfiguration();
    }
    updateHoverConfiguration() {
        const model = this.editor.getModel();
        if (model) {
            this.editorHoverOptions = this.configurationService.getValue('editor.hover', {
                resource: model.uri,
                overrideIdentifier: model.getLanguageId(),
            });
        }
    }
    addDocumentListeners() {
        const stackFrame = this.debugService.getViewModel().focusedStackFrame;
        const model = this.editor.getModel();
        if (model) {
            this.applyDocumentListeners(model, stackFrame);
        }
    }
    applyDocumentListeners(model, stackFrame) {
        if (!stackFrame || !this.uriIdentityService.extUri.isEqual(model.uri, stackFrame.source.uri)) {
            this.altListener.clear();
            return;
        }
        const ownerDocument = this.editor.getContainerDomNode().ownerDocument;
        // When the alt key is pressed show regular editor hover and hide the debug hover #84561
        this.altListener.value = addDisposableListener(ownerDocument, 'keydown', (keydownEvent) => {
            const standardKeyboardEvent = new StandardKeyboardEvent(keydownEvent);
            if (standardKeyboardEvent.keyCode === 6 /* KeyCode.Alt */) {
                this.altPressed = true;
                const debugHoverWasVisible = this.hoverWidget.isVisible();
                this.hoverWidget.hide();
                this.defaultHoverLockout.clear();
                if (debugHoverWasVisible && this.hoverPosition) {
                    // If the debug hover was visible immediately show the editor hover for the alt transition to be smooth
                    this.showEditorHover(this.hoverPosition.position, false);
                }
                const onKeyUp = new DomEmitter(ownerDocument, 'keyup');
                const listener = Event.any(this.hostService.onDidChangeFocus, onKeyUp.event)((keyupEvent) => {
                    let standardKeyboardEvent = undefined;
                    if (isKeyboardEvent(keyupEvent)) {
                        standardKeyboardEvent = new StandardKeyboardEvent(keyupEvent);
                    }
                    if (!standardKeyboardEvent || standardKeyboardEvent.keyCode === 6 /* KeyCode.Alt */) {
                        this.altPressed = false;
                        this.preventDefaultEditorHover();
                        listener.dispose();
                        onKeyUp.dispose();
                    }
                });
            }
        });
    }
    async showHover(position, focus, mouseEvent) {
        // normally will already be set in `showHoverScheduler`, but public callers may hit this directly:
        this.preventDefaultEditorHover();
        const sf = this.debugService.getViewModel().focusedStackFrame;
        const model = this.editor.getModel();
        if (sf && model && this.uriIdentityService.extUri.isEqual(sf.source.uri, model.uri)) {
            const result = await this.hoverWidget.showAt(position, focus, mouseEvent);
            if (result === 1 /* ShowDebugHoverResult.NOT_AVAILABLE */) {
                // When no expression available fallback to editor hover
                this.showEditorHover(position, focus);
            }
        }
        else {
            this.showEditorHover(position, focus);
        }
    }
    preventDefaultEditorHover() {
        if (this.defaultHoverLockout.value || this.editorHoverOptions?.enabled === false) {
            return;
        }
        const hoverController = this.editor.getContribution(ContentHoverController.ID);
        hoverController?.hideContentHover();
        this.editor.updateOptions({ hover: { enabled: false } });
        this.defaultHoverLockout.value = {
            dispose: () => {
                this.editor.updateOptions({
                    hover: { enabled: this.editorHoverOptions?.enabled ?? true },
                });
            },
        };
    }
    showEditorHover(position, focus) {
        const hoverController = this.editor.getContribution(ContentHoverController.ID);
        const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
        // enable the editor hover, otherwise the content controller will see it
        // as disabled and hide it on the first mouse move (#193149)
        this.defaultHoverLockout.clear();
        hoverController?.showContentHover(range, 1 /* HoverStartMode.Immediate */, 0 /* HoverStartSource.Mouse */, focus);
    }
    async onFocusStackFrame(sf) {
        const model = this.editor.getModel();
        if (model) {
            this.applyDocumentListeners(model, sf);
            if (sf && this.uriIdentityService.extUri.isEqual(sf.source.uri, model.uri)) {
                await this.toggleExceptionWidget();
            }
            else {
                this.hideHoverWidget();
            }
        }
        await this.updateInlineValueDecorations(sf);
    }
    get hoverDelay() {
        const baseDelay = this.editorHoverOptions?.delay || 0;
        // heuristic to get a 'good' but configurable delay for evaluation. The
        // debug hover can be very large, so we tend to be more conservative about
        // when to show it (#180621). With this equation:
        // - default 300ms hover => * 2   = 600ms
        // - short   100ms hover => * 2   = 200ms
        // - longer  600ms hover => * 1.5 = 900ms
        // - long   1000ms hover => * 1.0 = 1000ms
        const delayFactor = clamp(2 - (baseDelay - 300) / 600, 1, 2);
        return baseDelay * delayFactor;
    }
    get showHoverScheduler() {
        const scheduler = new RunOnceScheduler(() => {
            if (this.hoverPosition && !this.altPressed) {
                this.showHover(this.hoverPosition.position, false, this.hoverPosition.event);
            }
        }, this.hoverDelay);
        this.toDispose.push(scheduler);
        return scheduler;
    }
    hideHoverWidget() {
        if (this.hoverWidget.willBeVisible()) {
            this.hoverWidget.hide();
        }
        this.showHoverScheduler.cancel();
        this.defaultHoverLockout.clear();
    }
    // hover business
    onEditorMouseDown(mouseEvent) {
        this.mouseDown = true;
        if (mouseEvent.target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ &&
            mouseEvent.target.detail === DebugHoverWidget.ID) {
            return;
        }
        this.hideHoverWidget();
    }
    onEditorMouseMove(mouseEvent) {
        if (this.debugService.state !== 2 /* State.Stopped */) {
            return;
        }
        const target = mouseEvent.target;
        const stopKey = env.isMacintosh ? 'metaKey' : 'ctrlKey';
        if (!this.altPressed) {
            if (target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) {
                this.defaultHoverLockout.clear();
                this.gutterIsHovered = true;
            }
            else if (this.gutterIsHovered) {
                this.gutterIsHovered = false;
                this.updateHoverConfiguration();
            }
        }
        if ((target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && target.detail === DebugHoverWidget.ID) ||
            this.hoverWidget.isInSafeTriangle(mouseEvent.event.posx, mouseEvent.event.posy)) {
            // mouse moved on top of debug hover widget
            const sticky = this.editorHoverOptions?.sticky ?? true;
            if (sticky || this.hoverWidget.isShowingComplexValue || mouseEvent.event[stopKey]) {
                return;
            }
        }
        if (target.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            if (target.position &&
                !Position.equals(target.position, this.hoverPosition?.position || null) &&
                !this.hoverWidget.isInSafeTriangle(mouseEvent.event.posx, mouseEvent.event.posy)) {
                this.hoverPosition = { position: target.position, event: mouseEvent.event };
                // Disable the editor hover during the request to avoid flickering
                this.preventDefaultEditorHover();
                this.showHoverScheduler.schedule(this.hoverDelay);
            }
        }
        else if (!this.mouseDown) {
            // Do not hide debug hover when the mouse is pressed because it usually leads to accidental closing #64620
            this.hideHoverWidget();
        }
    }
    onKeyDown(e) {
        const stopKey = env.isMacintosh ? 57 /* KeyCode.Meta */ : 5 /* KeyCode.Ctrl */;
        if (e.keyCode !== stopKey && e.keyCode !== 6 /* KeyCode.Alt */) {
            // do not hide hover when Ctrl/Meta is pressed, and alt is handled separately
            this.hideHoverWidget();
        }
    }
    // end hover business
    // exception widget
    async toggleExceptionWidget() {
        // Toggles exception widget based on the state of the current editor model and debug stack frame
        const model = this.editor.getModel();
        const focusedSf = this.debugService.getViewModel().focusedStackFrame;
        const callStack = focusedSf ? focusedSf.thread.getCallStack() : null;
        if (!model || !focusedSf || !callStack || callStack.length === 0) {
            this.closeExceptionWidget();
            return;
        }
        // First call stack frame that is available is the frame where exception has been thrown
        const exceptionSf = callStack.find((sf) => !!(sf && sf.source && sf.source.available && sf.source.presentationHint !== 'deemphasize'));
        if (!exceptionSf || exceptionSf !== focusedSf) {
            this.closeExceptionWidget();
            return;
        }
        const sameUri = this.uriIdentityService.extUri.isEqual(exceptionSf.source.uri, model.uri);
        if (this.exceptionWidget && !sameUri) {
            this.closeExceptionWidget();
        }
        else if (sameUri) {
            const exceptionInfo = await focusedSf.thread.exceptionInfo;
            if (exceptionInfo) {
                this.showExceptionWidget(exceptionInfo, this.debugService.getViewModel().focusedSession, exceptionSf.range.startLineNumber, exceptionSf.range.startColumn);
            }
        }
    }
    showExceptionWidget(exceptionInfo, debugSession, lineNumber, column) {
        if (this.exceptionWidget) {
            this.exceptionWidget.dispose();
        }
        this.exceptionWidget = this.instantiationService.createInstance(ExceptionWidget, this.editor, exceptionInfo, debugSession);
        this.exceptionWidget.show({ lineNumber, column }, 0);
        this.exceptionWidget.focus();
        this.editor.revealRangeInCenter({
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
        });
        this.exceptionWidgetVisible.set(true);
    }
    closeExceptionWidget() {
        if (this.exceptionWidget) {
            const shouldFocusEditor = this.exceptionWidget.hasFocus();
            this.exceptionWidget.dispose();
            this.exceptionWidget = undefined;
            this.exceptionWidgetVisible.set(false);
            if (shouldFocusEditor) {
                this.editor.focus();
            }
        }
    }
    async addLaunchConfiguration() {
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        let configurationsArrayPosition;
        let lastProperty;
        const getConfigurationPosition = () => {
            let depthInArray = 0;
            visit(model.getValue(), {
                onObjectProperty: (property) => {
                    lastProperty = property;
                },
                onArrayBegin: (offset) => {
                    if (lastProperty === 'configurations' && depthInArray === 0) {
                        configurationsArrayPosition = model.getPositionAt(offset + 1);
                    }
                    depthInArray++;
                },
                onArrayEnd: () => {
                    depthInArray--;
                },
            });
        };
        getConfigurationPosition();
        if (!configurationsArrayPosition) {
            // "configurations" array doesn't exist. Add it here.
            const { tabSize, insertSpaces } = model.getOptions();
            const eol = model.getEOL();
            const edit = basename(model.uri.fsPath) === 'launch.json'
                ? setProperty(model.getValue(), ['configurations'], [], { tabSize, insertSpaces, eol })[0]
                : setProperty(model.getValue(), ['launch'], { configurations: [] }, { tabSize, insertSpaces, eol })[0];
            const startPosition = model.getPositionAt(edit.offset);
            const lineNumber = startPosition.lineNumber;
            const range = new Range(lineNumber, startPosition.column, lineNumber, model.getLineMaxColumn(lineNumber));
            model.pushEditOperations(null, [EditOperation.replace(range, edit.content)], () => null);
            // Go through the file again since we've edited it
            getConfigurationPosition();
        }
        if (!configurationsArrayPosition) {
            return;
        }
        this.editor.focus();
        const insertLine = (position) => {
            // Check if there are more characters on a line after a "configurations": [, if yes enter a newline
            if (model.getLineLastNonWhitespaceColumn(position.lineNumber) > position.column) {
                this.editor.setPosition(position);
                CoreEditingCommands.LineBreakInsert.runEditorCommand(null, this.editor, null);
            }
            this.editor.setPosition(position);
            return this.commandService.executeCommand('editor.action.insertLineAfter');
        };
        await insertLine(configurationsArrayPosition);
        await this.commandService.executeCommand('editor.action.triggerSuggest');
    }
    // Inline Decorations
    get removeInlineValuesScheduler() {
        return new RunOnceScheduler(() => {
            this.displayedStore.clear();
            this.oldDecorations.clear();
        }, 100);
    }
    get updateInlineValuesScheduler() {
        const model = this.editor.getModel();
        return new RunOnceScheduler(async () => await this.updateInlineValueDecorations(this.debugService.getViewModel().focusedStackFrame), model ? this.debounceInfo.get(model) : DEAFULT_INLINE_DEBOUNCE_DELAY);
    }
    async updateInlineValueDecorations(stackFrame) {
        const var_value_format = '{0} = {1}';
        const separator = ', ';
        const model = this.editor.getModel();
        const inlineValuesSetting = this.configurationService.getValue('debug').inlineValues;
        const inlineValuesTurnedOn = inlineValuesSetting === true ||
            inlineValuesSetting === 'on' ||
            (inlineValuesSetting === 'auto' &&
                model &&
                this.languageFeaturesService.inlineValuesProvider.has(model));
        if (!inlineValuesTurnedOn ||
            !model ||
            !stackFrame ||
            model.uri.toString() !== stackFrame.source.uri.toString()) {
            if (!this.removeInlineValuesScheduler.isScheduled()) {
                this.removeInlineValuesScheduler.schedule();
            }
            return;
        }
        this.removeInlineValuesScheduler.cancel();
        this.displayedStore.clear();
        const viewRanges = this.editor.getVisibleRangesPlusViewportAboveBelow();
        let allDecorations;
        const cts = new CancellationTokenSource();
        this.displayedStore.add(toDisposable(() => cts.dispose(true)));
        if (this.languageFeaturesService.inlineValuesProvider.has(model)) {
            const findVariable = async (_key, caseSensitiveLookup) => {
                const scopes = await stackFrame.getMostSpecificScopes(stackFrame.range);
                const key = caseSensitiveLookup ? _key : _key.toLowerCase();
                for (const scope of scopes) {
                    const variables = await scope.getChildren();
                    const found = variables.find((v) => caseSensitiveLookup ? v.name === key : v.name.toLowerCase() === key);
                    if (found) {
                        return found.value;
                    }
                }
                return undefined;
            };
            const ctx = {
                frameId: stackFrame.frameId,
                stoppedLocation: new Range(stackFrame.range.startLineNumber, stackFrame.range.startColumn + 1, stackFrame.range.endLineNumber, stackFrame.range.endColumn + 1),
            };
            const providers = this.languageFeaturesService.inlineValuesProvider.ordered(model).reverse();
            allDecorations = [];
            const lineDecorations = new Map();
            const promises = providers.flatMap((provider) => viewRanges.map((range) => Promise.resolve(provider.provideInlineValues(model, range, ctx, cts.token)).then(async (result) => {
                if (result) {
                    for (const iv of result) {
                        let text = undefined;
                        switch (iv.type) {
                            case 'text':
                                text = iv.text;
                                break;
                            case 'variable': {
                                let va = iv.variableName;
                                if (!va) {
                                    const lineContent = model.getLineContent(iv.range.startLineNumber);
                                    va = lineContent.substring(iv.range.startColumn - 1, iv.range.endColumn - 1);
                                }
                                const value = await findVariable(va, iv.caseSensitiveLookup);
                                if (value) {
                                    text = strings.format(var_value_format, va, value);
                                }
                                break;
                            }
                            case 'expression': {
                                let expr = iv.expression;
                                if (!expr) {
                                    const lineContent = model.getLineContent(iv.range.startLineNumber);
                                    expr = lineContent.substring(iv.range.startColumn - 1, iv.range.endColumn - 1);
                                }
                                if (expr) {
                                    const expression = new Expression(expr);
                                    await expression.evaluate(stackFrame.thread.session, stackFrame, 'watch', true);
                                    if (expression.available) {
                                        text = strings.format(var_value_format, expr, expression.value);
                                    }
                                }
                                break;
                            }
                        }
                        if (text) {
                            const line = iv.range.startLineNumber;
                            let lineSegments = lineDecorations.get(line);
                            if (!lineSegments) {
                                lineSegments = [];
                                lineDecorations.set(line, lineSegments);
                            }
                            if (!lineSegments.some((iv) => iv.text === text)) {
                                // de-dupe
                                lineSegments.push(new InlineSegment(iv.range.startColumn, text));
                            }
                        }
                    }
                }
            }, (err) => {
                onUnexpectedExternalError(err);
            })));
            const startTime = Date.now();
            await Promise.all(promises);
            // update debounce info
            this.updateInlineValuesScheduler.delay = this.debounceInfo.update(model, Date.now() - startTime);
            // sort line segments and concatenate them into a decoration
            lineDecorations.forEach((segments, line) => {
                if (segments.length > 0) {
                    segments = segments.sort((a, b) => a.column - b.column);
                    const text = segments.map((s) => s.text).join(separator);
                    const editorWidth = this.editor.getLayoutInfo().width;
                    const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
                    const viewportMaxCol = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                    allDecorations.push(...createInlineValueDecoration(line, text, 'debug', undefined, viewportMaxCol));
                }
            });
        }
        else {
            // old "one-size-fits-all" strategy
            const scopes = await stackFrame.getMostSpecificScopes(stackFrame.range);
            const scopesWithVariables = await Promise.all(scopes.map(async (scope) => ({ scope, variables: await scope.getChildren() })));
            // Map of inline values per line that's populated in scope order, from
            // narrowest to widest. This is done to avoid duplicating values if
            // they appear in multiple scopes or are shadowed (#129770, #217326)
            const valuesPerLine = new Map();
            for (const { scope, variables } of scopesWithVariables) {
                let scopeRange = new Range(0, 0, stackFrame.range.startLineNumber, stackFrame.range.startColumn);
                if (scope.range) {
                    scopeRange = scopeRange.setStartPosition(scope.range.startLineNumber, scope.range.startColumn);
                }
                const ownRanges = viewRanges.map((r) => r.intersectRanges(scopeRange)).filter(isDefined);
                this._wordToLineNumbersMap ??= new WordsToLineNumbersCache(model);
                for (const range of ownRanges) {
                    this._wordToLineNumbersMap.ensureRangePopulated(range);
                }
                const mapped = createInlineValueDecorationsInsideRange(variables, ownRanges, model, this._wordToLineNumbersMap.value);
                for (const { line, variables } of mapped) {
                    let values = valuesPerLine.get(line);
                    if (!values) {
                        values = new Map();
                        valuesPerLine.set(line, values);
                    }
                    for (const { name, value } of variables) {
                        if (!values.has(name)) {
                            values.set(name, value);
                        }
                    }
                }
            }
            allDecorations = [...valuesPerLine.entries()].flatMap(([line, values]) => {
                const text = [...values].map(([n, v]) => `${n} = ${v}`).join(', ');
                const editorWidth = this.editor.getLayoutInfo().width;
                const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
                const viewportMaxCol = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                return createInlineValueDecoration(line, text, 'debug', undefined, viewportMaxCol);
            });
        }
        if (cts.token.isCancellationRequested) {
            return;
        }
        // If word wrap is on, application of inline decorations may change the scroll position.
        // Ensure the cursor maintains its vertical position relative to the viewport when
        // we apply decorations.
        let preservePosition;
        if (this.editor.getOption(137 /* EditorOption.wordWrap */) !== 'off') {
            const position = this.editor.getPosition();
            if (position && this.editor.getVisibleRanges().some((r) => r.containsPosition(position))) {
                preservePosition = {
                    position,
                    top: this.editor.getTopForPosition(position.lineNumber, position.column),
                };
            }
        }
        this.oldDecorations.set(allDecorations);
        if (preservePosition) {
            const top = this.editor.getTopForPosition(preservePosition.position.lineNumber, preservePosition.position.column);
            this.editor.setScrollTop(this.editor.getScrollTop() - (preservePosition.top - top), 1 /* ScrollType.Immediate */);
        }
    }
    dispose() {
        if (this.hoverWidget) {
            this.hoverWidget.dispose();
        }
        if (this.configurationWidget) {
            this.configurationWidget.dispose();
        }
        this.toDispose = dispose(this.toDispose);
    }
};
__decorate([
    memoize
], DebugEditorContribution.prototype, "showHoverScheduler", null);
__decorate([
    memoize
], DebugEditorContribution.prototype, "removeInlineValuesScheduler", null);
__decorate([
    memoize
], DebugEditorContribution.prototype, "updateInlineValuesScheduler", null);
DebugEditorContribution = __decorate([
    __param(1, IDebugService),
    __param(2, IInstantiationService),
    __param(3, ICommandService),
    __param(4, IConfigurationService),
    __param(5, IHostService),
    __param(6, IUriIdentityService),
    __param(7, IContextKeyService),
    __param(8, ILanguageFeaturesService),
    __param(9, ILanguageFeatureDebounceService)
], DebugEditorContribution);
export { DebugEditorContribution };
class WordsToLineNumbersCache {
    constructor(model) {
        this.model = model;
        this.value = new Map();
        this.intervals = new Uint8Array(Math.ceil(model.getLineCount() / 8));
    }
    /** Ensures that variables names in the given range have been identified. */
    ensureRangePopulated(range) {
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
            const bin = lineNumber >> 3; /* Math.floor(i / 8) */
            const bit = 1 << (lineNumber & 0b111); /* 1 << (i % 8) */
            if (!(this.intervals[bin] & bit)) {
                getWordToLineNumbersMap(this.model, lineNumber, this.value);
                this.intervals[bin] |= bit;
            }
        }
    }
}
CommandsRegistry.registerCommand('_executeInlineValueProvider', async (accessor, uri, iRange, context) => {
    assertType(URI.isUri(uri));
    assertType(Range.isIRange(iRange));
    if (!context ||
        typeof context.frameId !== 'number' ||
        !Range.isIRange(context.stoppedLocation)) {
        throw illegalArgument('context');
    }
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        throw illegalArgument('uri');
    }
    const range = Range.lift(iRange);
    const { inlineValuesProvider } = accessor.get(ILanguageFeaturesService);
    const providers = inlineValuesProvider.ordered(model);
    const providerResults = await Promise.all(providers.map((provider) => provider.provideInlineValues(model, range, context, CancellationToken.None)));
    return providerResults.flat().filter(isDefined);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnRWRpdG9yQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFakUsT0FBTyxFQUNOLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBV2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBSWxGLE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBRU4sK0JBQStCLEdBQy9CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBSzNHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUNOLGdDQUFnQyxFQUdoQyxhQUFhLEdBTWIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQSxDQUFDLHFGQUFxRjtBQUN2SCxNQUFNLDJCQUEyQixHQUFHLEdBQUcsQ0FBQSxDQUFDLHNGQUFzRjtBQUM5SCxNQUFNLHlCQUF5QixHQUFHLEdBQUcsQ0FBQSxDQUFDLG1FQUFtRTtBQUV6RyxNQUFNLDZCQUE2QixHQUFHLEdBQUcsQ0FBQTtBQUV6QyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQ2pELCtCQUErQixFQUMvQjtJQUNDLElBQUksRUFBRSxXQUFXO0lBQ2pCLEtBQUssRUFBRSxXQUFXO0lBQ2xCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE9BQU8sRUFBRSxXQUFXO0NBQ3BCLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx3Q0FBd0MsQ0FBQyxDQUN2RixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsYUFBYSxDQUNqRCwrQkFBK0IsRUFDL0IsV0FBVyxFQUNYLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsOENBQThDLENBQUMsQ0FDN0YsQ0FBQTtBQUVELE1BQU0sYUFBYTtJQUNsQixZQUNRLE1BQWMsRUFDZCxJQUFZO1FBRFosV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVE7SUFDakIsQ0FBQztDQUNKO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFdBQW1CO0lBQ3JELElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDNUQscUZBQXFGO1FBQ3JGLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBWSxFQUFZLEVBQUU7WUFDOUMsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1lBQzNCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtZQUNuQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDYixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDckIsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ3ZCLFdBQVcsRUFBRSxDQUFBO3dCQUNiLFNBQVE7b0JBQ1QsQ0FBQztvQkFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDM0MsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLElBQUksVUFBVSxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUM5QyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO3dCQUN2QixLQUFLLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQTtvQkFDdkIsQ0FBQztvQkFDRCxXQUFXLEVBQUUsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtZQUMzQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDVCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7Z0JBQzVDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsQ0FBQztZQUNELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDdEMsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQyxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN6QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLElBQUksV0FBVyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDckQsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN6RSxDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBQ0QsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7QUFDN0QsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsVUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsZUFBdUIsRUFDdkIsTUFBTSxvREFBbUMsRUFDekMsaUJBQXlCLDJCQUEyQjtJQUVwRCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUEsQ0FBQyxtQ0FBbUM7SUFFL0QsNkRBQTZEO0lBQzdELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxjQUFjLEVBQUUsQ0FBQztRQUN6QyxXQUFXLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsS0FBSyxDQUFBO0lBQy9ELENBQUM7SUFFRCxPQUFPO1FBQ047WUFDQyxLQUFLLEVBQUU7Z0JBQ04sZUFBZSxFQUFFLFVBQVU7Z0JBQzNCLGFBQWEsRUFBRSxVQUFVO2dCQUN6QixXQUFXLEVBQUUsTUFBTTtnQkFDbkIsU0FBUyxFQUFFLE1BQU07YUFDakI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1IsV0FBVyxFQUFFLEdBQUcsZUFBZSxpQ0FBaUM7Z0JBQ2hFLEtBQUssRUFBRTtvQkFDTixPQUFPLEVBQUUsT0FBTyxDQUFDLGlCQUFpQjtvQkFDbEMsV0FBVyxFQUFFLHVCQUF1QixDQUFDLElBQUk7aUJBQ3pDO2dCQUNELGVBQWUsRUFBRSxJQUFJO2FBQ3JCO1NBQ0Q7UUFDRDtZQUNDLEtBQUssRUFBRTtnQkFDTixlQUFlLEVBQUUsVUFBVTtnQkFDM0IsYUFBYSxFQUFFLFVBQVU7Z0JBQ3pCLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixTQUFTLEVBQUUsTUFBTTthQUNqQjtZQUNELE9BQU8sRUFBRTtnQkFDUixXQUFXLEVBQUUsR0FBRyxlQUFlLDBCQUEwQjtnQkFDekQsS0FBSyxFQUFFO29CQUNOLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxXQUFXLENBQUM7b0JBQzVDLGVBQWUsRUFBRSxHQUFHLGVBQWUsZUFBZTtvQkFDbEQsbUNBQW1DLEVBQUUsSUFBSTtvQkFDekMsV0FBVyxFQUFFLHVCQUF1QixDQUFDLElBQUk7aUJBQ3pDO2dCQUNELGVBQWUsRUFBRSxJQUFJO2dCQUNyQixZQUFZLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxDQUFDO2FBQ3pDO1NBQ0Q7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsR0FBVztJQUMxQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQzFELENBQUM7QUFFRCxTQUFTLHVDQUF1QyxDQUMvQyxXQUF1QyxFQUN2QyxNQUFlLEVBQ2YsS0FBaUIsRUFDakIsb0JBQTJDO0lBRTNDLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBQzlDLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFLENBQUM7UUFDaEMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QywwREFBMEQ7UUFDMUQsSUFBSSxZQUFZLENBQUMsSUFBSSxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDaEQsTUFBSztRQUNOLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxjQUFjLEdBQTBCLElBQUksR0FBRyxFQUFvQixDQUFBO0lBRXpFLDJDQUEyQztJQUMzQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxlQUFlLElBQUksVUFBVSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29CQUMxRixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUNyQyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQTtvQkFDbkMsQ0FBQztvQkFFRCxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQzFELGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUMzQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsbUNBQW1DO0lBQ25DLE9BQU8sQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELElBQUk7UUFDSixTQUFTLEVBQUUsS0FBSzthQUNkLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN2QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hELENBQUMsQ0FBQzthQUNELEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsRUFBRSxDQUFDLENBQUM7S0FDM0QsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FDL0IsS0FBaUIsRUFDakIsVUFBa0IsRUFDbEIsTUFBNkI7SUFFN0IsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNsRCx5Q0FBeUM7SUFDekMsSUFBSSxVQUFVLEdBQUcseUJBQXlCLEVBQUUsQ0FBQztRQUM1QyxPQUFNO0lBQ1AsQ0FBQztJQUVELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDcEQsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNoRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMvRCxLQUNDLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxVQUFVLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxFQUN0RCxVQUFVLEdBQUcsVUFBVSxFQUN2QixVQUFVLEVBQUUsRUFDWCxDQUFDO1FBQ0YsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTdELG9DQUFvQztRQUNwQyxJQUFJLFNBQVMsb0NBQTRCLEVBQUUsQ0FBQztZQUMzQyxtQkFBbUIsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBLENBQUMsK0RBQStEO1lBRWpHLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5RCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzFELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDeEUsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRXBELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN2QixNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDckIsQ0FBQztnQkFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRU0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFvQm5DLFlBQ1MsTUFBbUIsRUFDWixZQUE0QyxFQUNwQyxvQkFBNEQsRUFDbEUsY0FBZ0QsRUFDMUMsb0JBQTRELEVBQ3JFLFdBQTBDLEVBQ25DLGtCQUF3RCxFQUN6RCxpQkFBcUMsRUFDL0IsdUJBQWtFLEVBQzNELHNCQUF1RDtRQVRoRixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ0ssaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNqRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDekIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNwRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNsQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBRWxDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUF6QnJGLGNBQVMsR0FBRyxLQUFLLENBQUE7UUFFakIsb0JBQWUsR0FBRyxLQUFLLENBQUE7UUFJZCxnQkFBVyxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUM5QyxlQUFVLEdBQUcsS0FBSyxDQUFBO1FBRVQsbUJBQWMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBSXZELHNGQUFzRjtRQUNyRSx3QkFBbUIsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7UUFjN0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDL0QsSUFBSSxDQUFDLFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQzdDLHVCQUF1QixDQUFDLG9CQUFvQixFQUM1QyxjQUFjLEVBQ2QsRUFBRSxHQUFHLEVBQUUsNkJBQTZCLEVBQUUsQ0FDdEMsQ0FBQTtRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsc0JBQXNCLEdBQUcsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7SUFDN0IsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSxDQUFDLFlBQVk7YUFDZixZQUFZLEVBQUU7YUFDZCxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUNuRSxDQUFBO1FBRUQsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQW9CLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM1RSxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDNUUsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQTJCLEVBQUUsRUFBRTtZQUN4RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ2xELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDbkIsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUNqRCwrRkFBK0Y7WUFDL0YsSUFDQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSTtnQkFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUs7Z0JBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHO2dCQUN2QixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxFQUN6QixDQUFDO2dCQUNGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBaUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3hDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUE7WUFDdEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSxDQUFDLFlBQVk7YUFDZixZQUFZLEVBQUU7YUFDZCxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDdEUsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsWUFBWTthQUNmLFlBQVksRUFBRTthQUNkLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUNoRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdkMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDNUIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUE7WUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQTtZQUNyRSxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNwRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUV0Qiw4REFBOEQ7WUFDOUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNwQyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUM1QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN4RCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBWSxFQUFFLEVBQUU7WUFDbkQsSUFBSSxLQUFLLDBCQUFrQixFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUlPLHdCQUF3QjtRQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDM0QsY0FBYyxFQUNkO2dCQUNDLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDbkIsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRTthQUN6QyxDQUNELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGlCQUFpQixDQUFBO1FBQ3JFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDcEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLFVBQW1DO1FBQ3BGLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5RixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLGFBQWEsQ0FBQTtRQUVyRSx3RkFBd0Y7UUFDeEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcscUJBQXFCLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ3pGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNyRSxJQUFJLHFCQUFxQixDQUFDLE9BQU8sd0JBQWdCLEVBQUUsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7Z0JBQ3RCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtnQkFDekQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDdkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUVoQyxJQUFJLG9CQUFvQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDaEQsdUdBQXVHO29CQUN2RyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUN6RCxDQUFDO2dCQUVELE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFDdEQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFDakMsT0FBTyxDQUFDLEtBQUssQ0FDYixDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7b0JBQ2hCLElBQUkscUJBQXFCLEdBQUcsU0FBUyxDQUFBO29CQUNyQyxJQUFJLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUNqQyxxQkFBcUIsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUM5RCxDQUFDO29CQUNELElBQUksQ0FBQyxxQkFBcUIsSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLHdCQUFnQixFQUFFLENBQUM7d0JBQzdFLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO3dCQUN2QixJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTt3QkFDaEMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO3dCQUNsQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQ2xCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFrQixFQUFFLEtBQWMsRUFBRSxVQUF3QjtRQUMzRSxrR0FBa0c7UUFDbEcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFFaEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQTtRQUM3RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLElBQUksRUFBRSxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDekUsSUFBSSxNQUFNLCtDQUF1QyxFQUFFLENBQUM7Z0JBQ25ELHdEQUF3RDtnQkFDeEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbEYsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDbEQsc0JBQXNCLENBQUMsRUFBRSxDQUN6QixDQUFBO1FBQ0QsZUFBZSxFQUFFLGdCQUFnQixFQUFFLENBQUE7UUFFbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEdBQUc7WUFDaEMsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztvQkFDekIsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLElBQUksSUFBSSxFQUFFO2lCQUM1RCxDQUFDLENBQUE7WUFDSCxDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsUUFBa0IsRUFBRSxLQUFjO1FBQ3pELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUNsRCxzQkFBc0IsQ0FBQyxFQUFFLENBQ3pCLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sRUFDZixRQUFRLENBQUMsVUFBVSxFQUNuQixRQUFRLENBQUMsTUFBTSxDQUNmLENBQUE7UUFDRCx3RUFBd0U7UUFDeEUsNERBQTREO1FBQzVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNoQyxlQUFlLEVBQUUsZ0JBQWdCLENBQ2hDLEtBQUssb0VBR0wsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLEVBQTJCO1FBQzFELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDcEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDdEMsSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzVFLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDbkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxJQUFZLFVBQVU7UUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssSUFBSSxDQUFDLENBQUE7UUFFckQsdUVBQXVFO1FBQ3ZFLDBFQUEwRTtRQUMxRSxpREFBaUQ7UUFDakQseUNBQXlDO1FBQ3pDLHlDQUF5QztRQUN6Qyx5Q0FBeUM7UUFDekMsMENBQTBDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxPQUFPLFNBQVMsR0FBRyxXQUFXLENBQUE7SUFDL0IsQ0FBQztJQUdELElBQVksa0JBQWtCO1FBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzNDLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3RSxDQUFDO1FBQ0YsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUU5QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sZUFBZTtRQUN0QixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hCLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxpQkFBaUI7SUFFVCxpQkFBaUIsQ0FBQyxVQUE2QjtRQUN0RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUNyQixJQUNDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSwyQ0FBbUM7WUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsRUFBRSxFQUMvQyxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFVBQTZCO1FBQ3RELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLDBCQUFrQixFQUFFLENBQUM7WUFDL0MsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBRXZELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsSUFBSSxNQUFNLENBQUMsSUFBSSxnREFBd0MsRUFBRSxDQUFDO2dCQUN6RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQzVCLENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFBO2dCQUM1QixJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQ0MsQ0FBQyxNQUFNLENBQUMsSUFBSSwyQ0FBbUMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUN6RixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQzlFLENBQUM7WUFDRiwyQ0FBMkM7WUFFM0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUE7WUFDdEQsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ25GLE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLElBQUkseUNBQWlDLEVBQUUsQ0FBQztZQUNsRCxJQUNDLE1BQU0sQ0FBQyxRQUFRO2dCQUNmLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsUUFBUSxJQUFJLElBQUksQ0FBQztnQkFDdkUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQy9FLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQzNFLGtFQUFrRTtnQkFDbEUsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2xELENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM1QiwwR0FBMEc7WUFDMUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRU8sU0FBUyxDQUFDLENBQWlCO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyx1QkFBYyxDQUFDLHFCQUFhLENBQUE7UUFDN0QsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyx3QkFBZ0IsRUFBRSxDQUFDO1lBQ3hELDZFQUE2RTtZQUM3RSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFDRCxxQkFBcUI7SUFFckIsbUJBQW1CO0lBQ1gsS0FBSyxDQUFDLHFCQUFxQjtRQUNsQyxnR0FBZ0c7UUFDaEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGlCQUFpQixDQUFBO1FBQ3BFLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ3BFLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUVELHdGQUF3RjtRQUN4RixNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUNqQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ04sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsS0FBSyxhQUFhLENBQUMsQ0FDM0YsQ0FBQTtRQUNELElBQUksQ0FBQyxXQUFXLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1lBQzNCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pGLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzVCLENBQUM7YUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3BCLE1BQU0sYUFBYSxHQUFHLE1BQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUE7WUFDMUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLG1CQUFtQixDQUN2QixhQUFhLEVBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQy9DLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNqQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDN0IsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQixDQUMxQixhQUE2QixFQUM3QixZQUF1QyxFQUN2QyxVQUFrQixFQUNsQixNQUFjO1FBRWQsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5RCxlQUFlLEVBQ2YsSUFBSSxDQUFDLE1BQU0sRUFDWCxhQUFhLEVBQ2IsWUFBWSxDQUNaLENBQUE7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUM7WUFDL0IsZUFBZSxFQUFFLFVBQVU7WUFDM0IsV0FBVyxFQUFFLE1BQU07WUFDbkIsYUFBYSxFQUFFLFVBQVU7WUFDekIsU0FBUyxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzlCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1lBQ2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0I7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksMkJBQWlELENBQUE7UUFDckQsSUFBSSxZQUFvQixDQUFBO1FBRXhCLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxFQUFFO1lBQ3JDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTtZQUNwQixLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUN2QixnQkFBZ0IsRUFBRSxDQUFDLFFBQWdCLEVBQUUsRUFBRTtvQkFDdEMsWUFBWSxHQUFHLFFBQVEsQ0FBQTtnQkFDeEIsQ0FBQztnQkFDRCxZQUFZLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtvQkFDaEMsSUFBSSxZQUFZLEtBQUssZ0JBQWdCLElBQUksWUFBWSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUM3RCwyQkFBMkIsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDOUQsQ0FBQztvQkFDRCxZQUFZLEVBQUUsQ0FBQTtnQkFDZixDQUFDO2dCQUNELFVBQVUsRUFBRSxHQUFHLEVBQUU7b0JBQ2hCLFlBQVksRUFBRSxDQUFBO2dCQUNmLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFFRCx3QkFBd0IsRUFBRSxDQUFBO1FBRTFCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQ2xDLHFEQUFxRDtZQUNyRCxNQUFNLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUNwRCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDMUIsTUFBTSxJQUFJLEdBQ1QsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssYUFBYTtnQkFDM0MsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFGLENBQUMsQ0FBQyxXQUFXLENBQ1gsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUNoQixDQUFDLFFBQVEsQ0FBQyxFQUNWLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxFQUN0QixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDUCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0RCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFBO1lBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUN0QixVQUFVLEVBQ1YsYUFBYSxDQUFDLE1BQU0sRUFDcEIsVUFBVSxFQUNWLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FDbEMsQ0FBQTtZQUNELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN4RixrREFBa0Q7WUFDbEQsd0JBQXdCLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBQ0QsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7WUFDbEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRW5CLE1BQU0sVUFBVSxHQUFHLENBQUMsUUFBa0IsRUFBZ0IsRUFBRTtZQUN2RCxtR0FBbUc7WUFDbkcsSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDakMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQzNFLENBQUMsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDN0MsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxxQkFBcUI7SUFHckIsSUFBWSwyQkFBMkI7UUFDdEMsT0FBTyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzNCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDNUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ1IsQ0FBQztJQUdELElBQVksMkJBQTJCO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDcEMsT0FBTyxJQUFJLGdCQUFnQixDQUMxQixLQUFLLElBQUksRUFBRSxDQUNWLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFDNUYsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQ3BFLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLDRCQUE0QixDQUFDLFVBQW1DO1FBQzdFLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFBO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQTtRQUV0QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLE1BQU0sbUJBQW1CLEdBQ3hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQTtRQUM5RSxNQUFNLG9CQUFvQixHQUN6QixtQkFBbUIsS0FBSyxJQUFJO1lBQzVCLG1CQUFtQixLQUFLLElBQUk7WUFDNUIsQ0FBQyxtQkFBbUIsS0FBSyxNQUFNO2dCQUM5QixLQUFLO2dCQUNMLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxJQUNDLENBQUMsb0JBQW9CO1lBQ3JCLENBQUMsS0FBSztZQUNOLENBQUMsVUFBVTtZQUNYLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQ3hELENBQUM7WUFDRixJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUM1QyxDQUFDO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDekMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUUzQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLHNDQUFzQyxFQUFFLENBQUE7UUFDdkUsSUFBSSxjQUF1QyxDQUFBO1FBRTNDLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEUsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUN6QixJQUFZLEVBQ1osbUJBQTRCLEVBQ0UsRUFBRTtnQkFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN2RSxNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQzNELEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQzVCLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFBO29CQUMzQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLEdBQUcsQ0FDbkUsQ0FBQTtvQkFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQTtvQkFDbkIsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUMsQ0FBQTtZQUVELE1BQU0sR0FBRyxHQUF1QjtnQkFDL0IsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO2dCQUMzQixlQUFlLEVBQUUsSUFBSSxLQUFLLENBQ3pCLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNoQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQ2hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUM5QixVQUFVLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQzlCO2FBQ0QsQ0FBQTtZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7WUFFNUYsY0FBYyxHQUFHLEVBQUUsQ0FBQTtZQUNuQixNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQTtZQUUxRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDL0MsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3hCLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDL0UsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUNoQixJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxFQUFFLENBQUM7d0JBQ3pCLElBQUksSUFBSSxHQUF1QixTQUFTLENBQUE7d0JBQ3hDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNqQixLQUFLLE1BQU07Z0NBQ1YsSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUE7Z0NBQ2QsTUFBSzs0QkFDTixLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0NBQ2pCLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUE7Z0NBQ3hCLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQ0FDVCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7b0NBQ2xFLEVBQUUsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQ0FDN0UsQ0FBQztnQ0FDRCxNQUFNLEtBQUssR0FBRyxNQUFNLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUE7Z0NBQzVELElBQUksS0FBSyxFQUFFLENBQUM7b0NBQ1gsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dDQUNuRCxDQUFDO2dDQUNELE1BQUs7NEJBQ04sQ0FBQzs0QkFDRCxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0NBQ25CLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUE7Z0NBQ3hCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQ0FDWCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7b0NBQ2xFLElBQUksR0FBRyxXQUFXLENBQUMsU0FBUyxDQUMzQixFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQ3hCLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FDdEIsQ0FBQTtnQ0FDRixDQUFDO2dDQUNELElBQUksSUFBSSxFQUFFLENBQUM7b0NBQ1YsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7b0NBQ3ZDLE1BQU0sVUFBVSxDQUFDLFFBQVEsQ0FDeEIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQ3pCLFVBQVUsRUFDVixPQUFPLEVBQ1AsSUFBSSxDQUNKLENBQUE7b0NBQ0QsSUFBSSxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7d0NBQzFCLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7b0NBQ2hFLENBQUM7Z0NBQ0YsQ0FBQztnQ0FDRCxNQUFLOzRCQUNOLENBQUM7d0JBQ0YsQ0FBQzt3QkFFRCxJQUFJLElBQUksRUFBRSxDQUFDOzRCQUNWLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFBOzRCQUNyQyxJQUFJLFlBQVksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBOzRCQUM1QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0NBQ25CLFlBQVksR0FBRyxFQUFFLENBQUE7Z0NBQ2pCLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFBOzRCQUN4QyxDQUFDOzRCQUNELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7Z0NBQ2xELFVBQVU7Z0NBQ1YsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBOzRCQUNqRSxDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ1AseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDL0IsQ0FBQyxDQUNELENBQ0QsQ0FDRCxDQUFBO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBRTVCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUzQix1QkFBdUI7WUFDdkIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FDaEUsS0FBSyxFQUNMLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQ3RCLENBQUE7WUFFRCw0REFBNEQ7WUFFNUQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDMUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN6QixRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUN2RCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUN4RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQTtvQkFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLGdDQUF1QixDQUFBO29CQUM3RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUNoQyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsOEJBQThCLENBQzVELENBQUE7b0JBQ0QsY0FBYyxDQUFDLElBQUksQ0FDbEIsR0FBRywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQzlFLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxtQ0FBbUM7WUFFbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3ZFLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUM1QyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUM5RSxDQUFBO1lBRUQsc0VBQXNFO1lBQ3RFLG1FQUFtRTtZQUNuRSxvRUFBb0U7WUFDcEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWdFLENBQUE7WUFFN0YsS0FBSyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3hELElBQUksVUFBVSxHQUFHLElBQUksS0FBSyxDQUN6QixDQUFDLEVBQ0QsQ0FBQyxFQUNELFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNoQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDNUIsQ0FBQTtnQkFDRCxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDakIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FDdkMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQzNCLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUN2QixDQUFBO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDeEYsSUFBSSxDQUFDLHFCQUFxQixLQUFLLElBQUksdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2pFLEtBQUssTUFBTSxLQUFLLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQy9CLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdkQsQ0FBQztnQkFFRCxNQUFNLE1BQU0sR0FBRyx1Q0FBdUMsQ0FDckQsU0FBUyxFQUNULFNBQVMsRUFDVCxLQUFLLEVBQ0wsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FDaEMsQ0FBQTtnQkFDRCxLQUFLLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQzFDLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3BDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDYixNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7d0JBQ2xDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO29CQUNoQyxDQUFDO29CQUVELEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7d0JBQ3hCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELGNBQWMsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRTtnQkFDeEUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUE7Z0JBQ3JELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxnQ0FBdUIsQ0FBQTtnQkFDN0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDaEMsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixDQUM1RCxDQUFBO2dCQUNELE9BQU8sMkJBQTJCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ25GLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3ZDLE9BQU07UUFDUCxDQUFDO1FBRUQsd0ZBQXdGO1FBQ3hGLGtGQUFrRjtRQUNsRix3QkFBd0I7UUFDeEIsSUFBSSxnQkFBaUUsQ0FBQTtRQUNyRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxpQ0FBdUIsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQzFDLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFGLGdCQUFnQixHQUFHO29CQUNsQixRQUFRO29CQUNSLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQztpQkFDeEUsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFdkMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQ3hDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQ3BDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQ2hDLENBQUE7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsK0JBRXpELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzNCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7Q0FDRCxDQUFBO0FBamhCQTtJQURDLE9BQU87aUVBVVA7QUF5T0Q7SUFEQyxPQUFPOzBFQU1QO0FBR0Q7SUFEQyxPQUFPOzBFQVFQO0FBamlCVyx1QkFBdUI7SUFzQmpDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLCtCQUErQixDQUFBO0dBOUJyQix1QkFBdUIsQ0FpekJuQzs7QUFFRCxNQUFNLHVCQUF1QjtJQUs1QixZQUE2QixLQUFpQjtRQUFqQixVQUFLLEdBQUwsS0FBSyxDQUFZO1FBRjlCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtRQUdsRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVELDRFQUE0RTtJQUNyRSxvQkFBb0IsQ0FBQyxLQUFZO1FBQ3ZDLEtBQUssSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLGVBQWUsRUFBRSxVQUFVLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzlGLE1BQU0sR0FBRyxHQUFHLFVBQVUsSUFBSSxDQUFDLENBQUEsQ0FBQyx1QkFBdUI7WUFDbkQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFBLENBQUMsa0JBQWtCO1lBQ3hELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FDL0IsNkJBQTZCLEVBQzdCLEtBQUssRUFDSixRQUEwQixFQUMxQixHQUFRLEVBQ1IsTUFBYyxFQUNkLE9BQTJCLEVBQ0ssRUFBRTtJQUNsQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzFCLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFFbEMsSUFDQyxDQUFDLE9BQU87UUFDUixPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUTtRQUNuQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUN2QyxDQUFDO1FBQ0YsTUFBTSxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3ZELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE1BQU0sZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hDLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN2RSxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckQsTUFBTSxlQUFlLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUN4QyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDMUIsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUMzRSxDQUNELENBQUE7SUFDRCxPQUFPLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDaEQsQ0FBQyxDQUNELENBQUEifQ==