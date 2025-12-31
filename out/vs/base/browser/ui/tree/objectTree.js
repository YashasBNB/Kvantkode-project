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
import { AbstractTree, } from './abstractTree.js';
import { CompressibleObjectTreeModel, } from './compressedObjectTreeModel.js';
import { ObjectTreeModel } from './objectTreeModel.js';
import { memoize } from '../../../common/decorators.js';
import { Iterable } from '../../../common/iterator.js';
export class ObjectTree extends AbstractTree {
    get onDidChangeCollapseState() {
        return this.model.onDidChangeCollapseState;
    }
    constructor(user, container, delegate, renderers, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
    }
    setChildren(element, children = Iterable.empty(), options) {
        this.model.setChildren(element, children, options);
    }
    rerender(element) {
        if (element === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(element);
    }
    updateElementHeight(element, height) {
        const elementIndex = this.model.getListIndex(element);
        if (elementIndex === -1) {
            return;
        }
        this.view.updateElementHeight(elementIndex, height);
    }
    resort(element, recursive = true) {
        this.model.resort(element, recursive);
    }
    hasElement(element) {
        return this.model.has(element);
    }
    createModel(user, options) {
        return new ObjectTreeModel(user, options);
    }
}
class CompressibleRenderer {
    get compressedTreeNodeProvider() {
        return this._compressedTreeNodeProvider();
    }
    constructor(_compressedTreeNodeProvider, stickyScrollDelegate, renderer) {
        this._compressedTreeNodeProvider = _compressedTreeNodeProvider;
        this.stickyScrollDelegate = stickyScrollDelegate;
        this.renderer = renderer;
        this.templateId = renderer.templateId;
        if (renderer.onDidChangeTwistieState) {
            this.onDidChangeTwistieState = renderer.onDidChangeTwistieState;
        }
    }
    renderTemplate(container) {
        const data = this.renderer.renderTemplate(container);
        return { compressedTreeNode: undefined, data };
    }
    renderElement(node, index, templateData, height) {
        let compressedTreeNode = this.stickyScrollDelegate.getCompressedNode(node);
        if (!compressedTreeNode) {
            compressedTreeNode = this.compressedTreeNodeProvider.getCompressedTreeNode(node.element);
        }
        if (compressedTreeNode.element.elements.length === 1) {
            templateData.compressedTreeNode = undefined;
            this.renderer.renderElement(node, index, templateData.data, height);
        }
        else {
            templateData.compressedTreeNode = compressedTreeNode;
            this.renderer.renderCompressedElements(compressedTreeNode, index, templateData.data, height);
        }
    }
    disposeElement(node, index, templateData, height) {
        if (templateData.compressedTreeNode) {
            this.renderer.disposeCompressedElements?.(templateData.compressedTreeNode, index, templateData.data, height);
        }
        else {
            this.renderer.disposeElement?.(node, index, templateData.data, height);
        }
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.data);
    }
    renderTwistie(element, twistieElement) {
        if (this.renderer.renderTwistie) {
            return this.renderer.renderTwistie(element, twistieElement);
        }
        return false;
    }
}
__decorate([
    memoize
], CompressibleRenderer.prototype, "compressedTreeNodeProvider", null);
class CompressibleStickyScrollDelegate {
    constructor(modelProvider) {
        this.modelProvider = modelProvider;
        this.compressedStickyNodes = new Map();
    }
    getCompressedNode(node) {
        return this.compressedStickyNodes.get(node);
    }
    constrainStickyScrollNodes(stickyNodes, stickyScrollMaxItemCount, maxWidgetHeight) {
        this.compressedStickyNodes.clear();
        if (stickyNodes.length === 0) {
            return [];
        }
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const stickyNodeBottom = stickyNode.position + stickyNode.height;
            const followingReachesMaxHeight = i + 1 < stickyNodes.length && stickyNodeBottom + stickyNodes[i + 1].height > maxWidgetHeight;
            if (followingReachesMaxHeight ||
                (i >= stickyScrollMaxItemCount - 1 && stickyScrollMaxItemCount < stickyNodes.length)) {
                const uncompressedStickyNodes = stickyNodes.slice(0, i);
                const overflowingStickyNodes = stickyNodes.slice(i);
                const compressedStickyNode = this.compressStickyNodes(overflowingStickyNodes);
                return [...uncompressedStickyNodes, compressedStickyNode];
            }
        }
        return stickyNodes;
    }
    compressStickyNodes(stickyNodes) {
        if (stickyNodes.length === 0) {
            throw new Error("Can't compress empty sticky nodes");
        }
        const compressionModel = this.modelProvider();
        if (!compressionModel.isCompressionEnabled()) {
            return stickyNodes[0];
        }
        // Collect all elements to be compressed
        const elements = [];
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const compressedNode = compressionModel.getCompressedTreeNode(stickyNode.node.element);
            if (compressedNode.element) {
                // if an element is incompressible, it can't be compressed with it's parent element
                if (i !== 0 && compressedNode.element.incompressible) {
                    break;
                }
                elements.push(...compressedNode.element.elements);
            }
        }
        if (elements.length < 2) {
            return stickyNodes[0];
        }
        // Compress the elements
        const lastStickyNode = stickyNodes[stickyNodes.length - 1];
        const compressedElement = { elements, incompressible: false };
        const compressedNode = {
            ...lastStickyNode.node,
            children: [],
            element: compressedElement,
        };
        const stickyTreeNode = new Proxy(stickyNodes[0].node, {});
        const compressedStickyNode = {
            node: stickyTreeNode,
            startIndex: stickyNodes[0].startIndex,
            endIndex: lastStickyNode.endIndex,
            position: stickyNodes[0].position,
            height: stickyNodes[0].height,
        };
        this.compressedStickyNodes.set(stickyTreeNode, compressedNode);
        return compressedStickyNode;
    }
}
function asObjectTreeOptions(compressedTreeNodeProvider, options) {
    return (options && {
        ...options,
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            getKeyboardNavigationLabel(e) {
                let compressedTreeNode;
                try {
                    compressedTreeNode = compressedTreeNodeProvider().getCompressedTreeNode(e);
                }
                catch {
                    return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e);
                }
                if (compressedTreeNode.element.elements.length === 1) {
                    return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e);
                }
                else {
                    return options.keyboardNavigationLabelProvider.getCompressedNodeKeyboardNavigationLabel(compressedTreeNode.element.elements);
                }
            },
        },
    });
}
export class CompressibleObjectTree extends ObjectTree {
    constructor(user, container, delegate, renderers, options = {}) {
        const compressedTreeNodeProvider = () => this;
        const stickyScrollDelegate = new CompressibleStickyScrollDelegate(() => this.model);
        const compressibleRenderers = renderers.map((r) => new CompressibleRenderer(compressedTreeNodeProvider, stickyScrollDelegate, r));
        super(user, container, delegate, compressibleRenderers, {
            ...asObjectTreeOptions(compressedTreeNodeProvider, options),
            stickyScrollDelegate,
        });
    }
    setChildren(element, children = Iterable.empty(), options) {
        this.model.setChildren(element, children, options);
    }
    createModel(user, options) {
        return new CompressibleObjectTreeModel(user, options);
    }
    updateOptions(optionsUpdate = {}) {
        super.updateOptions(optionsUpdate);
        if (typeof optionsUpdate.compressionEnabled !== 'undefined') {
            this.model.setCompressionEnabled(optionsUpdate.compressionEnabled);
        }
    }
    getCompressedTreeNode(element = null) {
        return this.model.getCompressedTreeNode(element);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0VHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL29iamVjdFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFPaEcsT0FBTyxFQUNOLFlBQVksR0FLWixNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFDTiwyQkFBMkIsR0FJM0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQW9CLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBU3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUF5QnRELE1BQU0sT0FBTyxVQUEyRCxTQUFRLFlBSS9FO0lBR0EsSUFBYSx3QkFBd0I7UUFDcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFBO0lBQzNDLENBQUM7SUFFRCxZQUNvQixJQUFZLEVBQy9CLFNBQXNCLEVBQ3RCLFFBQWlDLEVBQ2pDLFNBQStDLEVBQy9DLFVBQThDLEVBQUU7UUFFaEQsS0FBSyxDQUNKLElBQUksRUFDSixTQUFTLEVBQ1QsUUFBUSxFQUNSLFNBQVMsRUFDVCxPQUFvRCxDQUNwRCxDQUFBO1FBWmtCLFNBQUksR0FBSixJQUFJLENBQVE7SUFhaEMsQ0FBQztJQUVELFdBQVcsQ0FDVixPQUFpQixFQUNqQixXQUE0QyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQzVELE9BQTBDO1FBRTFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELFFBQVEsQ0FBQyxPQUFXO1FBQ25CLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lB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