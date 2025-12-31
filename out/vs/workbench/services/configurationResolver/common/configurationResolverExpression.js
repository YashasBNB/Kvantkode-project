/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../base/common/iterator.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
export class ConfigurationResolverExpression {
    static { this.VARIABLE_LHS = '${'; }
    constructor(object) {
        this.locations = new Map();
        // If the input is a string, wrap it in an object so we can use the same logic
        if (typeof object === 'string') {
            this.stringRoot = true;
            this.root = { value: object };
        }
        else {
            this.stringRoot = false;
            this.root = structuredClone(object);
        }
    }
    /**
     * Creates a new {@link ConfigurationResolverExpression} from an object.
     * Note that platform-specific keys (i.e. `windows`, `osx`, `linux`) are
     * applied during parsing.
     */
    static parse(object) {
        if (object instanceof ConfigurationResolverExpression) {
            return object;
        }
        const expr = new ConfigurationResolverExpression(object);
        expr.applyPlatformSpecificKeys();
        expr.parseObject(expr.root);
        return expr;
    }
    applyPlatformSpecificKeys() {
        const config = this.root; // already cloned by ctor, safe to change
        const key = isWindows ? 'windows' : isMacintosh ? 'osx' : isLinux ? 'linux' : undefined;
        if (key === undefined || !config || typeof config !== 'object' || !config.hasOwnProperty(key)) {
            return;
        }
        Object.keys(config[key]).forEach((k) => (config[k] = config[key][k]));
        delete config.windows;
        delete config.osx;
        delete config.linux;
    }
    parseVariable(str, start) {
        if (str[start] !== '$' || str[start + 1] !== '{') {
            return undefined;
        }
        let end = start + 2;
        let braceCount = 1;
        while (end < str.length) {
            if (str[end] === '{') {
                braceCount++;
            }
            else if (str[end] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    break;
                }
            }
            end++;
        }
        if (braceCount !== 0) {
            return undefined;
        }
        const id = str.slice(start, end + 1);
        const inner = str.substring(start + 2, end);
        const colonIdx = inner.indexOf(':');
        if (colonIdx === -1) {
            return { replacement: { id, name: inner, inner }, end };
        }
        return {
            replacement: {
                id,
                inner,
                name: inner.slice(0, colonIdx),
                arg: inner.slice(colonIdx + 1),
            },
            end,
        };
    }
    parseObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const value = obj[i];
                if (typeof value === 'string') {
                    this.parseString(obj, i, value);
                }
                else {
                    this.parseObject(value);
                }
            }
            return;
        }
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                this.parseString(obj, key, value);
            }
            else {
                this.parseObject(value);
            }
        }
    }
    parseString(object, propertyName, value) {
        let pos = 0;
        while (pos < value.length) {
            const match = value.indexOf('${', pos);
            if (match === -1) {
                break;
            }
            const parsed = this.parseVariable(value, match);
            if (parsed) {
                const locations = this.locations.get(parsed.replacement.id) || {
                    locations: [],
                    replacement: parsed.replacement,
                };
                locations.locations.push({ object, propertyName });
                this.locations.set(parsed.replacement.id, locations);
                pos = parsed.end + 1;
            }
            else {
                pos = match + 2;
            }
        }
    }
    unresolved() {
        return Iterable.map(Iterable.filter(this.locations.values(), (l) => l.resolved === undefined), (l) => l.replacement);
    }
    resolved() {
        return Iterable.map(Iterable.filter(this.locations.values(), (l) => !!l.resolved), (l) => [l.replacement, l.resolved]);
    }
    resolve(replacement, data) {
        if (typeof data !== 'object') {
            data = { value: String(data) };
        }
        const location = this.locations.get(replacement.id);
        if (!location) {
            return;
        }
        if (data.value !== undefined) {
            for (const { object, propertyName } of location.locations || []) {
                const newValue = object[propertyName].replaceAll(replacement.id, data.value);
                object[propertyName] = newValue;
            }
        }
        location.resolved = data;
    }
    toObject() {
        // If we wrapped a string, unwrap it
        if (this.stringRoot) {
            return this.root.value;
        }
        return this.root;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyRXhwcmVzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvY29tbW9uL2NvbmZpZ3VyYXRpb25SZXNvbHZlckV4cHJlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBeURyRixNQUFNLE9BQU8sK0JBQStCO2FBQ3BCLGlCQUFZLEdBQUcsSUFBSSxBQUFQLENBQU87SUFNMUMsWUFBb0IsTUFBUztRQUpyQixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUE7UUFLMUQsOEVBQThFO1FBQzlFLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7WUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQVMsQ0FBQTtRQUNyQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLE1BQU0sQ0FBQyxLQUFLLENBQUksTUFBUztRQUMvQixJQUFJLE1BQU0sWUFBWSwrQkFBK0IsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksK0JBQStCLENBQUksTUFBTSxD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