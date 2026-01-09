/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as paths from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import * as Json from '../../../../base/common/json.js';
import { ExtensionData, } from '../common/workbenchThemeService.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { fontColorRegex, fontSizeRegex } from '../../../../platform/theme/common/iconRegistry.js';
import * as css from '../../../../base/browser/cssValue.js';
import { fileIconSelectorEscape } from '../../../../editor/common/services/getIconClasses.js';
export class FileIconThemeData {
    static { this.STORAGE_KEY = 'iconThemeData'; }
    constructor(id, label, settingsId) {
        this.id = id;
        this.label = label;
        this.settingsId = settingsId;
        this.isLoaded = false;
        this.hasFileIcons = false;
        this.hasFolderIcons = false;
        this.hidesExplorerArrows = false;
    }
    ensureLoaded(themeLoader) {
        return !this.isLoaded ? this.load(themeLoader) : Promise.resolve(this.styleSheetContent);
    }
    reload(themeLoader) {
        return this.load(themeLoader);
    }
    load(themeLoader) {
        return themeLoader.load(this);
    }
    static fromExtensionTheme(iconTheme, iconThemeLocation, extensionData) {
        const id = extensionData.extensionId + '-' + iconTheme.id;
        const label = iconTheme.label || paths.basename(iconTheme.path);
        const settingsId = iconTheme.id;
        const themeData = new FileIconThemeData(id, label, settingsId);
        themeData.description = iconTheme.description;
        themeData.location = iconThemeLocation;
        themeData.extensionData = extensionData;
        themeData.watch = iconTheme._watch;
        themeData.isLoaded = false;
        return themeData;
    }
    static { this._noIconTheme = null; }
    static get noIconTheme() {
        let themeData = FileIconThemeData._noIconTheme;
        if (!themeData) {
            themeData = FileIconThemeData._noIconTheme = new FileIconThemeData('', '', null);
            themeData.hasFileIcons = false;
            themeData.hasFolderIcons = false;
            themeData.hidesExplorerArrows = false;
            themeData.isLoaded = true;
            themeData.extensionData = undefined;
            themeData.watch = false;
        }
        return themeData;
    }
    static createUnloadedTheme(id) {
        const themeData = new FileIconThemeData(id, '', '__' + id);
        themeData.isLoaded = false;
        themeData.hasFileIcons = false;
        themeData.hasFolderIcons = false;
        themeData.hidesExplorerArrows = false;
        themeData.extensionData = undefined;
        themeData.watch = false;
        return themeData;
    }
    static fromStorageData(storageService) {
        const input = storageService.get(FileIconThemeData.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!input) {
            return undefined;
        }
        try {
            const data = JSON.parse(input);
            const theme = new FileIconThemeData('', '', null);
            for (const key in data) {
                switch (key) {
                    case 'id':
                    case 'label':
                    case 'description':
                    case 'settingsId':
                    case 'styleSheetContent':
                    case 'hasFileIcons':
                    case 'hidesExplorerArrows':
                    case 'hasFolderIcons':
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
            return theme;
        }
        catch (e) {
            return undefined;
        }
    }
    toStorage(storageService) {
        const data = JSON.stringify({
            id: this.id,
            label: this.label,
            description: this.description,
            settingsId: this.settingsId,
            styleSheetContent: this.styleSheetContent,
            hasFileIcons: this.hasFileIcons,
            hasFolderIcons: this.hasFolderIcons,
            hidesExplorerArrows: this.hidesExplorerArrows,
            extensionData: ExtensionData.toJSONObject(this.extensionData),
            watch: this.watch,
        });
        storageService.store(FileIconThemeData.STORAGE_KEY, data, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
}
export class FileIconThemeLoader {
    constructor(fileService, languageService) {
        this.fileService = fileService;
        this.languageService = languageService;
    }
    load(data) {
        if (!data.location) {
            return Promise.resolve(data.styleSheetContent);
        }
        return this.loadIconThemeDocument(data.location).then((iconThemeDocument) => {
            const result = this.processIconThemeDocument(data.id, data.location, iconThemeDocument);
            data.styleSheetContent = result.content;
            data.hasFileIcons = result.hasFileIcons;
            data.hasFolderIcons = result.hasFolderIcons;
            data.hidesExplorerArrows = result.hidesExplorerArrows;
            data.isLoaded = true;
            return data.styleSheetContent;
        });
    }
    loadIconThemeDocument(location) {
        return this.fileService.readExtensionResource(location).then((content) => {
            const errors = [];
            const contentValue = Json.parse(content, errors);
            if (errors.length > 0) {
                return Promise.reject(new Error(nls.localize('error.cannotparseicontheme', 'Problems parsing file icons file: {0}', errors.map((e) => getParseErrorMessage(e.error)).join(', '))));
            }
            else if (Json.getNodeType(contentValue) !== 'object') {
                return Promise.reject(new Error(nls.localize('error.invalidformat', 'Invalid format for file icons theme file: Object expected.')));
            }
            return Promise.resolve(contentValue);
        });
    }
    processIconThemeDocument(id, iconThemeDocumentLocation, iconThemeDocument) {
        const result = {
            content: '',
            hasFileIcons: false,
            hasFolderIcons: false,
            hidesExplorerArrows: !!iconThemeDocument.hidesExplorerArrows,
        };
        let hasSpecificFileIcons = false;
        if (!iconThemeDocument.iconDefinitions) {
            return result;
        }
        const selectorByDefinitionId = {};
        const coveredLanguages = {};
        const iconThemeDocumentLocationDirname = resources.dirname(iconThemeDocumentLocation);
        function resolvePath(path) {
            return resources.joinPath(iconThemeDocumentLocationDirname, path);
        }
        function collectSelectors(associations, baseThemeClassName) {
            function addSelector(selector, defId) {
                if (defId) {
                    let list = selectorByDefinitionId[defId];
                    if (!list) {
                        list = selectorByDefinitionId[defId] = new css.Builder();
                    }
                    list.push(selector);
                }
            }
            if (associations) {
                let qualifier = css.inline `.show-file-icons`;
                if (baseThemeClassName) {
                    qualifier = css.inline `${baseThemeClassName} ${qualifier}`;
                }
                const expanded = css.inline `.monaco-tl-twistie.collapsible:not(.collapsed) + .monaco-tl-contents`;
                if (associations.folder) {
                    addSelector(css.inline `${qualifier} .folder-icon::before`, associations.folder);
                    result.hasFolderIcons = true;
                }
                if (associations.folderExpanded) {
                    addSelector(css.inline `${qualifier} ${expanded} .folder-icon::before`, associations.folderExpanded);
                    result.hasFolderIcons = true;
                }
                const rootFolder = associations.rootFolder || associations.folder;
                const rootFolderExpanded = associations.rootFolderExpanded || associations.folderExpanded;
                if (rootFolder) {
                    addSelector(css.inline `${qualifier} .rootfolder-icon::before`, rootFolder);
                    result.hasFolderIcons = true;
                }
                if (rootFolderExpanded) {
                    addSelector(css.inline `${qualifier} ${expanded} .rootfolder-icon::before`, rootFolderExpanded);
                    result.hasFolderIcons = true;
                }
                if (associations.file) {
                    addSelector(css.inline `${qualifier} .file-icon::before`, associations.file);
                    result.hasFileIcons = true;
                }
                const folderNames = associations.folderNames;
                if (folderNames) {
                    for (const key in folderNames) {
                        const selectors = new css.Builder();
                        const name = handleParentFolder(key.toLowerCase(), selectors);
                        selectors.push(css.inline `.${classSelectorPart(name)}-name-folder-icon`);
                        addSelector(css.inline `${qualifier} ${selectors.join('')}.folder-icon::before`, folderNames[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const folderNamesExpanded = associations.folderNamesExpanded;
                if (folderNamesExpanded) {
                    for (const key in folderNamesExpanded) {
                        const selectors = new css.Builder();
                        const name = handleParentFolder(key.toLowerCase(), selectors);
                        selectors.push(css.inline `.${classSelectorPart(name)}-name-folder-icon`);
                        addSelector(css.inline `${qualifier} ${expanded} ${selectors.join('')}.folder-icon::before`, folderNamesExpanded[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const rootFolderNames = associations.rootFolderNames;
                if (rootFolderNames) {
                    for (const key in rootFolderNames) {
                        const name = key.toLowerCase();
                        addSelector(css.inline `${qualifier} .${classSelectorPart(name)}-root-name-folder-icon.rootfolder-icon::before`, rootFolderNames[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const rootFolderNamesExpanded = associations.rootFolderNamesExpanded;
                if (rootFolderNamesExpanded) {
                    for (const key in rootFolderNamesExpanded) {
                        const name = key.toLowerCase();
                        addSelector(css.inline `${qualifier} ${expanded} .${classSelectorPart(name)}-root-name-folder-icon.rootfolder-icon::before`, rootFolderNamesExpanded[key]);
                        result.hasFolderIcons = true;
                    }
                }
                const languageIds = associations.languageIds;
                if (languageIds) {
                    if (!languageIds.jsonc && languageIds.json) {
                        languageIds.jsonc = languageIds.json;
                    }
                    for (const languageId in languageIds) {
                        addSelector(css.inline `${qualifier} .${classSelectorPart(languageId)}-lang-file-icon.file-icon::before`, languageIds[languageId]);
                        result.hasFileIcons = true;
                        hasSpecificFileIcons = true;
                        coveredLanguages[languageId] = true;
                    }
                }
                const fileExtensions = associations.fileExtensions;
                if (fileExtensions) {
                    for (const key in fileExtensions) {
                        const selectors = new css.Builder();
                        const name = handleParentFolder(key.toLowerCase(), selectors);
                        const segments = name.split('.');
                        if (segments.length) {
                            for (let i = 0; i < segments.length; i++) {
                                selectors.push(css.inline `.${classSelectorPart(segments.slice(i).join('.'))}-ext-file-icon`);
                            }
                            selectors.push(css.inline `.ext-file-icon`); // extra segment to increase file-ext score
                        }
                        addSelector(css.inline `${qualifier} ${selectors.join('')}.file-icon::before`, fileExtensions[key]);
                        result.hasFileIcons = true;
                        hasSpecificFileIcons = true;
                    }
                }
                const fileNames = associations.fileNames;
                if (fileNames) {
                    for (const key in fileNames) {
                        const selectors = new css.Builder();
                        const fileName = handleParentFolder(key.toLowerCase(), selectors);
                        selectors.push(css.inline `.${classSelectorPart(fileName)}-name-file-icon`);
                        selectors.push(css.inline `.name-file-icon`); // extra segment to increase file-name score
                        const segments = fileName.split('.');
                        if (segments.length) {
                            for (let i = 1; i < segments.length; i++) {
                                selectors.push(css.inline `.${classSelectorPart(segments.slice(i).join('.'))}-ext-file-icon`);
                            }
                            selectors.push(css.inline `.ext-file-icon`); // extra segment to increase file-ext score
                        }
                        addSelector(css.inline `${qualifier} ${selectors.join('')}.file-icon::before`, fileNames[key]);
                        result.hasFileIcons = true;
                        hasSpecificFileIcons = true;
                    }
                }
            }
        }
        collectSelectors(iconThemeDocument);
        collectSelectors(iconThemeDocument.light, css.inline `.vs`);
        collectSelectors(iconThemeDocument.highContrast, css.inline `.hc-black`);
        collectSelectors(iconThemeDocument.highContrast, css.inline `.hc-light`);
        if (!result.hasFileIcons && !result.hasFolderIcons) {
            return result;
        }
        const showLanguageModeIcons = iconThemeDocument.showLanguageModeIcons === true ||
            (hasSpecificFileIcons && iconThemeDocument.showLanguageModeIcons !== false);
        const cssRules = new css.Builder();
        const fonts = iconThemeDocument.fonts;
        const fontSizes = new Map();
        if (Array.isArray(fonts)) {
            const defaultFontSize = this.tryNormalizeFontSize(fonts[0].size) || '150%';
            fonts.forEach((font) => {
                const fontSrcs = new css.Builder();
                fontSrcs.push(...font.src.map((l) => css.inline `${css.asCSSUrl(resolvePath(l.path))} format(${css.stringValue(l.format)})`));
                cssRules.push(css.inline `@font-face { src: ${fontSrcs.join(', ')}; font-family: ${css.stringValue(font.id)}; font-weight: ${css.identValue(font.weight)}; font-style: ${css.identValue(font.style)}; font-display: block; }`);
                const fontSize = this.tryNormalizeFontSize(font.size);
                if (fontSize !== undefined && fontSize !== defaultFontSize) {
                    fontSizes.set(font.id, fontSize);
                }
            });
            cssRules.push(css.inline `.show-file-icons .file-icon::before, .show-file-icons .folder-icon::before, .show-file-icons .rootfolder-icon::before { font-family: ${css.stringValue(fonts[0].id)}; font-size: ${css.sizeValue(defaultFontSize)}; }`);
        }
        // Use emQuads to prevent the icon from collapsing to zero height for image icons
        const emQuad = css.stringValue('\\2001');
        for (const defId in selectorByDefinitionId) {
            const selectors = selectorByDefinitionId[defId];
            const definition = iconThemeDocument.iconDefinitions[defId];
            if (definition) {
                if (definition.iconPath) {
                    cssRules.push(css.inline `${selectors.join(', ')} { content: ${emQuad}; background-image: ${css.asCSSUrl(resolvePath(definition.iconPath))}; }`);
                }
                else if (definition.fontCharacter || definition.fontColor) {
                    const body = new css.Builder();
                    if (definition.fontColor && definition.fontColor.match(fontColorRegex)) {
                        body.push(css.inline `color: ${css.hexColorValue(definition.fontColor)};`);
                    }
                    if (definition.fontCharacter) {
                        body.push(css.inline `content: ${css.stringValue(definition.fontCharacter)};`);
                    }
                    const fontSize = definition.fontSize ??
                        (definition.fontId ? fontSizes.get(definition.fontId) : undefined);
                    if (fontSize && fontSize.match(fontSizeRegex)) {
                        body.push(css.inline `font-size: ${css.sizeValue(fontSize)};`);
                    }
                    if (definition.fontId) {
                        body.push(css.inline `font-family: ${css.stringValue(definition.fontId)};`);
                    }
                    if (showLanguageModeIcons) {
                        body.push(css.inline `background-image: unset;`); // potentially set by the language default
                    }
                    cssRules.push(css.inline `${selectors.join(', ')} { ${body.join(' ')} }`);
                }
            }
        }
        if (showLanguageModeIcons) {
            for (const languageId of this.languageService.getRegisteredLanguageIds()) {
                if (!coveredLanguages[languageId]) {
                    const icon = this.languageService.getIcon(languageId);
                    if (icon) {
                        const selector = css.inline `.show-file-icons .${classSelectorPart(languageId)}-lang-file-icon.file-icon::before`;
                        cssRules.push(css.inline `${selector} { content: ${emQuad}; background-image: ${css.asCSSUrl(icon.dark)}; }`);
                        cssRules.push(css.inline `.vs ${selector} { content: ${emQuad}; background-image: ${css.asCSSUrl(icon.light)}; }`);
                    }
                }
            }
        }
        result.content = cssRules.join('\n');
        return result;
    }
    /**
     * Try converting absolute font sizes to relative values.
     *
     * This allows them to be scaled nicely depending on where they are used.
     */
    tryNormalizeFontSize(size) {
        if (!size) {
            return undefined;
        }
        const defaultFontSizeInPx = 13;
        if (size.endsWith('px')) {
            const value = parseInt(size, 10);
            if (!isNaN(value)) {
                return Math.round((value / defaultFontSizeInPx) * 100) + '%';
            }
        }
        return size;
    }
}
function handleParentFolder(key, selectors) {
    const lastIndexOfSlash = key.lastIndexOf('/');
    if (lastIndexOfSlash >= 0) {
        const parentFolder = key.substring(0, lastIndexOfSlash);
        selectors.push(css.inline `.${classSelectorPart(parentFolder)}-name-dir-icon`);
        return key.substring(lastIndexOfSlash + 1);
    }
    return key;
}
function classSelectorPart(str) {
    str = fileIconSelectorEscape(str);
    return css.className(str, true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvYnJvd3Nlci9maWxlSWNvblRoZW1lRGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0saUNBQWlDLENBQUE7QUFDeEQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTixhQUFhLEdBR2IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQVFuRixPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sS0FBSyxHQUFHLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFN0YsTUFBTSxPQUFPLGlCQUFpQjthQUNiLGdCQUFXLEdBQUcsZUFBZSxDQUFBO0lBZ0I3QyxZQUFvQixFQUFVLEVBQUUsS0FBYSxFQUFFLFVBQXlCO1FBQ3ZFLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBO1FBQ1osSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7UUFDekIsSUFBSSxDQUFDLGNBQWMs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