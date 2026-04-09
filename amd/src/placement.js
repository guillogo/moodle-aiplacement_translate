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

/**
 * AI Translate placement – front-end controller.
 *
 * @module     aiplacement_translate/placement
 * @copyright  2026 Guillermo Gomez Arias <guigomar@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import Ajax from 'core/ajax';
import 'core/copy_to_clipboard';
import Notification from 'core/notification';
import Policy from 'core_ai/policy';
import AIHelper from 'core_ai/helper';
import {getString} from 'core/str';

const SEL = {
    DRAWER: '#ai-translate-drawer',
    CLOSE: '#ai-translate-close',
    BODY: '#ai-translate-body',
    RESULT: '#ai-translate-result',
    LANG: '#ai-translate-lang',
    BTN: '.ai-translate-btn',
    PAGE: '#page',
    MAIN: '[role="main"]',
    COURSEASSIST_CONTROLS: '.course-assist-controls',
    COURSEASSIST_DROPDOWN: '.course-assist-controls .dropdown-menu',
    COURSEASSIST_JUMPTO: '.course-assist-controls [data-region="jumpto"]',
};

const AITranslate = class {
    constructor(userId, contextId) {
        this.userId = userId;
        this.contextId = contextId;
        this.drawer = document.querySelector(SEL.DRAWER);
        this.result = document.querySelector(SEL.RESULT);
        this.langSelect = document.querySelector(SEL.LANG);
        this.page = document.querySelector(SEL.PAGE);
        this.cancelled = false;
        this._injectTrigger().finally(() => {
            this._listen();
        });
    }

    async _injectTrigger() {
        if (document.querySelector(SEL.BTN)) {
            return;
        }

        const dropdownMenu = document.querySelector(SEL.COURSEASSIST_DROPDOWN);
        if (dropdownMenu) {
            const html = await Templates.render('aiplacement_translate/action_button', {isdropdown: true});
            dropdownMenu.insertAdjacentHTML('beforeend', html);
            return;
        }

        const controls = document.querySelector(SEL.COURSEASSIST_CONTROLS);
        if (controls) {
            const html = await Templates.render('aiplacement_translate/action_button', {});
            const jumpto = controls.querySelector(SEL.COURSEASSIST_JUMPTO);
            if (jumpto) {
                jumpto.insertAdjacentHTML('beforebegin', html);
            } else {
                controls.insertAdjacentHTML('afterbegin', html);
            }
            return;
        }

        // Fallback: if the course assist controls are unavailable for some reason,
        // insert a standalone button before the main region.
        const main = document.querySelector(SEL.MAIN);
        if (main) {
            const html = await Templates.render('aiplacement_translate/action_button', {});
            main.insertAdjacentHTML('beforebegin', '<div class="translate-controls py-3">' + html + '</div>');
        }
    }

    _listen() {
        // Open drawer on button click.
        document.addEventListener('click', async(e) => {
            if (e.target.closest(SEL.BTN)) {
                e.preventDefault();
                this._open();
            }
            if (e.target.closest(SEL.CLOSE)) {
                e.preventDefault();
                this._close();
            }
        });

        // Language change → translate.
        this.langSelect?.addEventListener('change', async() => {
            const lang = this.langSelect.value;
            if (!lang) {
                return;
            }
            const ok = await Policy.getPolicyStatus(this.userId);
            if (!ok) {
                this._showPolicy(lang);
                return;
            }
            this._translate(lang);
        });

        // Escape closes.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.drawer.classList.contains('show')) {
                this._close();
            }
        });
    }

    _open() {
        this.drawer.classList.add('show');
        if (!this.page.classList.contains('show-drawer-right')) {
            this.page.classList.add('show-drawer-right');
            this.drawer.dataset.removepadding = '1';
        }
    }

    _close() {
        this.drawer.classList.remove('show');
        if (this.drawer.dataset.removepadding === '1') {
            this.page.classList.remove('show-drawer-right');
            this.drawer.dataset.removepadding = '0';
        }
    }

    _showPolicy(lang) {
        Templates.render('core_ai/policyblock', {}).then((html) => {
            this.result.innerHTML = html;
            const accept = this.result.querySelector('[data-action="accept"]');
            const decline = this.result.querySelector('[data-action="decline"]');
            accept?.addEventListener('click', (e) => {
                e.preventDefault();
                Policy.acceptPolicy().then(() => this._translate(lang)).catch(Notification.exception);
            });
            decline?.addEventListener('click', (e) => {
                e.preventDefault();
                this._close();
            });
        }).catch(Notification.exception);
    }

    async _translate(lang) {
        this.cancelled = false;
        // Show loading — reuse courseassist template.
        this.result.innerHTML = await Templates.render('aiplacement_courseassist/loading', {});
        const cancelBtn = this.result.querySelector('[data-action="cancel"]');
        cancelBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.cancelled = true;
            this.result.innerHTML = '';
        });

        // Call web service.
        const request = {
            methodname: 'aiplacement_translate_translate_text',
            args: {
                contextid: this.contextId,
                prompttext: this._getPageText(),
                targetlanguage: lang,
            },
        };

        try {
            const res = await Ajax.call([request])[0];
            if (this.cancelled) {
                return;
            }
            if (res.error) {
                this._showError(res.error);
                return;
            }
            const content = AIHelper.formatResponse(res.generatedcontent);
            this._showResponse(content, lang);
        } catch (err) {
            window.console.error(err);
            this._showError();
        }
    }

    async _showResponse(content, lang) {
        const opt = this.langSelect.querySelector('option[value="' + lang + '"]');
        const langName = opt ? opt.textContent : lang;
        const heading = await getString('aitranslation', 'aiplacement_translate', langName);
        // Reuse courseassist response template.
        this.result.innerHTML = await Templates.render('aiplacement_courseassist/response', {
            content,
            heading,
            action: 'translate_text',
        });

        // Regenerate.
        this.result.querySelector('[data-action="regenerate"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this._translate(lang);
        });
    }

    async _showError(error = '', msg = '') {
        if (!error) {
            error = await getString('error:defaultname', 'core_ai');
            msg = await getString('error:defaultmessage', 'core_ai');
        }
        // Reuse courseassist error template.
        this.result.innerHTML = await Templates.render('aiplacement_courseassist/error', {
            error,
            errorMessage: msg,
        });
    }

    _getPageText() {
        const el = document.querySelector(SEL.MAIN);
        return el?.innerText || el?.textContent || '';
    }
};

export default AITranslate;

