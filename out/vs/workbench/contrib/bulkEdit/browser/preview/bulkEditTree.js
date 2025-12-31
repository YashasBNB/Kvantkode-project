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
var CategoryElementRenderer_1, FileElementRenderer_1, TextEditElementRenderer_1;
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { HighlightedLabel, } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { Range } from '../../../../../editor/common/core/range.js';
import * as dom from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { BulkFileOperations, } from './bulkEditPreview.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { localize } from '../../../../../nls.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { basename } from '../../../../../base/common/resources.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { compare } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { ResourceFileEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { SnippetParser } from '../../../../../editor/contrib/snippet/browser/snippetParser.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import * as css from '../../../../../base/browser/cssValue.js';
export class CategoryElement {
    constructor(parent, category) {
        this.parent = parent;
        this.category = category;
    }
    isChecked() {
        const model = this.parent;
        let checked = true;
        for (const file of this.category.fileOperations) {
            for (const edit of file.originalEdits.values()) {
                checked = checked && model.checked.isChecked(edit);
            }
        }
        return checked;
    }
    setChecked(value) {
        const model = this.parent;
        for (const file of this.category.fileOperations) {
            for (const edit of file.originalEdits.values()) {
                model.checked.updateChecked(edit, value);
            }
        }
    }
}
export class FileElement {
    constructor(parent, edit) {
        this.parent = parent;
        this.edit = edit;
    }
    isChecked() {
        const model = this.parent instanceof CategoryElement ? this.parent.parent : this.parent;
        let checked = true;
        // only text edit children -> reflect children state
        if (this.edit.type === 1 /* BulkFileOperationType.TextEdit */) {
            checked = !this.edit.textEdits.every((edit) => !model.checked.isChecked(edit.textEdit));
        }
        // multiple file edits -> reflect single state
        for (const edit of this.edit.originalEdits.values()) {
            if (edit instanceof ResourceFileEdit) {
                checked = checked && model.checked.isChecked(edit);
            }
        }
        // multiple categories and text change -> read all elements
        if (this.parent instanceof CategoryElement &&
            this.edit.type === 1 /* BulkFileOperationType.TextEdit */) {
            for (const category of model.categories) {
                for (const file of category.fileOperations) {
                    if (file.uri.toString() === this.edit.uri.toString()) {
                        for (const edit of file.originalEdits.values()) {
                            if (edit instanceof ResourceFileEdit) {
                                checked = checked && model.checked.isChecked(edit);
                            }
                        }
                    }
                }
            }
        }
        return checked;
    }
    setChecked(value) {
        const model = this.parent instanceof CategoryElement ? this.parent.parent : this.parent;
        for (const edit of this.edit.originalEdits.values()) {
            model.checked.updateChecked(edit, value);
        }
        // multiple categories and file change -> update all elements
        if (this.parent instanceof CategoryElement &&
            this.edit.type !== 1 /* BulkFileOperationType.TextEdit */) {
            for (const category of model.categories) {
                for (const file of category.fileOperations) {
                    if (file.uri.toString() === this.edit.uri.toString()) {
                        for (const edit of file.originalEdits.values()) {
                            model.checked.updateChecked(edit, value);
                        }
                    }
                }
            }
        }
    }
    isDisabled() {
        if (this.parent instanceof CategoryElement &&
            this.edit.type === 1 /* BulkFileOperationType.TextEdit */) {
            const model = this.parent.parent;
            let checked = true;
            for (const category of model.categories) {
                for (const file of category.fileOperations) {
                    if (file.uri.toString() === this.edit.uri.toString()) {
                        for (const edit of file.originalEdits.values()) {
                            if (edit instanceof ResourceFileEdit) {
                                checked = checked && model.checked.isChecked(edit);
                            }
                        }
                    }
                }
            }
            return !checked;
        }
        return false;
    }
}
export class TextEditElement {
    constructor(parent, idx, edit, prefix, selecting, inserting, suffix) {
        this.parent = parent;
        this.idx = idx;
        this.edit = edit;
        this.prefix = prefix;
        this.selecting = selecting;
        this.inserting = inserting;
        this.suffix = suffix;
    }
    isChecked() {
        let model = this.parent.parent;
        if (model instanceof CategoryElement) {
            model = model.parent;
        }
        return model.checked.isChecked(this.edit.textEdit);
    }
    setChecked(value) {
        let model = this.parent.parent;
        if (model instanceof CategoryElement) {
            model = model.parent;
        }
        // check/uncheck this element
        model.checked.updateChecked(this.edit.textEdit, value);
        // make sure parent is checked when this element is checked...
        if (value) {
            for (const edit of this.parent.edit.originalEdits.values()) {
                if (edit instanceof ResourceFileEdit) {
                    ;
                    model.checked.updateChecked(edit, value);
                }
            }
        }
    }
    isDisabled() {
        return this.parent.isDisabled();
    }
}
// --- DATA SOURCE
let BulkEditDataSource = class BulkEditDataSource {
    constructor(_textModelService, _instantiationService) {
        this._textModelService = _textModelService;
        this._instantiationService = _instantiationService;
        this.groupByFile = true;
    }
    hasChildren(element) {
        if (element instanceof FileElement) {
            return element.edit.textEdits.length > 0;
        }
        if (element instanceof TextEditElement) {
            return false;
        }
        return true;
    }
    async getChildren(element) {
        // root -> file/text edits
        if (element instanceof BulkFileOperations) {
            return this.groupByFile
                ? element.fileOperations.map((op) => new FileElement(element, op))
                : element.categories.map((cat) => new CategoryElement(element, cat));
        }
        // category
        if (element instanceof CategoryElement) {
            return Array.from(element.category.fileOperations, (op) => new FileElement(element, op));
        }
        // file: text edit
        if (element instanceof FileElement && element.edit.textEdits.length > 0) {
            // const previewUri = BulkEditPreviewProvider.asPreviewUri(element.edit.resource);
            let textModel;
            let textModelDisposable;
            try {
                const ref = await this._textModelService.createModelReference(element.edit.uri);
                textModel = ref.object.textEditorModel;
                textModelDisposable = ref;
            }
            catch {
                textModel = this._instantiationService.createInstance(TextModel, '', PLAINTEXT_LANGUAGE_ID, TextModel.DEFAULT_CREATION_OPTIONS, null);
                textModelDisposable = textModel;
            }
            const result = element.edit.textEdits.map((edit, idx) => {
                const range = textModel.validateRange(edit.textEdit.textEdit.range);
                //prefix-math
                const startTokens = textModel.tokenization.getLineTokens(range.startLineNumber);
                let prefixLen = 23; // default value for the no tokens/grammar case
                for (let idx = startTokens.findTokenIndexAtOffset(range.startColumn - 1) - 1; prefixLen < 50 && idx >= 0; idx--) {
                    prefixLen = range.startColumn - startTokens.getStartOffset(idx);
                }
                //suffix-math
                const endTokens = textModel.tokenization.getLineTokens(range.endLineNumber);
                let suffixLen = 0;
                for (let idx = endTokens.findTokenIndexAtOffset(range.endColumn - 1); suffixLen < 50 && idx < endTokens.getCount(); idx++) {
                    suffixLen += endTokens.getEndOffset(idx) - endTokens.getStartOffset(idx);
                }
                return new TextEditElement(element, idx, edit, textModel.getValueInRange(new Range(range.startLineNumber, range.startColumn - prefixLen, range.startLineNumber, range.startColumn)), textModel.getValueInRange(range), !edit.textEdit.textEdit.insertAsSnippet
                    ? edit.textEdit.textEdit.text
                    : SnippetParser.asInsertText(edit.textEdit.textEdit.text), textModel.getValueInRange(new Range(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn + suffixLen)));
            });
            textModelDisposable.dispose();
            return result;
        }
        return [];
    }
};
BulkEditDataSource = __decorate([
    __param(0, ITextModelService),
    __param(1, IInstantiationService)
], BulkEditDataSource);
export { BulkEditDataSource };
export class BulkEditSorter {
    compare(a, b) {
        if (a instanceof FileElement && b instanceof FileElement) {
            return compareBulkFileOperations(a.edit, b.edit);
        }
        if (a instanceof TextEditElement && b instanceof TextEditElement) {
            return Range.compareRangesUsingStarts(a.edit.textEdit.textEdit.range, b.edit.textEdit.textEdit.range);
        }
        return 0;
    }
}
export function compareBulkFileOperations(a, b) {
    return compare(a.uri.toString(), b.uri.toString());
}
// --- ACCESSI
let BulkEditAccessibilityProvider = class BulkEditAccessibilityProvider {
    constructor(_labelService) {
        this._labelService = _labelService;
    }
    getWidgetAriaLabel() {
        return localize('bulkEdit', 'Bulk Edit');
    }
    getRole(_element) {
        return 'checkbox';
    }
    getAriaLabel(element) {
        if (element instanceof FileElement) {
            if (element.edit.textEdits.length > 0) {
                if (element.edit.type & 8 /* BulkFileOperationType.Rename */ && element.edit.newUri) {
                    return localize('aria.renameAndEdit', 'Renaming {0} to {1}, also making text edits', this._labelService.getUriLabel(element.edit.uri, { relative: true }), this._labelService.getUriLabel(element.edit.newUri, { relative: true }));
                }
                else if (element.edit.type & 2 /* BulkFileOperationType.Create */) {
                    return localize('aria.createAndEdit', 'Creating {0}, also making text edits', this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
                else if (element.edit.type & 4 /* BulkFileOperationType.Delete */) {
                    return localize('aria.deleteAndEdit', 'Deleting {0}, also making text edits', this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
                else {
                    return localize('aria.editOnly', '{0}, making text edits', this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
            }
            else {
                if (element.edit.type & 8 /* BulkFileOperationType.Rename */ && element.edit.newUri) {
                    return localize('aria.rename', 'Renaming {0} to {1}', this._labelService.getUriLabel(element.edit.uri, { relative: true }), this._labelService.getUriLabel(element.edit.newUri, { relative: true }));
                }
                else if (element.edit.type & 2 /* BulkFileOperationType.Create */) {
                    return localize('aria.create', 'Creating {0}', this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
                else if (element.edit.type & 4 /* BulkFileOperationType.Delete */) {
                    return localize('aria.delete', 'Deleting {0}', this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
            }
        }
        if (element instanceof TextEditElement) {
            if (element.selecting.length > 0 && element.inserting.length > 0) {
                // edit: replace
                return localize('aria.replace', 'line {0}, replacing {1} with {2}', element.edit.textEdit.textEdit.range.startLineNumber, element.selecting, element.inserting);
            }
            else if (element.selecting.length > 0 && element.inserting.length === 0) {
                // edit: delete
                return localize('aria.del', 'line {0}, removing {1}', element.edit.textEdit.textEdit.range.startLineNumber, element.selecting);
            }
            else if (element.selecting.length === 0 && element.inserting.length > 0) {
                // edit: insert
                return localize('aria.insert', 'line {0}, inserting {1}', element.edit.textEdit.textEdit.range.startLineNumber, element.selecting);
            }
        }
        return null;
    }
};
BulkEditAccessibilityProvider = __decorate([
    __param(0, ILabelService)
], BulkEditAccessibilityProvider);
export { BulkEditAccessibilityProvider };
// --- IDENT
export class BulkEditIdentityProvider {
    getId(element) {
        if (element instanceof FileElement) {
            return (element.edit.uri +
                (element.parent instanceof CategoryElement
                    ? JSON.stringify(element.parent.category.metadata)
                    : ''));
        }
        else if (element instanceof TextEditElement) {
            return element.parent.edit.uri.toString() + element.idx;
        }
        else {
            return JSON.stringify(element.category.metadata);
        }
    }
}
// --- RENDERER
class CategoryElementTemplate {
    constructor(container) {
        container.classList.add('category');
        this.icon = document.createElement('div');
        container.appendChild(this.icon);
        this.label = new IconLabel(container);
    }
}
let CategoryElementRenderer = class CategoryElementRenderer {
    static { CategoryElementRenderer_1 = this; }
    static { this.id = 'CategoryElementRenderer'; }
    constructor(_themeService) {
        this._themeService = _themeService;
        this.templateId = CategoryElementRenderer_1.id;
    }
    renderTemplate(container) {
        return new CategoryElementTemplate(container);
    }
    renderElement(node, _index, template) {
        template.icon.style.setProperty('--background-dark', null);
        template.icon.style.setProperty('--background-light', null);
        template.icon.style.color = '';
        const { metadata } = node.element.category;
        if (ThemeIcon.isThemeIcon(metadata.iconPath)) {
            // css
            const className = ThemeIcon.asClassName(metadata.iconPath);
            template.icon.className = className ? `theme-icon ${className}` : '';
            template.icon.style.color = metadata.iconPath.color
                ? (this._themeService.getColorTheme().getColor(metadata.iconPath.color.id)?.toString() ??
                    '')
                : '';
        }
        else if (URI.isUri(metadata.iconPath)) {
            // background-image
            template.icon.className = 'uri-icon';
            template.icon.style.setProperty('--background-dark', css.asCSSUrl(metadata.iconPath));
            template.icon.style.setProperty('--background-light', css.asCSSUrl(metadata.iconPath));
        }
        else if (metadata.iconPath) {
            // background-image
            template.icon.className = 'uri-icon';
            template.icon.style.setProperty('--background-dark', css.asCSSUrl(metadata.iconPath.dark));
            template.icon.style.setProperty('--background-light', css.asCSSUrl(metadata.iconPath.light));
        }
        template.label.setLabel(metadata.label, metadata.description, {
            descriptionMatches: createMatches(node.filterData),
        });
    }
    disposeTemplate(template) {
        template.label.dispose();
    }
};
CategoryElementRenderer = CategoryElementRenderer_1 = __decorate([
    __param(0, IThemeService)
], CategoryElementRenderer);
export { CategoryElementRenderer };
let FileElementTemplate = class FileElementTemplate {
    constructor(container, resourceLabels, _labelService) {
        this._labelService = _labelService;
        this._disposables = new DisposableStore();
        this._localDisposables = new DisposableStore();
        this._checkbox = document.createElement('input');
        this._checkbox.className = 'edit-checkbox';
        this._checkbox.type = 'checkbox';
        this._checkbox.setAttribute('role', 'checkbox');
        container.appendChild(this._checkbox);
        this._label = resourceLabels.create(container, { supportHighlights: true });
        this._details = document.createElement('span');
        this._details.className = 'details';
        container.appendChild(this._details);
    }
    dispose() {
        this._localDisposables.dispose();
        this._disposables.dispose();
        this._label.dispose();
    }
    set(element, score) {
        this._localDisposables.clear();
        this._checkbox.checked = element.isChecked();
        this._checkbox.disabled = element.isDisabled();
        this._localDisposables.add(dom.addDisposableListener(this._checkbox, 'change', () => {
            element.setChecked(this._checkbox.checked);
        }));
        if (element.edit.type & 8 /* BulkFileOperationType.Rename */ && element.edit.newUri) {
            // rename: oldName → newName
            this._label.setResource({
                resource: element.edit.uri,
                name: localize('rename.label', '{0} → {1}', this._labelService.getUriLabel(element.edit.uri, { relative: true }), this._labelService.getUriLabel(element.edit.newUri, { relative: true })),
            }, {
                fileDecorations: { colors: true, badges: false },
            });
            this._details.innerText = localize('detail.rename', '(renaming)');
        }
        else {
            // create, delete, edit: NAME
            const options = {
                matches: createMatches(score),
                fileKind: FileKind.FILE,
                fileDecorations: { colors: true, badges: false },
                extraClasses: [],
            };
            if (element.edit.type & 2 /* BulkFileOperationType.Create */) {
                this._details.innerText = localize('detail.create', '(creating)');
            }
            else if (element.edit.type & 4 /* BulkFileOperationType.Delete */) {
                this._details.innerText = localize('detail.del', '(deleting)');
                options.extraClasses.push('delete');
            }
            else {
                this._details.innerText = '';
            }
            this._label.setFile(element.edit.uri, options);
        }
    }
};
FileElementTemplate = __decorate([
    __param(2, ILabelService)
], FileElementTemplate);
let FileElementRenderer = class FileElementRenderer {
    static { FileElementRenderer_1 = this; }
    static { this.id = 'FileElementRenderer'; }
    constructor(_resourceLabels, _labelService) {
        this._resourceLabels = _resourceLabels;
        this._labelService = _labelService;
        this.templateId = FileElementRenderer_1.id;
    }
    renderTemplate(container) {
        return new FileElementTemplate(container, this._resourceLabels, this._labelService);
    }
    renderElement(node, _index, template) {
        template.set(node.element, node.filterData);
    }
    disposeTemplate(template) {
        template.dispose();
    }
};
FileElementRenderer = FileElementRenderer_1 = __decorate([
    __param(1, ILabelService)
], FileElementRenderer);
export { FileElementRenderer };
let TextEditElementTemplate = class TextEditElementTemplate {
    constructor(container, _themeService) {
        this._themeService = _themeService;
        this._disposables = new DisposableStore();
        this._localDisposables = new DisposableStore();
        container.classList.add('textedit');
        this._checkbox = document.createElement('input');
        this._checkbox.className = 'edit-checkbox';
        this._checkbox.type = 'checkbox';
        this._checkbox.setAttribute('role', 'checkbox');
        container.appendChild(this._checkbox);
        this._icon = document.createElement('div');
        container.appendChild(this._icon);
        this._label = this._disposables.add(new HighlightedLabel(container));
    }
    dispose() {
        this._localDisposables.dispose();
        this._disposables.dispose();
    }
    set(element) {
        this._localDisposables.clear();
        this._localDisposables.add(dom.addDisposableListener(this._checkbox, 'change', (e) => {
            element.setChecked(this._checkbox.checked);
            e.preventDefault();
        }));
        if (element.parent.isChecked()) {
            this._checkbox.checked = element.isChecked();
            this._checkbox.disabled = element.isDisabled();
        }
        else {
            this._checkbox.checked = element.isChecked();
            this._checkbox.disabled = element.isDisabled();
        }
        let value = '';
        value += element.prefix;
        value += element.selecting;
        value += element.inserting;
        value += element.suffix;
        const selectHighlight = {
            start: element.prefix.length,
            end: element.prefix.length + element.selecting.length,
            extraClasses: ['remove'],
        };
        const insertHighlight = {
            start: selectHighlight.end,
            end: selectHighlight.end + element.inserting.length,
            extraClasses: ['insert'],
        };
        let title;
        const { metadata } = element.edit.textEdit;
        if (metadata && metadata.description) {
            title = localize('title', '{0} - {1}', metadata.label, metadata.description);
        }
        else if (metadata) {
            title = metadata.label;
        }
        const iconPath = metadata?.iconPath;
        if (!iconPath) {
            this._icon.style.display = 'none';
        }
        else {
            this._icon.style.display = 'block';
            this._icon.style.setProperty('--background-dark', null);
            this._icon.style.setProperty('--background-light', null);
            if (ThemeIcon.isThemeIcon(iconPath)) {
                // css
                const className = ThemeIcon.asClassName(iconPath);
                this._icon.className = className ? `theme-icon ${className}` : '';
                this._icon.style.color = iconPath.color
                    ? (this._themeService.getColorTheme().getColor(iconPath.color.id)?.toString() ?? '')
                    : '';
            }
            else if (URI.isUri(iconPath)) {
                // background-image
                this._icon.className = 'uri-icon';
                this._icon.style.setProperty('--background-dark', css.asCSSUrl(iconPath));
                this._icon.style.setProperty('--background-light', css.asCSSUrl(iconPath));
            }
            else {
                // background-image
                this._icon.className = 'uri-icon';
                this._icon.style.setProperty('--background-dark', css.asCSSUrl(iconPath.dark));
                this._icon.style.setProperty('--background-light', css.asCSSUrl(iconPath.light));
            }
        }
        this._label.set(value, [selectHighlight, insertHighlight], title, true);
        this._icon.title = title || '';
    }
};
TextEditElementTemplate = __decorate([
    __param(1, IThemeService)
], TextEditElementTemplate);
let TextEditElementRenderer = class TextEditElementRenderer {
    static { TextEditElementRenderer_1 = this; }
    static { this.id = 'TextEditElementRenderer'; }
    constructor(_themeService) {
        this._themeService = _themeService;
        this.templateId = TextEditElementRenderer_1.id;
    }
    renderTemplate(container) {
        return new TextEditElementTemplate(container, this._themeService);
    }
    renderElement({ element }, _index, template) {
        template.set(element);
    }
    disposeTemplate(_template) { }
};
TextEditElementRenderer = TextEditElementRenderer_1 = __decorate([
    __param(0, IThemeService)
], TextEditElementRenderer);
export { TextEditElementRenderer };
export class BulkEditDelegate {
    getHeight() {
        return 23;
    }
    getTemplateId(element) {
        if (element instanceof FileElement) {
            return FileElementRenderer.id;
        }
        else if (element instanceof TextEditElement) {
            return TextEditElementRenderer.id;
        }
        else {
            return CategoryElementRenderer.id;
        }
    }
}
export class BulkEditNaviLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (element instanceof FileElement) {
            return basename(element.edit.uri);
        }
        else if (element instanceof CategoryElement) {
            return element.category.metadata.label;
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9wcmV2aWV3L2J1bGtFZGl0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFRaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWpGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxxRUFBcUUsQ0FBQTtBQU01RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixrQkFBa0IsR0FLbEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxLQUFLLEdBQUcsTUFBTSx5Q0FBeUMsQ0FBQTtBQVM5RCxNQUFNLE9BQU8sZUFBZTtJQUMzQixZQUNVLE1BQTBCLEVBQzFCLFFBQXNCO1FBRHRCLFdBQU0sR0FBTixNQUFNLENBQW9CO1FBQzFCLGFBQVEsR0FBUixRQUFRLENBQWM7SUFDN0IsQ0FBQztJQUVKLFNBQVM7UUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQ3pCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQTtRQUNsQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDakQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ2hELE9BQU8sR0FBRyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBYztRQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNqRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztnQkFDaEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDVSxNQUE0QyxFQUM1QyxJQUF1QjtRQUR2QixXQUFNLEdBQU4sTUFBTSxDQUFzQztRQUM1QyxTQUFJLEdBQUosSUFBSSxDQUFtQjtJQUM5QixDQUFDO0lBRUosU0FBUztRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLFlBQVksZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUV2RixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFFbEIsb0RBQW9EO1FBQ3BELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLDJDQUFtQyxFQUFFLENBQUM7WUFDdkQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3JELElBQUksSUFBSSxZQUFZLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sR0FBRyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7UUFFRCwyREFBMkQ7UUFDM0QsSUFDQyxJQUFJLENBQUMsTUFBTSxZQUFZLGVBQWU7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLDJDQUFtQyxFQUNoRCxDQUFDO1lBQ0YsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3pDLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUM1QyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzt3QkFDdEQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7NEJBQ2hELElBQUksSUFBSSxZQUFZLGdCQUFnQixFQUFFLENBQUM7Z0NBQ3RDLE9BQU8sR0FBRyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7NEJBQ25ELENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFjO1FBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLFlBQVksZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUN2RixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDckQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCw2REFBNkQ7UUFDN0QsSUFDQyxJQUFJLENBQUMsTUFBTSxZQUFZLGVBQWU7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLDJDQUFtQyxFQUNoRCxDQUFDO1lBQ0YsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3pDLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUM1QyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzt3QkFDdEQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7NEJBQ2hELEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTt3QkFDekMsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFDQyxJQUFJLENBQUMsTUFBTSxZQUFZLGVBQWU7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLDJDQUFtQyxFQUNoRCxDQUFDO1lBQ0YsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7WUFDaEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2xCLEtBQUssTUFBTSxRQUFRLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7d0JBQ3RELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDOzRCQUNoRCxJQUFJLElBQUksWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO2dDQUN0QyxPQUFPLEdBQUcsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBOzRCQUNuRCxDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sQ0FBQyxPQUFPLENBQUE7UUFDaEIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGVBQWU7SUFDM0IsWUFDVSxNQUFtQixFQUNuQixHQUFXLEVBQ1gsSUFBa0IsRUFDbEIsTUFBYyxFQUNkLFNBQWlCLEVBQ2pCLFNBQWlCLEVBQ2pCLE1BQWM7UUFOZCxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxTQUFJLEdBQUosSUFBSSxDQUFjO1FBQ2xCLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQUNyQixDQUFDO0lBRUosU0FBUztRQUNSLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQzlCLElBQUksS0FBSyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ3RDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFjO1FBQ3hCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQzlCLElBQUksS0FBSyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ3RDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO1FBQ3JCLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdEQsOERBQThEO1FBQzlELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUM1RCxJQUFJLElBQUksWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO29CQUN0QyxDQUFDO29CQUFxQixLQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ2hFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ2hDLENBQUM7Q0FDRDtBQUlELGtCQUFrQjtBQUVYLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBRzlCLFlBQ29CLGlCQUFxRCxFQUNqRCxxQkFBNkQ7UUFEaEQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSjlFLGdCQUFXLEdBQVksSUFBSSxDQUFBO0lBSy9CLENBQUM7SUFFSixXQUFXLENBQUMsT0FBNkM7UUFDeEQsSUFBSSxPQUFPLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDcEMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFDRCxJQUFJLE9BQU8sWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUN4QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQTZDO1FBQzlELDBCQUEwQjtRQUMxQixJQUFJLE9BQU8sWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFdBQVc7Z0JBQ3RCLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksZUFBZSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7UUFFRCxXQUFXO1FBQ1gsSUFBSSxPQUFPLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDeEMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksT0FBTyxZQUFZLFdBQVcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekUsa0ZBQWtGO1lBQ2xGLElBQUksU0FBcUIsQ0FBQTtZQUN6QixJQUFJLG1CQUFnQyxDQUFBO1lBQ3BDLElBQUksQ0FBQztnQkFDSixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUMvRSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7Z0JBQ3RDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQTtZQUMxQixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUNwRCxTQUFTLEVBQ1QsRUFBRSxFQUNGLHFCQUFxQixFQUNyQixTQUFTLENBQUMsd0JBQXdCLEVBQ2xDLElBQUksQ0FDSixDQUFBO2dCQUNELG1CQUFtQixHQUFHLFNBQVMsQ0FBQTtZQUNoQyxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUN2RCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUVuRSxhQUFhO2dCQUNiLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDL0UsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFBLENBQUMsK0NBQStDO2dCQUNsRSxLQUNDLElBQUksR0FBRyxHQUFHLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDdkUsU0FBUyxHQUFHLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUMxQixHQUFHLEVBQUUsRUFDSixDQUFDO29CQUNGLFNBQVMsR0FBRyxLQUFLLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2hFLENBQUM7Z0JBRUQsYUFBYTtnQkFDYixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzNFLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtnQkFDakIsS0FDQyxJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFDL0QsU0FBUyxHQUFHLEVBQUUsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUM1QyxHQUFHLEVBQUUsRUFDSixDQUFDO29CQUNGLFNBQVMsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3pFLENBQUM7Z0JBRUQsT0FBTyxJQUFJLGVBQWUsQ0FDekIsT0FBTyxFQUNQLEdBQUcsRUFDSCxJQUFJLEVBQ0osU0FBUyxDQUFDLGVBQWUsQ0FDeEIsSUFBSSxLQUFLLENBQ1IsS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLFdBQVcsR0FBRyxTQUFTLEVBQzdCLEtBQUssQ0FBQyxlQUFlLEVBQ3JCLEtBQUssQ0FBQyxXQUFXLENBQ2pCLENBQ0QsRUFDRCxTQUFTLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUNoQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWU7b0JBQ3RDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJO29CQUM3QixDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFDMUQsU0FBUyxDQUFDLGVBQWUsQ0FDeEIsSUFBSSxLQUFLLENBQ1IsS0FBSyxDQUFDLGFBQWEsRUFDbkIsS0FBSyxDQUFDLFNBQVMsRUFDZixLQUFLLENBQUMsYUFBYSxFQUNuQixLQUFLLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FDM0IsQ0FDRCxDQUNELENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUVGLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzdCLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNELENBQUE7QUE3R1ksa0JBQWtCO0lBSTVCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQUxYLGtCQUFrQixDQTZHOUI7O0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFDMUIsT0FBTyxDQUFDLENBQWtCLEVBQUUsQ0FBa0I7UUFDN0MsSUFBSSxDQUFDLFlBQVksV0FBVyxJQUFJLENBQUMsWUFBWSxXQUFXLEVBQUUsQ0FBQztZQUMxRCxPQUFPLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxlQUFlLElBQUksQ0FBQyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ2xFLE9BQU8sS0FBSyxDQUFDLHdCQUF3QixDQUNwQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUM5QixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUM5QixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLENBQW9CLEVBQUUsQ0FBb0I7SUFDbkYsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7QUFDbkQsQ0FBQztBQUVELGNBQWM7QUFFUCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjtJQUN6QyxZQUE0QyxhQUE0QjtRQUE1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtJQUFHLENBQUM7SUFFNUUsa0JBQWtCO1FBQ2pCLE9BQU8sUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQXlCO1FBQ2hDLE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBd0I7UUFDcEMsSUFBSSxPQUFPLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDcEMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUErQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzdFLE9BQU8sUUFBUSxDQUNkLG9CQUFvQixFQUNwQiw2Q0FBNkMsRUFDN0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDcEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDdkUsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUErQixFQUFFLENBQUM7b0JBQzdELE9BQU8sUUFBUSxDQUNkLG9CQUFvQixFQUNwQixzQ0FBc0MsRUFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDcEUsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUErQixFQUFFLENBQUM7b0JBQzdELE9BQU8sUUFBUSxDQUNkLG9CQUFvQixFQUNwQixzQ0FBc0MsRUFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDcEUsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxRQUFRLENBQ2QsZUFBZSxFQUNmLHdCQUF3QixFQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNwRSxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksdUNBQStCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDN0UsT0FBTyxRQUFRLENBQ2QsYUFBYSxFQUNiLHFCQUFxQixFQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUN2RSxDQUFBO2dCQUNGLENBQUM7cUJBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksdUNBQStCLEVBQUUsQ0FBQztvQkFDN0QsT0FBTyxRQUFRLENBQ2QsYUFBYSxFQUNiLGNBQWMsRUFDZCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNwRSxDQUFBO2dCQUNGLENBQUM7cUJBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksdUNBQStCLEVBQUUsQ0FBQztvQkFDN0QsT0FBTyxRQUFRLENBQ2QsYUFBYSxFQUNiLGNBQWMsRUFDZCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNwRSxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksT0FBTyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ3hDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNsRSxnQkFBZ0I7Z0JBQ2hCLE9BQU8sUUFBUSxDQUNkLGNBQWMsRUFDZCxrQ0FBa0MsRUFDbEMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ3BELE9BQU8sQ0FBQyxTQUFTLEVBQ2pCLE9BQU8sQ0FBQyxTQUFTLENBQ2pCLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzRSxlQUFlO2dCQUNmLE9BQU8sUUFBUSxDQUNkLFVBQVUsRUFDVix3QkFBd0IsRUFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ3BELE9BQU8sQ0FBQyxTQUFTLENBQ2pCLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzRSxlQUFlO2dCQUNmLE9BQU8sUUFBUSxDQUNkLGFBQWEsRUFDYix5QkFBeUIsRUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ3BELE9BQU8sQ0FBQyxTQUFTLENBQ2pCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUEvRlksNkJBQTZCO0lBQzVCLFdBQUEsYUFBYSxDQUFBO0dBRGQsNkJBQTZCLENBK0Z6Qzs7QUFFRCxZQUFZO0FBRVosTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxLQUFLLENBQUMsT0FBd0I7UUFDN0IsSUFBSSxPQUFPLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDcEMsT0FBTyxDQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRztnQkFDaEIsQ0FBQyxPQUFPLENBQUMsTUFBTSxZQUFZLGVBQWU7b0JBQ3pDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztvQkFDbEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUNOLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxPQUFPLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDL0MsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQTtRQUN4RCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxlQUFlO0FBRWYsTUFBTSx1QkFBdUI7SUFJNUIsWUFBWSxTQUFzQjtRQUNqQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBQ0Q7QUFFTSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1Qjs7YUFHbkIsT0FBRSxHQUFXLHlCQUF5QixBQUFwQyxDQUFvQztJQUl0RCxZQUEyQixhQUE2QztRQUE1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUYvRCxlQUFVLEdBQVcseUJBQXVCLENBQUMsRUFBRSxDQUFBO0lBRW1CLENBQUM7SUFFNUUsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE9BQU8sSUFBSSx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsYUFBYSxDQUNaLElBQTRDLEVBQzVDLE1BQWMsRUFDZCxRQUFpQztRQUVqQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUQsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUE7UUFFOUIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQzFDLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM5QyxNQUFNO1lBQ04sTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUQsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxjQUFjLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDcEUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSztnQkFDbEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFO29CQUNyRixFQUFFLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNOLENBQUM7YUFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDekMsbUJBQW1CO1lBQ25CLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQTtZQUNwQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUNyRixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN2RixDQUFDO2FBQU0sSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDOUIsbUJBQW1CO1lBQ25CLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQTtZQUNwQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDMUYsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFFRCxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDN0Qsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7U0FDbEQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUFpQztRQUNoRCxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7O0FBbERXLHVCQUF1QjtJQU90QixXQUFBLGFBQWEsQ0FBQTtHQVBkLHVCQUF1QixDQW1EbkM7O0FBRUQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFReEIsWUFDQyxTQUFzQixFQUN0QixjQUE4QixFQUNmLGFBQTZDO1FBQTVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBVjVDLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNwQyxzQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBV3pELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUE7UUFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVyQyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUUzRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQ25DLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRUQsR0FBRyxDQUFDLE9BQW9CLEVBQUUsS0FBNkI7UUFDdEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTlCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDekIsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUN4RCxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDM0MsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUErQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDN0UsNEJBQTRCO1lBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUN0QjtnQkFDQyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUMxQixJQUFJLEVBQUUsUUFBUSxDQUNiLGNBQWMsRUFDZCxXQUFXLEVBQ1gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDcEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDdkU7YUFDRCxFQUNEO2dCQUNDLGVBQWUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTthQUNoRCxDQUNELENBQUE7WUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2xFLENBQUM7YUFBTSxDQUFDO1lBQ1AsNkJBQTZCO1lBQzdCLE1BQU0sT0FBTyxHQUFHO2dCQUNmLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDO2dCQUM3QixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7Z0JBQ3ZCLGVBQWUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtnQkFDaEQsWUFBWSxFQUFZLEVBQUU7YUFDMUIsQ0FBQTtZQUNELElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUErQixFQUFFLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDbEUsQ0FBQztpQkFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSx1Q0FBK0IsRUFBRSxDQUFDO2dCQUM3RCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO2dCQUM5RCxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNwQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1lBQzdCLENBQUM7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFoRkssbUJBQW1CO0lBV3RCLFdBQUEsYUFBYSxDQUFBO0dBWFYsbUJBQW1CLENBZ0Z4QjtBQUVNLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1COzthQUdmLE9BQUUsR0FBVyxxQkFBcUIsQUFBaEMsQ0FBZ0M7SUFJbEQsWUFDa0IsZUFBK0IsRUFDakMsYUFBNkM7UUFEM0Msb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQ2hCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBSnBELGVBQVUsR0FBVyxxQkFBbUIsQ0FBQyxFQUFFLENBQUE7SUFLakQsQ0FBQztJQUVKLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxPQUFPLElBQUksbUJBQW1CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFRCxhQUFhLENBQ1osSUFBd0MsRUFDeEMsTUFBYyxFQUNkLFFBQTZCO1FBRTdCLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUE2QjtRQUM1QyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkIsQ0FBQzs7QUExQlcsbUJBQW1CO0lBUzdCLFdBQUEsYUFBYSxDQUFBO0dBVEgsbUJBQW1CLENBMkIvQjs7QUFFRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQVE1QixZQUNDLFNBQXNCLEVBQ1AsYUFBNkM7UUFBNUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFUNUMsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3BDLHNCQUFpQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFVekQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUE7UUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQy9DLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXJDLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVqQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFRCxHQUFHLENBQUMsT0FBd0I7UUFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTlCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ3pCLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pELE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMxQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDbkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQTtZQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDL0MsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQy9DLENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDZCxLQUFLLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUN2QixLQUFLLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQTtRQUMxQixLQUFLLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQTtRQUMxQixLQUFLLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUV2QixNQUFNLGVBQWUsR0FBZTtZQUNuQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNO1lBQzVCLEdBQUcsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU07WUFDckQsWUFBWSxFQUFFLENBQUMsUUFBUSxDQUFDO1NBQ3hCLENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBZTtZQUNuQyxLQUFLLEVBQUUsZUFBZSxDQUFDLEdBQUc7WUFDMUIsR0FBRyxFQUFFLGVBQWUsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNO1lBQ25ELFlBQVksRUFBRSxDQUFDLFFBQVEsQ0FBQztTQUN4QixDQUFBO1FBRUQsSUFBSSxLQUF5QixDQUFBO1FBQzdCLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUMxQyxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdFLENBQUM7YUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxRQUFRLEVBQUUsUUFBUSxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBRWxDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN2RCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFeEQsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU07Z0JBQ04sTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxjQUFjLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7Z0JBQ2pFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSztvQkFDdEMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7b0JBQ3BGLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDTixDQUFDO2lCQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxtQkFBbUI7Z0JBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQTtnQkFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtnQkFDekUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUMzRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsbUJBQW1CO2dCQUNuQixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUE7Z0JBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUM5RSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNqRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0NBQ0QsQ0FBQTtBQXpHSyx1QkFBdUI7SUFVMUIsV0FBQSxhQUFhLENBQUE7R0FWVix1QkFBdUIsQ0F5RzVCO0FBRU0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7O2FBR25CLE9BQUUsR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNEI7SUFJOUMsWUFBMkIsYUFBNkM7UUFBNUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFGL0QsZUFBVSxHQUFXLHlCQUF1QixDQUFDLEVBQUUsQ0FBQTtJQUVtQixDQUFDO0lBRTVFLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxPQUFPLElBQUksdUJBQXVCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsYUFBYSxDQUNaLEVBQUUsT0FBTyxFQUEwQyxFQUNuRCxNQUFjLEVBQ2QsUUFBaUM7UUFFakMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsZUFBZSxDQUFDLFNBQWtDLElBQVMsQ0FBQzs7QUFyQmhELHVCQUF1QjtJQU90QixXQUFBLGFBQWEsQ0FBQTtHQVBkLHVCQUF1QixDQXNCbkM7O0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQUM1QixTQUFTO1FBQ1IsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXdCO1FBQ3JDLElBQUksT0FBTyxZQUFZLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sbUJBQW1CLENBQUMsRUFBRSxDQUFBO1FBQzlCLENBQUM7YUFBTSxJQUFJLE9BQU8sWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUMvQyxPQUFPLHVCQUF1QixDQUFDLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sdUJBQXVCLENBQUMsRUFBRSxDQUFBO1FBQ2xDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBR3JDLDBCQUEwQixDQUFDLE9BQXdCO1FBQ2xELElBQUksT0FBTyxZQUFZLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbEMsQ0FBQzthQUFNLElBQUksT0FBTyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQy9DLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0QifQ==