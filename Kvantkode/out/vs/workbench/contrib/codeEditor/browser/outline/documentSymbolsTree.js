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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL291dGxpbmUvZG9jdW1lbnRTeW1ib2xzVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN0RyxPQUFPLEVBQ04sU0FBUyxHQUVULE1BQU0sdURBQXVELENBQUE7QUFlOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFFTixxQkFBcUIsRUFFckIsZUFBZSxFQUNmLFdBQVcsR0FFWCxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3RILE9BQU8sRUFDTixjQUFjLEVBQ2QsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sa0VBQWtFLENBQUEsQ0FBQyw4RUFBOEU7QUFDeEosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBaUIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUs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