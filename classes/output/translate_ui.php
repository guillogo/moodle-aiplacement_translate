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

namespace aiplacement_translate\output;

use aiplacement_translate\utils;
use core\hook\output\after_http_headers;
use core\hook\output\before_footer_html_generation;
use core_ai\aiactions\generate_text;
use core_ai\manager;

/**
 * Injects the translate button and drawer into activity pages.
 *
 * @package    aiplacement_translate
 * @copyright  2026 Guillermo Gomez Arias <guigomar@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class translate_ui {

    /**
     * Inject the translate drawer (language picker and response area).
     *
     * @param before_footer_html_generation $hook The hook instance.
     */
    public static function load_translate_ui(before_footer_html_generation $hook): void {
        global $PAGE, $OUTPUT, $USER;

        if (!self::preflight_checks()) {
            return;
        }

        $params = [
            'userid' => $USER->id,
            'contextid' => $PAGE->context->id,
            'languages' => utils::get_target_languages(),
        ];
        $hook->add_html($OUTPUT->render_from_template('aiplacement_translate/drawer', $params));
    }

    /**
     * Prepare the translate control integration.
     *
     * We do not render a separate visible button here because that leads to a
     * duplicate control beside the course assist UI. The front-end code injects
     * the translate action into the existing course assist control when present,
     * with a fallback if course assist controls are unavailable.
     *
     * @param after_http_headers $hook The hook instance.
     */
    public static function action_buttons_handler(after_http_headers $hook): void {
        global $PAGE;

        if (!self::preflight_checks()) {
            return;
        }

        $context = $PAGE->context;
        if (!has_capability('aiplacement/translate:use', $context)) {
            return;
        }

        $manager = \core\di::get(manager::class);
        if (!$manager->is_action_available(generate_text::class)) {
            return;
        }

        // Intentionally no HTML output here.
        // The drawer template bootstraps the JS module, which merges the
        // translate action into the existing AI features control.
    }

    /**
     * Common preflight checks (mirrors courseassist logic).
     *
     * @return bool True if all checks pass.
     */
    private static function preflight_checks(): bool {
        global $DB, $PAGE;

        if (during_initial_install()) {
            return false;
        }

        if (!get_config('aiplacement_translate', 'version')) {
            return false;
        }

        // Bail out if the plugin capabilities have not been registered yet (pre-upgrade).
        if (!$DB->record_exists('capabilities', ['name' => 'aiplacement/translate:use'])) {
            return false;
        }

        if (in_array($PAGE->pagelayout, ['maintenance', 'print', 'redirect', 'embedded'])) {
            return false;
        }

        if ($PAGE->context->contextlevel != CONTEXT_MODULE) {
            return false;
        }

        if (!$PAGE->get_ai_visibility_hint()) {
            return false;
        }

        return utils::is_translate_available();
    }
}

