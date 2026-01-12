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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0hvdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxheUhpbnRzL2Jyb3dzZXIvaW5sYXlIaW50c0hvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXRFLE9BQU8sRUFFTixxQkFBcUIsRUFDckIsY0FBYyxHQUNkLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZGLE9BQU8sRUFFTix5QkFBeUIsR0FFekIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RixPQUFPLEVBQ04sYUFBYSxFQUNiLHdCQUF3QixHQUN4QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxLQUFLLFFB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