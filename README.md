# coc-cmake

coc.nvim extension for cmake language.

![](https://user-images.githubusercontent.com/20282795/75767012-06869580-5d7d-11ea-9e89-8b8f173eed96.png)
![](https://user-images.githubusercontent.com/20282795/75767017-07b7c280-5d7d-11ea-900b-11eac5213b82.png)

## Features

- Code completion
- Code formatting
- Hover documentation
- Online document help

## Install

```
:CocInstall coc-cmake
```

## Commands

- `:CocCommand cmake.onlineHelp`

## Configuration

```jsonc
"cmake.cmakePath": {
  "type": "string",
  "default": "cmake",
  "description": "Path to CMake generator executable"
},
"cmake.formatter": {
  "type": "string",
  "default": "cmake-format",
  "description": "Path to [cmake-format](https://github.com/cheshirekow/cmake_format)"
},
"cmake.lsp.enable": {
  "type": "boolean",
  "default": false,
  "description": "Enable language server(https://github.com/regen100/cmake-language-server), Notice that the functionality(completion, formatting, etc.) of lsp and extension builtin can not coexist"
},
"cmake.lsp.serverPath": {
  "type": "string",
  "default": "cmake-language-server",
  "description": "Path to [cmake-language-server](https://github.com/regen100/cmake-language-server)"
},
"cmake.lsp.buildDirectory": {
  "type": "string",
  "default": "build",
  "description": "See https://github.com/regen100/cmake-language-server#configuration"
}
```

## References

- [vs.language.cmake](https://github.com/twxs/vs.language.cmake)
- [cmake-format](https://github.com/cheshirekow/cmake_format)
- [cmake-language-server](https://github.com/regen100/cmake-language-server)

## License

MIT
