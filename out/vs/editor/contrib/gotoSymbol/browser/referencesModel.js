/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { defaultGenerator } from '../../../../base/common/idGenerator.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
import { localize } from '../../../../nls.js';
export class OneReference {
    constructor(isProviderFirst, parent, link, _rangeCallback) {
        this.isProviderFirst = isProviderFirst;
        this.parent = parent;
        this.link = link;
        this._rangeCallback = _rangeCallback;
        this.id = defaultGenerator.nextId();
    }
    get uri() {
        return this.link.uri;
    }
    get range() {
        return this._range ?? this.link.targetSelectionRange ?? this.link.range;
    }
    set range(value) {
        this._range = value;
        this._rangeCallback(this);
    }
    get ariaMessage() {
        const preview = this.parent.getPreview(this)?.preview(this.range);
        if (!preview) {
            return localize('aria.oneReference', 'in {0} on line {1} at column {2}', basename(this.uri), this.range.startLineNumber, this.range.startColumn);
        }
        else {
            return localize({
                key: 'aria.oneReference.preview',
                comment: [
                    'Placeholders are: 0: filename, 1:line number, 2: column number, 3: preview snippet of source code',
                ],
            }, '{0} in {1} on line {2} at column {3}', preview.value, basename(this.uri), this.range.startLineNumber, this.range.startColumn);
        }
    }
}
export class FilePreview {
    constructor(_modelReference) {
        this._modelReference = _modelReference;
    }
    dispose() {
        this._modelReference.dispose();
    }
    preview(range, n = 8) {
        const model = this._modelReference.object.textEditorModel;
        if (!model) {
            return undefined;
        }
        const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
        const word = model.getWordUntilPosition({
            lineNumber: startLineNumber,
            column: startColumn - n,
        });
        const beforeRange = new Range(startLineNumber, word.startColumn, startLineNumber, startColumn);
        const afterRange = new Range(endLineNumber, endColumn, endLineNumber, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        const before = model.getValueInRange(beforeRange).replace(/^\s+/, '');
        const inside = model.getValueInRange(range);
        const after = model.getValueInRange(afterRange).replace(/\s+$/, '');
        return {
            value: before + inside + after,
            highlight: { start: before.length, end: before.length + inside.length },
        };
    }
}
export class FileReferences {
    constructor(parent, uri) {
        this.parent = parent;
        this.uri = uri;
        this.children = [];
        this._previews = new ResourceMap();
    }
    dispose() {
        dispose(this._previews.values());
        this._previews.clear();
    }
    getPreview(child) {
        return this._previews.get(child.uri);
    }
    get ariaMessage() {
        const len = this.children.length;
        if (len === 1) {
            return localize('aria.fileReferences.1', '1 symbol in {0}, full path {1}', basename(this.uri), this.uri.fsPath);
        }
        else {
            return localize('aria.fileReferences.N', '{0} symbols in {1}, full path {2}', len, basename(this.uri), this.uri.fsPath);
        }
    }
    async resolve(textModelResolverService) {
        if (this._previews.size !== 0) {
            return this;
        }
        for (const child of this.children) {
            if (this._previews.has(child.uri)) {
                continue;
            }
            try {
                const ref = await textModelResolverService.createModelReference(child.uri);
                this._previews.set(child.uri, new FilePreview(ref));
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        return this;
    }
}
export class ReferencesModel {
    constructor(links, title) {
        this.groups = [];
        this.references = [];
        this._onDidChangeReferenceRange = new Emitter();
        this.onDidChangeReferenceRange = this._onDidChangeReferenceRange.event;
        this._links = links;
        this._title = title;
        // grouping and sorting
        const [providersFirst] = links;
        links.sort(ReferencesModel._compareReferences);
        let current;
        for (const link of links) {
            if (!current || !extUri.isEqual(current.uri, link.uri, true)) {
                // new group
                current = new FileReferences(this, link.uri);
                this.groups.push(current);
            }
            // append, check for equality first!
            if (current.children.length === 0 ||
                ReferencesModel._compareReferences(link, current.children[current.children.length - 1]) !==
                    0) {
                const oneRef = new OneReference(providersFirst === link, current, link, (ref) => this._onDidChangeReferenceRange.fire(ref));
                this.references.push(oneRef);
                current.children.push(oneRef);
            }
        }
    }
    dispose() {
        dispose(this.groups);
        this._onDidChangeReferenceRange.dispose();
        this.groups.length = 0;
    }
    clone() {
        return new ReferencesModel(this._links, this._title);
    }
    get title() {
        return this._title;
    }
    get isEmpty() {
        return this.groups.length === 0;
    }
    get ariaMessage() {
        if (this.isEmpty) {
            return localize('aria.result.0', 'No results found');
        }
        else if (this.references.length === 1) {
            return localize('aria.result.1', 'Found 1 symbol in {0}', this.references[0].uri.fsPath);
        }
        else if (this.groups.length === 1) {
            return localize('aria.result.n1', 'Found {0} symbols in {1}', this.references.length, this.groups[0].uri.fsPath);
        }
        else {
            return localize('aria.result.nm', 'Found {0} symbols in {1} files', this.references.length, this.groups.length);
        }
    }
    nextOrPreviousReference(reference, next) {
        const { parent } = reference;
        let idx = parent.children.indexOf(reference);
        const childCount = parent.children.length;
        const groupCount = parent.parent.groups.length;
        if (groupCount === 1 || (next && idx + 1 < childCount) || (!next && idx > 0)) {
            // cycling within one file
            if (next) {
                idx = (idx + 1) % childCount;
            }
            else {
                idx = (idx + childCount - 1) % childCount;
            }
            return parent.children[idx];
        }
        idx = parent.parent.groups.indexOf(parent);
        if (next) {
            idx = (idx + 1) % groupCount;
            return parent.parent.groups[idx].children[0];
        }
        else {
            idx = (idx + groupCount - 1) % groupCount;
            return parent.parent.groups[idx].children[parent.parent.groups[idx].children.length - 1];
        }
    }
    nearestReference(resource, position) {
        const nearest = this.references
            .map((ref, idx) => {
            return {
                idx,
                prefixLen: strings.commonPrefixLength(ref.uri.toString(), resource.toString()),
                offsetDist: Math.abs(ref.range.startLineNumber - position.lineNumber) * 100 +
                    Math.abs(ref.range.startColumn - position.column),
            };
        })
            .sort((a, b) => {
            if (a.prefixLen > b.prefixLen) {
                return -1;
            }
            else if (a.prefixLen < b.prefixLen) {
                return 1;
            }
            else if (a.offsetDist < b.offsetDist) {
                return -1;
            }
            else if (a.offsetDist > b.offsetDist) {
                return 1;
            }
            else {
                return 0;
            }
        })[0];
        if (nearest) {
            return this.references[nearest.idx];
        }
        return undefined;
    }
    referenceAt(resource, position) {
        for (const ref of this.references) {
            if (ref.uri.toString() === resource.toString()) {
                if (Range.containsPosition(ref.range, position)) {
                    return ref;
                }
            }
        }
        return undefined;
    }
    firstReference() {
        for (const ref of this.references) {
            if (ref.isProviderFirst) {
                return ref;
            }
        }
        return this.references[0];
    }
    static _compareReferences(a, b) {
        return extUri.compare(a.uri, b.uri) || Range.compareRangesUsingStarts(a.range, b.range);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b1N5bWJvbC9icm93c2VyL3JlZmVyZW5jZXNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBMkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBSTdELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsTUFBTSxPQUFPLFlBQVk7SUFLeEIsWUFDVSxlQUF3QixFQUN4QixNQUFzQixFQUN0QixJQUFrQixFQUNuQixjQUEyQztRQUgxQyxvQkFBZSxHQUFmLGVBQWUsQ0FBUztRQUN4QixXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQUN0QixTQUFJLEdBQUosSUFBSSxDQUFjO1FBQ25CLG1CQUFjLEdBQWQsY0FBYyxDQUE2QjtRQVIzQyxPQUFFLEdBQVcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUE7SUFTNUMsQ0FBQztJQUVKLElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUE7SUFD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