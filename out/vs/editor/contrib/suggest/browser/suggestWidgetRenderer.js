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
import { $, append, hide, show } from '../../../../base/browser/dom.js';
import { IconLabel, } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { CompletionItemKinds, } from '../../../common/languages.js';
import { getIconClasses } from '../../../common/services/getIconClasses.js';
import { IModelService } from '../../../common/services/model.js';
import { ILanguageService } from '../../../common/languages/language.js';
import * as nls from '../../../../nls.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { canExpandCompletionItem } from './suggestWidgetDetails.js';
const suggestMoreInfoIcon = registerIcon('suggest-more-info', Codicon.chevronRight, nls.localize('suggestMoreInfoIcon', 'Icon for more information in the suggest widget.'));
const _completionItemColor = new (class ColorExtractor {
    static { this._regexRelaxed = /(#([\da-fA-F]{3}){1,2}|(rgb|hsl)a\(\s*(\d{1,3}%?\s*,\s*){3}(1|0?\.\d+)\)|(rgb|hsl)\(\s*\d{1,3}%?(\s*,\s*\d{1,3}%?){2}\s*\))/; }
    static { this._regexStrict = new RegExp(`^${ColorExtractor._regexRelaxed.source}$`, 'i'); }
    extract(item, out) {
        if (item.textLabel.match(ColorExtractor._regexStrict)) {
            out[0] = item.textLabel;
            return true;
        }
        if (item.completion.detail && item.completion.detail.match(ColorExtractor._regexStrict)) {
            out[0] = item.completion.detail;
            return true;
        }
        if (item.completion.documentation) {
            const value = typeof item.completion.documentation === 'string'
                ? item.completion.documentation
                : item.completion.documentation.value;
            const match = ColorExtractor._regexRelaxed.exec(value);
            if (match && (match.index === 0 || match.index + match[0].length === value.length)) {
                out[0] = match[0];
                return true;
            }
        }
        return false;
    }
})();
let ItemRenderer = class ItemRenderer {
    constructor(_editor, _modelService, _languageService, _themeService) {
        this._editor = _editor;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._onDidToggleDetails = new Emitter();
        this.onDidToggleDetails = this._onDidToggleDetails.event;
        this.templateId = 'suggestion';
    }
    dispose() {
        this._onDidToggleDetails.dispose();
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
        const readMore = append(right, $('span.readMore' + ThemeIcon.asCSSSelector(suggestMoreInfoIcon)));
        readMore.title = nls.localize('readMore', 'Read More');
        const configureFont = () => {
            const options = this._editor.getOptions();
            const fontInfo = options.get(52 /* EditorOption.fontInfo */);
            const fontFamily = fontInfo.getMassagedFontFamily();
            const fontFeatureSettings = fontInfo.fontFeatureSettings;
            const fontSize = options.get(124 /* EditorOption.suggestFontSize */) || fontInfo.fontSize;
            const lineHeight = options.get(125 /* EditorOption.suggestLineHeight */) || fontInfo.lineHeight;
            const fontWeight = fontInfo.fontWeight;
            const letterSpacing = fontInfo.letterSpacing;
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
            readMore.style.height = lineHeightPx;
            readMore.style.width = lineHeightPx;
        };
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
            readMore,
            disposables,
            configureFont,
        };
    }
    renderElement(element, index, data) {
        data.configureFont();
        const { completion } = element;
        data.colorspan.style.backgroundColor = '';
        const labelOptions = {
            labelEscapeNewLines: true,
            matches: createMatches(element.score),
        };
        const color = [];
        if (completion.kind === 19 /* CompletionItemKind.Color */ &&
            _completionItemColor.extract(element, color)) {
            // special logic for 'color' completion items
            data.icon.className = 'icon customcolor';
            data.iconContainer.className = 'icon hide';
            data.colorspan.style.backgroundColor = color[0];
        }
        else if (completion.kind === 20 /* CompletionItemKind.File */ &&
            this._themeService.getFileIconTheme().hasFileIcons) {
            // special logic for 'file' completion items
            data.icon.className = 'icon hide';
            data.iconContainer.className = 'icon hide';
            const labelClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: element.textLabel }), FileKind.FILE);
            const detailClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FILE);
            labelOptions.extraClasses =
                labelClasses.length > detailClasses.length ? labelClasses : detailClasses;
        }
        else if (completion.kind === 23 /* CompletionItemKind.Folder */ &&
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
            data.iconContainer.classList.add('suggest-icon', ...ThemeIcon.asClassNameArray(CompletionItemKinds.toIcon(completion.kind)));
        }
        if (completion.tags && completion.tags.indexOf(1 /* CompletionItemTag.Deprecated */) >= 0) {
            labelOptions.extraClasses = (labelOptions.extraClasses || []).concat(['deprecated']);
            labelOptions.matches = [];
        }
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
        if (this._editor.getOption(123 /* EditorOption.suggest */).showInlineDetails) {
            show(data.detailsLabel);
        }
        else {
            hide(data.detailsLabel);
        }
        if (canExpandCompletionItem(element)) {
            data.right.classList.add('can-expand-details');
            show(data.readMore);
            data.readMore.onmousedown = (e) => {
                e.stopPropagation();
                e.preventDefault();
            };
            data.readMore.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this._onDidToggleDetails.fire();
            };
        }
        else {
            data.right.classList.remove('can-expand-details');
            hide(data.readMore);
            data.readMore.onmousedown = null;
            data.readMore.onclick = null;
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
ItemRenderer = __decorate([
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, IThemeService)
], ItemRenderer);
export { ItemRenderer };
function stripNewLines(str) {
    return str.replace(/\r\n|\r|\n/g, '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RXaWRnZXRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkUsT0FBTyxFQUNOLFNBQVMsR0FFVCxNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3BELE9BQU8sRUFFTixtQkFBbUIsR0FFbkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FB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