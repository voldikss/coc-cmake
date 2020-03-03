import {
  workspace,
  languages,
  ExtensionContext,
  commands,
  CompletionItemProvider,
  HoverProvider,
} from 'coc.nvim'
import {
  DocumentSelector,
  Position,
  TextDocument,
  Hover,
  InsertTextFormat,
  CompletionItem,
  MarkupKind,
  CompletionItemKind
} from 'vscode-languageserver-protocol'
import child_process = require("child_process")

export function activate(_context: ExtensionContext): void {
  const CMAKE_LANGUAGE = 'cmake'
  const CMAKE_SELECTOR: DocumentSelector = [
    { language: CMAKE_LANGUAGE, scheme: 'file' },
    { language: CMAKE_LANGUAGE, scheme: 'untitled' },
  ]

  commands.registerCommand(
    'cmake.onlineHelp',
    async () => await onLineHelp()
  )

  languages.registerHoverProvider(
    CMAKE_SELECTOR,
    new CMakeExtraInfoProvider()
  )

  languages.registerCompletionItemProvider(
    'coc-cmake',
    'CMAKE',
    'cmake',
    new CMakeCompletionProvider(),
    [],
    [],
    config<number>('priority')
  )
}

class CMakeCompletionProvider implements CompletionItemProvider {
  public async provideCompletionItems(
    // tslint:disable-next-line: deprecation
    document: TextDocument,
    position: Position
  ): Promise<CompletionItem[]> {
    const doc = workspace.getDocument(document.uri)
    if (!doc) return []
    const wordRange = doc.getWordRangeAtPosition(Position.create(position.line, position.character - 1))
    if (!wordRange) return []
    const text = document.getText(wordRange)

    return new Promise((resolve, reject) => {
      Promise.all([
        cmCommandsSuggestions(text),
        cmVariablesSuggestions(text),
        cmPropertiesSuggestions(text),
        cmModulesSuggestions(text)
      ]).then(results => {
        let suggestions = Array.prototype.concat.apply([], results)
        resolve(suggestions)
      }).catch(err => { reject(err) })
    })
  }

  public resolveCompletionItem(item: CompletionItem): Thenable<CompletionItem> {
    let promises = cmake_help_all()
    let type = cmakeTypeFromComplKind(item.kind)
    return promises[type](item.label).then((result: string) => {
      item.documentation = result.split('\n')[3]
      return item
    })
  }
}

// Show Tooltip on mouse over
class CMakeExtraInfoProvider implements HoverProvider {

  public async provideHover(document, position): Promise<Hover | null> {
    const doc = workspace.getDocument(document.uri)
    if (!doc) return null
    const wordRange = doc.getWordRangeAtPosition(position)
    if (!wordRange) return null
    const text = document.getText(wordRange) || ''
    if (!text) { return null }
    let promises = cmake_help_all()

    return Promise.all([
      cmCommandsSuggestionsExact(text),
      cmVariablesSuggestionsExact(text),
      cmModulesSuggestionsExact(text),
      cmPropertiesSuggestionsExact(text),
    ]).then(results => {
      let suggestions = Array.prototype.concat.apply([], results)
      if (suggestions.length == 0) {
        return null
      }
      let suggestion: CompletionItem = suggestions[0]

      return promises[cmakeTypeFromComplKind(suggestion.kind)](suggestion.label).then((result: string) => {
        let lines = result.split('\n')
        lines = lines.slice(2, lines.length)
        let hover: Hover = {
          contents: {
            kind: MarkupKind.Markdown,
            value: lines.join('\n')
          }
        }
        return hover
      })
    })
  }
}

async function onLineHelp(): Promise<void> {
  let document = await workspace.document
  let position = await workspace.getCursorPosition()
  let range = document.getWordRangeAtPosition(position)
  let currentWord = document.textDocument.getText(range)

  if (range && range.start.character < position.character) {
    let word = document.textDocument.getText(range)
    currentWord = word
  }

  let result = await workspace.requestInput('Search on Cmake online documentation', currentWord)
  if (result != null) {
    if (result.length === 0) {
      result = currentWord
    }
    if (result != "") {
      await cmake_online_help(result)
    }
  }
}

/// strings Helpers
function strContains(word, pattern): boolean {
  return word.indexOf(pattern) > -1
}

function strEquals(word, pattern): boolean {
  return word == pattern
}

/// configuration helpers
function config<T>(key: string, defaultValue?: any): T {
  const cmake_conf = workspace.getConfiguration('cmake')
  return cmake_conf.get<T>(key, defaultValue)
}

// copied from https://stackoverflow.com/questions/13796594/how-to-split-string-into-arguments-and-options-in-javascript
function commandArgs2Array(text: string): string[] {
  const re = /^"[^"]*"$/ // Check if argument is surrounded with double-quotes
  const re2 = /^([^"]|[^"].*?[^"])$/ // Check if argument is NOT surrounded with double-quotes

  let arr = []
  let argPart = null

  // tslint:disable-next-line: no-unused-expression
  text && text.split(" ").forEach(arg => {
    if ((re.test(arg) || re2.test(arg)) && !argPart) {
      arr.push(arg)
    } else {
      argPart = argPart ? argPart + " " + arg : arg
      // If part is complete (ends with a double quote), we can add it to the array
      if (/"$/.test(argPart)) {
        arr.push(argPart)
        argPart = null
      }
    }
  })
  return arr
}

// Simple helper function that invoke the CMAKE executable
// and return a promise with stdout
async function cmake(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let cmake_config = config<string>('cmakePath', 'cmake')
    let cmake_args = commandArgs2Array(cmake_config)
    let cmd = child_process.spawn(cmake_args[0], cmake_args.slice(1, cmake_args.length)
      .concat(args.map(arg => arg.replace(/\r/gm, ''))))
    let stdout = ''
    cmd.stdout.on('data', data => {
      let txt: string = data.toString()
      stdout += txt.replace(/\r/gm, '')
    })
    cmd.on("error", error => {
      if (error && (error as any).code === 'ENOENT') {
        workspace.showMessage('The "cmake" command is not found in PATH.  Install it or use `cmake.cmakePath` in the workspace settings to define the CMake executable binary.', 'error')
      }
      reject()
    })
    cmd.on('exit', _code => resolve(stdout))
  })
}

function _extractVersion(output: string): string {
  let re = /cmake\s+version\s+(\d+.\d+.\d+)/
  if (re.test(output)) {
    let result = re.exec(output)
    return result[1]
  }
  return ''
}

async function cmake_version(): Promise<string> {
  let cmd_output = await cmake(['--version'])
  let version = _extractVersion(cmd_output)
  return version
}

// Return the url for the online help based on the cmake executable binary used
async function cmake_help_url(): Promise<string> {
  let base_url = 'https://cmake.org/cmake/help'
  let version = await cmake_version()
  if (version.length > 0) {
    if (version >= '3.0') {
      let re = /(\d+.\d+).\d+/
      version = version.replace(re, '$1/')
    } else {
      let older_versions = [
        '2.8.12',
        '2.8.11',
        '2.8.10',
        '2.8.9',
        '2.8.8',
        '2.8.7',
        '2.8.6',
        '2.8.5',
        '2.8.4',
        '2.8.3',
        '2.8.2',
        '2.8.1',
        '2.8.0',
        '2.6'
      ]
      if (older_versions.indexOf(version) == -1) {
        version = 'latest/'
      } else {
        version = version + '/cmake.html'
      }
    }
  } else {
    version = 'latest/'
  }
  return base_url + '/v' + version
}

// return the cmake command list
function cmake_help_command_list(): Promise<string> {
  return cmake(['--help-command-list'])
}

function cmake_help_command(name: string): Thenable<string> {
  return cmake_help_command_list()
    .then((result: string) => {
      let contains = result.indexOf(name) > -1
      return new Promise((resolve, reject) => {
        if (contains) {
          resolve(name)
        } else {
          reject('not found')
        }
      })
    }, _e => { })
    .then((n: string) => {
      return cmake(['--help-command', n])
    }, null)
}

function cmake_help_variable_list(): Promise<string> {
  return cmake(['--help-variable-list'])
}

function cmake_help_variable(name: string): Promise<string> {
  return cmake_help_variable_list()
    .then((result: string) => {
      let contains = result.indexOf(name) > -1
      return new Promise((resolve, reject) => {
        if (contains) {
          resolve(name)
        } else {
          reject('not found')
        }
      })
    }, _e => { }).then((name: string) => cmake(['--help-variable', name]), null)
}

function cmake_help_property_list(): Promise<string> {
  return cmake(['--help-property-list'])
}

function cmake_help_property(name: string): Promise<string> {
  return cmake_help_property_list()
    .then((result: string) => {
      let contains = result.indexOf(name) > -1
      return new Promise((resolve, reject) => {
        if (contains) {
          resolve(name)
        } else {
          reject('not found')
        }
      })
    }, _e => { }).then((name: string) => cmake(['--help-property', name]), null)
}

function cmake_help_module_list(): Promise<string> {
  return cmake(['--help-module-list'])
}

function cmake_help_module(name: string): Promise<string> {
  return cmake_help_module_list()
    .then((result: string) => {
      let contains = result.indexOf(name) > -1
      return new Promise((resolve, reject) => {
        if (contains) {
          resolve(name)
        } else {
          reject('not found')
        }
      })
    }, _e => { }).then((name: string) => cmake(['--help-module', name]), null)
}

function cmake_help_all(): any {
  let promises = {
    function: (name: string) => {
      return cmake_help_command(name)
    },
    module: (name: string) => {
      return cmake_help_module(name)
    },
    variable: (name: string) => {
      return cmake_help_variable(name)
    }
    ,
    property: (name: string) => {
      return cmake_help_property(name)
    }
  }
  return promises
}

async function cmake_online_help(search: string): Promise<void> {
  let url = await cmake_help_url()
  let v2x = url.endsWith('html') // cmake < 3.0
  return Promise.all([
    cmCommandsSuggestionsExact(search),
    cmVariablesSuggestionsExact(search),
    cmModulesSuggestionsExact(search),
    cmPropertiesSuggestionsExact(search),
  ]).then(results => {
    let opener = require("opener")

    let suggestions = Array.prototype.concat.apply([], results)

    if (suggestions.length == 0) {
      search = search.replace(/[<>]/g, '')
      if (v2x || search.length == 0) {
        opener(url)
      } else {
        opener(url + 'search.html?q=' + search + '&check_keywords=yes&area=default')
      }
    } else {
      let suggestion = suggestions[0]
      let type = cmakeTypeFromComplKind(suggestion.kind)
      if (type == 'property') {
        if (v2x) {
          opener(url)
        } else {
          // TODO : needs to filter properties per scope to detect the right URL
          opener(url + 'search.html?q=' + search + '&check_keywords=yes&area=default')
        }
      } else {
        if (type == 'function') {
          type = 'command'
        }
        search = search.replace(/[<>]/g, '')
        if (v2x) {
          opener(url + '#' + type + ':' + search)
        } else {
          opener(url + type + '/' + search + '.html')
        }
      }
    }
  })
}

function ComplKindFromCMakeCodeClass(kind: string): CompletionItemKind {
  switch (kind) {
    case "function":
      return CompletionItemKind.Function
    case "variable":
      return CompletionItemKind.Variable
    case "module":
      return CompletionItemKind.Module
  }
  return CompletionItemKind.Property // TODO@EG additional mappings needed?
}

function cmakeTypeFromComplKind(kind: CompletionItemKind): string {
  switch (kind) {
    case CompletionItemKind.Function:
      return "function"
    case CompletionItemKind.Variable:
      return "variable"
    case CompletionItemKind.Module:
      return "module"
  }
  return "property"
}

function suggestionsHelper(cmake_cmd, currentWord: string, type: string, insertText, matchPredicate): Thenable<CompletionItem[]> {
  return new Promise((resolve, reject) => {
    cmake_cmd.then((stdout: string) => {
      let commands = stdout.split('\n').filter(v => matchPredicate(v, currentWord))
      if (commands.length > 0) {
        let suggestions = commands.map(command_name => {
          let item = CompletionItem.create(command_name)
          item.kind = ComplKindFromCMakeCodeClass(type)
          if (insertText == null || insertText == '') {
            item.insertText = command_name
          } else {
            item.insertTextFormat = InsertTextFormat.Snippet
            item.insertText = insertText(command_name)
          }
          return item
        })
        resolve(suggestions)
      } else {
        resolve([])
      }
    }).catch(err => reject(err)
    )
  })
}

function cmModuleInsertText(module: string): string {
  if (module.indexOf('Find') == 0) {
    return 'find_package(' + module.replace('Find', '') + '${1: REQUIRED})'
  } else {
    return 'include(' + module + ')'
  }
}

function cmFunctionInsertText(func: string): string {
  let scoped_func = ['if', 'function', 'while', 'macro', 'foreach']
  let is_scoped = scoped_func.reduceRight((prev, name, _idx, _array) => prev || func == name, false)
  if (is_scoped) {
    return func + '(${1})\n\t\nend' + func + '(${1})\n'
  }
  else {
    return func + '(${1})'
  }
}

function cmVariableInsertText(variable: string): string {
  return variable.replace(/<(.*)>/g, '${1:<$1>}')
}

function cmPropetryInsertText(variable: string): string {
  return variable.replace(/<(.*)>/g, '${1:<$1>}')
}

function cmCommandsSuggestions(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_command_list()
  return suggestionsHelper(cmd, currentWord, 'function', cmFunctionInsertText, strContains)
}

function cmVariablesSuggestions(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_variable_list()
  return suggestionsHelper(cmd, currentWord, 'variable', cmVariableInsertText, strContains)
}

function cmPropertiesSuggestions(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_property_list()
  return suggestionsHelper(cmd, currentWord, 'property', cmPropetryInsertText, strContains)
}

function cmModulesSuggestions(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_module_list()
  return suggestionsHelper(cmd, currentWord, 'module', cmModuleInsertText, strContains)
}

function cmCommandsSuggestionsExact(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_command_list()
  return suggestionsHelper(cmd, currentWord, 'function', cmFunctionInsertText, strEquals)
}

function cmVariablesSuggestionsExact(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_variable_list()
  return suggestionsHelper(cmd, currentWord, 'variable', cmVariableInsertText, strEquals)
}

function cmPropertiesSuggestionsExact(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_property_list()
  return suggestionsHelper(cmd, currentWord, 'property', cmPropetryInsertText, strEquals)
}

function cmModulesSuggestionsExact(currentWord: string): Thenable<CompletionItem[]> {
  let cmd = cmake_help_module_list()
  return suggestionsHelper(cmd, currentWord, 'module', cmModuleInsertText, strEquals)
}
