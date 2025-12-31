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
import * as dom from '../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FileKind, FileType } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ResourcePool } from './chatCollections.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
const $ = dom.$;
let ChatTreeContentPart = class ChatTreeContentPart extends Disposable {
    constructor(data, element, treePool, treeDataIndex, openerService) {
        super();
        this.openerService = openerService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const ref = this._register(treePool.get());
        this.tree = ref.object;
        this.onDidFocus = this.tree.onDidFocus;
        this._register(this.tree.onDidOpen((e) => {
            if (e.element && !('children' in e.element)) {
                this.openerService.open(e.element.uri);
            }
        }));
        this._register(this.tree.onDidChangeCollapseState(() => {
            this._onDidChangeHeight.fire();
        }));
        this._register(this.tree.onContextMenu((e) => {
            e.browserEvent.preventDefault();
            e.browserEvent.stopPropagation();
        }));
        this.tree.setInput(data).then(() => {
            if (!ref.isStale()) {
                this.tree.layout();
                this._onDidChangeHeight.fire();
            }
        });
        this.domNode = this.tree.getHTMLElement().parentElement;
    }
    domFocus() {
        this.tree.domFocus();
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'treeData';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatTreeContentPart = __decorate([
    __param(4, IOpenerService)
], ChatTreeContentPart);
export { ChatTreeContentPart };
let TreePool = class TreePool extends Disposable {
    get inUse() {
        return this._pool.inUse;
    }
    constructor(_onDidChangeVisibility, instantiationService, configService, themeService) {
        super();
        this._onDidChangeVisibility = _onDidChangeVisibility;
        this.instantiationService = instantiationService;
        this.configService = configService;
        this.themeService = themeService;
        this._pool = this._register(new ResourcePool(() => this.treeFactory()));
    }
    treeFactory() {
        const resourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this._onDidChangeVisibility,
        }));
        const container = $('.interactive-response-progress-tree');
        this._register(createFileIconThemableTreeContainerScope(container, this.themeService));
        const tree = this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'ChatListRenderer', container, new ChatListTreeDelegate(), new ChatListTreeCompressionDelegate(), [
            new ChatListTreeRenderer(resourceLabels, this.configService.getValue('explorer.decorations')),
        ], new ChatListTreeDataSource(), {
            collapseByDefault: () => false,
            expandOnlyOnTwistieClick: () => false,
            identityProvider: {
                getId: (e) => e.uri.toString(),
            },
            accessibilityProvider: {
                getAriaLabel: (element) => element.label,
                getWidgetAriaLabel: () => localize('treeAriaLabel', 'File Tree'),
            },
            alwaysConsumeMouseWheel: false,
        });
        return tree;
    }
    get() {
        const object = this._pool.get();
        let stale = false;
        return {
            object,
            isStale: () => stale,
            dispose: () => {
                stale = true;
                this._pool.release(object);
            },
        };
    }
};
TreePool = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IThemeService)
], TreePool);
export { TreePool };
class ChatListTreeDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return ChatListTreeDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return 'chatListTreeTemplate';
    }
}
class ChatListTreeCompressionDelegate {
    isIncompressible(element) {
        return !element.children;
    }
}
class ChatListTreeRenderer {
    constructor(labels, decorations) {
        this.labels = labels;
        this.decorations = decorations;
        this.templateId = 'chatListTreeTemplate';
    }
    renderCompressedElements(element, index, templateData, height) {
        templateData.label.element.style.display = 'flex';
        const label = element.element.elements.map((e) => e.label);
        templateData.label.setResource({ resource: element.element.elements[0].uri, name: label }, {
            title: element.element.elements[0].label,
            fileKind: element.children ? FileKind.FOLDER : FileKind.FILE,
            extraClasses: ['explorer-item'],
            fileDecorations: this.decorations,
        });
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true }));
        return { templateDisposables, label };
    }
    renderElement(element, index, templateData, height) {
        templateData.label.element.style.display = 'flex';
        if (!element.children.length && element.element.type !== FileType.Directory) {
            templateData.label.setFile(element.element.uri, {
                fileKind: FileKind.FILE,
                hidePath: true,
                fileDecorations: this.decorations,
            });
        }
        else {
            templateData.label.setResource({ resource: element.element.uri, name: element.element.label }, {
                title: element.element.label,
                fileKind: FileKind.FOLDER,
                fileDecorations: this.decorations,
            });
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class ChatListTreeDataSource {
    hasChildren(element) {
        return !!element.children;
    }
    async getChildren(element) {
        return element.children ?? [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRyZWVDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUcmVlQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQU16RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBa0IsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFOUUsT0FBTyxFQUF3QixZQUFZLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUl6RSxPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUd2RyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRVIsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0Is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