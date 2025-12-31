/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import * as perf from '../common/performance.js';
export async function resolveNLSConfiguration({ userLocale, osLocale, userDataPath, commit, nlsMetadataPath, }) {
    perf.mark('code/willGenerateNls');
    if (process.env['VSCODE_DEV'] ||
        userLocale === 'pseudo' ||
        userLocale.startsWith('en') ||
        !commit ||
        !userDataPath) {
        return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
    }
    try {
        const languagePacks = await getLanguagePackConfigurations(userDataPath);
        if (!languagePacks) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const resolvedLanguage = resolveLanguagePackLanguage(languagePacks, userLocale);
        if (!resolvedLanguage) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const languagePack = languagePacks[resolvedLanguage];
        const mainLanguagePackPath = languagePack?.translations?.['vscode'];
        if (!languagePack ||
            typeof languagePack.hash !== 'string' ||
            !languagePack.translations ||
            typeof mainLanguagePackPath !== 'string' ||
            !(await exists(mainLanguagePackPath))) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const languagePackId = `${languagePack.hash}.${resolvedLanguage}`;
        const globalLanguagePackCachePath = path.join(userDataPath, 'clp', languagePackId);
        const commitLanguagePackCachePath = path.join(globalLanguagePackCachePath, commit);
        const languagePackMessagesFile = path.join(commitLanguagePackCachePath, 'nls.messages.json');
        const translationsConfigFile = path.join(globalLanguagePackCachePath, 'tcf.json');
        const languagePackCorruptMarkerFile = path.join(globalLanguagePackCachePath, 'corrupted.info');
        if (await exists(languagePackCorruptMarkerFile)) {
            await fs.promises.rm(globalLanguagePackCachePath, {
                recursive: true,
                force: true,
                maxRetries: 3,
            }); // delete corrupted cache folder
        }
        const result = {
            userLocale,
            osLocale,
            resolvedLanguage,
            defaultMessagesFile: path.join(nlsMetadataPath, 'nls.messages.json'),
            languagePack: {
                translationsConfigFile,
                messagesFile: languagePackMessagesFile,
                corruptMarkerFile: languagePackCorruptMarkerFile,
            },
            // NLS: below properties are a relic from old times only used by vscode-nls and deprecated
            locale: userLocale,
            availableLanguages: { '*': resolvedLanguage },
            _languagePackId: languagePackId,
            _languagePackSupport: true,
            _translationsConfigFile: translationsConfigFile,
            _cacheRoot: globalLanguagePackCachePath,
            _resolvedLanguagePackCoreLocation: commitLanguagePackCachePath,
            _corruptedFile: languagePackCorruptMarkerFile,
        };
        if (await exists(commitLanguagePackCachePath)) {
            touch(commitLanguagePackCachePath).catch(() => { }); // We don't wait for this. No big harm if we can't touch
            perf.mark('code/didGenerateNls');
            return result;
        }
        const [, nlsDefaultKeys, nlsDefaultMessages, nlsPackdata] = 
        //               ^moduleId ^nlsKeys                               ^moduleId      ^nlsKey ^nlsValue
        await Promise.all([
            fs.promises.mkdir(commitLanguagePackCachePath, { recursive: true }),
            JSON.parse(await fs.promises.readFile(path.join(nlsMetadataPath, 'nls.keys.json'), 'utf-8')),
            JSON.parse(await fs.promises.readFile(path.join(nlsMetadataPath, 'nls.messages.json'), 'utf-8')),
            JSON.parse(await fs.promises.readFile(mainLanguagePackPath, 'utf-8')),
        ]);
        const nlsResult = [];
        // We expect NLS messages to be in a flat array in sorted order as they
        // where produced during build time. We use `nls.keys.json` to know the
        // right order and then lookup the related message from the translation.
        // If a translation does not exist, we fallback to the default message.
        let nlsIndex = 0;
        for (const [moduleId, nlsKeys] of nlsDefaultKeys) {
            const moduleTranslations = nlsPackdata.contents[moduleId];
            for (const nlsKey of nlsKeys) {
                nlsResult.push(moduleTranslations?.[nlsKey] || nlsDefaultMessages[nlsIndex]);
                nlsIndex++;
            }
        }
        await Promise.all([
            fs.promises.writeFile(languagePackMessagesFile, JSON.stringify(nlsResult), 'utf-8'),
            fs.promises.writeFile(translationsConfigFile, JSON.stringify(languagePack.translations), 'utf-8'),
        ]);
        perf.mark('code/didGenerateNls');
        return result;
    }
    catch (error) {
        console.error('Generating translation files failed.', error);
    }
    return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
}
/**
 * The `languagepacks.json` file is a JSON file that contains all metadata
 * about installed language extensions per language. Specifically, for
 * core (`vscode`) and all extensions it supports, it points to the related
 * translation files.
 *
 * The file is updated whenever a new language pack is installed or removed.
 */
async function getLanguagePackConfigurations(userDataPath) {
    const configFile = path.join(userDataPath, 'languagepacks.json');
    try {
        return JSON.parse(await fs.promises.readFile(configFile, 'utf-8'));
    }
    catch (err) {
        return undefined; // Do nothing. If we can't read the file we have no language pack config.
    }
}
function resolveLanguagePackLanguage(languagePacks, locale) {
    try {
        while (locale) {
            if (languagePacks[locale]) {
                return locale;
            }
            const index = locale.lastIndexOf('-');
            if (index > 0) {
                locale = locale.substring(0, index);
            }
            else {
                return undefined;
            }
        }
    }
    catch (error) {
        console.error('Resolving language pack configuration failed.', error);
    }
    return undefined;
}
function defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath) {
    perf.mark('code/didGenerateNls');
    return {
        userLocale,
        osLocale,
        resolvedLanguage: 'en',
        defaultMessagesFile: path.join(nlsMetadataPath, 'nls.messages.json'),
        // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
        locale: userLocale,
        availableLanguages: {},
    };
}
//#region fs helpers
async function exists(path) {
    try {
        await fs.promises.access(path);
        return true;
    }
    catch {
        return false;
    }
}
function touch(path) {
    const date = new Date();
    return fs.promises.utimes(path, date, date);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL25scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUM1QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssSUFBSSxNQUFNLDBCQUEwQixDQUFBO0FBZ0NoRCxNQUFNLENBQUMsS0FBSyxVQUFVLHVCQUF1QixDQUFDLEVBQzdDLFVBQVUsRUFDVixRQUFRLEVBQ1IsWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEdBQ2tCO0lBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUVqQyxJQUNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1FBQ3pCLFVBQVUsS0FBSyxRQUFRO1FBQ3ZCLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQzNCLENBQUMsTUFBTTtRQUNQLENBQUMsWUFBWSxFQUNaLENBQUM7UUFDRixPQUFPLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELElBQUksQ0FBQztRQUNKLE1BQU0sYUFBYSxHQUFHLE1BQU0sNkJBQTZCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sdUJBQXVCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN0RSxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkIsT0FBTyx1QkFBdUIsQ0FBQyxV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