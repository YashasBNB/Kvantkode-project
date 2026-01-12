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
import { $, append, show } from '../../../../base/browser/dom.js';
import { IconLabel, } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { URI } from '../../../../base/common/uri.js';
import { FileKind } from '../../../../platform/files/common/files.js';
export function getAriaId(index) {
    return `simple-suggest-aria-id-${index}`;
}
let SimpleSuggestWidgetItemRenderer = class SimpleSuggestWidgetItemRenderer {
    constructor(_getFontInfo, _onDidFontConfigurationChange, _themeService, _modelService, _languageService) {
        this._getFontInfo = _getFontInfo;
        this._onDidFontConfigurationChange = _onDidFontConfigurationChange;
        this._themeService = _themeService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._onDidToggleDetails = new Emitter();
        this.onDidToggleDetails = this._onDidToggleDetails.event;
        this._disposables = new DisposableStore();
        this.templateId = 'suggestion';
    }
    dispose() {
        this._onDidToggleDetails.dispose();
        this._disposables.dispose();
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const root = container;
        root.classList.add('show-file-icons');
        const icon = append(container, $('.icon'));
        const colorspan = append(icon, $('span.colorspan'));
        const text = append(container, $('.contents'));
        const main = append(text, $('.main'));
        const iconContainer = append(main, $('.icon-label.codicon'));
        const left = append(main, $('span.left'));
        const right = append(main, $('span.right'));
        const iconLabel = new IconLabel(left, { supportHighlights: true, supportIcons: true });
        disposables.add(iconLabel);
        const parametersLabel = append(left, $('span.signature-label'));
        const qualifierLabel = append(left, $('span.qualifier-label'));
        const detailsLabel = append(right, $('span.details-label'));
        // const readMore = append(right, $('span.readMore' + ThemeIcon.asCSSSelector(suggestMoreInfoIcon)));
        // readMore.title = nls.localize('readMore', "Read More");
        const configureFont = () => {
            const fontFeatureSettings = '';
            const { fontFamily, fontSize, lineHeight, fontWeight, letterSpacing } = this._getFontInfo();
            const fontSizePx = `${fontSize}px`;
            const lineHeightPx = `${lineHeight}px`;
            const letterSpacingPx = `${letterSpacing}px`;
            root.style.fontSize = fontSizePx;
            root.style.fontWeight = fontWeight;
            root.style.letterSpacing = letterSpacingPx;
            main.style.fontFamily = fontFamily;
            main.style.fontFeatureSettings = fontFeatureSettings;
            main.style.lineHeight = lineHeightPx;
            icon.style.height = lineHeightPx;
            icon.style.width = lineHeightPx;
            // readMore.style.height = lineHeightPx;
            // readMore.style.width = lineHeightPx;
        };
        configureFont();
        this._disposables.add(this._onDidFontConfigurationChange(() => configureFont()));
        return {
            root,
            left,
            right,
            icon,
            colorspan,
            iconLabel,
            iconContainer,
            parametersLabel,
            qualifierLabel,
            detailsLabel,
            disposables,
        };
    }
    renderElement(element, index, data) {
        const { completion } = element;
        data.root.id = getAriaId(index);
        data.colorspan.style.backgroundColor = '';
        const labelOptions = {
            labelEscapeNewLines: true,
            matches: createMatches(element.score),
        };
        // const color: string[] = [];
        // if (completion.kind === CompletionItemKind.Color && _completionItemColor.extract(element, color)) {
        // 	// special logic for 'color' completion items
        // 	data.icon.className = 'icon customcolor';
        // 	data.iconContainer.className = 'icon hide';
        // 	data.colorspan.style.backgroundColor = color[0];
        // } else
        if (completion.kindLabel === 'File' && this._themeService.getFileIconTheme().hasFileIcons) {
            // special logic for 'file' completion items
            data.icon.className = 'icon hide';
            data.iconContainer.className = 'icon hide';
            const labelClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: element.textLabel }), FileKind.FILE);
            const detailClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FILE);
            labelOptions.extraClasses =
                labelClasses.length > detailClasses.length ? labelClasses : detailClasses;
        }
        else if (completion.kindLabel === 'Folder' &&
            this._themeService.getFileIconTheme().hasFolderIcons) {
            // special logic for 'folder' completion items
            data.icon.className = 'icon hide';
            data.iconContainer.className = 'icon hide';
            labelOptions.extraClasses = [
                getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: element.textLabel }), FileKind.FOLDER),
                getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FOLDER),
            ].flat();
        }
        else {
            // normal icon
            data.icon.className = 'icon hide';
            data.iconContainer.className = '';
            data.iconContainer.classList.add('suggest-icon', ...ThemeIcon.asClassNameArray(completion.icon || Codicon.symbolText));
        }
        // if (completion.tags && completion.tags.indexOf(CompletionItemTag.Deprecated) >= 0) {
        // 	labelOptions.extraClasses = (labelOptions.extraClasses || []).concat(['deprecated']);
        // 	labelOptions.matches = [];
        // }
        data.iconLabel.setLabel(element.textLabel, undefined, labelOptions);
        if (typeof completion.label === 'string') {
            data.parametersLabel.textContent = '';
            data.detailsLabel.textContent = stripNewLines(completion.detail || '');
            data.root.classList.add('string-label');
        }
        else {
            data.parametersLabel.textContent = stripNewLines(completion.label.detail || '');
            data.detailsLabel.textContent = stripNewLines(completion.label.description || '');
            data.root.classList.remove('string-label');
        }
        // if (this._editor.getOption(EditorOption.suggest).showInlineDetails) {
        show(data.detailsLabel);
        // } else {
        // 	hide(data.detailsLabel);
        // }
        // if (canExpandCompletionItem(element)) {
        // 	data.right.classList.add('can-expand-details');
        // 	show(data.readMore);
        // 	data.readMore.onmousedown = e => {
        // 		e.stopPropagation();
        // 		e.preventDefault();
        // 	};
        // 	data.readMore.onclick = e => {
        // 		e.stopPropagation();
        // 		e.preventDefault();
        // 		this._onDidToggleDetails.fire();
        // 	};
        // } else {
        data.right.classList.remove('can-expand-details');
        // hide(data.readMore);
        // data.readMore.onmousedown = null;
        // data.readMore.onclick = null;
        // }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
SimpleSuggestWidgetItemRenderer = __decorate([
    __param(2, IThemeService),
    __param(3, IModelService),
    __param(4, ILanguageService)
], SimpleSuggestWidgetItemRenderer);
export { SimpleSuggestWidgetItemRenderer };
function stripNewLines(str) {
    return str.replace(/\r\n|\r|\n/g, '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlU3VnZ2VzdFdpZGdldFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3VnZ2VzdC9icm93c2VyL3NpbXBsZVN1Z2dlc3RXaWRnZXRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sU0FBUyxHQUVULE1BQU0sb0RBQW9ELENBQUE7QUFHM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXJFLE1BQU0sVUFBVSxTQUFTLENBQUMsS0FBYTtJQUN0QyxPQUFPLDBCQUEwQixLQUFLLEVBQUUsQ0FBQTtBQUN6QyxD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