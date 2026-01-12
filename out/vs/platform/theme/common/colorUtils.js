/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../base/common/assert.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { Extensions as JSONExtensions, } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
import * as nls from '../../../nls.js';
/**
 * Returns the css variable name for the given color identifier. Dots (`.`) are replaced with hyphens (`-`) and
 * everything is prefixed with `--vscode-`.
 *
 * @sample `editorSuggestWidget.background` is `--vscode-editorSuggestWidget-background`.
 */
export function asCssVariableName(colorIdent) {
    return `--vscode-${colorIdent.replace(/\./g, '-')}`;
}
export function asCssVariable(color) {
    return `var(${asCssVariableName(color)})`;
}
export function asCssVariableWithDefault(color, defaultCssValue) {
    return `var(${asCssVariableName(color)}, ${defaultCssValue})`;
}
export var ColorTransformType;
(function (ColorTransformType) {
    ColorTransformType[ColorTransformType["Darken"] = 0] = "Darken";
    ColorTransformType[ColorTransformType["Lighten"] = 1] = "Lighten";
    ColorTransformType[ColorTransformType["Transparent"] = 2] = "Transparent";
    ColorTransformType[ColorTransformType["Opaque"] = 3] = "Opaque";
    ColorTransformType[ColorTransformType["OneOf"] = 4] = "OneOf";
    ColorTransformType[ColorTransformType["LessProminent"] = 5] = "LessProminent";
    ColorTransformType[ColorTransformType["IfDefinedThenElse"] = 6] = "IfDefinedThenElse";
})(ColorTransformType || (ColorTransformType = {}));
export function isColorDefaults(value) {
    return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}
// color registry
export const Extensions = {
    ColorContribution: 'base.contributions.colors',
};
export const DEFAULT_COLOR_CONFIG_VALUE = 'default';
class ColorRegistry {
    constructor() {
        this._onDidChangeSchema = new Emitter();
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.colorSchema = { type: 'object', properties: {} };
        this.colorReferenceSchema = {
            type: 'string',
            enum: [],
            enumDescriptions: [],
        };
        this.colorsById = {};
    }
    notifyThemeUpdate(colorThemeData) {
        for (const key of Object.keys(this.colorsById)) {
            const color = colorThemeData.getColor(key);
            if (color) {
                this.colorSchema.properties[key].oneOf[0].defaultSnippets[0].body =
                    `\${1:${Color.Format.CSS.formatHexA(color, true)}}`;
            }
        }
        this._onDidChangeSchema.fire();
    }
    registerColor(id, defaults, description, needsTransparency = false, deprecationMessage) {
        const colorContribution = {
            id,
            description,
            defaults,
            needsTransparency,
            deprecationMessage,
        };
        this.colorsById[id] = colorContribution;
        const propertySchema = {
            type: 'string',
            format: 'color-hex',
            defaultSnippets: [{ body: '${1:#ff0000}' }],
        };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (needsTransparency) {
            propertySchema.pattern =
                '^#(?:(?<rgba>[0-9a-fA-f]{3}[0-9a-eA-E])|(?:[0-9a-fA-F]{6}(?:(?![fF]{2})(?:[0-9a-fA-F]{2}))))?$';
            propertySchema.patternErrorMessage = nls.localize('transparecyRequired', 'This color must be transparent or it will obscure content');
        }
        this.colorSchema.properties[id] = {
            description,
            oneOf: [
                propertySchema,
                {
                    type: 'string',
                    const: DEFAULT_COLOR_CONFIG_VALUE,
                    description: nls.localize('useDefault', 'Use the default color.'),
                },
            ],
        };
        this.colorReferenceSchema.enum.push(id);
        this.colorReferenceSchema.enumDescriptions.push(description);
        this._onDidChangeSchema.fire();
        return id;
    }
    deregisterColor(id) {
        delete this.colorsById[id];
        delete this.colorSchema.properties[id];
        const index = this.colorReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.colorReferenceSchema.enum.splice(index, 1);
            this.colorReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChangeSchema.fire();
    }
    getColors() {
        return Object.keys(this.colorsById).map((id) => this.colorsById[id]);
    }
    resolveDefaultColor(id, theme) {
        const colorDesc = this.colorsById[id];
        if (colorDesc?.defaults) {
            const colorValue = isColorDefaults(colorDesc.defaults)
                ? colorDesc.defaults[theme.type]
                : colorDesc.defaults;
            return resolveColorValue(colorValue, theme);
        }
        return undefined;
    }
    getColorSchema() {
        return this.colorSchema;
    }
    getColorReferenceSchema() {
        return this.colorReferenceSchema;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.colorsById)
            .sort(sorter)
            .map((k) => `- \`${k}\`: ${this.colorsById[k].description}`)
            .join('\n');
    }
}
const colorRegistry = new ColorRegistry();
platform.Registry.add(Extensions.ColorContribution, colorRegistry);
export function registerColor(id, defaults, description, needsTransparency, deprecationMessage) {
    return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}
export function getColorRegistry() {
    return colorRegistry;
}
// ----- color functions
export function executeTransform(transform, theme) {
    switch (transform.op) {
        case 0 /* ColorTransformType.Darken */:
            return resolveColorValue(transform.value, theme)?.darken(transform.factor);
        case 1 /* ColorTransformType.Lighten */:
            return resolveColorValue(transform.value, theme)?.lighten(transform.factor);
        case 2 /* ColorTransformType.Transparent */:
            return resolveColorValue(transform.value, theme)?.transparent(transform.factor);
        case 3 /* ColorTransformType.Opaque */: {
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return resolveColorValue(transform.value, theme);
            }
            return resolveColorValue(transform.value, theme)?.makeOpaque(backgroundColor);
        }
        case 4 /* ColorTransformType.OneOf */:
            for (const candidate of transform.values) {
                const color = resolveColorValue(candidate, theme);
                if (color) {
                    return color;
                }
            }
            return undefined;
        case 6 /* ColorTransformType.IfDefinedThenElse */:
            return resolveColorValue(theme.defines(transform.if) ? transform.then : transform.else, theme);
        case 5 /* ColorTransformType.LessProminent */: {
            const from = resolveColorValue(transform.value, theme);
            if (!from) {
                return undefined;
            }
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return from.transparent(transform.factor * transform.transparency);
            }
            return from.isDarkerThan(backgroundColor)
                ? Color.getLighterColor(from, backgroundColor, transform.factor).transparent(transform.transparency)
                : Color.getDarkerColor(from, backgroundColor, transform.factor).transparent(transform.transparency);
        }
        default:
            throw assertNever(transform);
    }
}
export function darken(colorValue, factor) {
    return { op: 0 /* ColorTransformType.Darken */, value: colorValue, factor };
}
export function lighten(colorValue, factor) {
    return { op: 1 /* ColorTransformType.Lighten */, value: colorValue, factor };
}
export function transparent(colorValue, factor) {
    return { op: 2 /* ColorTransformType.Transparent */, value: colorValue, factor };
}
export function opaque(colorValue, background) {
    return { op: 3 /* ColorTransformType.Opaque */, value: colorValue, background };
}
export function oneOf(...colorValues) {
    return { op: 4 /* ColorTransformType.OneOf */, values: colorValues };
}
export function ifDefinedThenElse(ifArg, thenArg, elseArg) {
    return { op: 6 /* ColorTransformType.IfDefinedThenElse */, if: ifArg, then: thenArg, else: elseArg };
}
export function lessProminent(colorValue, backgroundColorValue, factor, transparency) {
    return {
        op: 5 /* ColorTransformType.LessProminent */,
        value: colorValue,
        background: backgroundColorValue,
        factor,
        transparency,
    };
}
// ----- implementation
/**
 * @param colorValue Resolve a color value in the context of a theme
 */
export function resolveColorValue(colorValue, theme) {
    if (colorValue === null) {
        return undefined;
    }
    else if (typeof colorValue === 'string') {
        if (colorValue[0] === '#') {
            return Color.fromHex(colorValue);
        }
        return theme.getColor(colorValue);
    }
    else if (colorValue instanceof Color) {
        return colorValue;
    }
    else if (typeof colorValue === 'object') {
        return executeTransform(colorValue, theme);
    }
    return undefined;
}
export const workbenchColorsSchemaId = 'vscode://schemas/workbench-colors';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(workbenchColorsSchemaId, colorRegistry.getColorSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workbenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
// setTimeout(_ => console.log(colorRegistry.toString()), 5000);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL2NvbG9yVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUVOLFVBQVUsSUFBSSxjQUFjLEdBQzVCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBY3RDOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFVBQTJCO0lBQzVELE9BQU8sWUFBWSxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFBO0FBQ3BELENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQXNCO0lBQ25ELE9BQU8sT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFBO0FBQzFDLENBQUM7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBc0IsRUFBRSxlQUF1QjtJQUN2RixPQUFPLE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLEtBQUssZUFBZSxHQUFHLENBQUE7QUFDOUQsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixrQkFRakI7QUFSRCxXQUFrQixrQkFBa0I7SUFDbkMsK0RBQU0sQ0FBQTtJQUNOLGlFQUFPLENB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