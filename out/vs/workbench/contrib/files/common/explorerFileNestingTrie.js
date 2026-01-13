/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A sort of double-ended trie, used to efficiently query for matches to "star" patterns, where
 * a given key represents a parent and may contain a capturing group ("*"), which can then be
 * referenced via the token "$(capture)" in associated child patterns.
 *
 * The generated tree will have at most two levels, as subtrees are flattened rather than nested.
 *
 * Example:
 * The config: [
 * [ *.ts , [ $(capture).*.ts ; $(capture).js ] ]
 * [ *.js , [ $(capture).min.js ] ] ]
 * Nests the files: [ a.ts ; a.d.ts ; a.js ; a.min.js ; b.ts ; b.min.js ]
 * As:
 * - a.ts => [ a.d.ts ; a.js ; a.min.js ]
 * - b.ts => [ ]
 * - b.min.ts => [ ]
 */
export class ExplorerFileNestingTrie {
    constructor(config) {
        this.root = new PreTrie();
        for (const [parentPattern, childPatterns] of config) {
            for (const childPattern of childPatterns) {
                this.root.add(parentPattern, childPattern);
            }
        }
    }
    toString() {
        return this.root.toString();
    }
    getAttributes(filename, dirname) {
        const lastDot = filename.lastIndexOf('.');
        if (lastDot < 1) {
            return {
                dirname,
                basename: filename,
                extname: '',
            };
        }
        else {
            return {
                dirname,
                basename: filename.substring(0, lastDot),
                extname: filename.substring(lastDot + 1),
            };
        }
    }
    nest(files, dirname) {
        const parentFinder = new PreTrie();
        for (const potentialParent of files) {
            const attributes = this.getAttributes(potentialParent, dirname);
            const children = this.root.get(potentialParent, attributes);
            for (const child of children) {
                parentFinder.add(child, potentialParent);
            }
        }
        const findAllRootAncestors = (file, seen = new Set()) => {
            if (seen.has(file)) {
                return [];
            }
            seen.add(file);
            const attributes = this.getAttributes(file, dirname);
            const ancestors = parentFinder.get(file, attributes);
            if (ancestors.length === 0) {
                return [file];
            }
            if (ancestors.length === 1 && ancestors[0] === file) {
                return [file];
            }
            return ancestors.flatMap((a) => findAllRootAncestors(a, seen));
        };
        const result = new Map();
        for (const file of files) {
            let ancestors = findAllRootAncestors(file);
            if (ancestors.length === 0) {
                ancestors = [file];
            }
            for (const ancestor of ancestors) {
                let existing = result.get(ancestor);
                if (!existing) {
                    result.set(ancestor, (existing = new Set()));
                }
                if (file !== ancestor) {
                    existing.add(file);
                }
            }
        }
        return result;
    }
}
/** Export for test only. */
export class PreTrie {
    constructor() {
        this.value = new SufTrie();
        this.map = new Map();
    }
    add(key, value) {
        if (key === '') {
            this.value.add(key, value);
        }
        else if (key[0] === '*') {
            this.value.add(key, value);
        }
        else {
            const head = key[0];
            const rest = key.slice(1);
            let existing = this.map.get(head);
            if (!existing) {
                this.map.set(head, (existing = new PreTrie()));
            }
            existing.add(rest, value);
        }
    }
    get(key, attributes) {
        const results = [];
        results.push(...this.value.get(key, attributes));
        const head = key[0];
        const rest = key.slice(1);
        const existing = this.map.get(head);
        if (existing) {
            results.push(...existing.get(rest, attributes));
        }
        return results;
    }
    toString(indentation = '') {
        const lines = [];
        if (this.value.hasItems) {
            lines.push('* => \n' + this.value.toString(indentation + '  '));
        }
        ;
        [...this.map.entries()].map(([key, trie]) => lines.push('^' + key + ' => \n' + trie.toString(indentation + '  ')));
        return lines.map((l) => indentation + l).join('\n');
    }
}
/** Export for test only. */
export class SufTrie {
    constructor() {
        this.star = [];
        this.epsilon = [];
        this.map = new Map();
        this.hasItems = false;
    }
    add(key, value) {
        this.hasItems = true;
        if (key === '*') {
            this.star.push(new SubstitutionString(value));
        }
        else if (key === '') {
            this.epsilon.push(new SubstitutionString(value));
        }
        else {
            const tail = key[key.length - 1];
            const rest = key.slice(0, key.length - 1);
            if (tail === '*') {
                throw Error('Unexpected star in SufTrie key: ' + key);
            }
            else {
                let existing = this.map.get(tail);
                if (!existing) {
                    this.map.set(tail, (existing = new SufTrie()));
                }
                existing.add(rest, value);
            }
        }
    }
    get(key, attributes) {
        const results = [];
        if (key === '') {
            results.push(...this.epsilon.map((ss) => ss.substitute(attributes)));
        }
        if (this.star.length) {
            results.push(...this.star.map((ss) => ss.substitute(attributes, key)));
        }
        const tail = key[key.length - 1];
        const rest = key.slice(0, key.length - 1);
        const existing = this.map.get(tail);
        if (existing) {
            results.push(...existing.get(rest, attributes));
        }
        return results;
    }
    toString(indentation = '') {
        const lines = [];
        if (this.star.length) {
            lines.push('* => ' + this.star.join('; '));
        }
        if (this.epsilon.length) {
            // allow-any-unicode-next-line
            lines.push('ε => ' + this.epsilon.join('; '));
        }
        ;
        [...this.map.entries()].map(([key, trie]) => lines.push(key + '$' + ' => \n' + trie.toString(indentation + '  ')));
        return lines.map((l) => indentation + l).join('\n');
    }
}
var SubstitutionType;
(function (SubstitutionType) {
    SubstitutionType["capture"] = "capture";
    SubstitutionType["basename"] = "basename";
    SubstitutionType["dirname"] = "dirname";
    SubstitutionType["extname"] = "extname";
})(SubstitutionType || (SubstitutionType = {}));
const substitutionStringTokenizer = /\$[({](capture|basename|dirname|extname)[)}]/g;
class SubstitutionString {
    constructor(pattern) {
        this.tokens = [];
        substitutionStringTokenizer.lastIndex = 0;
        let token;
        let lastIndex = 0;
        while ((token = substitutionStringTokenizer.exec(pattern))) {
            const prefix = pattern.slice(lastIndex, token.index);
            this.tokens.push(prefix);
            const type = token[1];
            switch (type) {
                case "basename" /* SubstitutionType.basename */:
                case "dirname" /* SubstitutionType.dirname */:
                case "extname" /* SubstitutionType.extname */:
                case "capture" /* SubstitutionType.capture */:
                    this.tokens.push({ capture: type });
                    break;
                default:
                    throw Error('unknown substitution type: ' + type);
            }
            lastIndex = token.index + token[0].length;
        }
        if (lastIndex !== pattern.length) {
            const suffix = pattern.slice(lastIndex, pattern.length);
            this.tokens.push(suffix);
        }
    }
    substitute(attributes, capture) {
        return this.tokens
            .map((t) => {
            if (typeof t === 'string') {
                return t;
            }
            switch (t.capture) {
                case "basename" /* SubstitutionType.basename */:
                    return attributes.basename;
                case "dirname" /* SubstitutionType.dirname */:
                    return attributes.dirname;
                case "extname" /* SubstitutionType.extname */:
                    return attributes.extname;
                case "capture" /* SubstitutionType.capture */:
                    return capture || '';
            }
        })
            .join('');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2NvbW1vbi9leHBsb3JlckZpbGVOZXN0aW5nVHJpZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRzs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsWUFBWSxNQUE0QjtRQUZoQyxTQUFJLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUczQixLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDckQsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQzNDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDNUIsQ0FBQztJQUVPLGFBQWEsQ0FBQyxRQUFnQixFQUFFLE9BQWU7UUFDdEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN6QyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqQixPQUFPO2dCQUNOLE9BQU87Z0JBQ1AsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLE9BQU8sRUFBRSxFQUFFO2FBQ1gsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTztnQkFDTixPQUFPO2dCQUNQLFFBQVEsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENB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