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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcmVzb3VyY2VUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDckQsT0FBTyxLQUFLLEtBQUssTUFBTSxXQUFXLENBQUE7QUFDbEMsT0FBTyxFQUFFLE1BQU0sSUFBSSxhQUFhLEVBQVcsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBYzlCLE1BQU0sSUFBSTtJQUdULElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUdELElBQUksSUFBSTtRQUNQLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxZQUNVLEdBQVEsRUFDUixZQUFvQixFQUNwQixPQUFVLEVBQ1osVUFBeUIsU0FBUyxFQUNoQyxTQUEwQyxTQUFTO1FBSm5ELFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixZQUFPLEdBQVAsT0FBTyxDQUFHO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBMkI7UUFDaEMsV0FBTSxHQUFOLE1BQU0sQ0FBNkM7UUFwQnJELGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQTtJQXFCOUMsQ0FBQztJ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