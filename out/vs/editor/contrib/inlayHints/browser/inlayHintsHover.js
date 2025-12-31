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
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { isEmptyMarkdownString, MarkdownString, } from '../../../../base/common/htmlContent.js';
import { Position } from '../../../common/core/position.js';
import { ModelDecorationInjectedTextOptions } from '../../../common/model/textModel.js';
import { HoverForeignElementAnchor, } from '../../hover/browser/hoverTypes.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { getHoverProviderResultsAsAsyncIterable } from '../../hover/browser/getHover.js';
import { MarkdownHover, MarkdownHoverParticipant, } from '../../hover/browser/markdownHoverParticipant.js';
import { RenderedInlayHintLabelPart, InlayHintsController } from './inlayHintsController.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import * as platform from '../../../../base/common/platform.js';
import { asCommandLink } from './inlayHints.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
class InlayHintsHoverAnchor extends HoverForeignElementAnchor {
    constructor(part, owner, initialMousePosX, initialMousePosY) {
        super(10, owner, part.item.anchor.range, initialMousePosX, initialMousePosY, true);
        this.part = part;
    }
}
let InlayHintsHover = class InlayHintsHover extends MarkdownHoverParticipant {
    constructor(editor, languageService, openerService, keybindingService, hoverService, configurationService, _resolverService, languageFeaturesService, commandService) {
        super(editor, languageService, openerService, configurationService, languageFeaturesService, keybindingService, hoverService, commandService);
        this._resolverService = _resolverService;
        this.hoverOrdinal = 6;
    }
    suggestHoverAnchor(mouseEvent) {
        const controller = InlayHintsController.get(this._editor);
        if (!controller) {
            return null;
        }
        if (mouseEvent.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
            return null;
        }
        const options = mouseEvent.target.detail.injectedText?.options;
        if (!(options instanceof ModelDecorationInjectedTextOptions &&
            options.attachedData instanceof RenderedInlayHintLabelPart)) {
            return null;
        }
        return new InlayHintsHoverAnchor(options.attachedData, this, mouseEvent.event.posx, mouseEvent.event.posy);
    }
    computeSync() {
        return [];
    }
    computeAsync(anchor, _lineDecorations, source, token) {
        if (!(anchor instanceof InlayHintsHoverAnchor)) {
            return AsyncIterableObject.EMPTY;
        }
        return new AsyncIterableObject(async (executor) => {
            const { part } = anchor;
            await part.item.resolve(token);
            if (token.isCancellationRequested) {
                return;
            }
            // (1) Inlay Tooltip
            let itemTooltip;
            if (typeof part.item.hint.tooltip === 'string') {
                itemTooltip = new MarkdownString().appendText(part.item.hint.tooltip);
            }
            else if (part.item.hint.tooltip) {
                itemTooltip = part.item.hint.tooltip;
            }
            if (itemTooltip) {
                executor.emitOne(new MarkdownHover(this, anchor.range, [itemTooltip], false, 0));
            }
            // (1.2) Inlay dbl-click gesture
            if (isNonEmptyArray(part.item.hint.textEdits)) {
                executor.emitOne(new MarkdownHover(this, anchor.range, [new MarkdownString().appendText(localize('hint.dbl', 'Double-click to insert'))], false, 10001));
            }
            // (2) Inlay Label Part Tooltip
            let partTooltip;
            if (typeof part.part.tooltip === 'string') {
                partTooltip = new MarkdownString().appendText(part.part.tooltip);
            }
            else if (part.part.tooltip) {
                partTooltip = part.part.tooltip;
            }
            if (partTooltip) {
                executor.emitOne(new MarkdownHover(this, anchor.range, [partTooltip], false, 1));
            }
            // (2.2) Inlay Label Part Help Hover
            if (part.part.location || part.part.command) {
                let linkHint;
                const useMetaKey = this._editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey';
                const kb = useMetaKey
                    ? platform.isMacintosh
                        ? localize('links.navigate.kb.meta.mac', 'cmd + click')
                        : localize('links.navigate.kb.meta', 'ctrl + click')
                    : platform.isMacintosh
                        ? localize('links.navigate.kb.alt.mac', 'option + click')
                        : localize('links.navigate.kb.alt', 'alt + click');
                if (part.part.location && part.part.command) {
                    linkHint = new MarkdownString().appendText(localize('hint.defAndCommand', 'Go to Definition ({0}), right click for more', kb));
                }
                else if (part.part.location) {
                    linkHint = new MarkdownString().appendText(localize('hint.def', 'Go to Definition ({0})', kb));
                }
                else if (part.part.command) {
                    linkHint = new MarkdownString(`[${localize('hint.cmd', 'Execute Command')}](${asCommandLink(part.part.command)} "${part.part.command.title}") (${kb})`, { isTrusted: true });
                }
                if (linkHint) {
                    executor.emitOne(new MarkdownHover(this, anchor.range, [linkHint], false, 10000));
                }
            }
            // (3) Inlay Label Part Location tooltip
            const iterable = await this._resolveInlayHintLabelPartHover(part, token);
            for await (const item of iterable) {
                executor.emitOne(item);
            }
        });
    }
    async _resolveInlayHintLabelPartHover(part, token) {
        if (!part.part.location) {
            return AsyncIterableObject.EMPTY;
        }
        const { uri, range } = part.part.location;
        const ref = await this._resolverService.createModelReference(uri);
        try {
            const model = ref.object.textEditorModel;
            if (!this._languageFeaturesService.hoverProvider.has(model)) {
                return AsyncIterableObject.EMPTY;
            }
            return getHoverProviderResultsAsAsyncIterable(this._languageFeaturesService.hoverProvider, model, new Position(range.startLineNumber, range.startColumn), token)
                .filter((item) => !isEmptyMarkdownString(item.hover.contents))
                .map((item) => new MarkdownHover(this, part.item.anchor.range, item.hover.contents, false, 2 + item.ordinal));
        }
        finally {
            ref.dispose();
        }
    }
};
InlayHintsHover = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IKeybindingService),
    __param(4, IHoverService),
    __param(5, IConfigurationService),
    __param(6, ITextModelService),
    __param(7, ILanguageFeaturesService),
    __param(8, ICommandService)
], InlayHintsHover);
export { InlayHintsHover };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0hvdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5sYXlIaW50cy9icm93c2VyL2lubGF5SGludHNIb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV0RSxPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLGNBQWMsR0FDZCxNQUFNLHdDQUF3QyxDQUFBO0FBRS9DLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RixPQUFPLEVBRU4seUJBQXlCLEdBRXpCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEYsT0FBTyxFQUNOLGFBQWEsRUFDYix3QkFBd0IsR0FDeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxRQUFRLE1B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