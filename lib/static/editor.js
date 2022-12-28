/* eslint-env jquery */

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

  const editor = monaco.editor.create(document.getElementById('infobox'), {
    value: infobox,
    language: 'wiki',
    wordWrap: 'on',
    minimap: {
      enabled: false,
    },
  });

  $('#submit').on('click', async () => {
    const res = await fetch(`/p1/wiki/subjects/${subjectID}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        commitMessage: $('#commitMessage').val(),
        subject: {
          name: $('#name').val(),
          date: $('#date').val() || undefined,
          infobox: editor.getValue(),
          platform: Number.parseInt($('input[name="platform"]:checked').val()) || 0,
          summary: $('#summary').val(),
        },
      }),
    });

    if (!res.ok) {
      alert(JSON.stringify(await res.json(), null, 2));
    } else {
      location.href = `https://bgm.tv/subject/${subjectID}`;
    }
  });
});
