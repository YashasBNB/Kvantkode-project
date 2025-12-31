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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9jb21tb24vZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEc7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLE9BQU8sdUJBQXVCO0lBR25DLFlBQVksTUFBNEI7UUFGaEMsU0FBSSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFHM0IsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ3JELEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFTyxhQUFhLENBQUMsUUFBZ0IsRUFBRSxPQUFlO1FBQ3RELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTixPQUFPO2dCQUNQLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixPQUFPLEVBQUUsRUFBRTthQUNYLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU87Z0JBQ04sT0FBTztnQkFDUCxRQUFRLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUN4QyxPQUFPLEVBQUUsUUFB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