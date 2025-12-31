/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { compareIgnoreCase, regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
import { clearPlatformLanguageAssociations, getLanguageIds, registerPlatformLanguageAssociation, } from './languagesAssociations.js';
import { ModesRegistry, PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { Extensions, } from '../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../platform/registry/common/platform.js';
const hasOwnProperty = Object.prototype.hasOwnProperty;
const NULL_LANGUAGE_ID = 'vs.editor.nullLanguage';
export class LanguageIdCodec {
    constructor() {
        this._languageIdToLanguage = [];
        this._languageToLanguageId = new Map();
        this._register(NULL_LANGUAGE_ID, 0 /* LanguageId.Null */);
        this._register(PLAINTEXT_LANGUAGE_ID, 1 /* LanguageId.PlainText */);
        this._nextLanguageId = 2;
    }
    _register(language, languageId) {
        this._languageIdToLanguage[languageId] = language;
        this._languageToLanguageId.set(language, languageId);
    }
    register(language) {
        if (this._languageToLanguageId.has(language)) {
            return;
        }
        const languageId = this._nextLanguageId++;
        this._register(language, languageId);
    }
    encodeLanguageId(languageId) {
        return this._languageToLanguageId.get(languageId) || 0 /* LanguageId.Null */;
    }
    decodeLanguageId(languageId) {
        return this._languageIdToLanguage[languageId] || NULL_LANGUAGE_ID;
    }
}
export class LanguagesRegistry extends Disposable {
    static { this.instanceCount = 0; }
    constructor(useModesRegistry = true, warnOnOverwrite = false) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        LanguagesRegistry.instanceCount++;
        this._warnOnOverwrite = warnOnOverwrite;
        this.languageIdCodec = new LanguageIdCodec();
        this._dynamicLanguages = [];
        this._languages = {};
        this._mimeTypesMap = {};
        this._nameMap = {};
        this._lowercaseNameMap = {};
        if (useModesRegistry) {
            this._initializeFromRegistry();
            this._register(ModesRegistry.onDidChangeLanguages((m) => {
                this._initializeFromRegistry();
            }));
        }
    }
    dispose() {
        LanguagesRegistry.instanceCount--;
        super.dispose();
    }
    setDynamicLanguages(def) {
        this._dynamicLanguages = def;
        this._initializeFromRegistry();
    }
    _initializeFromRegistry() {
        this._languages = {};
        this._mimeTypesMap = {};
        this._nameMap = {};
        this._lowercaseNameMap = {};
        clearPlatformLanguageAssociations();
        const desc = []
            .concat(ModesRegistry.getLanguages())
            .concat(this._dynamicLanguages);
        this._registerLanguages(desc);
    }
    registerLanguage(desc) {
        return ModesRegistry.registerLanguage(desc);
    }
    _registerLanguages(desc) {
        for (const d of desc) {
            this._registerLanguage(d);
        }
        // Rebuild fast path maps
        this._mimeTypesMap = {};
        this._nameMap = {};
        this._lowercaseNameMap = {};
        Object.keys(this._languages).forEach((langId) => {
            const language = this._languages[langId];
            if (language.name) {
                this._nameMap[language.name] = language.identifier;
            }
            language.aliases.forEach((alias) => {
                this._lowercaseNameMap[alias.toLowerCase()] = language.identifier;
            });
            language.mimetypes.forEach((mimetype) => {
                this._mimeTypesMap[mimetype] = language.identifier;
            });
        });
        Registry.as(Extensions.Configuration).registerOverrideIdentifiers(this.getRegisteredLanguageIds());
        this._onDidChange.fire();
    }
    _registerLanguage(lang) {
        const langId = lang.id;
        let resolvedLanguage;
        if (hasOwnProperty.call(this._languages, langId)) {
            resolvedLanguage = this._languages[langId];
        }
        else {
            this.languageIdCodec.register(langId);
            resolvedLanguage = {
                identifier: langId,
                name: null,
                mimetypes: [],
                aliases: [],
                extensions: [],
                filenames: [],
                configurationFiles: [],
                icons: [],
            };
            this._languages[langId] = resolvedLanguage;
        }
        this._mergeLanguage(resolvedLanguage, lang);
    }
    _mergeLanguage(resolvedLanguage, lang) {
        const langId = lang.id;
        let primaryMime = null;
        if (Array.isArray(lang.mimetypes) && lang.mimetypes.length > 0) {
            resolvedLanguage.mimetypes.push(...lang.mimetypes);
            primaryMime = lang.mimetypes[0];
        }
        if (!primaryMime) {
            primaryMime = `text/x-${langId}`;
            resolvedLanguage.mimetypes.push(primaryMime);
        }
        if (Array.isArray(lang.extensions)) {
            if (lang.configuration) {
                // insert first as this appears to be the 'primary' language definition
                resolvedLanguage.extensions = lang.extensions.concat(resolvedLanguage.extensions);
            }
            else {
                resolvedLanguage.extensions = resolvedLanguage.extensions.concat(lang.extensions);
            }
            for (const extension of lang.extensions) {
                registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, extension: extension }, this._warnOnOverwrite);
            }
        }
        if (Array.isArray(lang.filenames)) {
            for (const filename of lang.filenames) {
                registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, filename: filename }, this._warnOnOverwrite);
                resolvedLanguage.filenames.push(filename);
            }
        }
        if (Array.isArray(lang.filenamePatterns)) {
            for (const filenamePattern of lang.filenamePatterns) {
                registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, filepattern: filenamePattern }, this._warnOnOverwrite);
            }
        }
        if (typeof lang.firstLine === 'string' && lang.firstLine.length > 0) {
            let firstLineRegexStr = lang.firstLine;
            if (firstLineRegexStr.charAt(0) !== '^') {
                firstLineRegexStr = '^' + firstLineRegexStr;
            }
            try {
                const firstLineRegex = new RegExp(firstLineRegexStr);
                if (!regExpLeadsToEndlessLoop(firstLineRegex)) {
                    registerPlatformLanguageAssociation({ id: langId, mime: primaryMime, firstline: firstLineRegex }, this._warnOnOverwrite);
                }
            }
            catch (err) {
                // Most likely, the regex was bad
                console.warn(`[${lang.id}]: Invalid regular expression \`${firstLineRegexStr}\`: `, err);
            }
        }
        resolvedLanguage.aliases.push(langId);
        let langAliases = null;
        if (typeof lang.aliases !== 'undefined' && Array.isArray(lang.aliases)) {
            if (lang.aliases.length === 0) {
                // signal that this language should not get a name
                langAliases = [null];
            }
            else {
                langAliases = lang.aliases;
            }
        }
        if (langAliases !== null) {
            for (const langAlias of langAliases) {
                if (!langAlias || langAlias.length === 0) {
                    continue;
                }
                resolvedLanguage.aliases.push(langAlias);
            }
        }
        const containsAliases = langAliases !== null && langAliases.length > 0;
        if (containsAliases && langAliases[0] === null) {
            // signal that this language should not get a name
        }
        else {
            const bestName = (containsAliases ? langAliases[0] : null) || langId;
            if (containsAliases || !resolvedLanguage.name) {
                resolvedLanguage.name = bestName;
            }
        }
        if (lang.configuration) {
            resolvedLanguage.configurationFiles.push(lang.configuration);
        }
        if (lang.icon) {
            resolvedLanguage.icons.push(lang.icon);
        }
    }
    isRegisteredLanguageId(languageId) {
        if (!languageId) {
            return false;
        }
        return hasOwnProperty.call(this._languages, languageId);
    }
    getRegisteredLanguageIds() {
        return Object.keys(this._languages);
    }
    getSortedRegisteredLanguageNames() {
        const result = [];
        for (const languageName in this._nameMap) {
            if (hasOwnProperty.call(this._nameMap, languageName)) {
                result.push({
                    languageName: languageName,
                    languageId: this._nameMap[languageName],
                });
            }
        }
        result.sort((a, b) => compareIgnoreCase(a.languageName, b.languageName));
        return result;
    }
    getLanguageName(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return null;
        }
        return this._languages[languageId].name;
    }
    getMimeType(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return null;
        }
        const language = this._languages[languageId];
        return language.mimetypes[0] || null;
    }
    getExtensions(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return [];
        }
        return this._languages[languageId].extensions;
    }
    getFilenames(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return [];
        }
        return this._languages[languageId].filenames;
    }
    getIcon(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return null;
        }
        const language = this._languages[languageId];
        return language.icons[0] || null;
    }
    getConfigurationFiles(languageId) {
        if (!hasOwnProperty.call(this._languages, languageId)) {
            return [];
        }
        return this._languages[languageId].configurationFiles || [];
    }
    getLanguageIdByLanguageName(languageName) {
        const languageNameLower = languageName.toLowerCase();
        if (!hasOwnProperty.call(this._lowercaseNameMap, languageNameLower)) {
            return null;
        }
        return this._lowercaseNameMap[languageNameLower];
    }
    getLanguageIdByMimeType(mimeType) {
        if (!mimeType) {
            return null;
        }
        if (hasOwnProperty.call(this._mimeTypesMap, mimeType)) {
            return this._mimeTypesMap[mimeType];
        }
        return null;
    }
    guessLanguageIdByFilepathOrFirstLine(resource, firstLine) {
        if (!resource && !firstLine) {
            return [];
        }
        return getLanguageIds(resource, firstLine);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlc1JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0YsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxjQUFjLEVBQ2QsbUNBQW1DLEdBQ25DLE1BQU0sNEJBQTRCLENBQUE7QUFJbkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBTXBGLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFeEUsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUE7QUFDdEQsTUFBTSxnQkFBZ0IsR0FBRyx3QkFBd0IsQ0FBQTtBQWFqRCxNQUFNLE9BQU8sZUFBZTtJQUszQjtRQUhpQiwwQkFBcUIsR0FBYSxFQUFFLENBQUE7UUFDcEMsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFHakUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsMEJBQWtCLENBQUE7UUFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsK0JBQXVCLENBQUE7UUFDM0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVPLFNBQVMsQ0FBQyxRQUFnQixFQUFFLFVB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