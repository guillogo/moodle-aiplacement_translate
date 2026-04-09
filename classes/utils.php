<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace aiplacement_translate;

use core_ai\aiactions\generate_text;
use core_ai\manager;

/**
 * AI Placement translate utils.
 *
 * @package    aiplacement_translate
 * @copyright  2026 Guillermo Gomez Arias <guigomar@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class utils {

    /**
     * Check if the translate placement is usable.
     *
     * @return bool True if translate placement is available, false otherwise.
     */
    public static function is_translate_available(): bool {
        // Check our own plugin is enabled.
        [$plugintype, $pluginname] = explode(
            '_',
            \core_component::normalize_componentname('aiplacement_translate'),
            2,
        );
        $pluginmanager = \core_plugin_manager::resolve_plugininfo_class($plugintype);
        if (!$pluginmanager::is_plugin_enabled($pluginname)) {
            return false;
        }

        // At least one provider must support generate_text.
        return manager::is_action_available(generate_text::class);
    }

    /**
     * Get target languages offered in the UI.
     *
     * @return array Array of ['code' => 'es', 'name' => 'Spanish'] items.
     */
    public static function get_target_languages(): array {
        $codes = [
            'ar', 'ca', 'de', 'en', 'es', 'eu', 'fr', 'gl',
            'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'zh',
        ];
        $result = [];
        foreach ($codes as $code) {
            $result[] = [
                'code' => $code,
                'name' => get_string('lang_' . $code, 'aiplacement_translate'),
            ];
        }
        return $result;
    }

    /**
     * Resolve a language code to its display name.
     *
     * @param string $code The language code.
     * @return string The display name for the language.
     */
    public static function get_language_name(string $code): string {
        $key = 'lang_' . $code;
        if (get_string_manager()->string_exists($key, 'aiplacement_translate')) {
            return get_string($key, 'aiplacement_translate');
        }
        return $code;
    }
}

