# coc-cmake

![publish](https://github.com/voldikss/coc-cmake/workflows/publish/badge.svg)
[![npm version](https://badge.fury.io/js/coc-cmake.svg)](https://badge.fury.io/js/coc-cmake)

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

<!-- Generated by 'yarn run bulid:doc', please don't edit it directly -->
<!-- prettier-ignore-start -->
<strong>Properties</strong>
<details>
<summary><code>cmake.cmakePath</code>: Path to CMake generator executable.</summary>
Type: <pre><code>string</code></pre>Default: <pre><code>"cmake"</code></pre>
</details>
<details>
<summary><code>cmake.formatter</code>: Path to [cmake-format](https://github.com/cheshirekow/cmake_format).</summary>
Type: <pre><code>string</code></pre>Default: <pre><code>"cmake-format"</code></pre>
</details>
<details>
<summary><code>cmake.formatter_args</code>: Additional arguments to be passed down to the formatter.</summary>
Type: <pre><code>string[]</code></pre>Default: <pre><code>[]</code></pre>
</details>
<details>
<summary><code>cmake.lsp.enable</code>: Enable language server(https://github.com/regen100/cmake-language-server), Notice that the functionality(completion, formatting, etc.) of lsp and extension builtin can not coexist.</summary>
Type: <pre><code>boolean</code></pre>Default: <pre><code>false</code></pre>
</details>
<details>
<summary><code>cmake.lsp.serverPath</code>: Path to [cmake-language-server](https://github.com/regen100/cmake-language-server).</summary>
Type: <pre><code>string</code></pre>Default: <pre><code>"cmake-language-server"</code></pre>
</details>
<details>
<summary><code>cmake.lsp.buildDirectory</code>: See https://github.com/regen100/cmake-language-server#configuration.</summary>
Type: <pre><code>string</code></pre>Default: <pre><code>"build"</code></pre>
</details>

<!-- prettier-ignore-end -->

## References

- [vs.language.cmake](https://github.com/twxs/vs.language.cmake)
- [cmake-format](https://github.com/cheshirekow/cmake_format)
- [cmake-language-server](https://github.com/regen100/cmake-language-server)

## License

MIT
