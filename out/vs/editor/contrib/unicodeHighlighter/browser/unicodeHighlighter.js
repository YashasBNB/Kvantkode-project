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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { InvisibleCharacters, isBasicASCII } from '../../../../base/common/strings.js';
import './unicodeHighlighter.css';
import { EditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { inUntrustedWorkspace, unicodeHighlightConfigKeys, } from '../../../common/config/editorOptions.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { UnicodeTextModelHighlighter, } from '../../../common/services/unicodeTextModelHighlighter.js';
import { IEditorWorkerService, } from '../../../common/services/editorWorker.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { isModelDecorationInComment, isModelDecorationInString, isModelDecorationVisible, } from '../../../common/viewModel/viewModelDecorations.js';
import { HoverParticipantRegistry, } from '../../hover/browser/hoverTypes.js';
import { MarkdownHover, renderMarkdownHovers, } from '../../hover/browser/markdownHoverParticipant.js';
import { BannerController } from './bannerController.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
export const warningIcon = registerIcon('extensions-warning-message', Codicon.warning, nls.localize('warningIcon', 'Icon shown with a warning message in the extensions editor.'));
let UnicodeHighlighter = class UnicodeHighlighter extends Disposable {
    static { this.ID = 'editor.contrib.unicodeHighlighter'; }
    constructor(_editor, _editorWorkerService, _workspaceTrustService, instantiationService) {
        super();
        this._editor = _editor;
        this._editorWorkerService = _editorWorkerService;
        this._workspaceTrustService = _workspaceTrustService;
        this._highlighter = null;
        this._bannerClosed = false;
        this._updateState = (state) => {
            if (state && state.hasMore) {
                if (this._bannerClosed) {
                    return;
                }
                // This document contains many non-basic ASCII characters.
                const max = Math.max(state.ambiguousCharacterCount, state.nonBasicAsciiCharacterCount, state.invisibleCharacterCount);
                let data;
                if (state.nonBasicAsciiCharacterCount >= max) {
                    data = {
                        message: nls.localize('unicodeHighlighting.thisDocumentHasManyNonBasicAsciiUnicodeCharacters', 'This document contains many non-basic ASCII unicode characters'),
                        command: new DisableHighlightingOfNonBasicAsciiCharactersAction(),
                    };
                }
                else if (state.ambiguousCharacterCount >= max) {
                    data = {
                        message: nls.localize('unicodeHighlighting.thisDocumentHasManyAmbiguousUnicodeCharacters', 'This document contains many ambiguous unicode characters'),
                        command: new DisableHighlightingOfAmbiguousCharactersAction(),
                    };
                }
                else if (state.invisibleCharacterCount >= max) {
                    data = {
                        message: nls.localize('unicodeHighlighting.thisDocumentHasManyInvisibleUnicodeCharacters', 'This document contains many invisible unicode characters'),
                        command: new DisableHighlightingOfInvisibleCharactersAction(),
                    };
                }
                else {
                    throw new Error('Unreachable');
                }
                this._bannerController.show({
                    id: 'unicodeHighlightBanner',
                    message: data.message,
                    icon: warningIcon,
                    actions: [
                        {
                            label: data.command.shortLabel,
                            href: `command:${data.command.desc.id}`,
                        },
                    ],
                    onClose: () => {
                        this._bannerClosed = true;
                    },
                });
            }
            else {
                this._bannerController.hide();
            }
        };
        this._bannerController = this._register(instantiationService.createInstance(BannerController, _editor));
        this._register(this._editor.onDidChangeModel(() => {
            this._bannerClosed = false;
            this._updateHighlighter();
        }));
        this._options = _editor.getOption(130 /* EditorOption.unicodeHighlighting */);
        this._register(_workspaceTrustService.onDidChangeTrust((e) => {
            this._updateHighlighter();
        }));
        this._register(_editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(130 /* EditorOption.unicodeHighlighting */)) {
                this._options = _editor.getOption(130 /* EditorOption.unicodeHighlighting */);
                this._updateHighlighter();
            }
        }));
        this._updateHighlighter();
    }
    dispose() {
        if (this._highlighter) {
            this._highlighter.dispose();
            this._highlighter = null;
        }
        super.dispose();
    }
    _updateHighlighter() {
        this._updateState(null);
        if (this._highlighter) {
            this._highlighter.dispose();
            this._highlighter = null;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        const options = resolveOptions(this._workspaceTrustService.isWorkspaceTrusted(), this._options);
        if ([options.nonBasicASCII, options.ambiguousCharacters, options.invisibleCharacters].every((option) => option === false)) {
            // Don't do anything if the feature is fully disabled
            return;
        }
        const highlightOptions = {
            nonBasicASCII: options.nonBasicASCII,
            ambiguousCharacters: options.ambiguousCharacters,
            invisibleCharacters: options.invisibleCharacters,
            includeComments: options.includeComments,
            includeStrings: options.includeStrings,
            allowedCodePoints: Object.keys(options.allowedCharacters).map((c) => c.codePointAt(0)),
            allowedLocales: Object.keys(options.allowedLocales).map((locale) => {
                if (locale === '_os') {
                    const osLocale = new Intl.NumberFormat().resolvedOptions().locale;
                    return osLocale;
                }
                else if (locale === '_vscode') {
                    return platform.language;
                }
                return locale;
            }),
        };
        if (this._editorWorkerService.canComputeUnicodeHighlights(this._editor.getModel().uri)) {
            this._highlighter = new DocumentUnicodeHighlighter(this._editor, highlightOptions, this._updateState, this._editorWorkerService);
        }
        else {
            this._highlighter = new ViewportUnicodeHighlighter(this._editor, highlightOptions, this._updateState);
        }
    }
    getDecorationInfo(decoration) {
        if (this._highlighter) {
            return this._highlighter.getDecorationInfo(decoration);
        }
        return null;
    }
};
UnicodeHighlighter = __decorate([
    __param(1, IEditorWorkerService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, IInstantiationService)
], UnicodeHighlighter);
export { UnicodeHighlighter };
function resolveOptions(trusted, options) {
    return {
        nonBasicASCII: options.nonBasicASCII === inUntrustedWorkspace ? !trusted : options.nonBasicASCII,
        ambiguousCharacters: options.ambiguousCharacters,
        invisibleCharacters: options.invisibleCharacters,
        includeComments: options.includeComments === inUntrustedWorkspace ? !trusted : options.includeComments,
        includeStrings: options.includeStrings === inUntrustedWorkspace ? !trusted : options.includeStrings,
        allowedCharacters: options.allowedCharacters,
        allowedLocales: options.allowedLocales,
    };
}
let DocumentUnicodeHighlighter = class DocumentUnicodeHighlighter extends Disposable {
    constructor(_editor, _options, _updateState, _editorWorkerService) {
        super();
        this._editor = _editor;
        this._options = _options;
        this._updateState = _updateState;
        this._editorWorkerService = _editorWorkerService;
        this._model = this._editor.getModel();
        this._decorations = this._editor.createDecorationsCollection();
        this._updateSoon = this._register(new RunOnceScheduler(() => this._update(), 250));
        this._register(this._editor.onDidChangeModelContent(() => {
            this._updateSoon.schedule();
        }));
        this._updateSoon.schedule();
    }
    dispose() {
        this._decorations.clear();
        super.dispose();
    }
    _update() {
        if (this._model.isDisposed()) {
            return;
        }
        if (!this._model.mightContainNonBasicASCII()) {
            this._decorations.clear();
            return;
        }
        const modelVersionId = this._model.getVersionId();
        this._editorWorkerService
            .computedUnicodeHighlights(this._model.uri, this._options)
            .then((info) => {
            if (this._model.isDisposed()) {
                return;
            }
            if (this._model.getVersionId() !== modelVersionId) {
                // model changed in the meantime
                return;
            }
            this._updateState(info);
            const decorations = [];
            if (!info.hasMore) {
                // Don't show decoration if there are too many.
                // In this case, a banner is shown.
                for (const range of info.ranges) {
                    decorations.push({
                        range: range,
                        options: Decorations.instance.getDecorationFromOptions(this._options),
                    });
                }
            }
            this._decorations.set(decorations);
        });
    }
    getDecorationInfo(decoration) {
        if (!this._decorations.has(decoration)) {
            return null;
        }
        const model = this._editor.getModel();
        if (!isModelDecorationVisible(model, decoration)) {
            return null;
        }
        const text = model.getValueInRange(decoration.range);
        return {
            reason: computeReason(text, this._options),
            inComment: isModelDecorationInComment(model, decoration),
            inString: isModelDecorationInString(model, decoration),
        };
    }
};
DocumentUnicodeHighlighter = __decorate([
    __param(3, IEditorWorkerService)
], DocumentUnicodeHighlighter);
class ViewportUnicodeHighlighter extends Disposable {
    constructor(_editor, _options, _updateState) {
        super();
        this._editor = _editor;
        this._options = _options;
        this._updateState = _updateState;
        this._model = this._editor.getModel();
        this._decorations = this._editor.createDecorationsCollection();
        this._updateSoon = this._register(new RunOnceScheduler(() => this._update(), 250));
        this._register(this._editor.onDidLayoutChange(() => {
            this._updateSoon.schedule();
        }));
        this._register(this._editor.onDidScrollChange(() => {
            this._updateSoon.schedule();
        }));
        this._register(this._editor.onDidChangeHiddenAreas(() => {
            this._updateSoon.schedule();
        }));
        this._register(this._editor.onDidChangeModelContent(() => {
            this._updateSoon.schedule();
        }));
        this._updateSoon.schedule();
    }
    dispose() {
        this._decorations.clear();
        super.dispose();
    }
    _update() {
        if (this._model.isDisposed()) {
            return;
        }
        if (!this._model.mightContainNonBasicASCII()) {
            this._decorations.clear();
            return;
        }
        const ranges = this._editor.getVisibleRanges();
        const decorations = [];
        const totalResult = {
            ranges: [],
            ambiguousCharacterCount: 0,
            invisibleCharacterCount: 0,
            nonBasicAsciiCharacterCount: 0,
            hasMore: false,
        };
        for (const range of ranges) {
            const result = UnicodeTextModelHighlighter.computeUnicodeHighlights(this._model, this._options, range);
            for (const r of result.ranges) {
                totalResult.ranges.push(r);
            }
            totalResult.ambiguousCharacterCount += totalResult.ambiguousCharacterCount;
            totalResult.invisibleCharacterCount += totalResult.invisibleCharacterCount;
            totalResult.nonBasicAsciiCharacterCount += totalResult.nonBasicAsciiCharacterCount;
            totalResult.hasMore = totalResult.hasMore || result.hasMore;
        }
        if (!totalResult.hasMore) {
            // Don't show decorations if there are too many.
            // A banner will be shown instead.
            for (const range of totalResult.ranges) {
                decorations.push({
                    range,
                    options: Decorations.instance.getDecorationFromOptions(this._options),
                });
            }
        }
        this._updateState(totalResult);
        this._decorations.set(decorations);
    }
    getDecorationInfo(decoration) {
        if (!this._decorations.has(decoration)) {
            return null;
        }
        const model = this._editor.getModel();
        const text = model.getValueInRange(decoration.range);
        if (!isModelDecorationVisible(model, decoration)) {
            return null;
        }
        return {
            reason: computeReason(text, this._options),
            inComment: isModelDecorationInComment(model, decoration),
            inString: isModelDecorationInString(model, decoration),
        };
    }
}
export class UnicodeHighlighterHover {
    constructor(owner, range, decoration) {
        this.owner = owner;
        this.range = range;
        this.decoration = decoration;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */ &&
            this.range.startColumn <= anchor.range.startColumn &&
            this.range.endColumn >= anchor.range.endColumn);
    }
}
const configureUnicodeHighlightOptionsStr = nls.localize('unicodeHighlight.configureUnicodeHighlightOptions', 'Configure Unicode Highlight Options');
let UnicodeHighlighterHoverParticipant = class UnicodeHighlighterHoverParticipant {
    constructor(_editor, _languageService, _openerService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this.hoverOrdinal = 5;
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return [];
        }
        const model = this._editor.getModel();
        const unicodeHighlighter = this._editor.getContribution(UnicodeHighlighter.ID);
        if (!unicodeHighlighter) {
            return [];
        }
        const result = [];
        const existedReason = new Set();
        let index = 300;
        for (const d of lineDecorations) {
            const highlightInfo = unicodeHighlighter.getDecorationInfo(d);
            if (!highlightInfo) {
                continue;
            }
            const char = model.getValueInRange(d.range);
            // text refers to a single character.
            const codePoint = char.codePointAt(0);
            const codePointStr = formatCodePointMarkdown(codePoint);
            let reason;
            switch (highlightInfo.reason.kind) {
                case 0 /* UnicodeHighlighterReasonKind.Ambiguous */: {
                    if (isBasicASCII(highlightInfo.reason.confusableWith)) {
                        reason = nls.localize('unicodeHighlight.characterIsAmbiguousASCII', 'The character {0} could be confused with the ASCII character {1}, which is more common in source code.', codePointStr, formatCodePointMarkdown(highlightInfo.reason.confusableWith.codePointAt(0)));
                    }
                    else {
                        reason = nls.localize('unicodeHighlight.characterIsAmbiguous', 'The character {0} could be confused with the character {1}, which is more common in source code.', codePointStr, formatCodePointMarkdown(highlightInfo.reason.confusableWith.codePointAt(0)));
                    }
                    break;
                }
                case 1 /* UnicodeHighlighterReasonKind.Invisible */:
                    reason = nls.localize('unicodeHighlight.characterIsInvisible', 'The character {0} is invisible.', codePointStr);
                    break;
                case 2 /* UnicodeHighlighterReasonKind.NonBasicAscii */:
                    reason = nls.localize('unicodeHighlight.characterIsNonBasicAscii', 'The character {0} is not a basic ASCII character.', codePointStr);
                    break;
            }
            if (existedReason.has(reason)) {
                continue;
            }
            existedReason.add(reason);
            const adjustSettingsArgs = {
                codePoint: codePoint,
                reason: highlightInfo.reason,
                inComment: highlightInfo.inComment,
                inString: highlightInfo.inString,
            };
            const adjustSettings = nls.localize('unicodeHighlight.adjustSettings', 'Adjust settings');
            const uri = `command:${ShowExcludeOptions.ID}?${encodeURIComponent(JSON.stringify(adjustSettingsArgs))}`;
            const markdown = new MarkdownString('', true)
                .appendMarkdown(reason)
                .appendText(' ')
                .appendLink(uri, adjustSettings, configureUnicodeHighlightOptionsStr);
            result.push(new MarkdownHover(this, d.range, [markdown], false, index++));
        }
        return result;
    }
    renderHoverParts(context, hoverParts) {
        return renderMarkdownHovers(context, hoverParts, this._editor, this._languageService, this._openerService);
    }
    getAccessibleContent(hoverPart) {
        return hoverPart.contents.map((c) => c.value).join('\n');
    }
};
UnicodeHighlighterHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService)
], UnicodeHighlighterHoverParticipant);
export { UnicodeHighlighterHoverParticipant };
function codePointToHex(codePoint) {
    return `U+${codePoint.toString(16).padStart(4, '0')}`;
}
function formatCodePointMarkdown(codePoint) {
    let value = `\`${codePointToHex(codePoint)}\``;
    if (!InvisibleCharacters.isInvisibleCharacter(codePoint)) {
        // Don't render any control characters or any invisible characters, as they cannot be seen anyways.
        value += ` "${`${renderCodePointAsInlineCode(codePoint)}`}"`;
    }
    return value;
}
function renderCodePointAsInlineCode(codePoint) {
    if (codePoint === 96 /* CharCode.BackTick */) {
        return '`` ` ``';
    }
    return '`' + String.fromCodePoint(codePoint) + '`';
}
function computeReason(char, options) {
    return UnicodeTextModelHighlighter.computeUnicodeHighlightReason(char, options);
}
class Decorations {
    constructor() {
        this.map = new Map();
    }
    static { this.instance = new Decorations(); }
    getDecorationFromOptions(options) {
        return this.getDecoration(!options.includeComments, !options.includeStrings);
    }
    getDecoration(hideInComments, hideInStrings) {
        const key = `${hideInComments}${hideInStrings}`;
        let options = this.map.get(key);
        if (!options) {
            options = ModelDecorationOptions.createDynamic({
                description: 'unicode-highlight',
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                className: 'unicode-highlight',
                showIfCollapsed: true,
                overviewRuler: null,
                minimap: null,
                hideInCommentTokens: hideInComments,
                hideInStringTokens: hideInStrings,
            });
            this.map.set(key, options);
        }
        return options;
    }
}
export class DisableHighlightingInCommentsAction extends EditorAction {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingInComments'; }
    constructor() {
        super({
            id: DisableHighlightingOfAmbiguousCharactersAction.ID,
            label: nls.localize2('action.unicodeHighlight.disableHighlightingInComments', 'Disable highlighting of characters in comments'),
            precondition: undefined,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingInComments.shortLabel', 'Disable Highlight In Comments');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor?.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.includeComments, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingInStringsAction extends EditorAction {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingInStrings'; }
    constructor() {
        super({
            id: DisableHighlightingOfAmbiguousCharactersAction.ID,
            label: nls.localize2('action.unicodeHighlight.disableHighlightingInStrings', 'Disable highlighting of characters in strings'),
            precondition: undefined,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingInStrings.shortLabel', 'Disable Highlight In Strings');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor?.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.includeStrings, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingOfAmbiguousCharactersAction extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingOfAmbiguousCharacters'; }
    constructor() {
        super({
            id: DisableHighlightingOfAmbiguousCharactersAction.ID,
            title: nls.localize2('action.unicodeHighlight.disableHighlightingOfAmbiguousCharacters', 'Disable highlighting of ambiguous characters'),
            precondition: undefined,
            f1: false,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingOfAmbiguousCharacters.shortLabel', 'Disable Ambiguous Highlight');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor?.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.ambiguousCharacters, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingOfInvisibleCharactersAction extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingOfInvisibleCharacters'; }
    constructor() {
        super({
            id: DisableHighlightingOfInvisibleCharactersAction.ID,
            title: nls.localize2('action.unicodeHighlight.disableHighlightingOfInvisibleCharacters', 'Disable highlighting of invisible characters'),
            precondition: undefined,
            f1: false,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingOfInvisibleCharacters.shortLabel', 'Disable Invisible Highlight');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor?.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.invisibleCharacters, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingOfNonBasicAsciiCharactersAction extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingOfNonBasicAsciiCharacters'; }
    constructor() {
        super({
            id: DisableHighlightingOfNonBasicAsciiCharactersAction.ID,
            title: nls.localize2('action.unicodeHighlight.disableHighlightingOfNonBasicAsciiCharacters', 'Disable highlighting of non basic ASCII characters'),
            precondition: undefined,
            f1: false,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingOfNonBasicAsciiCharacters.shortLabel', 'Disable Non ASCII Highlight');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor?.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.nonBasicASCII, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class ShowExcludeOptions extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.showExcludeOptions'; }
    constructor() {
        super({
            id: ShowExcludeOptions.ID,
            title: nls.localize2('action.unicodeHighlight.showExcludeOptions', 'Show Exclude Options'),
            precondition: undefined,
            f1: false,
        });
    }
    async run(accessor, args) {
        const { codePoint, reason, inString, inComment } = args;
        const char = String.fromCodePoint(codePoint);
        const quickPickService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        function getExcludeCharFromBeingHighlightedLabel(codePoint) {
            if (InvisibleCharacters.isInvisibleCharacter(codePoint)) {
                return nls.localize('unicodeHighlight.excludeInvisibleCharFromBeingHighlighted', 'Exclude {0} (invisible character) from being highlighted', codePointToHex(codePoint));
            }
            return nls.localize('unicodeHighlight.excludeCharFromBeingHighlighted', 'Exclude {0} from being highlighted', `${codePointToHex(codePoint)} "${char}"`);
        }
        const options = [];
        if (reason.kind === 0 /* UnicodeHighlighterReasonKind.Ambiguous */) {
            for (const locale of reason.notAmbiguousInLocales) {
                options.push({
                    label: nls.localize('unicodeHighlight.allowCommonCharactersInLanguage', 'Allow unicode characters that are more common in the language "{0}".', locale),
                    run: async () => {
                        excludeLocaleFromBeingHighlighted(configurationService, [locale]);
                    },
                });
            }
        }
        options.push({
            label: getExcludeCharFromBeingHighlightedLabel(codePoint),
            run: () => excludeCharFromBeingHighlighted(configurationService, [codePoint]),
        });
        if (inComment) {
            const action = new DisableHighlightingInCommentsAction();
            options.push({ label: action.label, run: async () => action.runAction(configurationService) });
        }
        else if (inString) {
            const action = new DisableHighlightingInStringsAction();
            options.push({ label: action.label, run: async () => action.runAction(configurationService) });
        }
        function getTitle(options) {
            return typeof options.desc.title === 'string' ? options.desc.title : options.desc.title.value;
        }
        if (reason.kind === 0 /* UnicodeHighlighterReasonKind.Ambiguous */) {
            const action = new DisableHighlightingOfAmbiguousCharactersAction();
            options.push({
                label: getTitle(action),
                run: async () => action.runAction(configurationService),
            });
        }
        else if (reason.kind === 1 /* UnicodeHighlighterReasonKind.Invisible */) {
            const action = new DisableHighlightingOfInvisibleCharactersAction();
            options.push({
                label: getTitle(action),
                run: async () => action.runAction(configurationService),
            });
        }
        else if (reason.kind === 2 /* UnicodeHighlighterReasonKind.NonBasicAscii */) {
            const action = new DisableHighlightingOfNonBasicAsciiCharactersAction();
            options.push({
                label: getTitle(action),
                run: async () => action.runAction(configurationService),
            });
        }
        else {
            expectNever(reason);
        }
        const result = await quickPickService.pick(options, {
            title: configureUnicodeHighlightOptionsStr,
        });
        if (result) {
            await result.run();
        }
    }
}
async function excludeCharFromBeingHighlighted(configurationService, charCodes) {
    const existingValue = configurationService.getValue(unicodeHighlightConfigKeys.allowedCharacters);
    let value;
    if (typeof existingValue === 'object' && existingValue) {
        value = existingValue;
    }
    else {
        value = {};
    }
    for (const charCode of charCodes) {
        value[String.fromCodePoint(charCode)] = true;
    }
    await configurationService.updateValue(unicodeHighlightConfigKeys.allowedCharacters, value, 2 /* ConfigurationTarget.USER */);
}
async function excludeLocaleFromBeingHighlighted(configurationService, locales) {
    const existingValue = configurationService.inspect(unicodeHighlightConfigKeys.allowedLocales).user
        ?.value;
    let value;
    if (typeof existingValue === 'object' && existingValue) {
        // Copy value, as the existing value is read only
        value = Object.assign({}, existingValue);
    }
    else {
        value = {};
    }
    for (const locale of locales) {
        value[locale] = true;
    }
    await configurationService.updateValue(unicodeHighlightConfigKeys.allowedLocales, value, 2 /* ConfigurationTarget.USER */);
}
function expectNever(value) {
    throw new Error(`Unexpected value: ${value}`);
}
registerAction2(DisableHighlightingOfAmbiguousCharactersAction);
registerAction2(DisableHighlightingOfInvisibleCharactersAction);
registerAction2(DisableHighlightingOfNonBasicAsciiCharactersAction);
registerAction2(ShowExcludeOptions);
registerEditorContribution(UnicodeHighlighter.ID, UnicodeHighlighter, 1 /* EditorContributionInstantiation.AfterFirstRender */);
HoverParticipantRegistry.register(UnicodeHighlighterHoverParticipant);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZUhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvdW5pY29kZUhpZ2hsaWdodGVyL2Jyb3dzZXIvdW5pY29kZUhpZ2hsaWdodGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RGLE9BQU8sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUNOLFlBQVksRUFFWiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sb0JBQW9CLEVBR3BCLDBCQUEwQixHQUMxQixNQUFNLHlDQUF5QyxDQUFBO0FBU2hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFJTiwyQkFBMkIsR0FDM0IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUNOLDBCQUEwQixFQUMxQix5QkFBeUIsRUFDekIsd0JBQXdCLEdBQ3hCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FB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