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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlU3VnZ2VzdFdpZGdldFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N1Z2dlc3QvYnJvd3Nlci9zaW1wbGVTdWdnZXN0V2lkZ2V0UmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUNOLFNBQVMsR0FFVCxNQUFNLG9EQUFvRCxDQUFBO0FBRzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVyRSxNQUFNLFVBQVUsU0FBUyxDQUFDLEtBQWE7SUFDdEMsT0FBTywwQkFBMEIsS0FBSyxFQUFFLENBQUE7QUFDekMsQ0FBQztB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