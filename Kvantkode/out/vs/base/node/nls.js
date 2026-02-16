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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvbmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQzVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0sMEJBQTBCLENBQUE7QUFnQ2hELE1BQU0sQ0FBQyxLQUFLLFVBQVUsdUJBQXVCLENBQUMsRUFDN0MsVUFBVSxFQUNWLFFBQVEsRUFDUixZQUFZLEVBQ1osTUFBTSxFQUNOLGVBQWUsR0FDa0I7SUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBRWpDLElBQ0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7UUFDekIsVUFBVSxLQUFLLFFBQVE7UUFDdkIsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDM0IsQ0FBQyxNQUFNO1FBQ1AsQ0FBQyxZQUFZLEVBQ1osQ0FBQztRQUNGLE9BQU8sdUJBQXVCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0osTUFBTSxhQUFhLEdBQUcsTUFBTSw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUN2RSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7UUFFRCxNQUFNLGdCQUFnQixHQUFHLDJCQUEyQixDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZ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