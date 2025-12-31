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
var DocumentSymbolFilter_1;
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { IconLabel, } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { getAriaLabelForSymbol, symbolKindNames, SymbolKinds, } from '../../../../../editor/common/languages.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { OutlineElement, OutlineGroup, OutlineModel, } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import '../../../../../editor/contrib/symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { fillInSymbolsDragData } from '../../../../../platform/dnd/browser/dnd.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { withSelection } from '../../../../../platform/opener/common/opener.js';
import { listErrorForeground, listWarningForeground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import './documentSymbolsTree.css';
export class DocumentSymbolNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (element instanceof OutlineGroup) {
            return element.label;
        }
        else {
            return element.symbol.name;
        }
    }
}
export class DocumentSymbolAccessibilityProvider {
    constructor(_ariaLabel) {
        this._ariaLabel = _ariaLabel;
    }
    getWidgetAriaLabel() {
        return this._ariaLabel;
    }
    getAriaLabel(element) {
        if (element instanceof OutlineGroup) {
            return element.label;
        }
        else {
            return getAriaLabelForSymbol(element.symbol.name, element.symbol.kind);
        }
    }
}
export class DocumentSymbolIdentityProvider {
    getId(element) {
        return element.id;
    }
}
let DocumentSymbolDragAndDrop = class DocumentSymbolDragAndDrop {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
    }
    getDragURI(element) {
        const resource = OutlineModel.get(element)?.uri;
        if (!resource) {
            return null;
        }
        if (element instanceof OutlineElement) {
            const symbolUri = symbolRangeUri(resource, element.symbol);
            return symbolUri.fsPath + (symbolUri.fragment ? '#' + symbolUri.fragment : '');
        }
        else {
            return resource.fsPath;
        }
    }
    getDragLabel(elements, originalEvent) {
        // Multi select not supported
        if (elements.length !== 1) {
            return undefined;
        }
        const element = elements[0];
        return element instanceof OutlineElement ? element.symbol.name : element.label;
    }
    onDragStart(data, originalEvent) {
        const elements = data
            .elements;
        const item = elements[0];
        if (!item || !originalEvent.dataTransfer) {
            return;
        }
        const resource = OutlineModel.get(item)?.uri;
        if (!resource) {
            return;
        }
        const outlineElements = item instanceof OutlineElement ? [item] : Array.from(item.children.values());
        fillInSymbolsDragData(outlineElements.map((oe) => ({
            name: oe.symbol.name,
            fsPath: resource.fsPath,
            range: oe.symbol.range,
            kind: oe.symbol.kind,
        })), originalEvent);
        this._instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, outlineElements.map((oe) => ({
            resource,
            selection: oe.symbol.range,
        })), originalEvent));
    }
    onDragOver() {
        return false;
    }
    drop() { }
    dispose() { }
};
DocumentSymbolDragAndDrop = __decorate([
    __param(0, IInstantiationService)
], DocumentSymbolDragAndDrop);
export { DocumentSymbolDragAndDrop };
function symbolRangeUri(resource, symbol) {
    return withSelection(resource, symbol.range);
}
class DocumentSymbolGroupTemplate {
    static { this.id = 'DocumentSymbolGroupTemplate'; }
    constructor(labelContainer, label) {
        this.labelContainer = labelContainer;
        this.label = label;
    }
    dispose() {
        this.label.dispose();
    }
}
class DocumentSymbolTemplate {
    static { this.id = 'DocumentSymbolTemplate'; }
    constructor(container, iconLabel, iconClass, decoration) {
        this.container = container;
        this.iconLabel = iconLabel;
        this.iconClass = iconClass;
        this.decoration = decoration;
    }
}
export class DocumentSymbolVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        return element instanceof OutlineGroup
            ? DocumentSymbolGroupTemplate.id
            : DocumentSymbolTemplate.id;
    }
}
export class DocumentSymbolGroupRenderer {
    constructor() {
        this.templateId = DocumentSymbolGroupTemplate.id;
    }
    renderTemplate(container) {
        const labelContainer = dom.$('.outline-element-label');
        container.classList.add('outline-element');
        dom.append(container, labelContainer);
        return new DocumentSymbolGroupTemplate(labelContainer, new HighlightedLabel(labelContainer));
    }
    renderElement(node, _index, template) {
        template.label.set(node.element.label, createMatches(node.filterData));
    }
    disposeTemplate(_template) {
        _template.dispose();
    }
}
let DocumentSymbolRenderer = class DocumentSymbolRenderer {
    constructor(_renderMarker, target, _configurationService, _themeService) {
        this._renderMarker = _renderMarker;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this.templateId = DocumentSymbolTemplate.id;
    }
    renderTemplate(container) {
        container.classList.add('outline-element');
        const iconLabel = new IconLabel(container, { supportHighlights: true });
        const iconClass = dom.$('.outline-element-icon');
        const decoration = dom.$('.outline-element-decoration');
        container.prepend(iconClass);
        container.appendChild(decoration);
        return new DocumentSymbolTemplate(container, iconLabel, iconClass, decoration);
    }
    renderElement(node, _index, template) {
        const { element } = node;
        const extraClasses = ['nowrap'];
        const options = {
            matches: createMatches(node.filterData),
            labelEscapeNewLines: true,
            extraClasses,
            title: localize('title.template', '{0} ({1})', element.symbol.name, symbolKindNames[element.symbol.kind]),
        };
        if (this._configurationService.getValue("outline.icons" /* OutlineConfigKeys.icons */)) {
            // add styles for the icons
            template.iconClass.className = '';
            template.iconClass.classList.add('outline-element-icon', 'inline', ...ThemeIcon.asClassNameArray(SymbolKinds.toIcon(element.symbol.kind)));
        }
        if (element.symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0) {
            extraClasses.push(`deprecated`);
            options.matches = [];
        }
        template.iconLabel.setLabel(element.symbol.name, element.symbol.detail, options);
        if (this._renderMarker) {
            this._renderMarkerInfo(element, template);
        }
    }
    _renderMarkerInfo(element, template) {
        if (!element.marker) {
            dom.hide(template.decoration);
            template.container.style.removeProperty('--outline-element-color');
            return;
        }
        const { count, topSev } = element.marker;
        const color = this._themeService
            .getColorTheme()
            .getColor(topSev === MarkerSeverity.Error ? listErrorForeground : listWarningForeground);
        const cssColor = color ? color.toString() : 'inherit';
        // color of the label
        const problem = this._configurationService.getValue('problems.visibility');
        const configProblems = this._configurationService.getValue("outline.problems.colors" /* OutlineConfigKeys.problemsColors */);
        if (!problem || !configProblems) {
            template.container.style.removeProperty('--outline-element-color');
        }
        else {
            template.container.style.setProperty('--outline-element-color', cssColor);
        }
        // badge with color/rollup
        if (problem === undefined) {
            return;
        }
        const configBadges = this._configurationService.getValue("outline.problems.badges" /* OutlineConfigKeys.problemsBadges */);
        if (!configBadges || !problem) {
            dom.hide(template.decoration);
        }
        else if (count > 0) {
            dom.show(template.decoration);
            template.decoration.classList.remove('bubble');
            template.decoration.innerText = count < 10 ? count.toString() : '+9';
            template.decoration.title =
                count === 1
                    ? localize('1.problem', '1 problem in this element')
                    : localize('N.problem', '{0} problems in this element', count);
            template.decoration.style.setProperty('--outline-element-color', cssColor);
        }
        else {
            dom.show(template.decoration);
            template.decoration.classList.add('bubble');
            template.decoration.innerText = '\uea71';
            template.decoration.title = localize('deep.problem', 'Contains elements with problems');
            template.decoration.style.setProperty('--outline-element-color', cssColor);
        }
    }
    disposeTemplate(_template) {
        _template.iconLabel.dispose();
    }
};
DocumentSymbolRenderer = __decorate([
    __param(2, IConfigurationService),
    __param(3, IThemeService)
], DocumentSymbolRenderer);
export { DocumentSymbolRenderer };
let DocumentSymbolFilter = class DocumentSymbolFilter {
    static { DocumentSymbolFilter_1 = this; }
    static { this.kindToConfigName = Object.freeze({
        [0 /* SymbolKind.File */]: 'showFiles',
        [1 /* SymbolKind.Module */]: 'showModules',
        [2 /* SymbolKind.Namespace */]: 'showNamespaces',
        [3 /* SymbolKind.Package */]: 'showPackages',
        [4 /* SymbolKind.Class */]: 'showClasses',
        [5 /* SymbolKind.Method */]: 'showMethods',
        [6 /* SymbolKind.Property */]: 'showProperties',
        [7 /* SymbolKind.Field */]: 'showFields',
        [8 /* SymbolKind.Constructor */]: 'showConstructors',
        [9 /* SymbolKind.Enum */]: 'showEnums',
        [10 /* SymbolKind.Interface */]: 'showInterfaces',
        [11 /* SymbolKind.Function */]: 'showFunctions',
        [12 /* SymbolKind.Variable */]: 'showVariables',
        [13 /* SymbolKind.Constant */]: 'showConstants',
        [14 /* SymbolKind.String */]: 'showStrings',
        [15 /* SymbolKind.Number */]: 'showNumbers',
        [16 /* SymbolKind.Boolean */]: 'showBooleans',
        [17 /* SymbolKind.Array */]: 'showArrays',
        [18 /* SymbolKind.Object */]: 'showObjects',
        [19 /* SymbolKind.Key */]: 'showKeys',
        [20 /* SymbolKind.Null */]: 'showNull',
        [21 /* SymbolKind.EnumMember */]: 'showEnumMembers',
        [22 /* SymbolKind.Struct */]: 'showStructs',
        [23 /* SymbolKind.Event */]: 'showEvents',
        [24 /* SymbolKind.Operator */]: 'showOperators',
        [25 /* SymbolKind.TypeParameter */]: 'showTypeParameters',
    }); }
    constructor(_prefix, _textResourceConfigService) {
        this._prefix = _prefix;
        this._textResourceConfigService = _textResourceConfigService;
    }
    filter(element) {
        const outline = OutlineModel.get(element);
        if (!(element instanceof OutlineElement)) {
            return true;
        }
        const configName = DocumentSymbolFilter_1.kindToConfigName[element.symbol.kind];
        const configKey = `${this._prefix}.${configName}`;
        return this._textResourceConfigService.getValue(outline?.uri, configKey);
    }
};
DocumentSymbolFilter = DocumentSymbolFilter_1 = __decorate([
    __param(1, ITextResourceConfigurationService)
], DocumentSymbolFilter);
export { DocumentSymbolFilter };
export class DocumentSymbolComparator {
    constructor() {
        this._collator = new dom.WindowIdleValue(mainWindow, () => new Intl.Collator(undefined, { numeric: true }));
    }
    compareByPosition(a, b) {
        if (a instanceof OutlineGroup && b instanceof OutlineGroup) {
            return a.order - b.order;
        }
        else if (a instanceof OutlineElement && b instanceof OutlineElement) {
            return (Range.compareRangesUsingStarts(a.symbol.range, b.symbol.range) ||
                this._collator.value.compare(a.symbol.name, b.symbol.name));
        }
        return 0;
    }
    compareByType(a, b) {
        if (a instanceof OutlineGroup && b instanceof OutlineGroup) {
            return a.order - b.order;
        }
        else if (a instanceof OutlineElement && b instanceof OutlineElement) {
            return (a.symbol.kind - b.symbol.kind || this._collator.value.compare(a.symbol.name, b.symbol.name));
        }
        return 0;
    }
    compareByName(a, b) {
        if (a instanceof OutlineGroup && b instanceof OutlineGroup) {
            return a.order - b.order;
        }
        else if (a instanceof OutlineElement && b instanceof OutlineElement) {
            return (this._collator.value.compare(a.symbol.name, b.symbol.name) ||
                Range.compareRangesUsingStarts(a.symbol.range, b.symbol.range));
        }
        return 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9vdXRsaW5lL2RvY3VtZW50U3ltYm9sc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdEcsT0FBTyxFQUNOLFNBQVMsR0FFVCxNQUFNLHVEQUF1RCxDQUFBO0FBZTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0sdUNBQXVDLENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBRU4scUJBQXFCLEVBRXJCLGVBQWUsRUFDZixXQUFXLEdBRVgsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUN0SCxPQUFPLEVBQ04sY0FBYyxFQUNkLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLGtFQUFrRSxDQUFBLENBQUMsOEVBQThFO0FBQ3hKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQWlCLE1BQU0sNENBQTRDLENBQUE7QUFDakcsT0FBTyxFQUFFLHFCQUFx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