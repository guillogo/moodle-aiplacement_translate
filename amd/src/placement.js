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
 * @copyright  2026 Moodle Pty Ltd
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
        this._listen();
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
            return;
        }).catch(Notification.exception);
    }

    async _translate(lang) {
        this.cancelled = false;
        // Show loading — reuse courseassist template.
        const loadingHtml = await Templates.render('aiplacement_courseassist/loading', {});
        this.result.innerHTML = loadingHtml;
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
                this._showError(res.error, res.errormessage);
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
        const html = await Templates.render('aiplacement_courseassist/response', {content, heading, action: 'translate_text'});
        this.result.innerHTML = html;

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
        const html = await Templates.render('aiplacement_courseassist/error', {error, errorMessage: msg});
        this.result.innerHTML = html;
    }

    _getPageText() {
        const el = document.querySelector(SEL.MAIN);
        return el?.innerText || el?.textContent || '';
    }
};

export default AITranslate;

