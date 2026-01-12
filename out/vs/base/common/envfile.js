/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Parses a standard .env/.envrc file into a map of the environment variables
 * it defines.
 *
 * todo@connor4312: this can go away (if only used in Node.js targets) and be
 * replaced with `util.parseEnv`. However, currently calling that makes the
 * extension host crash.
 */
export function parseEnvFile(src) {
    const result = new Map();
    // Normalize line breaks
    const normalizedSrc = src.replace(/\r\n?/g, '\n');
    const lines = normalizedSrc.split('\n');
    for (let line of lines) {
        // Skip empty lines and comments
        line = line.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }
        // Parse the line into key and value
        const [key, value] = parseLine(line);
        if (key) {
            result.set(key, value);
        }
    }
    return result;
    function parseLine(line) {
        // Handle export prefix
        if (line.startsWith('export ')) {
            line = line.substring(7).trim();
        }
        // Find the key-value separator
        const separatorIndex = findIndexOutsideQuotes(line, (c) => c === '=' || c === ':');
        if (separatorIndex === -1) {
            return [null, null];
        }
        const key = line.substring(0, separatorIndex).trim();
        let value = line.substring(separatorIndex + 1).trim();
        // Handle comments and remove them
        const commentIndex = findIndexOutsideQuotes(value, (c) => c === '#');
        if (commentIndex !== -1) {
            value = value.substring(0, commentIndex).trim();
        }
        // Process quoted values
        if (value.length >= 2) {
            const firstChar = value[0];
            const lastChar = value[value.length - 1];
            if ((firstChar === '"' && lastChar === '"') ||
                (firstChar === "'" && lastChar === "'") ||
                (firstChar === '`' && lastChar === '`')) {
                // Remove surrounding quotes
                value = value.substring(1, value.length - 1);
                // Handle escaped characters in double quotes
                if (firstChar === '"') {
                    value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                }
            }
        }
        return [key, value];
    }
    function findIndexOutsideQuotes(text, predicate) {
        let inQuote = false;
        let quoteChar = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuote) {
                if (char === quoteChar && text[i - 1] !== '\\') {
                    inQuote = false;
                }
            }
            else if (char === '"' || char === "'" || char === '`') {
                inQuote = true;
                quoteChar = char;
            }
            else if (predicate(char)) {
                return i;
            }
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52ZmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZW52ZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFXO0lBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBRXhDLHdCQUF3QjtJQUN4QixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqRCxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXZDLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDeEIsZ0NBQWdDO1FBQ2hDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkMsU0FBUTtRQUNULENBQUM7UUFFRCxvQ0FBb0M7UUFDcEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUE7SUFFYixTQUFTLFNBQVMsQ0FBQyxJQUFZO1FBQzlCLHVCQUF1QjtRQUN2QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FB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