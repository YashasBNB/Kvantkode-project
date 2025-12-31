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
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { DefaultStyleController, } from '../../../../base/browser/ui/list/listWidget.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchObjectTree, } from '../../../../platform/list/browser/listService.js';
import { getListStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground, focusBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { settingsHeaderForeground, settingsHeaderHoverForeground, } from '../common/settingsEditorColorRegistry.js';
import { SettingsTreeFilter } from './settingsTree.js';
import { SettingsTreeGroupElement, SettingsTreeSettingElement, } from './settingsTreeModels.js';
const $ = DOM.$;
let TOCTreeModel = class TOCTreeModel {
    constructor(_viewState, environmentService) {
        this._viewState = _viewState;
        this.environmentService = environmentService;
        this._currentSearchModel = null;
    }
    get settingsTreeRoot() {
        return this._settingsTreeRoot;
    }
    set settingsTreeRoot(value) {
        this._settingsTreeRoot = value;
        this.update();
    }
    get currentSearchModel() {
        return this._currentSearchModel;
    }
    set currentSearchModel(model) {
        this._currentSearchModel = model;
        this.update();
    }
    get children() {
        return this._settingsTreeRoot.children;
    }
    update() {
        if (this._settingsTreeRoot) {
            this.updateGroupCount(this._settingsTreeRoot);
        }
    }
    updateGroupCount(group) {
        group.children.forEach((child) => {
            if (child instanceof SettingsTreeGroupElement) {
                this.updateGroupCount(child);
            }
        });
        const childCount = group.children
            .filter((child) => child instanceof SettingsTreeGroupElement)
            .reduce((acc, cur) => acc + cur.count, 0);
        group.count = childCount + this.getGroupCount(group);
    }
    getGroupCount(group) {
        return group.children.filter((child) => {
            if (!(child instanceof SettingsTreeSettingElement)) {
                return false;
            }
            if (this._currentSearchModel &&
                !this._currentSearchModel.root.containsSetting(child.setting.key)) {
                return false;
            }
            // Check everything that the SettingsFilter checks except whether it's filtered by a category
            const isRemote = !!this.environmentService.remoteAuthority;
            return (child.matchesScope(this._viewState.settingsTarget, isRemote) &&
                child.matchesAllTags(this._viewState.tagFilters) &&
                child.matchesAnyFeature(this._viewState.featureFilters) &&
                child.matchesAnyExtension(this._viewState.extensionFilters) &&
                child.matchesAnyId(this._viewState.idFilters));
        }).length;
    }
};
TOCTreeModel = __decorate([
    __param(1, IWorkbenchEnvironmentService)
], TOCTreeModel);
export { TOCTreeModel };
const TOC_ENTRY_TEMPLATE_ID = 'settings.toc.entry';
export class TOCRenderer {
    constructor(_hoverService) {
        this._hoverService = _hoverService;
        this.templateId = TOC_ENTRY_TEMPLATE_ID;
    }
    renderTemplate(container) {
        return {
            labelElement: DOM.append(container, $('.settings-toc-entry')),
            countElement: DOM.append(container, $('.settings-toc-count')),
            elementDisposables: new DisposableStore(),
        };
    }
    renderElement(node, index, template) {
        template.elementDisposables.clear();
        const element = node.element;
        const count = element.count;
        const label = element.label;
        template.labelElement.textContent = label;
        template.elementDisposables.add(this._hoverService.setupDelayedHover(template.labelElement, { content: label }));
        if (count) {
            template.countElement.textContent = ` (${count})`;
        }
        else {
            template.countElement.textContent = '';
        }
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
    }
}
class TOCTreeDelegate {
    getTemplateId(element) {
        return TOC_ENTRY_TEMPLATE_ID;
    }
    getHeight(element) {
        return 22;
    }
}
export function createTOCIterator(model, tree) {
    const groupChildren = (model.children.filter((c) => c instanceof SettingsTreeGroupElement));
    return Iterable.map(groupChildren, (g) => {
        const hasGroupChildren = g.children.some((c) => c instanceof SettingsTreeGroupElement);
        return {
            element: g,
            collapsed: undefined,
            collapsible: hasGroupChildren,
            children: g instanceof SettingsTreeGroupElement ? createTOCIterator(g, tree) : undefined,
        };
    });
}
class SettingsAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize({
            key: 'settingsTOC',
            comment: ['A label for the table of contents for the full settings list'],
        }, 'Settings Table of Contents');
    }
    getAriaLabel(element) {
        if (!element) {
            return '';
        }
        if (element instanceof SettingsTreeGroupElement) {
            return localize('groupRowAriaLabel', '{0}, group', element.label);
        }
        return '';
    }
    getAriaLevel(element) {
        let i = 1;
        while (element instanceof SettingsTreeGroupElement && element.parent) {
            i++;
            element = element.parent;
        }
        return i;
    }
}
let TOCTree = class TOCTree extends WorkbenchObjectTree {
    constructor(container, viewState, contextKeyService, listService, configurationService, hoverService, instantiationService) {
        // test open mode
        const filter = instantiationService.createInstance(SettingsTreeFilter, viewState);
        const options = {
            filter,
            multipleSelectionSupport: false,
            identityProvider: {
                getId(e) {
                    return e.id;
                },
            },
            styleController: (id) => new DefaultStyleController(domStylesheetsJs.createStyleSheet(container), id),
            accessibilityProvider: instantiationService.createInstance(SettingsAccessibilityProvider),
            collapseByDefault: true,
            horizontalScrolling: false,
            hideTwistiesOfChildlessElements: true,
            renderIndentGuides: RenderIndentGuides.None,
        };
        super('SettingsTOC', container, new TOCTreeDelegate(), [new TOCRenderer(hoverService)], options, instantiationService, contextKeyService, listService, configurationService);
        this.style(getListStyles({
            listBackground: editorBackground,
            listFocusOutline: focusBorder,
            listActiveSelectionBackground: editorBackground,
            listActiveSelectionForeground: settingsHeaderForeground,
            listFocusAndSelectionBackground: editorBackground,
            listFocusAndSelectionForeground: settingsHeaderForeground,
            listFocusBackground: editorBackground,
            listFocusForeground: settingsHeaderHoverForeground,
            listHoverForeground: settingsHeaderHoverForeground,
            listHoverBackground: editorBackground,
            listInactiveSelectionBackground: editorBackground,
            listInactiveSelectionForeground: settingsHeaderForeground,
            listInactiveFocusBackground: editorBackground,
            listInactiveFocusOutline: editorBackground,
            treeIndentGuidesStroke: undefined,
            treeInactiveIndentGuidesStroke: undefined,
        }));
    }
};
TOCTree = __decorate([
    __param(2, IContextKeyService),
    __param(3, IListService),
    __param(4, IConfigurationService),
    __param(5, IHoverService),
    __param(6, IInstantiationService)
], TOCTree);
export { TOCTree };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9jVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvdG9jVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU5RSxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixZQUFZLEVBRVosbUJBQW1CLEdBQ25CLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sd0JB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