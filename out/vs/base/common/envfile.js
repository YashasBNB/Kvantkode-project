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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52ZmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2VudmZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsR0FBVztJQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtJQUV4Qyx3QkFBd0I7SUFDeEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUV2QyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3hCLGdDQUFnQztRQUNoQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25DLFNBQVE7UUFDVCxDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0lBRWIsU0FBUyxTQUFTLENBQUMsSUFBWTtRQUM5Qix1QkFBdUI7UUFDdkIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDaEMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FB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