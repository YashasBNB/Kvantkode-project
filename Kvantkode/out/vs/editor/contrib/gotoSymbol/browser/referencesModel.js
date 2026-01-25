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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvcmVmZXJlbmNlc01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUEyQixNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFJN0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxNQUFNLE9BQU8sWUFBWTtJQUt4QixZQUNVLGVBQXdCLEVBQ3hCLE1BQXNCLEVBQ3RCLElBQWtCLEVBQ25CLGNBQTJDO1FBSDFDLG9CQUFlLEdBQWYsZUFBZSxDQUFTO1FBQ3hCLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQ3RCLFNBQUksR0FBSixJQUFJLENBQWM7UUFDbkIsbUJBQWMsR0FBZCxjQUFjLENBQTZCO1FBUjNDLE9BQUUsR0FBVyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQVM1QyxDQUFDO0lBRUosSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FB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