/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TypeHierarchyModel, } from '../common/typeHierarchy.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { compare } from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export class Type {
    constructor(item, model, parent) {
        this.item = item;
        this.model = model;
        this.parent = parent;
    }
    static compare(a, b) {
        let res = compare(a.item.uri.toString(), b.item.uri.toString());
        if (res === 0) {
            res = Range.compareRangesUsingStarts(a.item.range, b.item.range);
        }
        return res;
    }
}
export class DataSource {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    hasChildren() {
        return true;
    }
    async getChildren(element) {
        if (element instanceof TypeHierarchyModel) {
            return element.roots.map((root) => new Type(root, element, undefined));
        }
        const { model, item } = element;
        if (this.getDirection() === "supertypes" /* TypeHierarchyDirection.Supertypes */) {
            return (await model.provideSupertypes(item, CancellationToken.None)).map((item) => {
                return new Type(item, model, element);
            });
        }
        else {
            return (await model.provideSubtypes(item, CancellationToken.None)).map((item) => {
                return new Type(item, model, element);
            });
        }
    }
}
export class Sorter {
    compare(element, otherElement) {
        return Type.compare(element, otherElement);
    }
}
export class IdentityProvider {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    getId(element) {
        let res = this.getDirection() + JSON.stringify(element.item.uri) + JSON.stringify(element.item.range);
        if (element.parent) {
            res += this.getId(element.parent);
        }
        return res;
    }
}
class TypeRenderingTemplate {
    constructor(icon, label) {
        this.icon = icon;
        this.label = label;
    }
}
export class TypeRenderer {
    constructor() {
        this.templateId = TypeRenderer.id;
    }
    static { this.id = 'TypeRenderer'; }
    renderTemplate(container) {
        container.classList.add('typehierarchy-element');
        const icon = document.createElement('div');
        container.appendChild(icon);
        const label = new IconLabel(container, { supportHighlights: true });
        return new TypeRenderingTemplate(icon, label);
    }
    renderElement(node, _index, template) {
        const { element, filterData } = node;
        const deprecated = element.item.tags?.includes(1 /* SymbolTag.Deprecated */);
        template.icon.classList.add('inline', ...ThemeIcon.asClassNameArray(SymbolKinds.toIcon(element.item.kind)));
        template.label.setLabel(element.item.name, element.item.detail, {
            labelEscapeNewLines: true,
            matches: createMatches(filterData),
            strikethrough: deprecated,
        });
    }
    disposeTemplate(template) {
        template.label.dispose();
    }
}
export class VirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return TypeRenderer.id;
    }
}
export class AccessibilityProvider {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    getWidgetAriaLabel() {
        return localize('tree.aria', 'Type Hierarchy');
    }
    getAriaLabel(element) {
        if (this.getDirection() === "supertypes" /* TypeHierarchyDirection.Supertypes */) {
            return localize('supertypes', 'supertypes of {0}', element.item.name);
        }
        else {
            return localize('subtypes', 'subtypes of {0}', element.item.name);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90eXBlSGllcmFyY2h5L2Jyb3dzZXIvdHlwZUhpZXJhcmNoeVRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUdOLGtCQUFrQixHQUNsQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTNFLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBYSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxNQUFNLE9BQU8sSUFBSTtJQUNoQixZQUNVLElBQXVCLEVBQ3ZCLEtBQXlCLEVBQ3pCLE1BQXdCO1FBRnhCLFNBQUksR0FBSixJQUFJLENBQW1CO1FBQ3ZCLFVBQUssR0FBTCxLQUFLLENBQW9CO1FBQ3pCLFdBQU0sR0FBTixNQUFNLENBQWtCO0lBQy9CLENBQUM7SUFFSixNQUFNLENBQUMsT0FBTyxDQUFDLENBQU8sRUFBRSxDQUFPO1FBQzlCLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFD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