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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2Jyb3dzZXIvZmlsZUljb25UaGVtZURhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sYUFBYSxHQUdiLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFRbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEtBQUssR0FBRyxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRTdGLE1BQU0sT0FBTyxpQkFBaUI7YUFDYixnQkFBVyxHQUFHLGVBQWUsQ0FBQTtJQWdCN0MsWUFBb0IsRUFBVSxFQUFFLEtBQWEsRUFBRSxVQUF5QjtRQUN2RSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUNaLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFBO1FBQzNCLElB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