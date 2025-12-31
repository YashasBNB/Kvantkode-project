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
var InlayHintsController_1;
import { isHTMLElement, ModifierKeyEmitter } from '../../../../base/browser/dom.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { DynamicCssRules } from '../../../browser/editorDom.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import * as languages from '../../../common/languages.js';
import { InjectedTextCursorStops, } from '../../../common/model.js';
import { ModelDecorationInjectedTextOptions } from '../../../common/model/textModel.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { ClickLinkGesture, } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { InlayHintAnchor, InlayHintsFragments } from './inlayHints.js';
import { goToDefinitionWithLocation, showGoToContextMenu } from './inlayHintsLocations.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import * as colors from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
// --- hint caching service (per session)
class InlayHintsCache {
    constructor() {
        this._entries = new LRUCache(50);
    }
    get(model) {
        const key = InlayHintsCache._key(model);
        return this._entries.get(key);
    }
    set(model, value) {
        const key = InlayHintsCache._key(model);
        this._entries.set(key, value);
    }
    static _key(model) {
        return `${model.uri.toString()}/${model.getVersionId()}`;
    }
}
const IInlayHintsCache = createDecorator('IInlayHintsCache');
registerSingleton(IInlayHintsCache, InlayHintsCache, 1 /* InstantiationType.Delayed */);
// --- rendered label
export class RenderedInlayHintLabelPart {
    constructor(item, index) {
        this.item = item;
        this.index = index;
    }
    get part() {
        const label = this.item.hint.label;
        if (typeof label === 'string') {
            return { label };
        }
        else {
            return label[this.index];
        }
    }
}
class ActiveInlayHintInfo {
    constructor(part, hasTriggerModifier) {
        this.part = part;
        this.hasTriggerModifier = hasTriggerModifier;
    }
}
var RenderMode;
(function (RenderMode) {
    RenderMode[RenderMode["Normal"] = 0] = "Normal";
    RenderMode[RenderMode["Invisible"] = 1] = "Invisible";
})(RenderMode || (RenderMode = {}));
// --- controller
let InlayHintsController = class InlayHintsController {
    static { InlayHintsController_1 = this; }
    static { this.ID = 'editor.contrib.InlayHints'; }
    static { this._MAX_DECORATORS = 1500; }
    static { this._whitespaceData = {}; }
    static get(editor) {
        return editor.getContribution(InlayHintsController_1.ID) ?? undefined;
    }
    constructor(_editor, _languageFeaturesService, _featureDebounce, _inlayHintsCache, _commandService, _notificationService, _instaService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._inlayHintsCache = _inlayHintsCache;
        this._commandService = _commandService;
        this._notificationService = _notificationService;
        this._instaService = _instaService;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._decorationsMetadata = new Map();
        this._ruleFactory = new DynamicCssRules(this._editor);
        this._activeRenderMode = 0 /* RenderMode.Normal */;
        this._debounceInfo = _featureDebounce.for(_languageFeaturesService.inlayHintsProvider, 'InlayHint', { min: 25 });
        this._disposables.add(_languageFeaturesService.inlayHintsProvider.onDidChange(() => this._update()));
        this._disposables.add(_editor.onDidChangeModel(() => this._update()));
        this._disposables.add(_editor.onDidChangeModelLanguage(() => this._update()));
        this._disposables.add(_editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(146 /* EditorOption.inlayHints */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        this._sessionDisposables.dispose();
        this._removeAllDecorations();
        this._disposables.dispose();
    }
    _update() {
        this._sessionDisposables.clear();
        this._removeAllDecorations();
        const options = this._editor.getOption(146 /* EditorOption.inlayHints */);
        if (options.enabled === 'off') {
            return;
        }
        const model = this._editor.getModel();
        if (!model || !this._languageFeaturesService.inlayHintsProvider.has(model)) {
            return;
        }
        if (options.enabled === 'on') {
            // different "on" modes: always
            this._activeRenderMode = 0 /* RenderMode.Normal */;
        }
        else {
            // different "on" modes: offUnlessPressed, or onUnlessPressed
            let defaultMode;
            let altMode;
            if (options.enabled === 'onUnlessPressed') {
                defaultMode = 0 /* RenderMode.Normal */;
                altMode = 1 /* RenderMode.Invisible */;
            }
            else {
                defaultMode = 1 /* RenderMode.Invisible */;
                altMode = 0 /* RenderMode.Normal */;
            }
            this._activeRenderMode = defaultMode;
            this._sessionDisposables.add(ModifierKeyEmitter.getInstance().event((e) => {
                if (!this._editor.hasModel()) {
                    return;
                }
                const newRenderMode = e.altKey && e.ctrlKey && !(e.shiftKey || e.metaKey) ? altMode : defaultMode;
                if (newRenderMode !== this._activeRenderMode) {
                    this._activeRenderMode = newRenderMode;
                    const model = this._editor.getModel();
                    const copies = this._copyInlayHintsWithCurrentAnchor(model);
                    this._updateHintsDecorators([model.getFullModelRange()], copies);
                    scheduler.schedule(0);
                }
            }));
        }
        // iff possible, quickly update from cache
        const cached = this._inlayHintsCache.get(model);
        if (cached) {
            this._updateHintsDecorators([model.getFullModelRange()], cached);
        }
        this._sessionDisposables.add(toDisposable(() => {
            // cache items when switching files etc
            if (!model.isDisposed()) {
                this._cacheHintsForFastRestore(model);
            }
        }));
        let cts;
        const watchedProviders = new Set();
        const scheduler = new RunOnceScheduler(async () => {
            const t1 = Date.now();
            cts?.dispose(true);
            cts = new CancellationTokenSource();
            const listener = model.onWillDispose(() => cts?.cancel());
            try {
                const myToken = cts.token;
                const inlayHints = await InlayHintsFragments.create(this._languageFeaturesService.inlayHintsProvider, model, this._getHintsRanges(), myToken);
                scheduler.delay = this._debounceInfo.update(model, Date.now() - t1);
                if (myToken.isCancellationRequested) {
                    inlayHints.dispose();
                    return;
                }
                // listen to provider changes
                for (const provider of inlayHints.provider) {
                    if (typeof provider.onDidChangeInlayHints === 'function' &&
                        !watchedProviders.has(provider)) {
                        watchedProviders.add(provider);
                        this._sessionDisposables.add(provider.onDidChangeInlayHints(() => {
                            if (!scheduler.isScheduled()) {
                                // ignore event when request is already scheduled
                                scheduler.schedule();
                            }
                        }));
                    }
                }
                this._sessionDisposables.add(inlayHints);
                this._updateHintsDecorators(inlayHints.ranges, inlayHints.items);
                this._cacheHintsForFastRestore(model);
            }
            catch (err) {
                onUnexpectedError(err);
            }
            finally {
                cts.dispose();
                listener.dispose();
            }
        }, this._debounceInfo.get(model));
        this._sessionDisposables.add(scheduler);
        this._sessionDisposables.add(toDisposable(() => cts?.dispose(true)));
        scheduler.schedule(0);
        this._sessionDisposables.add(this._editor.onDidScrollChange((e) => {
            // update when scroll position changes
            // uses scrollTopChanged has weak heuristic to differenatiate between scrolling due to
            // typing or due to "actual" scrolling
            if (e.scrollTopChanged || !scheduler.isScheduled()) {
                scheduler.schedule();
            }
        }));
        const cursor = this._sessionDisposables.add(new MutableDisposable());
        this._sessionDisposables.add(this._editor.onDidChangeModelContent((e) => {
            cts?.cancel();
            // mark current cursor position and time after which the whole can be updated/redrawn
            const delay = Math.max(scheduler.delay, 800);
            this._cursorInfo = {
                position: this._editor.getPosition(),
                notEarlierThan: Date.now() + delay,
            };
            cursor.value = disposableTimeout(() => scheduler.schedule(0), delay);
            scheduler.schedule();
        }));
        this._sessionDisposables.add(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(146 /* EditorOption.inlayHints */)) {
                scheduler.schedule();
            }
        }));
        // mouse gestures
        this._sessionDisposables.add(this._installDblClickGesture(() => scheduler.schedule(0)));
        this._sessionDisposables.add(this._installLinkGesture());
        this._sessionDisposables.add(this._installContextMenu());
    }
    _installLinkGesture() {
        const store = new DisposableStore();
        const gesture = store.add(new ClickLinkGesture(this._editor));
        // let removeHighlight = () => { };
        const sessionStore = new DisposableStore();
        store.add(sessionStore);
        store.add(gesture.onMouseMoveOrRelevantKeyDown((e) => {
            const [mouseEvent] = e;
            const labelPart = this._getInlayHintLabelPart(mouseEvent);
            const model = this._editor.getModel();
            if (!labelPart || !model) {
                sessionStore.clear();
                return;
            }
            // resolve the item
            const cts = new CancellationTokenSource();
            sessionStore.add(toDisposable(() => cts.dispose(true)));
            labelPart.item.resolve(cts.token);
            // render link => when the modifier is pressed and when there is a command or location
            this._activeInlayHintPart =
                labelPart.part.command || labelPart.part.location
                    ? new ActiveInlayHintInfo(labelPart, mouseEvent.hasTriggerModifier)
                    : undefined;
            const lineNumber = model.validatePosition(labelPart.item.hint.position).lineNumber;
            const range = new Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber));
            const lineHints = this._getInlineHintsForRange(range);
            this._updateHintsDecorators([range], lineHints);
            sessionStore.add(toDisposable(() => {
                this._activeInlayHintPart = undefined;
                this._updateHintsDecorators([range], lineHints);
            }));
        }));
        store.add(gesture.onCancel(() => sessionStore.clear()));
        store.add(gesture.onExecute(async (e) => {
            const label = this._getInlayHintLabelPart(e);
            if (label) {
                const part = label.part;
                if (part.location) {
                    // location -> execute go to def
                    this._instaService.invokeFunction(goToDefinitionWithLocation, e, this._editor, part.location);
                }
                else if (languages.Command.is(part.command)) {
                    // command -> execute it
                    await this._invokeCommand(part.command, label.item);
                }
            }
        }));
        return store;
    }
    _getInlineHintsForRange(range) {
        const lineHints = new Set();
        for (const data of this._decorationsMetadata.values()) {
            if (range.containsRange(data.item.anchor.range)) {
                lineHints.add(data.item);
            }
        }
        return Array.from(lineHints);
    }
    _installDblClickGesture(updateInlayHints) {
        return this._editor.onMouseUp(async (e) => {
            if (e.event.detail !== 2) {
                return;
            }
            const part = this._getInlayHintLabelPart(e);
            if (!part) {
                return;
            }
            e.event.preventDefault();
            await part.item.resolve(CancellationToken.None);
            if (isNonEmptyArray(part.item.hint.textEdits)) {
                const edits = part.item.hint.textEdits.map((edit) => EditOperation.replace(Range.lift(edit.range), edit.text));
                this._editor.executeEdits('inlayHint.default', edits);
                updateInlayHints();
            }
        });
    }
    _installContextMenu() {
        return this._editor.onContextMenu(async (e) => {
            if (!isHTMLElement(e.event.target)) {
                return;
            }
            const part = this._getInlayHintLabelPart(e);
            if (part) {
                await this._instaService.invokeFunction(showGoToContextMenu, this._editor, e.event.target, part);
            }
        });
    }
    _getInlayHintLabelPart(e) {
        if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
            return undefined;
        }
        const options = e.target.detail.injectedText?.options;
        if (options instanceof ModelDecorationInjectedTextOptions &&
            options?.attachedData instanceof RenderedInlayHintLabelPart) {
            return options.attachedData;
        }
        return undefined;
    }
    async _invokeCommand(command, item) {
        try {
            await this._commandService.executeCommand(command.id, ...(command.arguments ?? []));
        }
        catch (err) {
            this._notificationService.notify({
                severity: Severity.Error,
                source: item.provider.displayName,
                message: err,
            });
        }
    }
    _cacheHintsForFastRestore(model) {
        const hints = this._copyInlayHintsWithCurrentAnchor(model);
        this._inlayHintsCache.set(model, hints);
    }
    // return inlay hints but with an anchor that reflects "updates"
    // that happened after receiving them, e.g adding new lines before a hint
    _copyInlayHintsWithCurrentAnchor(model) {
        const items = new Map();
        for (const [id, obj] of this._decorationsMetadata) {
            if (items.has(obj.item)) {
                // an inlay item can be rendered as multiple decorations
                // but they will all uses the same range
                continue;
            }
            const range = model.getDecorationRange(id);
            if (range) {
                // update range with whatever the editor has tweaked it to
                const anchor = new InlayHintAnchor(range, obj.item.anchor.direction);
                const copy = obj.item.with({ anchor });
                items.set(obj.item, copy);
            }
        }
        return Array.from(items.values());
    }
    _getHintsRanges() {
        const extra = 30;
        const model = this._editor.getModel();
        const visibleRanges = this._editor.getVisibleRangesPlusViewportAboveBelow();
        const result = [];
        for (const range of visibleRanges.sort(Range.compareRangesUsingStarts)) {
            const extendedRange = model.validateRange(new Range(range.startLineNumber - extra, range.startColumn, range.endLineNumber + extra, range.endColumn));
            if (result.length === 0 ||
                !Range.areIntersectingOrTouching(result[result.length - 1], extendedRange)) {
                result.push(extendedRange);
            }
            else {
                result[result.length - 1] = Range.plusRange(result[result.length - 1], extendedRange);
            }
        }
        return result;
    }
    _updateHintsDecorators(ranges, items) {
        const itemFixedLengths = new Map();
        if (this._cursorInfo &&
            this._cursorInfo.notEarlierThan > Date.now() &&
            ranges.some((range) => range.containsPosition(this._cursorInfo.position))) {
            // collect inlay hints that are on the same line and before the cursor. Those "old" hints
            // define fixed lengths so that the cursor does not jump back and worth while typing.
            const { position } = this._cursorInfo;
            this._cursorInfo = undefined;
            const lengths = new Map();
            for (const deco of this._editor.getLineDecorations(position.lineNumber) ?? []) {
                const data = this._decorationsMetadata.get(deco.id);
                if (deco.range.startColumn > position.column) {
                    continue;
                }
                const opts = data?.decoration.options[data.item.anchor.direction];
                if (opts && opts.attachedData !== InlayHintsController_1._whitespaceData) {
                    const len = lengths.get(data.item) ?? 0;
                    lengths.set(data.item, len + opts.content.length);
                }
            }
            // on the cursor line and before the cursor-column
            const newItemsWithFixedLength = items.filter((item) => item.anchor.range.startLineNumber === position.lineNumber &&
                item.anchor.range.endColumn <= position.column);
            const fixedLengths = Array.from(lengths.values());
            // match up fixed lengths with items and distribute the remaining lengths to the last item
            let lastItem;
            while (true) {
                const targetItem = newItemsWithFixedLength.shift();
                const fixedLength = fixedLengths.shift();
                if (!fixedLength && !targetItem) {
                    break; // DONE
                }
                if (targetItem) {
                    itemFixedLengths.set(targetItem, fixedLength ?? 0);
                    lastItem = targetItem;
                }
                else if (lastItem && fixedLength) {
                    // still lengths but no more item. give it all to the last
                    let len = itemFixedLengths.get(lastItem);
                    len += fixedLength;
                    len += fixedLengths.reduce((p, c) => p + c, 0);
                    fixedLengths.length = 0;
                    break; // DONE
                }
            }
        }
        // utils to collect/create injected text decorations
        const newDecorationsData = [];
        const addInjectedText = (item, ref, content, cursorStops, attachedData) => {
            const opts = {
                content,
                inlineClassNameAffectsLetterSpacing: true,
                inlineClassName: ref.className,
                cursorStops,
                attachedData,
            };
            newDecorationsData.push({
                item,
                classNameRef: ref,
                decoration: {
                    range: item.anchor.range,
                    options: {
                        // className: "rangeHighlight", // DEBUG highlight to see to what range a hint is attached
                        description: 'InlayHint',
                        showIfCollapsed: item.anchor.range.isEmpty(), // "original" range is empty
                        collapseOnReplaceEdit: !item.anchor.range.isEmpty(),
                        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
                        [item.anchor.direction]: this._activeRenderMode === 0 /* RenderMode.Normal */ ? opts : undefined,
                    },
                },
            });
        };
        const addInjectedWhitespace = (item, isLast) => {
            const marginRule = this._ruleFactory.createClassNameRef({
                width: `${(fontSize / 3) | 0}px`,
                display: 'inline-block',
            });
            addInjectedText(item, marginRule, '\u200a', isLast ? InjectedTextCursorStops.Right : InjectedTextCursorStops.None, InlayHintsController_1._whitespaceData);
        };
        //
        const { fontSize, fontFamily, padding, isUniform } = this._getLayoutInfo();
        const maxLength = this._editor.getOption(146 /* EditorOption.inlayHints */).maximumLength;
        const fontFamilyVar = '--code-editorInlayHintsFontFamily';
        this._editor.getContainerDomNode().style.setProperty(fontFamilyVar, fontFamily);
        let currentLineInfo = { line: 0, totalLen: 0 };
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (currentLineInfo.line !== item.anchor.range.startLineNumber) {
                currentLineInfo = { line: item.anchor.range.startLineNumber, totalLen: 0 };
            }
            if (maxLength && currentLineInfo.totalLen > maxLength) {
                continue;
            }
            // whitespace leading the actual label
            if (item.hint.paddingLeft) {
                addInjectedWhitespace(item, false);
            }
            // the label with its parts
            const parts = typeof item.hint.label === 'string' ? [{ label: item.hint.label }] : item.hint.label;
            const itemFixedLength = itemFixedLengths.get(item);
            let itemActualLength = 0;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFirst = i === 0;
                const isLast = i === parts.length - 1;
                const cssProperties = {
                    fontSize: `${fontSize}px`,
                    fontFamily: `var(${fontFamilyVar}), ${EDITOR_FONT_DEFAULTS.fontFamily}`,
                    verticalAlign: isUniform ? 'baseline' : 'middle',
                    unicodeBidi: 'isolate',
                };
                if (isNonEmptyArray(item.hint.textEdits)) {
                    cssProperties.cursor = 'default';
                }
                this._fillInColors(cssProperties, item.hint);
                if ((part.command || part.location) &&
                    this._activeInlayHintPart?.part.item === item &&
                    this._activeInlayHintPart.part.index === i) {
                    // active link!
                    cssProperties.textDecoration = 'underline';
                    if (this._activeInlayHintPart.hasTriggerModifier) {
                        cssProperties.color = themeColorFromId(colors.editorActiveLinkForeground);
                        cssProperties.cursor = 'pointer';
                    }
                }
                let textlabel = part.label;
                currentLineInfo.totalLen += textlabel.length;
                let tooLong = false;
                const over = maxLength !== 0 ? currentLineInfo.totalLen - maxLength : 0;
                if (over > 0) {
                    textlabel = textlabel.slice(0, -over) + '…';
                    tooLong = true;
                }
                itemActualLength += textlabel.length;
                if (itemFixedLength !== undefined) {
                    const overFixedLength = itemActualLength - itemFixedLength;
                    if (overFixedLength >= 0) {
                        // longer than fixed length, trim
                        itemActualLength -= overFixedLength;
                        textlabel = textlabel.slice(0, -(1 + overFixedLength)) + '…';
                        tooLong = true;
                    }
                }
                if (padding) {
                    if (isFirst && (isLast || tooLong)) {
                        // only element
                        cssProperties.padding = `1px ${Math.max(1, fontSize / 4) | 0}px`;
                        cssProperties.borderRadius = `${(fontSize / 4) | 0}px`;
                    }
                    else if (isFirst) {
                        // first element
                        cssProperties.padding = `1px 0 1px ${Math.max(1, fontSize / 4) | 0}px`;
                        cssProperties.borderRadius = `${(fontSize / 4) | 0}px 0 0 ${(fontSize / 4) | 0}px`;
                    }
                    else if (isLast || tooLong) {
                        // last element
                        cssProperties.padding = `1px ${Math.max(1, fontSize / 4) | 0}px 1px 0`;
                        cssProperties.borderRadius = `0 ${(fontSize / 4) | 0}px ${(fontSize / 4) | 0}px 0`;
                    }
                    else {
                        cssProperties.padding = `1px 0 1px 0`;
                    }
                }
                addInjectedText(item, this._ruleFactory.createClassNameRef(cssProperties), fixSpace(textlabel), isLast && !item.hint.paddingRight
                    ? InjectedTextCursorStops.Right
                    : InjectedTextCursorStops.None, new RenderedInlayHintLabelPart(item, i));
                if (tooLong) {
                    break;
                }
            }
            if (itemFixedLength !== undefined && itemActualLength < itemFixedLength) {
                // shorter than fixed length, pad
                const pad = itemFixedLength - itemActualLength;
                addInjectedText(item, this._ruleFactory.createClassNameRef({}), '\u200a'.repeat(pad), InjectedTextCursorStops.None);
            }
            // whitespace trailing the actual label
            if (item.hint.paddingRight) {
                addInjectedWhitespace(item, true);
            }
            if (newDecorationsData.length > InlayHintsController_1._MAX_DECORATORS) {
                break;
            }
        }
        // collect all decoration ids that are affected by the ranges
        // and only update those decorations
        const decorationIdsToReplace = [];
        for (const [id, metadata] of this._decorationsMetadata) {
            const range = this._editor.getModel()?.getDecorationRange(id);
            if (range && ranges.some((r) => r.containsRange(range))) {
                decorationIdsToReplace.push(id);
                metadata.classNameRef.dispose();
                this._decorationsMetadata.delete(id);
            }
        }
        const scrollState = StableEditorScrollState.capture(this._editor);
        this._editor.changeDecorations((accessor) => {
            const newDecorationIds = accessor.deltaDecorations(decorationIdsToReplace, newDecorationsData.map((d) => d.decoration));
            for (let i = 0; i < newDecorationIds.length; i++) {
                const data = newDecorationsData[i];
                this._decorationsMetadata.set(newDecorationIds[i], data);
            }
        });
        scrollState.restore(this._editor);
    }
    _fillInColors(props, hint) {
        if (hint.kind === languages.InlayHintKind.Parameter) {
            props.backgroundColor = themeColorFromId(colors.editorInlayHintParameterBackground);
            props.color = themeColorFromId(colors.editorInlayHintParameterForeground);
        }
        else if (hint.kind === languages.InlayHintKind.Type) {
            props.backgroundColor = themeColorFromId(colors.editorInlayHintTypeBackground);
            props.color = themeColorFromId(colors.editorInlayHintTypeForeground);
        }
        else {
            props.backgroundColor = themeColorFromId(colors.editorInlayHintBackground);
            props.color = themeColorFromId(colors.editorInlayHintForeground);
        }
    }
    _getLayoutInfo() {
        const options = this._editor.getOption(146 /* EditorOption.inlayHints */);
        const padding = options.padding;
        const editorFontSize = this._editor.getOption(54 /* EditorOption.fontSize */);
        const editorFontFamily = this._editor.getOption(51 /* EditorOption.fontFamily */);
        let fontSize = options.fontSize;
        if (!fontSize || fontSize < 5 || fontSize > editorFontSize) {
            fontSize = editorFontSize;
        }
        const fontFamily = options.fontFamily || editorFontFamily;
        const isUniform = !padding && fontFamily === editorFontFamily && fontSize === editorFontSize;
        return { fontSize, fontFamily, padding, isUniform };
    }
    _removeAllDecorations() {
        this._editor.removeDecorations(Array.from(this._decorationsMetadata.keys()));
        for (const obj of this._decorationsMetadata.values()) {
            obj.classNameRef.dispose();
        }
        this._decorationsMetadata.clear();
    }
    // --- accessibility
    getInlayHintsForLine(line) {
        if (!this._editor.hasModel()) {
            return [];
        }
        const set = new Set();
        const result = [];
        for (const deco of this._editor.getLineDecorations(line)) {
            const data = this._decorationsMetadata.get(deco.id);
            if (data && !set.has(data.item.hint)) {
                set.add(data.item.hint);
                result.push(data.item);
            }
        }
        return result;
    }
};
InlayHintsController = InlayHintsController_1 = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageFeatureDebounceService),
    __param(3, IInlayHintsCache),
    __param(4, ICommandService),
    __param(5, INotificationService),
    __param(6, IInstantiationService)
], InlayHintsController);
export { InlayHintsController };
// Prevents the view from potentially visible whitespace
function fixSpace(str) {
    const noBreakWhitespace = '\xa0';
    return str.replace(/[ \t]/g, noBreakWhitespace);
}
CommandsRegistry.registerCommand('_executeInlayHintProvider', async (accessor, ...args) => {
    const [uri, range] = args;
    assertType(URI.isUri(uri));
    assertType(Range.isIRange(range));
    const { inlayHintsProvider } = accessor.get(ILanguageFeaturesService);
    const ref = await accessor.get(ITextModelService).createModelReference(uri);
    try {
        const model = await InlayHintsFragments.create(inlayHintsProvider, ref.object.textEditorModel, [Range.lift(range)], CancellationToken.None);
        const result = model.items.map((i) => i.hint);
        setTimeout(() => model.dispose(), 0); // dispose after sending to ext host
        return result;
    }
    finally {
        ref.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxheUhpbnRzL2Jyb3dzZXIvaW5sYXlIaW50c0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUNOLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFPcEQsT0FBTyxFQUFxQyxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRixPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FB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