/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { CONFIG_KEY, DEFAULT_SOURCE_FOLDER, LOCATIONS_CONFIG_KEY } from './constants.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link CONFIG_KEY} and {@link LOCATIONS_CONFIG_KEY}.
 *
 * ### Functions
 *
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export var PromptsConfig;
(function (PromptsConfig) {
    PromptsConfig.KEY = CONFIG_KEY;
    PromptsConfig.LOCATIONS_KEY = LOCATIONS_CONFIG_KEY;
    /**
     * Checks if the feature is enabled.
     * @see {@link CONFIG_KEY}.
     */
    PromptsConfig.enabled = (configService) => {
        const enabledValue = configService.getValue(CONFIG_KEY);
        return asBoolean(enabledValue) ?? false;
    };
    /**
     * Context key expression for the `reusable prompts` feature `enabled` status.
     */
    PromptsConfig.enabledCtx = ContextKeyExpr.equals(`config.${CONFIG_KEY}`, true);
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link LOCATIONS_CONFIG_KEY}.
     */
    PromptsConfig.getLocationsValue = (configService) => {
        const configValue = configService.getValue(LOCATIONS_CONFIG_KEY);
        if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
            return undefined;
        }
        // note! this would be also true for `null` and `array`,
        // 		 but those cases are already handled above
        if (typeof configValue === 'object') {
            const paths = {};
            for (const [path, value] of Object.entries(configValue)) {
                const cleanPath = path.trim();
                const booleanValue = asBoolean(value);
                // if value can be mapped to a boolean, and the clean
                // path is not empty, add it to the map
                if (booleanValue !== undefined && cleanPath) {
                    paths[cleanPath] = booleanValue;
                }
            }
            return paths;
        }
        return undefined;
    };
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link DEFAULT_SOURCE_FOLDER}.
     */
    PromptsConfig.promptSourceFolders = (configService) => {
        const value = PromptsConfig.getLocationsValue(configService);
        // note! the `value &&` part handles the `undefined`, `null`, and `false` cases
        if (value && typeof value === 'object') {
            const paths = [];
            // if the default source folder is not explicitly disabled, add it
            if (value[DEFAULT_SOURCE_FOLDER] !== false) {
                paths.push(DEFAULT_SOURCE_FOLDER);
            }
            // copy all the enabled paths to the result list
            for (const [path, enabled] of Object.entries(value)) {
                // we already added the default source folder, so skip it
                if (enabled === false || path === DEFAULT_SOURCE_FOLDER) {
                    continue;
                }
                paths.push(path);
            }
            return paths;
        }
        // `undefined`, `null`, and `false` cases
        return [];
    };
})(PromptsConfig || (PromptsConfig = {}));
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanValue = value.trim().toLowerCase();
        if (cleanValue === 'true') {
            return true;
        }
        if (cleanValue === 'false') {
            return false;
        }
        return undefined;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvbXB0cy9jb21tb24vY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFeEY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSCxNQUFNLEtBQVcsYUFBYSxDQXNGN0I7QUF0RkQsV0FBaUIsYUFBYTtJQUNoQixpQkFBRyxHQUFHLFVBQVUsQ0FBQTtJQUNoQiwyQkFBYSxHQUFHLG9CQUFvQixDQUFBO0lBRWpEOzs7T0FHRztJQUNVLHFCQUFPLEdBQUcsQ0FBQyxhQUFvQyxFQUFXLEVBQUU7UUFDeEUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUV2RCxPQUFPLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxLQUFLLENBQUE7SUFDeEMsQ0FBQyxDQUFBO0lBRUQ7O09BRUc7SUFDVSx3QkFBVSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxVQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUU3RTs7O09BR0c7SUFDVSwrQkFBaUIsR0FBRyxDQUNoQyxhQUFvQyxFQUNFLEVBQUU7UUFDeEMsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRWhFLElBQUksV0FBVyxLQUFLLFNBQVMsSUFBSSxXQUFXLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNyRixPQUFPLFNBQVMsQ0FBQTtRQUNqQixD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