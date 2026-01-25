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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3R5cGVIaWVyYXJjaHkvYnJvd3Nlci90eXBlSGllcmFyY2h5VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBR04sa0JBQWtCLEdBQ2xCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0UsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFhLE1BQU0sd0NBQXdDLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE1BQU0sT0FBTyxJQUFJO0lBQ2hCLFlBQ1UsSUFBdUIsRUFDdkIsS0FBeUIsRUFDekIsTUFBd0I7UUFGeEIsU0FBSSxHQUFKLElBQUksQ0FBbUI7UUFDdkIsVUFBSyxHQUFMLEtBQUssQ0FBb0I7UUFDekIsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFDL0IsQ0FBQztJQUVKLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBTyxFQUFFLENBQU87UUFDOUIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJ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