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
var FileReferencesRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { CountBadge } from '../../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { createMatches, FuzzyScore } from '../../../../../base/common/filters.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { defaultCountBadgeStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { FileReferences, OneReference, ReferencesModel } from '../referencesModel.js';
let DataSource = class DataSource {
    constructor(_resolverService) {
        this._resolverService = _resolverService;
    }
    hasChildren(element) {
        if (element instanceof ReferencesModel) {
            return true;
        }
        if (element instanceof FileReferences) {
            return true;
        }
        return false;
    }
    getChildren(element) {
        if (element instanceof ReferencesModel) {
            return element.groups;
        }
        if (element instanceof FileReferences) {
            return element.resolve(this._resolverService).then((val) => {
                // if (element.failure) {
                // 	// refresh the element on failure so that
                // 	// we can update its rendering
                // 	return tree.refresh(element).then(() => val.children);
                // }
                return val.children;
            });
        }
        throw new Error('bad tree');
    }
};
DataSource = __decorate([
    __param(0, ITextModelService)
], DataSource);
export { DataSource };
//#endregion
export class Delegate {
    getHeight() {
        return 23;
    }
    getTemplateId(element) {
        if (element instanceof FileReferences) {
            return FileReferencesRenderer.id;
        }
        else {
            return OneReferenceRenderer.id;
        }
    }
}
let StringRepresentationProvider = class StringRepresentationProvider {
    constructor(_keybindingService) {
        this._keybindingService = _keybindingService;
    }
    getKeyboardNavigationLabel(element) {
        if (element instanceof OneReference) {
            const parts = element.parent.getPreview(element)?.preview(element.range);
            if (parts) {
                return parts.value;
            }
        }
        // FileReferences or unresolved OneReference
        return basename(element.uri);
    }
    mightProducePrintableCharacter(event) {
        return this._keybindingService.mightProducePrintableCharacter(event);
    }
};
StringRepresentationProvider = __decorate([
    __param(0, IKeybindingService)
], StringRepresentationProvider);
export { StringRepresentationProvider };
export class IdentityProvider {
    getId(element) {
        return element instanceof OneReference ? element.id : element.uri;
    }
}
//#region render: File
let FileReferencesTemplate = class FileReferencesTemplate extends Disposable {
    constructor(container, _labelService) {
        super();
        this._labelService = _labelService;
        const parent = document.createElement('div');
        parent.classList.add('reference-file');
        this.file = this._register(new IconLabel(parent, { supportHighlights: true }));
        this.badge = this._register(new CountBadge(dom.append(parent, dom.$('.count')), {}, defaultCountBadgeStyles));
        container.appendChild(parent);
    }
    set(element, matches) {
        const parent = dirname(element.uri);
        this.file.setLabel(this._labelService.getUriBasenameLabel(element.uri), this._labelService.getUriLabel(parent, { relative: true }), { title: this._labelService.getUriLabel(element.uri), matches });
        const len = element.children.length;
        this.badge.setCount(len);
        if (len > 1) {
            this.badge.setTitleFormat(localize('referencesCount', '{0} references', len));
        }
        else {
            this.badge.setTitleFormat(localize('referenceCount', '{0} reference', len));
        }
    }
};
FileReferencesTemplate = __decorate([
    __param(1, ILabelService)
], FileReferencesTemplate);
let FileReferencesRenderer = class FileReferencesRenderer {
    static { FileReferencesRenderer_1 = this; }
    static { this.id = 'FileReferencesRenderer'; }
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this.templateId = FileReferencesRenderer_1.id;
    }
    renderTemplate(container) {
        return this._instantiationService.createInstance(FileReferencesTemplate, container);
    }
    renderElement(node, index, template) {
        template.set(node.element, createMatches(node.filterData));
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
};
FileReferencesRenderer = FileReferencesRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], FileReferencesRenderer);
export { FileReferencesRenderer };
//#endregion
//#region render: Reference
class OneReferenceTemplate extends Disposable {
    constructor(container) {
        super();
        this.label = this._register(new HighlightedLabel(container));
    }
    set(element, score) {
        const preview = element.parent.getPreview(element)?.preview(element.range);
        if (!preview || !preview.value) {
            // this means we FAILED to resolve the document or the value is the empty string
            this.label.set(`${basename(element.uri)}:${element.range.startLineNumber + 1}:${element.range.startColumn + 1}`);
        }
        else {
            // render search match as highlight unless
            // we have score, then render the score
            const { value, highlight } = preview;
            if (score && !FuzzyScore.isDefault(score)) {
                this.label.element.classList.toggle('referenceMatch', false);
                this.label.set(value, createMatches(score));
            }
            else {
                this.label.element.classList.toggle('referenceMatch', true);
                this.label.set(value, [highlight]);
            }
        }
    }
}
export class OneReferenceRenderer {
    constructor() {
        this.templateId = OneReferenceRenderer.id;
    }
    static { this.id = 'OneReferenceRenderer'; }
    renderTemplate(container) {
        return new OneReferenceTemplate(container);
    }
    renderElement(node, index, templateData) {
        templateData.set(node.element, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//#endregion
export class AccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('treeAriaLabel', 'References');
    }
    getAriaLabel(element) {
        return element.ariaMessage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc1RyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9wZWVrL3JlZmVyZW5jZXNUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFZakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQVUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBTTlFLElBQU0sVUFBVSxHQUFoQixNQUFN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