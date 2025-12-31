/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Paths from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import * as Json from '../../../../base/common/json.js';
import { ExtensionData, ThemeSettingDefaults, } from '../common/workbenchThemeService.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { isObject, isString } from '../../../../base/common/types.js';
import { getIconRegistry, IconFontDefinition, fontIdRegex, fontWeightRegex, fontStyleRegex, fontFormatRegex, } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export const DEFAULT_PRODUCT_ICON_THEME_ID = ''; // TODO
export class ProductIconThemeData {
    static { this.STORAGE_KEY = 'productIconThemeData'; }
    constructor(id, label, settingsId) {
        this.iconThemeDocument = { iconDefinitions: new Map() };
        this.id = id;
        this.label = label;
        this.settingsId = settingsId;
        this.isLoaded = false;
    }
    getIcon(iconContribution) {
        return _resolveIconDefinition(iconContribution, this.iconThemeDocument);
    }
    ensureLoaded(fileService, logService) {
        return !this.isLoaded
            ? this.load(fileService, logService)
            : Promise.resolve(this.styleSheetContent);
    }
    reload(fileService, logService) {
        return this.load(fileService, logService);
    }
    async load(fileService, logService) {
        const location = this.location;
        if (!location) {
            return Promise.resolve(this.styleSheetContent);
        }
        const warnings = [];
        this.iconThemeDocument = await _loadProductIconThemeDocument(fileService, location, warnings);
        this.isLoaded = true;
        if (warnings.length) {
            logService.error(nls.localize('error.parseicondefs', 'Problems processing product icons definitions in {0}:\n{1}', location.toString(), warnings.join('\n')));
        }
        return this.styleSheetContent;
    }
    static fromExtensionTheme(iconTheme, iconThemeLocation, extensionData) {
        const id = extensionData.extensionId + '-' + iconTheme.id;
        const label = iconTheme.label || Paths.basename(iconTheme.path);
        const settingsId = iconTheme.id;
        const themeData = new ProductIconThemeData(id, label, settingsId);
        themeData.description = iconTheme.description;
        themeData.location = iconThemeLocation;
        themeData.extensionData = extensionData;
        themeData.watch = iconTheme._watch;
        themeData.isLoaded = false;
        return themeData;
    }
    static createUnloadedTheme(id) {
        const themeData = new ProductIconThemeData(id, '', '__' + id);
        themeData.isLoaded = false;
        themeData.extensionData = undefined;
        themeData.watch = false;
        return themeData;
    }
    static { this._defaultProductIconTheme = null; }
    static get defaultTheme() {
        let themeData = ProductIconThemeData._defaultProductIconTheme;
        if (!themeData) {
            themeData = ProductIconThemeData._defaultProductIconTheme = new ProductIconThemeData(DEFAULT_PRODUCT_ICON_THEME_ID, nls.localize('defaultTheme', 'Default'), ThemeSettingDefaults.PRODUCT_ICON_THEME);
            themeData.isLoaded = true;
            themeData.extensionData = undefined;
            themeData.watch = false;
        }
        return themeData;
    }
    static fromStorageData(storageService) {
        const input = storageService.get(ProductIconThemeData.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!input) {
            return undefined;
        }
        try {
            const data = JSON.parse(input);
            const theme = new ProductIconThemeData('', '', '');
            for (const key in data) {
                switch (key) {
                    case 'id':
                    case 'label':
                    case 'description':
                    case 'settingsId':
                    case 'styleSheetContent':
                    case 'watch':
                        ;
                        theme[key] = data[key];
                        break;
                    case 'location':
                        // ignore, no longer restore
                        break;
                    case 'extensionData':
                        theme.extensionData = ExtensionData.fromJSONObject(data.extensionData);
                        break;
                }
            }
            const { iconDefinitions, iconFontDefinitions } = data;
            if (Array.isArray(iconDefinitions) && isObject(iconFontDefinitions)) {
                const restoredIconDefinitions = new Map();
                for (const entry of iconDefinitions) {
                    const { id, fontCharacter, fontId } = entry;
                    if (isString(id) && isString(fontCharacter)) {
                        if (isString(fontId)) {
                            const iconFontDefinition = IconFontDefinition.fromJSONObject(iconFontDefinitions[fontId]);
                            if (iconFontDefinition) {
                                restoredIconDefinitions.set(id, {
                                    fontCharacter,
                                    font: { id: fontId, definition: iconFontDefinition },
                                });
                            }
                        }
                        else {
                            restoredIconDefinitions.set(id, { fontCharacter });
                        }
                    }
                }
                theme.iconThemeDocument = { iconDefinitions: restoredIconDefinitions };
            }
            return theme;
        }
        catch (e) {
            return undefined;
        }
    }
    toStorage(storageService) {
        const iconDefinitions = [];
        const iconFontDefinitions = {};
        for (const entry of this.iconThemeDocument.iconDefinitions.entries()) {
            const font = entry[1].font;
            iconDefinitions.push({
                id: entry[0],
                fontCharacter: entry[1].fontCharacter,
                fontId: font?.id,
            });
            if (font && iconFontDefinitions[font.id] === undefined) {
                iconFontDefinitions[font.id] = IconFontDefinition.toJSONObject(font.definition);
            }
        }
        const data = JSON.stringify({
            id: this.id,
            label: this.label,
            description: this.description,
            settingsId: this.settingsId,
            styleSheetContent: this.styleSheetContent,
            watch: this.watch,
            extensionData: ExtensionData.toJSONObject(this.extensionData),
            iconDefinitions,
            iconFontDefinitions,
        });
        storageService.store(ProductIconThemeData.STORAGE_KEY, data, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
}
function _loadProductIconThemeDocument(fileService, location, warnings) {
    return fileService.readExtensionResource(location).then((content) => {
        const parseErrors = [];
        const contentValue = Json.parse(content, parseErrors);
        if (parseErrors.length > 0) {
            return Promise.reject(new Error(nls.localize('error.cannotparseicontheme', 'Problems parsing product icons file: {0}', parseErrors.map((e) => getParseErrorMessage(e.error)).join(', '))));
        }
        else if (Json.getNodeType(contentValue) !== 'object') {
            return Promise.reject(new Error(nls.localize('error.invalidformat', 'Invalid format for product icons theme file: Object expected.')));
        }
        else if (!contentValue.iconDefinitions ||
            !Array.isArray(contentValue.fonts) ||
            !contentValue.fonts.length) {
            return Promise.reject(new Error(nls.localize('error.missingProperties', 'Invalid format for product icons theme file: Must contain iconDefinitions and fonts.')));
        }
        const iconThemeDocumentLocationDirname = resources.dirname(location);
        const sanitizedFonts = new Map();
        for (const font of contentValue.fonts) {
            const fontId = font.id;
            if (isString(fontId) && fontId.match(fontIdRegex)) {
                let fontWeight = undefined;
                if (isString(font.weight) && font.weight.match(fontWeightRegex)) {
                    fontWeight = font.weight;
                }
                else {
                    warnings.push(nls.localize('error.fontWeight', "Invalid font weight in font '{0}'. Ignoring setting.", font.id));
                }
                let fontStyle = undefined;
                if (isString(font.style) && font.style.match(fontStyleRegex)) {
                    fontStyle = font.style;
                }
                else {
                    warnings.push(nls.localize('error.fontStyle', "Invalid font style in font '{0}'. Ignoring setting.", font.id));
                }
                const sanitizedSrc = [];
                if (Array.isArray(font.src)) {
                    for (const s of font.src) {
                        if (isString(s.path) && isString(s.format) && s.format.match(fontFormatRegex)) {
                            const iconFontLocation = resources.joinPath(iconThemeDocumentLocationDirname, s.path);
                            sanitizedSrc.push({ location: iconFontLocation, format: s.format });
                        }
                        else {
                            warnings.push(nls.localize('error.fontSrc', "Invalid font source in font '{0}'. Ignoring source.", font.id));
                        }
                    }
                }
                if (sanitizedSrc.length) {
                    sanitizedFonts.set(fontId, { weight: fontWeight, style: fontStyle, src: sanitizedSrc });
                }
                else {
                    warnings.push(nls.localize('error.noFontSrc', "No valid font source in font '{0}'. Ignoring font definition.", font.id));
                }
            }
            else {
                warnings.push(nls.localize('error.fontId', "Missing or invalid font id '{0}'. Skipping font definition.", font.id));
            }
        }
        const iconDefinitions = new Map();
        const primaryFontId = contentValue.fonts[0].id;
        for (const iconId in contentValue.iconDefinitions) {
            const definition = contentValue.iconDefinitions[iconId];
            if (isString(definition.fontCharacter)) {
                const fontId = definition.fontId ?? primaryFontId;
                const fontDefinition = sanitizedFonts.get(fontId);
                if (fontDefinition) {
                    const font = { id: `pi-${fontId}`, definition: fontDefinition };
                    iconDefinitions.set(iconId, { fontCharacter: definition.fontCharacter, font });
                }
                else {
                    warnings.push(nls.localize('error.icon.font', "Skipping icon definition '{0}'. Unknown font.", iconId));
                }
            }
            else {
                warnings.push(nls.localize('error.icon.fontCharacter', "Skipping icon definition '{0}': Needs to be defined", iconId));
            }
        }
        return { iconDefinitions };
    });
}
const iconRegistry = getIconRegistry();
function _resolveIconDefinition(iconContribution, iconThemeDocument) {
    const iconDefinitions = iconThemeDocument.iconDefinitions;
    let definition = iconDefinitions.get(iconContribution.id);
    let defaults = iconContribution.defaults;
    while (!definition && ThemeIcon.isThemeIcon(defaults)) {
        // look if an inherited icon has a definition
        const ic = iconRegistry.getIcon(defaults.id);
        if (ic) {
            definition = iconDefinitions.get(ic.id);
            defaults = ic.defaults;
        }
        else {
            return undefined;
        }
    }
    if (definition) {
        return definition;
    }
    if (!ThemeIcon.isThemeIcon(defaults)) {
        return defaults;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdEljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2Jyb3dzZXIvcHJvZHVjdEljb25UaGVtZURhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sYUFBYSxFQUdiLG9CQUFvQixHQUNwQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBTW5GLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFckUsT0FBTyxFQUVOLGVBQWUsRUFFZixrQkFBa0IsRUFFbEIsV0FBVyxFQUNYLGVBQWUsRUFDZixjQUFjLEVBQ2QsZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2hFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLEVBQUUsQ0FBQSxDQUFDLE9BQU87QUFFdkQsTUFBTSxPQUFPLG9CQUFvQjthQUNoQixnQkFBVyxHQUFHLHNCQUFzQixBQUF6QixDQUF5QjtJQWNwRCxZQUFvQixFQUFVLEVBQUUsS0FBYSxFQUFFLFVBQWtCO1FBSGpFLHNCQUFpQixHQUE2QixFQUFFLGVBQWUsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUE7UUFJM0UsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDWixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtJQUN0QixDQUFDO0lBRU0sT0FBTyxDQUFDLGdCQUFrQztRQUNoRCxPQUFPLHNCQUFzQixDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFTSxZQUFZLENBQ2xCLFdBQTRDLEVBQzVDLFVBQXVCO1FBRXZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUTtZQUNwQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTSxNQUFNLENBQ1osV0FBNEMsRUFDNUMsVUFBdUI7UUFFdkIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUksQ0FDakIsV0FBNEMsRUFDNUMsVUFBdUI7UUFFdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSw2QkFBNkIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzdGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLFVBQVUsQ0FBQyxLQUFLLENBQ2YsR0FBRyxDQUFDLFFBQVEsQ0FDWCxxQkFBcUIsRUFDckIsNERBQTRELEVBQzVELFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDbkIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDbkIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRCxNQUFNLENBQUMsa0JBQWtCLENBQ3hCLFNBQStCLEVBQy9CLGlCQUFzQixFQUN0QixhQUE0QjtRQUU1QixNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFBO1FBQ3pELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0QsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEVBQUUsQ0FBQTtRQUUvQixNQUFNLFNBQVMsR0FBRyxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFakUsU0FBUyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFBO1FBQzdDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUE7UUFDdEMsU0FBUyxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFDdkMsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFBO1FBQ2xDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQzFCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLENBQUMsbUJBQW1CLENBQUMsRUFBVTtRQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzdELFNBQVMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQzFCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFBO1FBQ25DLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7YUFFYyw2QkFBd0IsR0FBZ0MsSUFBSSxBQUFwQyxDQUFvQztJQUUzRSxNQUFNLEtBQUssWUFBWTtRQUN0QixJQUFJLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQTtRQUM3RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsU0FBUyxHQUFHLG9CQUFvQixDQUFDLHdCQUF3QixHQUFHLElBQUksb0JBQW9CLENBQ25GLDZCQUE2QixFQUM3QixHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsRUFDdkMsb0JBQW9CLENBQUMsa0JBQWtCLENBQ3ZDLENBQUE7WUFDRCxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtZQUN6QixTQUFTLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQTtZQUNuQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUN4QixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBK0I7UUFDckQsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLCtCQUF1QixDQUFBO1FBQ3hGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNsRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUN4QixRQUFRLEdBQUcsRUFBRSxDQUFDO29CQUNiLEtBQUssSUFBSSxDQUFDO29CQUNWLEtBQUssT0FBTyxDQUFDO29CQUNiLEtBQUssYUFBYSxDQUFDO29CQUNuQixLQUFLLFlBQVksQ0FBQztvQkFDbEIsS0FBSyxtQkFBbUIsQ0FBQztvQkFDekIsS0FBSyxPQUFPO3dCQUNYLENBQUM7d0JBQUMsS0FBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFDaEMsTUFBSztvQkFDTixLQUFLLFVBQVU7d0JBQ2QsNEJBQTRCO3dCQUM1QixNQUFLO29CQUNOLEtBQUssZUFBZTt3QkFDbkIsS0FBSyxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTt3QkFDdEUsTUFBSztnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxJQUFJLENBQUE7WUFDckQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JFLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUE7Z0JBQ2pFLEtBQUssTUFBTSxLQUFLLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3JDLE1BQU0sRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQTtvQkFDM0MsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7d0JBQzdDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7NEJBQ3RCLE1BQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUMzRCxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FDM0IsQ0FBQTs0QkFDRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0NBQ3hCLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUU7b0NBQy9CLGFBQWE7b0NBQ2IsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUU7aUNBQ3BELENBQUMsQ0FBQTs0QkFDSCxDQUFDO3dCQUNGLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTt3QkFDbkQsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsZUFBZSxFQUFFLHVCQUF1QixFQUFFLENBQUE7WUFDdkUsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsQ0FBQyxjQUErQjtRQUN4QyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUE7UUFDMUIsTUFBTSxtQkFBbUIsR0FBeUMsRUFBRSxDQUFBO1FBQ3BFLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3RFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDMUIsZUFBZSxDQUFDLElBQUksQ0FBQztnQkFDcEIsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ1osYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhO2dCQUNyQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7YUFDaEIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxJQUFJLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4RCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNoRixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDM0IsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsYUFBYSxFQUFFLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUM3RCxlQUFlO1lBQ2YsbUJBQW1CO1NBQ25CLENBQUMsQ0FBQTtRQUNGLGNBQWMsQ0FBQyxLQUFLLENBQ25CLG9CQUFvQixDQUFDLFdBQVcsRUFDaEMsSUFBSSw4REFHSixDQUFBO0lBQ0YsQ0FBQzs7QUFPRixTQUFTLDZCQUE2QixDQUNyQyxXQUE0QyxFQUM1QyxRQUFhLEVBQ2IsUUFBa0I7SUFFbEIsT0FBTyxXQUFXLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDbkUsTUFBTSxXQUFXLEdBQXNCLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNyRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUNwQixJQUFJLEtBQUssQ0FDUixHQUFHLENBQUMsUUFBUSxDQUNYLDRCQUE0QixFQUM1QiwwQ0FBMEMsRUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNoRSxDQUNELENBQ0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDeEQsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUNwQixJQUFJLEtBQUssQ0FDUixHQUFHLENBQUMsUUFBUSxDQUNYLHFCQUFxQixFQUNyQiwrREFBK0QsQ0FDL0QsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO2FBQU0sSUFDTixDQUFDLFlBQVksQ0FBQyxlQUFlO1lBQzdCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1lBQ2xDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQ3pCLENBQUM7WUFDRixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQ3BCLElBQUksS0FBSyxDQUNSLEdBQUcsQ0FBQyxRQUFRLENBQ1gseUJBQXlCLEVBQ3pCLHNGQUFzRixDQUN0RixDQUNELENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLGdDQUFnQyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFcEUsTUFBTSxjQUFjLEdBQW9DLElBQUksR0FBRyxFQUFFLENBQUE7UUFDakUsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtZQUN0QixJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQTtnQkFDMUIsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7b0JBQ2pFLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO2dCQUN6QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FDWixHQUFHLENBQUMsUUFBUSxDQUNYLGtCQUFrQixFQUNsQixzREFBc0QsRUFDdEQsSUFBSSxDQUFDLEVBQUUsQ0FDUCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLFNBQVMsR0FBRyxTQUFTLENBQUE7Z0JBQ3pCLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO29CQUM5RCxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtnQkFDdkIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFFBQVEsQ0FBQyxJQUFJLENBQ1osR0FBRyxDQUFDLFFBQVEsQ0FDWCxpQkFBaUIsRUFDakIscURBQXFELEVBQ3JELElBQUksQ0FBQyxFQUFFLENBQ1AsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxZQUFZLEdBQXFCLEVBQUUsQ0FBQTtnQkFDekMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM3QixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDMUIsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQzs0QkFDL0UsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTs0QkFDckYsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7d0JBQ3BFLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxRQUFRLENBQUMsSUFBSSxDQUNaLEdBQUcsQ0FBQyxRQUFRLENBQ1gsZUFBZSxFQUNmLHFEQUFxRCxFQUNyRCxJQUFJLENBQUMsRUFBRSxDQUNQLENBQ0QsQ0FBQTt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDekIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7Z0JBQ3hGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxRQUFRLENBQUMsSUFBSSxDQUNaLEdBQUcsQ0FBQyxRQUFRLENBQ1gsaUJBQWlCLEVBQ2pCLCtEQUErRCxFQUMvRCxJQUFJLENBQUMsRUFBRSxDQUNQLENBQ0QsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxJQUFJLENBQ1osR0FBRyxDQUFDLFFBQVEsQ0FDWCxjQUFjLEVBQ2QsNkRBQTZELEVBQzdELElBQUksQ0FBQyxFQUFFLENBQ1AsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQTtRQUV6RCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQVksQ0FBQTtRQUV4RCxLQUFLLE1BQU0sTUFBTSxJQUFJLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNuRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZELElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxJQUFJLGFBQWEsQ0FBQTtnQkFDakQsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDcEIsTUFBTSxJQUFJLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLENBQUE7b0JBQy9ELGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsYUFBYSxFQUFFLFVBQVUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDL0UsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFFBQVEsQ0FBQyxJQUFJLENBQ1osR0FBRyxDQUFDLFFBQVEsQ0FDWCxpQkFBaUIsRUFDakIsK0NBQStDLEVBQy9DLE1BQU0sQ0FDTixDQUNELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLENBQUMsSUFBSSxDQUNaLEdBQUcsQ0FBQyxRQUFRLENBQ1gsMEJBQTBCLEVBQzFCLHFEQUFxRCxFQUNyRCxNQUFNLENBQ04sQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUE7SUFDM0IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7QUFFdEMsU0FBUyxzQkFBc0IsQ0FDOUIsZ0JBQWtDLEVBQ2xDLGlCQUEyQztJQUUzQyxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLENBQUE7SUFDekQsSUFBSSxVQUFVLEdBQStCLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDckYsSUFBSSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFBO0lBQ3hDLE9BQU8sQ0FBQyxVQUFVLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3ZELDZDQUE2QztRQUM3QyxNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1QyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsVUFBVSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZDLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFBO1FBQ3ZCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDIn0=