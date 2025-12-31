/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from './errors.js';
import { escapeIcons } from './iconLabels.js';
import { Schemas } from './network.js';
import { isEqual } from './resources.js';
import { escapeRegExpCharacters } from './strings.js';
import { URI } from './uri.js';
export var MarkdownStringTextNewlineStyle;
(function (MarkdownStringTextNewlineStyle) {
    MarkdownStringTextNewlineStyle[MarkdownStringTextNewlineStyle["Paragraph"] = 0] = "Paragraph";
    MarkdownStringTextNewlineStyle[MarkdownStringTextNewlineStyle["Break"] = 1] = "Break";
})(MarkdownStringTextNewlineStyle || (MarkdownStringTextNewlineStyle = {}));
export class MarkdownString {
    static lift(dto) {
        const markdownString = new MarkdownString(dto.value, dto);
        markdownString.uris = dto.uris;
        markdownString.baseUri = dto.baseUri ? URI.revive(dto.baseUri) : undefined;
        return markdownString;
    }
    constructor(value = '', isTrustedOrOptions = false) {
        this.value = value;
        if (typeof this.value !== 'string') {
            throw illegalArgument('value');
        }
        if (typeof isTrustedOrOptions === 'boolean') {
            this.isTrusted = isTrustedOrOptions;
            this.supportThemeIcons = false;
            this.supportHtml = false;
        }
        else {
            this.isTrusted = isTrustedOrOptions.isTrusted ?? undefined;
            this.supportThemeIcons = isTrustedOrOptions.supportThemeIcons ?? false;
            this.supportHtml = isTrustedOrOptions.supportHtml ?? false;
        }
    }
    appendText(value, newlineStyle = 0 /* MarkdownStringTextNewlineStyle.Paragraph */) {
        this.value += escapeMarkdownSyntaxTokens(this.supportThemeIcons ? escapeIcons(value) : value) // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
            .replace(/([ \t]+)/g, (_match, g1) => '&nbsp;'.repeat(g1.length)) // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
            .replace(/\>/gm, '\\>') // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
            .replace(/\n/g, newlineStyle === 1 /* MarkdownStringTextNewlineStyle.Break */ ? '\\\n' : '\n\n'); // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
        return this;
    }
    appendMarkdown(value) {
        this.value += value;
        return this;
    }
    appendCodeblock(langId, code) {
        this.value += `\n${appendEscapedMarkdownCodeBlockFence(code, langId)}\n`;
        return this;
    }
    appendLink(target, label, title) {
        this.value += '[';
        this.value += this._escape(label, ']');
        this.value += '](';
        this.value += this._escape(String(target), ')');
        if (title) {
            this.value += ` "${this._escape(this._escape(title, '"'), ')')}"`;
        }
        this.value += ')';
        return this;
    }
    _escape(value, ch) {
        const r = new RegExp(escapeRegExpCharacters(ch), 'g');
        return value.replace(r, (match, offset) => {
            if (value.charAt(offset - 1) !== '\\') {
                return `\\${match}`;
            }
            else {
                return match;
            }
        });
    }
}
export function isEmptyMarkdownString(oneOrMany) {
    if (isMarkdownString(oneOrMany)) {
        return !oneOrMany.value;
    }
    else if (Array.isArray(oneOrMany)) {
        return oneOrMany.every(isEmptyMarkdownString);
    }
    else {
        return true;
    }
}
export function isMarkdownString(thing) {
    if (thing instanceof MarkdownString) {
        return true;
    }
    else if (thing && typeof thing === 'object') {
        return (typeof thing.value === 'string' &&
            (typeof thing.isTrusted === 'boolean' ||
                typeof thing.isTrusted === 'object' ||
                thing.isTrusted === undefined) &&
            (typeof thing.supportThemeIcons === 'boolean' ||
                thing.supportThemeIcons === undefined));
    }
    return false;
}
export function markdownStringEqual(a, b) {
    if (a === b) {
        return true;
    }
    else if (!a || !b) {
        return false;
    }
    else {
        return (a.value === b.value &&
            a.isTrusted === b.isTrusted &&
            a.supportThemeIcons === b.supportThemeIcons &&
            a.supportHtml === b.supportHtml &&
            (a.baseUri === b.baseUri ||
                (!!a.baseUri && !!b.baseUri && isEqual(URI.from(a.baseUri), URI.from(b.baseUri)))));
    }
}
export function escapeMarkdownSyntaxTokens(text) {
    // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
    return text.replace(/[\\`*_{}[\]()#+\-!~]/g, '\\$&'); // CodeQL [SM02383] Backslash is escaped in the character class
}
/**
 * @see https://github.com/microsoft/vscode/issues/193746
 */
export function appendEscapedMarkdownCodeBlockFence(code, langId) {
    const longestFenceLength = code.match(/^`+/gm)?.reduce((a, b) => (a.length > b.length ? a : b)).length ?? 0;
    const desiredFenceLength = longestFenceLength >= 3 ? longestFenceLength + 1 : 3;
    // the markdown result
    return [
        `${'`'.repeat(desiredFenceLength)}${langId}`,
        code,
        `${'`'.repeat(desiredFenceLength)}`,
    ].join('\n');
}
export function escapeDoubleQuotes(input) {
    return input.replace(/"/g, '&quot;');
}
export function removeMarkdownEscapes(text) {
    if (!text) {
        return text;
    }
    return text.replace(/\\([\\`*_{}[\]()#+\-.!~])/g, '$1');
}
export function parseHrefAndDimensions(href) {
    const dimensions = [];
    const splitted = href.split('|').map((s) => s.trim());
    href = splitted[0];
    const parameters = splitted[1];
    if (parameters) {
        const heightFromParams = /height=(\d+)/.exec(parameters);
        const widthFromParams = /width=(\d+)/.exec(parameters);
        const height = heightFromParams ? heightFromParams[1] : '';
        const width = widthFromParams ? widthFromParams[1] : '';
        const widthIsFinite = isFinite(parseInt(width));
        const heightIsFinite = isFinite(parseInt(height));
        if (widthIsFinite) {
            dimensions.push(`width="${width}"`);
        }
        if (heightIsFinite) {
            dimensions.push(`height="${height}"`);
        }
    }
    return { href, dimensions };
}
export function markdownCommandLink(command) {
    const uri = URI.from({
        scheme: Schemas.command,
        path: command.id,
        query: command.arguments?.length
            ? encodeURIComponent(JSON.stringify(command.arguments))
            : undefined,
    }).toString();
    return `[${escapeMarkdownSyntaxTokens(command.title)}](${uri})`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbENvbnRlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9odG1sQ29udGVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDckQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxVQUFVLENBQUE7QUFlN0MsTUFBTSxDQUFOLElBQWtCLDhCQUdqQjtBQUhELFdBQWtCLDhCQUE4QjtJQUMvQyw2RkFBYSxDQUFBO0lBQ2IscUZBQVMsQ0FBQTtBQUNWLENBQUMsRUFIaUIsOEJBQThCLEtBQTlCLDhCQUE4QixRQUcvQztBQUVELE1BQU0sT0FBTyxjQUFjO0lBUW5CLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBb0I7UUFDdEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN6RCxjQUFjLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUE7UUFDOUIsY0FBYyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQzFFLE9BQU8sY0FBYyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxZQUNDLFFBQWdCLEVBQUUsRUFDbEIscUJBTU8sS0FBSztRQUVaLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFFRCxJQUFJLE9BQU8sa0JBQWtCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQTtZQUNuQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFBO1lBQzlCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFBO1lBQzFELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxpQkFBaUIsSUFBSSxLQUFLLENBQUE7WUFDdEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFBO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUNULEtBQWEsRUFDYiwrREFBdUY7UUFFdkYsSUFBSSxDQUFDLEtBQUssSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMseUVBQXlFO2FBQ3JLLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLHlFQUF5RTthQUMxSSxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLHlFQUF5RTthQUNoRyxPQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksaURBQXlDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQyx5RUFBeUU7UUFFbkssT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQWE7UUFDM0IsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUE7UUFDbkIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsZUFBZSxDQUFDLE1BQWMsRUFBRSxJQUFZO1FBQzNDLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxtQ0FBbUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQTtRQUN4RSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBb0IsRUFBRSxLQUFhLEVBQUUsS0FBYztRQUM3RCxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQTtRQUNqQixJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDL0MsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUE7UUFDbEUsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFBO1FBQ2pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLE9BQU8sQ0FBQyxLQUFhLEVBQUUsRUFBVTtRQUN4QyxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQTtZQUNwQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLFNBQWlFO0lBRWpFLElBQUksZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQTtJQUN4QixDQUFDO1NBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDckMsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7SUFDOUMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEtBQVU7SUFDMUMsSUFBSSxLQUFLLFlBQVksY0FBYyxFQUFFLENBQUM7UUFDckMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO1NBQU0sSUFBSSxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDL0MsT0FBTyxDQUNOLE9BQXlCLEtBQU0sQ0FBQyxLQUFLLEtBQUssUUFBUTtZQUNsRCxDQUFDLE9BQXlCLEtBQU0sQ0FBQyxTQUFTLEtBQUssU0FBUztnQkFDdkQsT0FBeUIsS0FBTSxDQUFDLFNBQVMsS0FBSyxRQUFRO2dCQUNwQyxLQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQztZQUNsRCxDQUFDLE9BQXlCLEtBQU0sQ0FBQyxpQkFBaUIsS0FBSyxTQUFTO2dCQUM3QyxLQUFNLENBQUMsaUJBQWlCLEtBQUssU0FBUyxDQUFDLENBQzFELENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLENBQWtCLEVBQUUsQ0FBa0I7SUFDekUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDYixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7U0FBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDckIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sQ0FDTixDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLO1lBQ25CLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVM7WUFDM0IsQ0FBQyxDQUFDLGlCQUFpQixLQUFLLENBQUMsQ0FBQyxpQkFBaUI7WUFDM0MsQ0FBQyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsV0FBVztZQUMvQixDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLE9BQU87Z0JBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNuRixDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsSUFBWTtJQUN0RCw4RkFBOEY7SUFDOUYsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxDQUFBLENBQUMsK0RBQStEO0FBQ3JILENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxtQ0FBbUMsQ0FBQyxJQUFZLEVBQUUsTUFBYztJQUMvRSxNQUFNLGtCQUFrQixHQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQTtJQUNqRixNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFL0Usc0JBQXNCO0lBQ3RCLE9BQU87UUFDTixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxNQUFNLEVBQUU7UUFDNUMsSUFBSTtRQUNKLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO0tBQ25DLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFhO0lBQy9DLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDckMsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxJQUFZO0lBQ2pELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUN4RCxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLElBQVk7SUFDbEQsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFBO0lBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNyRCxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5QixJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN4RCxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQzFELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDdkQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQTtBQUM1QixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLE9BSW5DO0lBQ0EsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ2hCLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLE1BQU07WUFDL0IsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxTQUFTO0tBQ1osQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBRWIsT0FBTyxJQUFJLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQTtBQUNoRSxDQUFDIn0=