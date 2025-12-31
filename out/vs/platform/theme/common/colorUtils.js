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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi9jb2xvclV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFFTixVQUFVLElBQUksY0FBYyxHQUM1QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sS0FBSyxRQUFRLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQWN0Qzs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxVQUEyQjtJQUM1RCxPQUFPLFlBQVksVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQTtBQUNwRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUFzQjtJQUNuRCxPQUFPLE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQXNCLEVBQUUsZUFBdUI7SUFDdkYsT0FBTyxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLGVBQWUsR0FBRyxDQUFBO0FBQzlELENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0Isa0JBUWpCO0FBUkQsV0FBa0Isa0JBQWtCO0lBQ25DLCtEQUFNLENBQUE7SUFDTixpRUFBTyxDQUFBO0lBQ1AseUVBQVcsQ0FBQTtJQUNYLCtEQUFNLENBQUE7SUFDTiw2REFBSyxDQUFBO0lBQ0wsNkVBQWEsQ0FBQTtJQUNiLHFGQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFSaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQVFuQztBQTZCRCxNQUFNLFVBQVUsZUFBZSxDQUFDLEtBQWM7SUFDN0MsT0FBTyxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksS0FBSyxJQUFJLE1BQU0sSUFBSSxLQUFLLENBQUE7QUFDMUYsQ0FBQztBQU9ELGlCQUFpQjtBQUNqQixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsaUJBQWlCLEVBQUUsMkJBQTJCO0NBQzlDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxTQUFTLENBQUE7QUF1RG5ELE1BQU0sYUFBYTtJQVlsQjtRQVhpQix1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ2hELHNCQUFpQixHQUFnQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBRy9ELGdCQUFXLEdBQXlCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUE7UUFDdEUseUJBQW9CLEdBQWlFO1lBQzVGLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLEVBQUU7WUFDUixnQkFBZ0IsRUFBRSxFQUFFO1NBQ3BCLENBQUE7UUFHQSxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU0saUJBQWlCLENBQUMsY0FBMkI7UUFDbkQsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDMUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7b0JBQ2hFLFFBQVEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFBO1lBQ3JELENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFFTSxhQUFhLENBQ25CLEVBQVUsRUFDVixRQUEyQyxFQUMzQyxXQUFtQixFQUNuQixpQkFBaUIsR0FBRyxLQUFLLEVBQ3pCLGtCQUEyQjtRQUUzQixNQUFNLGlCQUFpQixHQUFzQjtZQUM1QyxFQUFFO1lBQ0YsV0FBVztZQUNYLFFBQVE7WUFDUixpQkFBaUI7WUFDakIsa0JBQWtCO1NBQ2xCLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLGlCQUFpQixDQUFBO1FBQ3ZDLE1BQU0sY0FBYyxHQUE0QjtZQUMvQyxJQUFJLEVBQUUsUUFBUTtZQUNkLE1BQU0sRUFBRSxXQUFXO1lBQ25CLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDO1NBQzNDLENBQUE7UUFDRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsY0FBYyxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFBO1FBQ3ZELENBQUM7UUFDRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsY0FBYyxDQUFDLE9BQU87Z0JBQ3JCLGdHQUFnRyxDQUFBO1lBQ2pHLGNBQWMsQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNoRCxxQkFBcUIsRUFDckIsMkRBQTJELENBQzNELENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUc7WUFDakMsV0FBVztZQUNYLEtBQUssRUFBRTtnQkFDTixjQUFjO2dCQUNkO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLEtBQUssRUFBRSwwQkFBMEI7b0JBQ2pDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSx3QkFBd0IsQ0FBQztpQkFDakU7YUFDRDtTQUNELENBQUE7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM5QixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTSxlQUFlLENBQUMsRUFBVTtRQUNoQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN4RCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRU0sbUJBQW1CLENBQUMsRUFBbUIsRUFBRSxLQUFrQjtRQUNqRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLElBQUksU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO2dCQUNyRCxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNoQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQTtZQUNyQixPQUFPLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVNLGNBQWM7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFTSx1QkFBdUI7UUFDN0IsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUE7SUFDakMsQ0FBQztJQUVNLFFBQVE7UUFDZCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsRUFBRTtZQUN2QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxJQUFJLEdBQUcsSUFBSSxDQUFBO1lBQ25CLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUIsQ0FBQyxDQUFBO1FBRUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7YUFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUNaLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUMzRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDYixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO0FBQ3pDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtBQUVsRSxNQUFNLFVBQVUsYUFBYSxDQUM1QixFQUFVLEVBQ1YsUUFBMkMsRUFDM0MsV0FBbUIsRUFDbkIsaUJBQTJCLEVBQzNCLGtCQUEyQjtJQUUzQixPQUFPLGFBQWEsQ0FBQyxhQUFhLENBQ2pDLEVBQUUsRUFDRixRQUFRLEVBQ1IsV0FBVyxFQUNYLGlCQUFpQixFQUNqQixrQkFBa0IsQ0FDbEIsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCO0lBQy9CLE9BQU8sYUFBYSxDQUFBO0FBQ3JCLENBQUM7QUFFRCx3QkFBd0I7QUFFeEIsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFNBQXlCLEVBQUUsS0FBa0I7SUFDN0UsUUFBUSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdEI7WUFDQyxPQUFPLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUzRTtZQUNDLE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTVFO1lBQ0MsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFaEYsc0NBQThCLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN0QixPQUFPLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDakQsQ0FBQztZQUNELE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDOUUsQ0FBQztRQUVEO1lBQ0MsS0FBSyxNQUFNLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sU0FBUyxDQUFBO1FBRWpCO1lBQ0MsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvRiw2Q0FBcUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUVELE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbkUsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FDMUUsU0FBUyxDQUFDLFlBQVksQ0FDdEI7Z0JBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUN6RSxTQUFTLENBQUMsWUFBWSxDQUN0QixDQUFBO1FBQ0osQ0FBQztRQUNEO1lBQ0MsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDOUIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsTUFBTSxDQUFDLFVBQXNCLEVBQUUsTUFBYztJQUM1RCxPQUFPLEVBQUUsRUFBRSxtQ0FBMkIsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFBO0FBQ3BFLENBQUM7QUFFRCxNQUFNLFVBQVUsT0FBTyxDQUFDLFVBQXNCLEVBQUUsTUFBYztJQUM3RCxPQUFPLEVBQUUsRUFBRSxvQ0FBNEIsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFBO0FBQ3JFLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLFVBQXNCLEVBQUUsTUFBYztJQUNqRSxPQUFPLEVBQUUsRUFBRSx3Q0FBZ0MsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFBO0FBQ3pFLENBQUM7QUFFRCxNQUFNLFVBQVUsTUFBTSxDQUFDLFVBQXNCLEVBQUUsVUFBc0I7SUFDcEUsT0FBTyxFQUFFLEVBQUUsbUNBQTJCLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsQ0FBQTtBQUN4RSxDQUFDO0FBRUQsTUFBTSxVQUFVLEtBQUssQ0FBQyxHQUFHLFdBQXlCO0lBQ2pELE9BQU8sRUFBRSxFQUFFLGtDQUEwQixFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQTtBQUM3RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxLQUFzQixFQUN0QixPQUFtQixFQUNuQixPQUFtQjtJQUVuQixPQUFPLEVBQUUsRUFBRSw4Q0FBc0MsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFBO0FBQzdGLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUM1QixVQUFzQixFQUN0QixvQkFBZ0MsRUFDaEMsTUFBYyxFQUNkLFlBQW9CO0lBRXBCLE9BQU87UUFDTixFQUFFLDBDQUFrQztRQUNwQyxLQUFLLEVBQUUsVUFBVTtRQUNqQixVQUFVLEVBQUUsb0JBQW9CO1FBQ2hDLE1BQU07UUFDTixZQUFZO0tBQ1osQ0FBQTtBQUNGLENBQUM7QUFFRCx1QkFBdUI7QUFFdkI7O0dBRUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLFVBQTZCLEVBQzdCLEtBQWtCO0lBRWxCLElBQUksVUFBVSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3pCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7U0FBTSxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzNDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7U0FBTSxJQUFJLFVBQVUsWUFBWSxLQUFLLEVBQUUsQ0FBQztRQUN4QyxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO1NBQU0sSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxPQUFPLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLG1DQUFtQyxDQUFBO0FBRTFFLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUMxQyxjQUFjLENBQUMsZ0JBQWdCLENBQy9CLENBQUE7QUFDRCxjQUFjLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO0FBRXRGLE1BQU0sT0FBTyxHQUFHLElBQUksZ0JBQWdCLENBQ25DLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyx1QkFBdUIsQ0FBQyxFQUNqRSxHQUFHLENBQ0gsQ0FBQTtBQUVELGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7SUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUE7QUFFRixnRUFBZ0UifQ==