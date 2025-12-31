/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Codicon } from '../../../base/common/codicons.js';
import { getCodiconFontCharacters } from '../../../base/common/codiconsUtil.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Emitter } from '../../../base/common/event.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { Extensions as JSONExtensions, } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
//  ------ API types
// icon registry
export const Extensions = {
    IconContribution: 'base.contributions.icons',
};
export var IconContribution;
(function (IconContribution) {
    function getDefinition(contribution, registry) {
        let definition = contribution.defaults;
        while (ThemeIcon.isThemeIcon(definition)) {
            const c = iconRegistry.getIcon(definition.id);
            if (!c) {
                return undefined;
            }
            definition = c.defaults;
        }
        return definition;
    }
    IconContribution.getDefinition = getDefinition;
})(IconContribution || (IconContribution = {}));
export var IconFontDefinition;
(function (IconFontDefinition) {
    function toJSONObject(iconFont) {
        return {
            weight: iconFont.weight,
            style: iconFont.style,
            src: iconFont.src.map((s) => ({ format: s.format, location: s.location.toString() })),
        };
    }
    IconFontDefinition.toJSONObject = toJSONObject;
    function fromJSONObject(json) {
        const stringOrUndef = (s) => (isString(s) ? s : undefined);
        if (json &&
            Array.isArray(json.src) &&
            json.src.every((s) => isString(s.format) && isString(s.location))) {
            return {
                weight: stringOrUndef(json.weight),
                style: stringOrUndef(json.style),
                src: json.src.map((s) => ({ format: s.format, location: URI.parse(s.location) })),
            };
        }
        return undefined;
    }
    IconFontDefinition.fromJSONObject = fromJSONObject;
})(IconFontDefinition || (IconFontDefinition = {}));
// regexes for validation of font properties
export const fontIdRegex = /^([\w_-]+)$/;
export const fontStyleRegex = /^(normal|italic|(oblique[ \w\s-]+))$/;
export const fontWeightRegex = /^(normal|bold|lighter|bolder|(\d{0-1000}))$/;
export const fontSizeRegex = /^([\w_.%+-]+)$/;
export const fontFormatRegex = /^woff|woff2|truetype|opentype|embedded-opentype|svg$/;
export const fontColorRegex = /^#[0-9a-fA-F]{0,6}$/;
export const fontIdErrorMessage = localize('schema.fontId.formatError', 'The font ID must only contain letters, numbers, underscores and dashes.');
class IconRegistry {
    constructor() {
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.iconSchema = {
            definitions: {
                icons: {
                    type: 'object',
                    properties: {
                        fontId: {
                            type: 'string',
                            description: localize('iconDefinition.fontId', 'The id of the font to use. If not set, the font that is defined first is used.'),
                            pattern: fontIdRegex.source,
                            patternErrorMessage: fontIdErrorMessage,
                        },
                        fontCharacter: {
                            type: 'string',
                            description: localize('iconDefinition.fontCharacter', 'The font character associated with the icon definition.'),
                        },
                    },
                    additionalProperties: false,
                    defaultSnippets: [{ body: { fontCharacter: '\\\\e030' } }],
                },
            },
            type: 'object',
            properties: {},
        };
        this.iconReferenceSchema = {
            type: 'string',
            pattern: `^${ThemeIcon.iconNameExpression}$`,
            enum: [],
            enumDescriptions: [],
        };
        this.iconsById = {};
        this.iconFontsById = {};
    }
    registerIcon(id, defaults, description, deprecationMessage) {
        const existing = this.iconsById[id];
        if (existing) {
            if (description && !existing.description) {
                existing.description = description;
                this.iconSchema.properties[id].markdownDescription = `${description} $(${id})`;
                const enumIndex = this.iconReferenceSchema.enum.indexOf(id);
                if (enumIndex !== -1) {
                    this.iconReferenceSchema.enumDescriptions[enumIndex] = description;
                }
                this._onDidChange.fire();
            }
            return existing;
        }
        const iconContribution = { id, description, defaults, deprecationMessage };
        this.iconsById[id] = iconContribution;
        const propertySchema = { $ref: '#/definitions/icons' };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (description) {
            propertySchema.markdownDescription = `${description}: $(${id})`;
        }
        this.iconSchema.properties[id] = propertySchema;
        this.iconReferenceSchema.enum.push(id);
        this.iconReferenceSchema.enumDescriptions.push(description || '');
        this._onDidChange.fire();
        return { id };
    }
    deregisterIcon(id) {
        delete this.iconsById[id];
        delete this.iconSchema.properties[id];
        const index = this.iconReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.iconReferenceSchema.enum.splice(index, 1);
            this.iconReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChange.fire();
    }
    getIcons() {
        return Object.keys(this.iconsById).map((id) => this.iconsById[id]);
    }
    getIcon(id) {
        return this.iconsById[id];
    }
    getIconSchema() {
        return this.iconSchema;
    }
    getIconReferenceSchema() {
        return this.iconReferenceSchema;
    }
    registerIconFont(id, definition) {
        const existing = this.iconFontsById[id];
        if (existing) {
            return existing;
        }
        this.iconFontsById[id] = definition;
        this._onDidChange.fire();
        return definition;
    }
    deregisterIconFont(id) {
        delete this.iconFontsById[id];
    }
    getIconFont(id) {
        return this.iconFontsById[id];
    }
    toString() {
        const sorter = (i1, i2) => {
            return i1.id.localeCompare(i2.id);
        };
        const classNames = (i) => {
            while (ThemeIcon.isThemeIcon(i.defaults)) {
                i = this.iconsById[i.defaults.id];
            }
            return `codicon codicon-${i ? i.id : ''}`;
        };
        const reference = [];
        reference.push(`| preview     | identifier                        | default codicon ID                | description`);
        reference.push(`| ----------- | --------------------------------- | --------------------------------- | --------------------------------- |`);
        const contributions = Object.keys(this.iconsById).map((key) => this.iconsById[key]);
        for (const i of contributions.filter((i) => !!i.description).sort(sorter)) {
            reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|${ThemeIcon.isThemeIcon(i.defaults) ? i.defaults.id : i.id}|${i.description || ''}|`);
        }
        reference.push(`| preview     | identifier                        `);
        reference.push(`| ----------- | --------------------------------- |`);
        for (const i of contributions.filter((i) => !ThemeIcon.isThemeIcon(i.defaults)).sort(sorter)) {
            reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|`);
        }
        return reference.join('\n');
    }
}
const iconRegistry = new IconRegistry();
platform.Registry.add(Extensions.IconContribution, iconRegistry);
export function registerIcon(id, defaults, description, deprecationMessage) {
    return iconRegistry.registerIcon(id, defaults, description, deprecationMessage);
}
export function getIconRegistry() {
    return iconRegistry;
}
function initialize() {
    const codiconFontCharacters = getCodiconFontCharacters();
    for (const icon in codiconFontCharacters) {
        const fontCharacter = '\\' + codiconFontCharacters[icon].toString(16);
        iconRegistry.registerIcon(icon, { fontCharacter });
    }
}
initialize();
export const iconsSchemaId = 'vscode://schemas/icons';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(iconsSchemaId, iconRegistry.getIconSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(iconsSchemaId), 200);
iconRegistry.onDidChange(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
//setTimeout(_ => console.log(iconRegistry.toString()), 5000);
// common icons
export const widgetClose = registerIcon('widget-close', Codicon.close, localize('widgetClose', 'Icon for the close action in widgets.'));
export const gotoPreviousLocation = registerIcon('goto-previous-location', Codicon.arrowUp, localize('previousChangeIcon', 'Icon for goto previous editor location.'));
export const gotoNextLocation = registerIcon('goto-next-location', Codicon.arrowDown, localize('nextChangeIcon', 'Icon for goto next editor location.'));
export const syncing = ThemeIcon.modify(Codicon.sync, 'spin');
export const spinningLoading = ThemeIcon.modify(Codicon.loading, 'spin');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL2ljb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBa0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLFVBQVUsSUFBSSxjQUFjLEdBRTVCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxvQkFBb0I7QUFFcEIsZ0JBQWdCO0FBQ2hCLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixnQkFBZ0IsRUFBRSwwQkFBMEI7Q0FDNUMsQ0FBQTtBQWdCRCxNQUFNLEtBQVcsZ0JBQWdCLENBZWhDO0FBZkQsV0FBaUIsZ0JBQWdCO0lBQ2hDLFNBQWdCLGFBQWEsQ0FDNUIsWUFBOEIsRUFDOUIsUUFBdUI7UUFFdkIsSUFBSSxVQUFVLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQTtRQUN0QyxPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUs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