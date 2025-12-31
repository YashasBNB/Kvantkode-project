/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * This code is also used by standalone cli's. Avoid adding dependencies to keep the size of the cli small.
 */
import { exec } from 'child_process';
import { isWindows } from '../common/platform.js';
const windowsTerminalEncodings = {
    '437': 'cp437', // United States
    '850': 'cp850', // Multilingual(Latin I)
    '852': 'cp852', // Slavic(Latin II)
    '855': 'cp855', // Cyrillic(Russian)
    '857': 'cp857', // Turkish
    '860': 'cp860', // Portuguese
    '861': 'cp861', // Icelandic
    '863': 'cp863', // Canadian - French
    '865': 'cp865', // Nordic
    '866': 'cp866', // Russian
    '869': 'cp869', // Modern Greek
    '936': 'cp936', // Simplified Chinese
    '1252': 'cp1252', // West European Latin
};
function toIconvLiteEncoding(encodingName) {
    const normalizedEncodingName = encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];
    return mapped || normalizedEncodingName;
}
const JSCHARDET_TO_ICONV_ENCODINGS = {
    ibm866: 'cp866',
    big5: 'cp950',
};
const UTF8 = 'utf8';
export async function resolveTerminalEncoding(verbose) {
    let rawEncodingPromise;
    // Support a global environment variable to win over other mechanics
    const cliEncodingEnv = process.env['VSCODE_CLI_ENCODING'];
    if (cliEncodingEnv) {
        if (verbose) {
            console.log(`Found VSCODE_CLI_ENCODING variable: ${cliEncodingEnv}`);
        }
        rawEncodingPromise = Promise.resolve(cliEncodingEnv);
    }
    // Windows: educated guess
    else if (isWindows) {
        rawEncodingPromise = new Promise((resolve) => {
            if (verbose) {
                console.log('Running "chcp" to detect terminal encoding...');
            }
            exec('chcp', (err, stdout, stderr) => {
                if (stdout) {
                    if (verbose) {
                        console.log(`Output from "chcp" command is: ${stdout}`);
                    }
                    const windowsTerminalEncodingKeys = Object.keys(windowsTerminalEncodings);
                    for (const key of windowsTerminalEncodingKeys) {
                        if (stdout.indexOf(key) >= 0) {
                            return resolve(windowsTerminalEncodings[key]);
                        }
                    }
                }
                return resolve(undefined);
            });
        });
    }
    // Linux/Mac: use "locale charmap" command
    else {
        rawEncodingPromise = new Promise((resolve) => {
            if (verbose) {
                console.log('Running "locale charmap" to detect terminal encoding...');
            }
            exec('locale charmap', (err, stdout, stderr) => resolve(stdout));
        });
    }
    const rawEncoding = await rawEncodingPromise;
    if (verbose) {
        console.log(`Detected raw terminal encoding: ${rawEncoding}`);
    }
    if (!rawEncoding || rawEncoding.toLowerCase() === 'utf-8' || rawEncoding.toLowerCase() === UTF8) {
        return UTF8;
    }
    return toIconvLiteEncoding(rawEncoding);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbmNvZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS90ZXJtaW5hbEVuY29kaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFakQsTUFBTSx3QkFBd0IsR0FBRztJQUNoQyxLQUFLLEVBQUUsT0FBTyxFQUFFLGdCQUFnQjtJQUNoQyxLQUFLLEVBQUUsT0FBTyxFQUFFLHdCQUF3QjtJQUN4QyxLQUFLLEVBQUUsT0FBTyxFQUFFLG1CQUFtQjtJQUNuQyxLQUFLLEVBQUUsT0FBTyxFQUFFLG9CQUFvQjtJQUNwQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVU7SUFDMUIsS0FBSyxFQUFFLE9BQU8sRUFBRSxhQUFhO0lBQzdCLEtBQUssRUFBRSxPQUFPLEVBQUUsWUFBWTtJQUM1QixLQUFLLEVBQUUsT0FBTyxFQUFFLG9CQUFvQjtJQUNwQyxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVM7SUFDekIsS0FBSyxFQUFFLE9BQU8sRUFBRSxVQUFVO0lBQzFCLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZTtJQUMvQixLQUFLLEVBQUUsT0FBTyxFQUFFLHFCQUFxQjtJQUNyQyxNQUFNLEVBQUUsUUFBUSxFQUFFLHNCQUFzQjtDQUN4QyxDQUFBO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxZQUFvQjtJQUNoRCxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ3RGLE1BQU0sTUFBTSxHQUFHLDRCQUE0QixDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFFbkUs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