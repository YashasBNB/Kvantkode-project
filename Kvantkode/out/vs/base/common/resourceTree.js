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
import { memoize } from './decorators.js';
import { PathIterator } from './ternarySearchTree.js';
import * as paths from './path.js';
import { extUri as defaultExtUri } from './resources.js';
import { URI } from './uri.js';
class Node {
    get childrenCount() {
        return this._children.size;
    }
    get children() {
        return this._children.values();
    }
    get name() {
        return paths.posix.basename(this.relativePath);
    }
    constructor(uri, relativePath, context, element = undefined, parent = undefined) {
        this.uri = uri;
        this.relativePath = relativePath;
        this.context = context;
        this.element = element;
        this.parent = parent;
        this._children = new Map();
    }
    get(path) {
        return this._children.get(path);
    }
    set(path, child) {
        this._children.set(path, child);
    }
    delete(path) {
        this._children.delete(path);
    }
    clear() {
        this._children.clear();
    }
}
__decorate([
    memoize
], Node.prototype, "name", null);
function collect(node, result) {
    if (typeof node.element !== 'undefined') {
        result.push(node.element);
    }
    for (const child of node.children) {
        collect(child, result);
    }
    return result;
}
export class ResourceTree {
    static getRoot(node) {
        while (node.parent) {
            node = node.parent;
        }
        return node;
    }
    static collect(node) {
        return collect(node, []);
    }
    static isResourceNode(obj) {
        return obj instanceof Node;
    }
    constructor(context, rootURI = URI.file('/'), extUri = defaultExtUri) {
        this.extUri = extUri;
        this.root = new Node(rootURI, '', context);
    }
    add(uri, element) {
        const key = this.extUri.relativePath(this.root.uri, uri) || uri.path;
        const iterator = new PathIterator(false).reset(key);
        let node = this.root;
        let path = '';
        while (true) {
            const name = iterator.value();
            path = path + '/' + name;
            let child = node.get(name);
            if (!child) {
                child = new Node(this.extUri.joinPath(this.root.uri, path), path, this.root.context, iterator.hasNext() ? undefined : element, node);
                node.set(name, child);
            }
            else if (!iterator.hasNext()) {
                child.element = element;
            }
            node = child;
            if (!iterator.hasNext()) {
                return;
            }
            iterator.next();
        }
    }
    delete(uri) {
        const key = this.extUri.relativePath(this.root.uri, uri) || uri.path;
        const iterator = new PathIterator(false).reset(key);
        return this._delete(this.root, iterator);
    }
    _delete(node, iterator) {
        const name = iterator.value();
        const child = node.get(name);
        if (!child) {
            return undefined;
        }
        if (iterator.hasNext()) {
            const result = this._delete(child, iterator.next());
            if (typeof result !== 'undefined' && child.childrenCount === 0) {
                node.delete(name);
            }
            return result;
        }
        node.delete(name);
        return child.element;
    }
    clear() {
        this.root.clear();
    }
    getNode(uri) {
        const key = this.extUri.relativePath(this.root.uri, uri) || uri.path;
        const iterator = new PathIterator(false).reset(key);
        let node = this.root;
        while (true) {
            const name = iterator.value();
            const child = node.get(name);
            if (!child || !iterator.hasNext()) {
                return child;
            }
            node = child;
            iterator.next();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9yZXNvdXJjZVRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNyRCxPQUFPLEtBQUssS0FBSyxNQUFNLFdBQVcsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsTUFBTSxJQUFJLGFBQWEsRUFBVyxNQUFNLGdCQUFnQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFjOUIsTUFBTSxJQUFJO0lBR1QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBR0QsSUFBSSxJQUFJO1FBQ1AsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELFlBQ1UsR0FBUSxFQUNSLFlBQW9CLEVBQ3BCLE9BQVUsRUFDWixVQUF5QixTQUFTLEVBQ2hDLFNBQTBDLFNBQVM7UUFKbkQsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLFlBQU8sR0FBUCxPQUFPLENBQUc7UUFDWixZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQUNoQyxXQUFNLEdBQU4sTUFBTSxDQUE2QztRQXBCckQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFBO0lBcUI5QyxD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