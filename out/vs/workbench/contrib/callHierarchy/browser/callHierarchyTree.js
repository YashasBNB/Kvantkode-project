/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CallHierarchyModel, } from '../common/callHierarchy.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { compare } from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export class Call {
    constructor(item, locations, model, parent) {
        this.item = item;
        this.locations = locations;
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
        if (element instanceof CallHierarchyModel) {
            return element.roots.map((root) => new Call(root, undefined, element, undefined));
        }
        const { model, item } = element;
        if (this.getDirection() === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */) {
            return (await model.resolveOutgoingCalls(item, CancellationToken.None)).map((call) => {
                return new Call(call.to, call.fromRanges.map((range) => ({ range, uri: item.uri })), model, element);
            });
        }
        else {
            return (await model.resolveIncomingCalls(item, CancellationToken.None)).map((call) => {
                return new Call(call.from, call.fromRanges.map((range) => ({ range, uri: call.from.uri })), model, element);
            });
        }
    }
}
export class Sorter {
    compare(element, otherElement) {
        return Call.compare(element, otherElement);
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
class CallRenderingTemplate {
    constructor(icon, label) {
        this.icon = icon;
        this.label = label;
    }
}
export class CallRenderer {
    constructor() {
        this.templateId = CallRenderer.id;
    }
    static { this.id = 'CallRenderer'; }
    renderTemplate(container) {
        container.classList.add('callhierarchy-element');
        const icon = document.createElement('div');
        container.appendChild(icon);
        const label = new IconLabel(container, { supportHighlights: true });
        return new CallRenderingTemplate(icon, label);
    }
    renderElement(node, _index, template) {
        const { element, filterData } = node;
        const deprecated = element.item.tags?.includes(1 /* SymbolTag.Deprecated */);
        template.icon.className = '';
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
        return CallRenderer.id;
    }
}
export class AccessibilityProvider {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    getWidgetAriaLabel() {
        return localize('tree.aria', 'Call Hierarchy');
    }
    getAriaLabel(element) {
        if (this.getDirection() === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */) {
            return localize('from', 'calls from {0}', element.item.name);
        }
        else {
            return localize('to', 'callers of {0}', element.item.name);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jYWxsSGllcmFyY2h5L2Jyb3dzZXIvY2FsbEhpZXJhcmNoeVRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUdOLGtCQUFrQixHQUNsQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTNFLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBdUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEUsTUFBTSxPQUFPLElBQUk7SUFDaEIsWUFDVSxJQUF1QixFQUN2QixTQUFpQyxFQUNqQyxLQUF5QixFQUN6QixNQUF3QjtRQUh4QixTQUFJLEdBQUosSUFBSSxDQUFtQjtRQUN2QixjQUFTLEdBQVQsU0FBUyxDQUF3QjtRQUNqQyxVQUFLLEdBQUwsS0FBSyxDQUFvQjtRQUN6QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUMvQixDQUFDO0lBRUosTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFPLEVBQUUsQ0FBTztRQUM5QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFH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