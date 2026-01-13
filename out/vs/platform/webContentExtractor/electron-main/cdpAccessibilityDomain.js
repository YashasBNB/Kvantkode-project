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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci9lbGVjdHJvbi1tYWluL2NkcEFjY2Vzc2liaWxpdHlEb21haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFnQ2hHOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLE9BQWlCO0lBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7SUFDekMsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUN4QyxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUE7SUFFOUIseUNBQXlDO0lBQ3pDLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN4RSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FBQyxJQUFZO1FBQ3hDLG1FQUFtRTtRQUNuRSxNQUFNLFNBQVMsR0FBRztZQUNqQixZQUFZO1lBQ1osUUFBUTtZQUNSLGVBQWU7WUFDZixTQUFTO1lBQ1QsTUFBTTtZQUNOLFVBQVU7WUFDVixLQUFLO1lBQ0wsU0FBUztTQUNULENBQUE7UUFDRCxNQUFNLFNBQVMsR0FBRztZQUNqQixzQkFBc0I7WUFDdEIsbUJBQW1CO1lBQ25CLFVBQVU7WUFDVixNQUFNO1lBQ04sTUFBTTtZQUNOLGdCQUFnQjtZQUNoQixjQUFjO1lBQ2QsZ0JBQWdCO1lBQ2hCLFFBQVE7WUFDUixXQUFXO1NBQ1gsQ0FBQTtRQUVELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDN0QsOEJBQThCO1FBQzlCLE9BQU8sQ0FDTixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztZQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7WUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSw0Q0FBNEM7WUFDeEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSw2Q0FBNkM7WUFDdkUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSwrQkFBK0I7WUFDdEQsSUFBSSxLQUFLLFFBQVEsQ0FDakIsQ0FBQSxDQUFDLDZCQUE2QjtJQUNoQyxDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUMsSUFBWTtRQUNoQyxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUE7UUFFMUIsd0JBQXdCO1FBQ3hCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN0QixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELGlEQUFpRDtRQUNqRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDaEUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFFRCxpRUFBaUU7UUFDakUsSUFDQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUs7WUFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLO1lBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUMzQyxDQUFDO1lBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUFDLElBQVk7UUFDaEMsT0FBTyxDQUNOLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxLQUFLLE1BQU07WUFDM0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FDaEYsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FDbkIsSUFBWSxFQUNaLFFBQWdCLENBQUMsRUFDakIsZ0JBQThEO1FBQzdELFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFFBQVEsRUFBRSxFQUFFO0tBQ1o7UUFFRCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0IsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFBO1FBQzFCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUE7UUFFbkYsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakMsSUFBSSxhQUFhLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMxQyx3REFBd0Q7Z0JBQ3hELE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDbEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7b0JBQ3pELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDMUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsb0VBQW9FO1FBQ3BFLElBQUksYUFBYSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQTtJQUM3QixLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzlCLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFBO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRUQsMENBQTBDO0lBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ25DLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxPQUFPLFFBQVE7U0FDYixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQzlCLGdGQUFnRjtRQUNoRixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzdELENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxJQUFJLENBQUM7U0FDVixJQUFJLEVBQUUsQ0FBQTtBQUNULENBQUMifQ==