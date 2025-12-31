/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Converts an array of AXNode objects to a readable format.
 * It processes the nodes to extract their text content, ignoring navigation elements and
 * formatting them in a structured way.
 *
 * @remarks We can do more here, but this is a good start.
 * @param axNodes - The array of AXNode objects to be converted to a readable format.
 * @returns string
 */
export function convertToReadibleFormat(axNodes) {
    if (!axNodes.length) {
        return '';
    }
    const nodeMap = new Map();
    const processedNodes = new Set();
    const rootNodes = [];
    // Build node map and identify root nodes
    for (const node of axNodes) {
        nodeMap.set(node.nodeId, node);
        if (!node.parentId || !axNodes.some((n) => n.nodeId === node.parentId)) {
            rootNodes.push(node);
        }
    }
    function isNavigationElement(node) {
        // Skip navigation and UI elements that don't contribute to content
        const skipRoles = [
            'navigation',
            'banner',
            'complementary',
            'toolbar',
            'menu',
            'menuitem',
            'tab',
            'tablist',
        ];
        const skipTexts = [
            'Skip to main content',
            'Toggle navigation',
            'Previous',
            'Next',
            'Copy',
            'Direct link to',
            'On this page',
            'Edit this page',
            'Search',
            'Command+K',
        ];
        const text = getNodeText(node);
        const role = node.role?.value?.toString().toLowerCase() || '';
        // allow-any-unicode-next-line
        return (skipRoles.includes(role) ||
            skipTexts.some((skipText) => text.includes(skipText)) ||
            text.startsWith('Direct link to') ||
            text.startsWith('\xAB ') || // Left-pointing double angle quotation mark
            text.endsWith(' \xBB') || // Right-pointing double angle quotation mark
            /^#\s*$/.test(text) || // Skip standalone # characters
            text === '\u200B'); // Zero-width space character
    }
    function getNodeText(node) {
        const parts = [];
        // Add name if available
        if (node.name?.value) {
            parts.push(String(node.name.value));
        }
        // Add value if available and different from name
        if (node.value?.value && node.value.value !== node.name?.value) {
            parts.push(String(node.value.value));
        }
        // Add description if available and different from name and value
        if (node.description?.value &&
            node.description.value !== node.name?.value &&
            node.description.value !== node.value?.value) {
            parts.push(String(node.description.value));
        }
        return parts.join(' ').trim();
    }
    function isCodeBlock(node) {
        return (node.role?.value === 'code' ||
            (node.properties || []).some((p) => p.name === 'code-block' || p.name === 'pre'));
    }
    function processNode(node, depth = 0, parentContext = {
        inCodeBlock: false,
        codeText: [],
    }) {
        if (!node || node.ignored || processedNodes.has(node.nodeId)) {
            return [];
        }
        if (isNavigationElement(node)) {
            return [];
        }
        processedNodes.add(node.nodeId);
        const lines = [];
        const text = getNodeText(node);
        const currentIsCode = isCodeBlock(node);
        const context = currentIsCode ? { inCodeBlock: true, codeText: [] } : parentContext;
        if (text) {
            const indent = '  '.repeat(depth);
            if (currentIsCode || context.inCodeBlock) {
                // For code blocks, collect text without adding newlines
                context.codeText.push(text.trim());
            }
            else {
                lines.push(indent + text);
            }
        }
        // Process children
        if (node.childIds) {
            for (const childId of node.childIds) {
                const child = nodeMap.get(childId);
                if (child) {
                    const childLines = processNode(child, depth + 1, context);
                    lines.push(...childLines);
                }
            }
        }
        // If this is the root code block node, join all collected code text
        if (currentIsCode && context.codeText.length > 0) {
            const indent = '  '.repeat(depth);
            lines.push(indent + context.codeText.join(' '));
        }
        return lines;
    }
    // Process all nodes starting from roots
    const allLines = [];
    for (const node of rootNodes) {
        const nodeLines = processNode(node);
        if (nodeLines.length > 0) {
            allLines.push(...nodeLines);
        }
    }
    // Process any remaining unprocessed nodes
    for (const node of axNodes) {
        if (!processedNodes.has(node.nodeId)) {
            const nodeLines = processNode(node);
            if (nodeLines.length > 0) {
                allLines.push(...nodeLines);
            }
        }
    }
    // Clean up empty lines and trim
    return allLines
        .filter((line, index, array) => {
        // Keep the line if it's not empty or if it's not adjacent to another empty line
        return line.trim() || (index > 0 && array[index - 1].trim());
    })
        .join('\n')
        .trim();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvZWxlY3Ryb24tbWFpbi9jZHBBY2Nlc3NpYmlsaXR5RG9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBZ0NoRzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxPQUFpQjtJQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBQ3pDLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFDeEMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFBO0lBRTlCLHlDQUF5QztJQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDeEUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsSUFBWTtRQUN4QyxtRUFBbUU7UUFDbkUsTUFBTSxTQUFTLEdBQUc7WUFDakIsWUFBWTtZQUNaLFFBQVE7WUFDUixlQUFlO1lBQ2YsU0FBUztZQUNULE1BQU07WUFDTixV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