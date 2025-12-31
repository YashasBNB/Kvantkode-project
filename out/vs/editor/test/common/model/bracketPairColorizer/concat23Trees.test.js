/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ListAstNode, TextAstNode, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/ast.js';
import { concat23Trees } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/concat23Trees.js';
import { toLength } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
suite('Bracket Pair Colorizer - mergeItems', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Clone', () => {
        const tree = ListAstNode.create([
            new TextAstNode(toLength(1, 1)),
            new TextAstNode(toLength(1, 1)),
        ]);
        assert.ok(equals(tree, tree.deepClone()));
    });
    function equals(node1, node2) {
        if (node1.length !== node2.length) {
            return false;
        }
        if (node1.children.length !== node2.children.length) {
            return false;
        }
        for (let i = 0; i < node1.children.length; i++) {
            if (!equals(node1.children[i], node2.children[i])) {
                return false;
            }
        }
        if (!node1.missingOpeningBracketIds.equals(node2.missingOpeningBracketIds)) {
            return false;
        }
        if (node1.kind === 2 /* AstNodeKind.Pair */ && node2.kind === 2 /* AstNodeKind.Pair */) {
            return true;
        }
        else if (node1.kind === node2.kind) {
            return true;
        }
        return false;
    }
    function testMerge(lists) {
        const node = (concat23Trees(lists.map((l) => l.deepClone())) || ListAstNode.create([])).flattenLists();
        // This trivial merge does not maintain the (2,3) tree invariant.
        const referenceNode = ListAstNode.create(lists).flattenLists();
        assert.ok(equals(node, referenceNode), 'merge23Trees failed');
    }
    test('Empty List', () => {
        testMerge([]);
    });
    test('Same Height Lists', () => {
        const textNode = new TextAstNode(toLength(1, 1));
        const tree = ListAstNode.create([textNode.deepClone(), textNode.deepClone()]);
        testMerge([
            tree.deepClone(),
            tree.deepClone(),
            tree.deepClone(),
            tree.deepClone(),
            tree.deepClone(),
        ]);
    });
    test('Different Height Lists 1', () => {
        const textNode = new TextAstNode(toLength(1, 1));
        const tree1 = ListAstNode.create([textNode.deepClone(), textNode.deepClone()]);
        const tree2 = ListAstNode.create([tree1.deepClone(), tree1.deepClone()]);
        testMerge([tree1, tree2]);
    });
    test('Different Height Lists 2', () => {
        const textNode = new TextAstNode(toLength(1, 1));
        const tree1 = ListAstNode.create([textNode.deepClone(), textNode.deepClone()]);
        const tree2 = ListAstNode.create([tree1.deepClone(), tree1.deepClone()]);
        testMerge([tree2, tree1]);
    });
    test('Different Height Lists 3', () => {
        const textNode = new TextAstNode(toLength(1, 1));
        const tree1 = ListAstNode.create([textNode.deepClone(), textNode.deepClone()]);
        const tree2 = ListAstNode.create([tree1.deepClone(), tree1.deepClone()]);
        testMerge([tree2, tree1, tree1, tree2, tree2]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uY2F0MjNUcmVlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyQ29sb3JpemVyL2NvbmNhdDIzVHJlZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUdOLFdBQVcsRUFDWCxXQUFXLEdBQ1gsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0ZBQXNGLENBQUE7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBRXhHLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO1lBQy9CLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMvQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsTUFBTSxDQUFDLEtBQWMsRUFBRSxLQUFjO1FBQzdDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7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