# AI Translate Placement (aiplacement_translate)

An AI placement plugin for [Moodle](https://moodle.org/) that adds on-page translation powered by the Moodle AI subsystem.

When viewing an activity that has AI features enabled, a **Translate** button appears inside the existing Course Assist controls. Clicking it opens a side drawer where the user can pick a target language; the page content is then sent to the configured AI provider and the translated text is displayed in the drawer.

## Requirements

| Requirement | Version |
|---|---|
| Moodle | 5.1+ (2025100600) |
| PHP | 8.1+ |
| `aiplacement_courseassist` | Any version (ships with Moodle core) |
| At least one AI provider configured with the **Generate text** action enabled | — |

> **Note:** The `public/ai/placement/` directory structure and the AI subsystem hooks used by this plugin were introduced in Moodle 5.1. On Moodle 5.2+ the plugin additionally respects the `get_ai_visibility_hint()` page-level toggle.

## Installation

### Using git

```bash
cd /path/to/moodle/ai/placement
git clone https://github.com/guillogo/moodle-aiplacement_translate.git translate
```

### Manual download

1. Download the latest release from [GitHub](https://github.com/guillogo/moodle-aiplacement_translate).
2. Extract the archive into `ai/placement/translate` inside your Moodle directory.

### Finish installation

1. Log in as a site administrator.
2. Navigate to **Site administration → Notifications** to trigger the upgrade.
3. Go to **Site administration → AI → AI placement: Translate** and enable the plugin.
4. Make sure at least one AI provider is configured and the **Generate text** action is enabled for the translate placement.

## How it works

The plugin hooks into Moodle's AI subsystem using the existing `generate_text` action — the same action that powers Summarise and Explain in Course Assist. No new AI action type is needed; translation is achieved by wrapping the page text in a translation prompt before sending it to the provider.

### Architecture

```
aiplacement_translate/
├── amd/
│   ├── build/
│   │   └── placement.min.js          # Minified AMD module
│   └── src/
│       └── placement.js              # Front-end controller (drawer, language picker, AJAX)
├── classes/
│   ├── external/
│   │   └── translate_text.php        # Web service: translate text via AI
│   ├── output/
│   │   └── translate_ui.php          # Hook handler: injects drawer & button into pages
│   ├── privacy/
│   │   └── provider.php              # Privacy API (null provider)
│   ├── hook_callbacks.php            # Hook callback dispatcher
│   ├── placement.php                 # Placement class (extends courseassist)
│   └── utils.php                     # Availability checks & language helpers
├── db/
│   ├── access.php                    # Capability: aiplacement/translate:use
│   ├── hooks.php                     # Hook registrations
│   └── services.php                  # Web service definitions
├── lang/
│   └── en/
│       └── aiplacement_translate.php # English strings
├── templates/
│   ├── action_button.mustache        # Translate button (dropdown item or standalone)
│   └── drawer.mustache               # Side drawer with language picker
├── styles.css                        # Drawer positioning & transitions
├── version.php                       # Plugin metadata
└── README.md
```

### Supported languages

Arabic, Basque, Catalan, Chinese, Dutch, English, French, Galician, German, Italian, Japanese, Korean, Polish, Portuguese, Russian, and Spanish.

Additional languages can be added by extending the language list in `classes/utils.php` and the corresponding strings in `lang/en/aiplacement_translate.php`.

## Capabilities

| Capability | Default roles | Description |
|---|---|---|
| `aiplacement/translate:use` | Manager, Editing teacher, Teacher, Student | Allows use of AI translation on activity pages |

## Privacy

This plugin does not store any personal data. All AI requests are processed through Moodle's core AI subsystem, which handles its own data retention policies.

## License

This plugin is licensed under the [GNU General Public License v3.0 or later](https://www.gnu.org/copyleft/gpl.html).

Copyright © 2026 Guillermo Gomez Arias <guigomar@gmail.com>

