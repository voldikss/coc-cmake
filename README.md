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
  "description": "The path to CMake generator executable"
},
"cmake.formatter": {
  "type": "string",
  "default": "cmake-format",
  "description": "The path to [cmake-format](https://github.com/cheshirekow/cmake_format)"
}
```

## References

- [vs.language.cmake](https://github.com/twxs/vs.language.cmake)
- [cmake-format](https://github.com/cheshirekow/cmake_format)

## License

MIT
