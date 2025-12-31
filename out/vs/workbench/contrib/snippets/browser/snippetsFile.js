/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse as jsonParse, getNodeType } from '../../../../base/common/json.js';
import { localize } from '../../../../nls.js';
import { extname, basename } from '../../../../base/common/path.js';
import { SnippetParser, Variable, Placeholder, Text, } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
import { KnownSnippetVariableNames } from '../../../../editor/contrib/snippet/browser/snippetVariables.js';
import { relativePath } from '../../../../base/common/resources.js';
import { isObject } from '../../../../base/common/types.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { WindowIdleValue, getActiveWindow } from '../../../../base/browser/dom.js';
class SnippetBodyInsights {
    constructor(body) {
        // init with defaults
        this.isBogous = false;
        this.isTrivial = false;
        this.usesClipboardVariable = false;
        this.usesSelectionVariable = false;
        this.codeSnippet = body;
        // check snippet...
        const textmateSnippet = new SnippetParser().parse(body, false);
        const placeholders = new Map();
        let placeholderMax = 0;
        for (const placeholder of textmateSnippet.placeholders) {
            placeholderMax = Math.max(placeholderMax, placeholder.index);
        }
        // mark snippet as trivial when there is no placeholders or when the only
        // placeholder is the final tabstop and it is at the very end.
        if (textmateSnippet.placeholders.length === 0) {
            this.isTrivial = true;
        }
        else if (placeholderMax === 0) {
            const last = textmateSnippet.children.at(-1);
            this.isTrivial = last instanceof Placeholder && last.isFinalTabstop;
        }
        const stack = [...textmateSnippet.children];
        while (stack.length > 0) {
            const marker = stack.shift();
            if (marker instanceof Variable) {
                if (marker.children.length === 0 && !KnownSnippetVariableNames[marker.name]) {
                    // a 'variable' without a default value and not being one of our supported
                    // variables is automatically turned into a placeholder. This is to restore
                    // a bug we had before. So `${foo}` becomes `${N:foo}`
                    const index = placeholders.has(marker.name)
                        ? placeholders.get(marker.name)
                        : ++placeholderMax;
                    placeholders.set(marker.name, index);
                    const synthetic = new Placeholder(index).appendChild(new Text(marker.name));
                    textmateSnippet.replace(marker, [synthetic]);
                    this.isBogous = true;
                }
                switch (marker.name) {
                    case 'CLIPBOARD':
                        this.usesClipboardVariable = true;
                        break;
                    case 'SELECTION':
                    case 'TM_SELECTED_TEXT':
                        this.usesSelectionVariable = true;
                        break;
                }
            }
            else {
                // recurse
                stack.push(...marker.children);
            }
        }
        if (this.isBogous) {
            this.codeSnippet = textmateSnippet.toTextmateString();
        }
    }
}
export class Snippet {
    constructor(isFileTemplate, scopes, name, prefix, description, body, source, snippetSource, snippetIdentifier, extensionId) {
        this.isFileTemplate = isFileTemplate;
        this.scopes = scopes;
        this.name = name;
        this.prefix = prefix;
        this.description = description;
        this.body = body;
        this.source = source;
        this.snippetSource = snippetSource;
        this.snippetIdentifier = snippetIdentifier;
        this.extensionId = extensionId;
        this.prefixLow = prefix.toLowerCase();
        this._bodyInsights = new WindowIdleValue(getActiveWindow(), () => new SnippetBodyInsights(this.body));
    }
    get codeSnippet() {
        return this._bodyInsights.value.codeSnippet;
    }
    get isBogous() {
        return this._bodyInsights.value.isBogous;
    }
    get isTrivial() {
        return this._bodyInsights.value.isTrivial;
    }
    get needsClipboard() {
        return this._bodyInsights.value.usesClipboardVariable;
    }
    get usesSelection() {
        return this._bodyInsights.value.usesSelectionVariable;
    }
}
function isJsonSerializedSnippet(thing) {
    return isObject(thing) && Boolean(thing.body);
}
export var SnippetSource;
(function (SnippetSource) {
    SnippetSource[SnippetSource["User"] = 1] = "User";
    SnippetSource[SnippetSource["Workspace"] = 2] = "Workspace";
    SnippetSource[SnippetSource["Extension"] = 3] = "Extension";
})(SnippetSource || (SnippetSource = {}));
export class SnippetFile {
    constructor(source, location, defaultScopes, _extension, _fileService, _extensionResourceLoaderService) {
        this.source = source;
        this.location = location;
        this.defaultScopes = defaultScopes;
        this._extension = _extension;
        this._fileService = _fileService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this.data = [];
        this.isGlobalSnippets = extname(location.path) === '.code-snippets';
        this.isUserSnippets = !this._extension;
    }
    select(selector, bucket) {
        if (this.isGlobalSnippets || !this.isUserSnippets) {
            this._scopeSelect(selector, bucket);
        }
        else {
            this._filepathSelect(selector, bucket);
        }
    }
    _filepathSelect(selector, bucket) {
        // for `fooLang.json` files all snippets are accepted
        if (selector + '.json' === basename(this.location.path)) {
            bucket.push(...this.data);
        }
    }
    _scopeSelect(selector, bucket) {
        // for `my.code-snippets` files we need to look at each snippet
        for (const snippet of this.data) {
            const len = snippet.scopes.length;
            if (len === 0) {
                // always accept
                bucket.push(snippet);
            }
            else {
                for (let i = 0; i < len; i++) {
                    // match
                    if (snippet.scopes[i] === selector) {
                        bucket.push(snippet);
                        break; // match only once!
                    }
                }
            }
        }
        const idx = selector.lastIndexOf('.');
        if (idx >= 0) {
            this._scopeSelect(selector.substring(0, idx), bucket);
        }
    }
    async _load() {
        if (this._extension) {
            return this._extensionResourceLoaderService.readExtensionResource(this.location);
        }
        else {
            const content = await this._fileService.readFile(this.location);
            return content.value.toString();
        }
    }
    load() {
        if (!this._loadPromise) {
            this._loadPromise = Promise.resolve(this._load()).then((content) => {
                const data = jsonParse(content);
                if (getNodeType(data) === 'object') {
                    for (const [name, scopeOrTemplate] of Object.entries(data)) {
                        if (isJsonSerializedSnippet(scopeOrTemplate)) {
                            this._parseSnippet(name, scopeOrTemplate, this.data);
                        }
                        else {
                            for (const [name, template] of Object.entries(scopeOrTemplate)) {
                                this._parseSnippet(name, template, this.data);
                            }
                        }
                    }
                }
                return this;
            });
        }
        return this._loadPromise;
    }
    reset() {
        this._loadPromise = undefined;
        this.data.length = 0;
    }
    _parseSnippet(name, snippet, bucket) {
        let { isFileTemplate, prefix, body, description } = snippet;
        if (!prefix) {
            prefix = '';
        }
        if (Array.isArray(body)) {
            body = body.join('\n');
        }
        if (typeof body !== 'string') {
            return;
        }
        if (Array.isArray(description)) {
            description = description.join('\n');
        }
        let scopes;
        if (this.defaultScopes) {
            scopes = this.defaultScopes;
        }
        else if (typeof snippet.scope === 'string') {
            scopes = snippet.scope
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
        else {
            scopes = [];
        }
        let source;
        if (this._extension) {
            // extension snippet -> show the name of the extension
            source = this._extension.displayName || this._extension.name;
        }
        else if (this.source === 2 /* SnippetSource.Workspace */) {
            // workspace -> only *.code-snippets files
            source = localize('source.workspaceSnippetGlobal', 'Workspace Snippet');
        }
        else {
            // user -> global (*.code-snippets) and language snippets
            if (this.isGlobalSnippets) {
                source = localize('source.userSnippetGlobal', 'Global User Snippet');
            }
            else {
                source = localize('source.userSnippet', 'User Snippet');
            }
        }
        for (const _prefix of Iterable.wrap(prefix)) {
            bucket.push(new Snippet(Boolean(isFileTemplate), scopes, name, _prefix, description, body, source, this.source, this._extension
                ? `${relativePath(this._extension.extensionLocation, this.location)}/${name}`
                : `${basename(this.location.path)}/${name}`, this._extension?.identifier));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNGaWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0c0ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkUsT0FBTyxFQUNOLGFBQWEsRUFDYixRQUFRLEVBQ1IsV0FBVyxFQUNYLElBQUksR0FDSixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBUTFHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbEYsTUFBTSxtQkFBbUI7SUFZeEIsWUFBWSxJQUFZO1FBQ3ZCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUNyQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUE7UUFDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFFdkIs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