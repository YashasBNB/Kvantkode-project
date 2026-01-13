import { FileAccess } from '../common/network.js';
function asFragment(raw) {
    return raw;
}
export function asCssValueWithDefault(cssPropertyValue, dflt) {
    if (cssPropertyValue !== undefined) {
        const variableMatch = cssPropertyValue.match(/^\s*var\((.+)\)$/);
        if (variableMatch) {
            const varArguments = variableMatch[1].split(',', 2);
            if (varArguments.length === 2) {
                dflt = asCssValueWithDefault(varArguments[1].trim(), dflt);
            }
            return `var(${varArguments[0]}, ${dflt})`;
        }
        return cssPropertyValue;
    }
    return dflt;
}
export function sizeValue(value) {
    const out = value.replaceAll(/[^\w.%+-]/gi, '');
    if (out !== value) {
        console.warn(`CSS size ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
export function hexColorValue(value) {
    const out = value.replaceAll(/[^[0-9a-fA-F#]]/gi, '');
    if (out !== value) {
        console.warn(`CSS hex color ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
export function identValue(value) {
    const out = value.replaceAll(/[^_\-a-z0-9]/gi, '');
    if (out !== value) {
        console.warn(`CSS ident value ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
export function stringValue(value) {
    return asFragment(`'${value.replaceAll(/'/g, '\\000027')}'`);
}
/**
 * returns url('...')
 */
export function asCSSUrl(uri) {
    if (!uri) {
        return asFragment(`url('')`);
    }
    return inline `url('${asFragment(CSS.escape(FileAccess.uriToBrowserUri(uri).toString(true)))}')`;
}
export function className(value, escapingExpected = false) {
    const out = CSS.escape(value);
    if (!escapingExpected && out !== value) {
        console.warn(`CSS class name ${value} modified to ${out} to be safe for CSS`);
    }
    return asFragment(out);
}
/**
 * Template string tag that that constructs a CSS fragment.
 *
 * All expressions in the template must be css safe values.
 */
export function inline(strings, ...values) {
    return asFragment(strings.reduce((result, str, i) => {
        const value = values[i] || '';
        return result + str + value;
    }, ''));
}
export class Builder {
    constructor() {
        this._parts = [];
    }
    push(...parts) {
        this._parts.push(...parts);
    }
    join(joiner = '\n') {
        return asFragment(this._parts.join(joiner));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzVmFsdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9jc3NWYWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFLakQsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM5QixPQUFPLEdBQWtCLENBQUE7QUFDMUIsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxnQkFBb0MsRUFBRSxJQUFZO0lBQ3ZGLElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDcEMsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDaEUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNuRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDM0QsQ0FBQztZQUNELE9BQU8sT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUE7UUFDMUMsQ0FBQztRQUNELE9BQU8sZ0JBQWdCLENBQUE7SUFDeEIsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELE1BQU0sVUFBVSxTQUFTLENBQUMsS0FBYTtJQUN0QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtJ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