# ![icon](https://raw.githubusercontent.com/savioserra/vs-theme-switcher/master/assets/icon.png) Theme Switcher

This extension enables you to define which time which theme should be activated!

![preview](https://raw.githubusercontent.com/savioserra/vs-theme-switcher/master/assets/preview.gif)

## How To Setup Themes

For the extension to work, the only thing you need to do is to set in your VSCode settings the mappings you want, like this:

```
"themeswitcher.utcOffset": -3, // Example
"themeswitcher.mappings": [
    {
        "time": "13:03",
        "theme": "Material Theme",
    },
    {
        "time": "12:04",
        "theme": "Monokai",
    },
    {
        "time": "00:53",
        "theme": "Default Dark+",
    },
    ...
],
```

## Extension Settings

This extension contributes the following settings:

- `themeswitcher.mappings`: Array of mappings
- `themeswitcher.utcOffset`: The utc offset used to scheduling tasks.

## Credits

- Icon made by [Pixel Perfect](https://www.flaticon.com/br/autores/pixel-perfect) from [www.flaticon.com](https://www.flaticon.com)

**Enjoy!**
