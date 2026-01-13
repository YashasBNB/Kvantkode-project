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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9jVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci90b2NUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLDRDQUE0QyxDQUFBO0FBRTlFLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLFlBQVksRUFFWixtQkFBbUIsR0FDbkIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxD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