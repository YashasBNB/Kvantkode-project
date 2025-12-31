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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc1RyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvcGVlay9yZWZlcmVuY2VzVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBWWpGLE9BQU8sRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFVLE1BQU0sdUNBQXVDLENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQU05RSxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFV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