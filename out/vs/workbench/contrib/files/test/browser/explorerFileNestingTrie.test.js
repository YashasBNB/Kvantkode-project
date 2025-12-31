/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PreTrie, ExplorerFileNestingTrie, SufTrie } from '../../common/explorerFileNestingTrie.js';
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const fakeFilenameAttributes = { dirname: 'mydir', basename: '', extname: '' };
suite('SufTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exactMatches', () => {
        const t = new SufTrie();
        t.add('.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), []);
    });
    test('starMatches', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['MyKey']);
    });
    test('starSubstitutes', () => {
        const t = new SufTrie();
        t.add('*.npmrc', '${capture}.json');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['.json']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['a.json']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['a.b.c.d.json']);
    });
    test('multiMatches', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'Key1');
        t.add('*.json', 'Key2');
        t.add('*d.npmrc', 'Key3');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1', 'Key3']);
    });
    test('multiSubstitutes', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'Key1.${capture}.js');
        t.add('*.json', 'Key2.${capture}.js');
        t.add('*d.npmrc', 'Key3.${capture}.js');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1..js']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2..js']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2.a.js']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1.a.js']);
        assert.deepStrictEqual(t.get('a.b.cd.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.cd.js',
            'Key3.a.b.c.js',
        ]);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.c.d.js',
            'Key3.a.b.c..js',
        ]);
    });
});
suite('PreTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exactMatches', () => {
        const t = new PreTrie();
        t.add('.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), []);
    });
    test('starMatches', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['MyKey']);
    });
    test('starSubstitutes', () => {
        const t = new PreTrie();
        t.add('*.npmrc', '${capture}.json');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['.json']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['a.json']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['a.b.c.d.json']);
    });
    test('multiMatches', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'Key1');
        t.add('*.json', 'Key2');
        t.add('*d.npmrc', 'Key3');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1', 'Key3']);
    });
    test('multiSubstitutes', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'Key1.${capture}.js');
        t.add('*.json', 'Key2.${capture}.js');
        t.add('*d.npmrc', 'Key3.${capture}.js');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1..js']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2..js']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2.a.js']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1.a.js']);
        assert.deepStrictEqual(t.get('a.b.cd.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.cd.js',
            'Key3.a.b.c.js',
        ]);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.c.d.js',
            'Key3.a.b.c..js',
        ]);
    });
    test('emptyMatches', () => {
        const t = new PreTrie();
        t.add('package*json', 'package');
        assert.deepStrictEqual(t.get('package.json', fakeFilenameAttributes), ['package']);
        assert.deepStrictEqual(t.get('packagejson', fakeFilenameAttributes), ['package']);
        assert.deepStrictEqual(t.get('package-lock.json', fakeFilenameAttributes), ['package']);
    });
});
suite('StarTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const assertMapEquals = (actual, expected) => {
        const actualStr = [...actual.entries()].map((e) => `${e[0]} => [${[...e[1].keys()].join()}]`);
        const expectedStr = Object.entries(expected).map((e) => `${e[0]}: [${[e[1]].join()}]`);
        const bigMsg = actualStr + '===' + expectedStr;
        assert.strictEqual(actual.size, Object.keys(expected).length, bigMsg);
        for (const parent of actual.keys()) {
            const act = actual.get(parent);
            const exp = expected[parent];
            const str = [...act.keys()].join() + '===' + exp.join();
            const msg = bigMsg + '\n' + str;
            assert(act.size === exp.length, msg);
            for (const child of exp) {
                assert(act.has(child), msg);
            }
        }
    };
    test('does added extension nesting', () => {
        const t = new ExplorerFileNestingTrie([['*', ['${capture}.*']]]);
        const nesting = t.nest([
            'file',
            'file.json',
            'boop.test',
            'boop.test1',
            'boop.test.1',
            'beep',
            'beep.test1',
            'beep.boop.test1',
            'beep.boop.test2',
            'beep.boop.a',
        ], 'mydir');
        assertMapEquals(nesting, {
            file: ['file.json'],
            'boop.test': ['boop.test.1'],
            'boop.test1': [],
            beep: ['beep.test1', 'beep.boop.test1', 'beep.boop.test2', 'beep.boop.a'],
        });
    });
    test('does ext specific nesting', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.ts', ['${capture}.js']],
            ['*.js', ['${capture}.map']],
        ]);
        const nesting = t.nest(['a.ts', 'a.js', 'a.jss', 'ab.js', 'b.js', 'b.map', 'c.ts', 'c.js', 'c.map', 'd.ts', 'd.map'], 'mydir');
        assertMapEquals(nesting, {
            'a.ts': ['a.js'],
            'ab.js': [],
            'a.jss': [],
            'b.js': ['b.map'],
            'c.ts': ['c.js', 'c.map'],
            'd.ts': [],
            'd.map': [],
        });
    });
    test('handles loops', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.a', ['${capture}.b', '${capture}.c']],
            ['*.b', ['${capture}.a']],
            ['*.c', ['${capture}.d']],
            ['*.aa', ['${capture}.bb']],
            ['*.bb', ['${capture}.cc', '${capture}.dd']],
            ['*.cc', ['${capture}.aa']],
            ['*.dd', ['${capture}.ee']],
        ]);
        const nesting = t.nest([
            '.a',
            '.b',
            '.c',
            '.d',
            'a.a',
            'a.b',
            'a.d',
            'a.aa',
            'a.bb',
            'a.cc',
            'b.aa',
            'b.bb',
            'c.bb',
            'c.cc',
            'd.aa',
            'd.cc',
            'e.aa',
            'e.bb',
            'e.dd',
            'e.ee',
            'f.aa',
            'f.bb',
            'f.cc',
            'f.dd',
            'f.ee',
        ], 'mydir');
        assertMapEquals(nesting, {
            '.a': [],
            '.b': [],
            '.c': [],
            '.d': [],
            'a.a': [],
            'a.b': [],
            'a.d': [],
            'a.aa': [],
            'a.bb': [],
            'a.cc': [],
            'b.aa': ['b.bb'],
            'c.bb': ['c.cc'],
            'd.cc': ['d.aa'],
            'e.aa': ['e.bb', 'e.dd', 'e.ee'],
            'f.aa': [],
            'f.bb': [],
            'f.cc': [],
            'f.dd': [],
            'f.ee': [],
        });
    });
    test('does general bidirectional suffix matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['*-vsdoc.js', ['${capture}.js']],
            ['*.js', ['${capture}-vscdoc.js']],
        ]);
        const nesting = t.nest(['a-vsdoc.js', 'a.js', 'b.js', 'b-vscdoc.js'], 'mydir');
        assertMapEquals(nesting, {
            'a-vsdoc.js': ['a.js'],
            'b.js': ['b-vscdoc.js'],
        });
    });
    test('does general bidirectional prefix matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['vsdoc-*.js', ['${capture}.js']],
            ['*.js', ['vscdoc-${capture}.js']],
        ]);
        const nesting = t.nest(['vsdoc-a.js', 'a.js', 'b.js', 'vscdoc-b.js'], 'mydir');
        assertMapEquals(nesting, {
            'vsdoc-a.js': ['a.js'],
            'b.js': ['vscdoc-b.js'],
        });
    });
    test('does general bidirectional general matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['foo-*-bar.js', ['${capture}.js']],
            ['*.js', ['bib-${capture}-bap.js']],
        ]);
        const nesting = t.nest(['foo-a-bar.js', 'a.js', 'b.js', 'bib-b-bap.js'], 'mydir');
        assertMapEquals(nesting, {
            'foo-a-bar.js': ['a.js'],
            'b.js': ['bib-b-bap.js'],
        });
    });
    test('does extension specific path segment matching', () => {
        const t = new ExplorerFileNestingTrie([['*.js', ['${capture}.*.js']]]);
        const nesting = t.nest(['foo.js', 'foo.test.js', 'fooTest.js', 'bar.js.js'], 'mydir');
        assertMapEquals(nesting, {
            'foo.js': ['foo.test.js'],
            'fooTest.js': [],
            'bar.js.js': [],
        });
    });
    test('does exact match nesting', () => {
        const t = new ExplorerFileNestingTrie([
            [
                'package.json',
                [
                    '.npmrc',
                    'npm-shrinkwrap.json',
                    'yarn.lock',
                    '.yarnclean',
                    '.yarnignore',
                    '.yarn-integrity',
                    '.yarnrc',
                ],
            ],
            ['bower.json', ['.bowerrc']],
        ]);
        const nesting = t.nest(['package.json', '.npmrc', 'npm-shrinkwrap.json', 'yarn.lock', '.bowerrc'], 'mydir');
        assertMapEquals(nesting, {
            'package.json': ['.npmrc', 'npm-shrinkwrap.json', 'yarn.lock'],
            '.bowerrc': [],
        });
    });
    test('eslint test', () => {
        const t = new ExplorerFileNestingTrie([['.eslintrc*', ['.eslint*']]]);
        const nesting1 = t.nest(['.eslintrc.json', '.eslintignore'], 'mydir');
        assertMapEquals(nesting1, {
            '.eslintrc.json': ['.eslintignore'],
        });
        const nesting2 = t.nest(['.eslintrc', '.eslintignore'], 'mydir');
        assertMapEquals(nesting2, {
            '.eslintrc': ['.eslintignore'],
        });
    });
    test('basename expansion', () => {
        const t = new ExplorerFileNestingTrie([['*-vsdoc.js', ['${basename}.doc']]]);
        const nesting1 = t.nest(['boop-vsdoc.js', 'boop-vsdoc.doc', 'boop.doc'], 'mydir');
        assertMapEquals(nesting1, {
            'boop-vsdoc.js': ['boop-vsdoc.doc'],
            'boop.doc': [],
        });
    });
    test('extname expansion', () => {
        const t = new ExplorerFileNestingTrie([['*-vsdoc.js', ['${extname}.doc']]]);
        const nesting1 = t.nest(['boop-vsdoc.js', 'js.doc', 'boop.doc'], 'mydir');
        assertMapEquals(nesting1, {
            'boop-vsdoc.js': ['js.doc'],
            'boop.doc': [],
        });
    });
    test('added segment matcher', () => {
        const t = new ExplorerFileNestingTrie([['*', ['${basename}.*.${extname}']]]);
        const nesting1 = t.nest([
            'some.file',
            'some.html.file',
            'some.html.nested.file',
            'other.file',
            'some.thing',
            'some.thing.else',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'some.file': ['some.html.file', 'some.html.nested.file'],
            'other.file': [],
            'some.thing': [],
            'some.thing.else': [],
        });
    });
    test('added segment matcher (old format)', () => {
        const t = new ExplorerFileNestingTrie([['*', ['$(basename).*.$(extname)']]]);
        const nesting1 = t.nest([
            'some.file',
            'some.html.file',
            'some.html.nested.file',
            'other.file',
            'some.thing',
            'some.thing.else',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'some.file': ['some.html.file', 'some.html.nested.file'],
            'other.file': [],
            'some.thing': [],
            'some.thing.else': [],
        });
    });
    test('dirname matching', () => {
        const t = new ExplorerFileNestingTrie([['index.ts', ['${dirname}.ts']]]);
        const nesting1 = t.nest(['otherFile.ts', 'MyComponent.ts', 'index.ts'], 'MyComponent');
        assertMapEquals(nesting1, {
            'index.ts': ['MyComponent.ts'],
            'otherFile.ts': [],
        });
    });
    test.skip('is fast', () => {
        const bigNester = new ExplorerFileNestingTrie([
            ['*', ['${capture}.*']],
            ['*.js', ['${capture}.*.js', '${capture}.map']],
            ['*.jsx', ['${capture}.js']],
            ['*.ts', ['${capture}.js', '${capture}.*.ts']],
            ['*.tsx', ['${capture}.js']],
            ['*.css', ['${capture}.*.css', '${capture}.map']],
            ['*.html', ['${capture}.*.html']],
            ['*.htm', ['${capture}.*.htm']],
            ['*.less', ['${capture}.*.less', '${capture}.css']],
            ['*.scss', ['${capture}.*.scss', '${capture}.css']],
            ['*.sass', ['${capture}.css']],
            ['*.styl', ['${capture}.css']],
            ['*.coffee', ['${capture}.*.coffee', '${capture}.js']],
            ['*.iced', ['${capture}.*.iced', '${capture}.js']],
            ['*.config', ['${capture}.*.config']],
            ['*.cs', ['${capture}.*.cs', '${capture}.cs.d.ts']],
            ['*.vb', ['${capture}.*.vb']],
            ['*.json', ['${capture}.*.json']],
            ['*.md', ['${capture}.html']],
            ['*.mdown', ['${capture}.html']],
            ['*.markdown', ['${capture}.html']],
            ['*.mdwn', ['${capture}.html']],
            ['*.svg', ['${capture}.svgz']],
            ['*.a', ['${capture}.b']],
            ['*.b', ['${capture}.a']],
            ['*.resx', ['${capture}.designer.cs']],
            [
                'package.json',
                [
                    '.npmrc',
                    'npm-shrinkwrap.json',
                    'yarn.lock',
                    '.yarnclean',
                    '.yarnignore',
                    '.yarn-integrity',
                    '.yarnrc',
                ],
            ],
            ['bower.json', ['.bowerrc']],
            ['*-vsdoc.js', ['${capture}.js']],
            ['*.tt', ['${capture}.*']],
        ]);
        const bigFiles = Array.from({ length: 50000 / 6 })
            .map((_, i) => [
            'file' + i + '.js',
            'file' + i + '.map',
            'file' + i + '.css',
            'file' + i + '.ts',
            'file' + i + '.d.ts',
            'file' + i + '.jsx',
        ])
            .flat();
        const start = performance.now();
        // const _bigResult =
        bigNester.nest(bigFiles, 'mydir');
        const end = performance.now();
        assert(end - start < 1000, 'too slow...' + (end - start));
        // console.log(bigResult)
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL3Rlc3QvYnJvd3Nlci9leHBsb3JlckZpbGVOZXN0aW5nVHJpZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE1BQU0sc0JBQXNCLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO0FBRTlFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUN2QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN4QixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFF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