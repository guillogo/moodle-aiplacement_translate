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

namespace aiplacement_translate\external;

use aiplacement_translate\utils;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;

/**
 * External API to translate text via the AI subsystem.
 *
 * @package    aiplacement_translate
 * @copyright  2026 Guillermo Gomez Arias <guigomar@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class translate_text extends external_api {

    /**
     * Translate text parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(
                PARAM_INT,
                'The context ID',
                VALUE_REQUIRED,
            ),
            'prompttext' => new external_value(
                PARAM_RAW,
                'The text to translate',
                VALUE_REQUIRED,
            ),
            'targetlanguage' => new external_value(
                PARAM_ALPHAEXT,
                'Target language code e.g. es, fr',
                VALUE_REQUIRED,
            ),
        ]);
    }

    /**
     * Translate text from the AI placement.
     *
     * @param int $contextid The context ID.
     * @param string $prompttext The text to translate.
     * @param string $targetlanguage The target language code.
     * @return array The generated content.
     */
    public static function execute(
        int $contextid,
        string $prompttext,
        string $targetlanguage,
    ): array {
        global $USER;

        // Parameter validation.
        [
            'contextid' => $contextid,
            'prompttext' => $prompttext,
            'targetlanguage' => $targetlanguage,
        ] = self::validate_parameters(self::execute_parameters(), [
            'contextid' => $contextid,
            'prompttext' => $prompttext,
            'targetlanguage' => $targetlanguage,
        ]);

        // Context validation and permission check.
        $context = \context::instance_by_id($contextid);
        self::validate_context($context);
        require_capability('aiplacement/translate:use', $context);

        // Check if AI Placement translate is available.
        if (!utils::is_translate_available()) {
            throw new \moodle_exception('notavailable', 'aiplacement_translate');
        }

        // Build a translation prompt that wraps the original text.
        $langname = utils::get_language_name($targetlanguage);
        $translationprompt = "Translate the following text into {$langname}. "
            . "Return only the translated text. Do not add any commentary, greetings, or markdown formatting.\n\n"
            . $prompttext;

        // Prepare the action.
        $action = new \core_ai\aiactions\generate_text(
            contextid: $contextid,
            userid: $USER->id,
            prompttext: $translationprompt,
        );

        // Send the action to the AI manager.
        $manager = \core\di::get(\core_ai\manager::class);
        $response = $manager->process_action($action);
        $generatedcontent = $response->get_response_data()['generatedcontent'] ?? '';

        // Return the response.
        return [
            'success' => $response->get_success(),
            'generatedcontent' => \core_external\util::format_text($generatedcontent, FORMAT_PLAIN, $contextid)[0],
            'finishreason' => $response->get_response_data()['finishreason'] ?? '',
            'errorcode' => $response->get_errorcode(),
            'error' => $response->get_errormessage(),
            'timecreated' => $response->get_timecreated(),
        ];
    }

    /**
     * Translate text return value.
     *
     * @return external_function_parameters
     */
    public static function execute_returns(): external_function_parameters {
        return new external_function_parameters([
            'success' => new external_value(
                PARAM_BOOL,
                'Was the request successful',
                VALUE_REQUIRED,
            ),
            'timecreated' => new external_value(
                PARAM_INT,
                'The time the request was created',
                VALUE_REQUIRED,
            ),
            'generatedcontent' => new external_value(
                PARAM_RAW,
                'The text generated by AI.',
                VALUE_DEFAULT,
            ),
            'finishreason' => new external_value(
                PARAM_ALPHAEXT,
                'The reason generation was stopped',
                VALUE_DEFAULT,
                'stop',
            ),
            'errorcode' => new external_value(
                PARAM_INT,
                'Error code if any',
                VALUE_DEFAULT,
                0,
            ),
            'error' => new external_value(
                PARAM_TEXT,
                'Error message if any',
                VALUE_DEFAULT,
                '',
            ),
        ]);
    }
}

