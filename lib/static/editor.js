require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function () {
  monaco.languages.register({ id: 'wiki' });

  monaco.languages.setLanguageConfiguration('wiki', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['{{', '}}'],
    ],

    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
    ],
  });

  monaco.languages.setMonarchTokensProvider('wiki', {
    default: 'invalid',
    brackets: [
      ['{', '}', 'delimiter.curly'],
      ['[', ']', 'delimiter.square'],
      ['{{', '}}', 'delimiter.doubleCurly'],
    ],

    keywords: ['Infobox'],

    operators: ['='],

    tokenizer: {
      root: [[/{{Infobox/, 'metatag', '@doctype']],

      doctype: [
        [/[^|]*$/, 'string'],
        [/\|[^=]+/, 'variable', '@field'],
        [/\|[^=]+/, 'variable', '@field'],
        [/}}/, { token: 'metatag', next: '@pop' }],
      ],

      field: [
        [/=/, { token: 'delimiter' }],
        [/{/, 'delimiter', '@array'],
        [/[^{n]+/, { token: 'string', next: '@pop' }],
      ],

      array: [
        [/\[/, { token: 'delimiter', next: '@arrayItem' }],
        [/}/, { token: '@rematch', next: '@doctype' }],
      ],

      // `日文名|ワンピース]`
      // `航海王]`
      arrayItem: [
        [/(.+)(\|)([^\]]*)/, ['identify', 'delimiter', 'string']],
        [/[^\]]+/, { token: 'string' }],
        [/]$/, { token: 'delimiter', next: '@pop' }],
      ],
    },
  });

  monaco.editor.defineTheme('wiki', {
    base: 'vs',
    rules: [
      { token: 'delimiter', forground: 'red' },
      { token: 'operator', forground: 'grey' },
      { token: 'variable', forground: 'yellow' },
    ],
  });

  const editor = monaco.editor.create(document.getElementById('container'), {
    value: infobox.trim(),
    language: 'wiki',
    wordWrap: 'on',
    minimap: {
      enabled: false,
    },
  });

  $('#submit').on('click', async () => {
    const res = await fetch('/p1/wiki/subjects/184017', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        commitMessage: $('#commitMessage').val(),
        subject: {
          infobox: editor.getValue(),
        },
      }),
    });

    if (!res.ok) {
      alert(await res.text());
    }
  });
});
