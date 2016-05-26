import Consts from 'common/consts'

class ButtonsController {
  constructor () {
    this._initMutationObserver();

    this._startObserving(true);
  }

  get _isListPage () {
    if (typeof this.__isListPage === 'undefined') {
      this.__isListPage = !Consts.TRACK_PAGE_RE.test(window.location.href);
    }
    return this.__isListPage;
  }

  _initMutationObserver () {
    this._observer = new MutationObserver((records) =>  {
      console.log('MO HANDLER', 'started', Array.from(arguments));

      if (records.every(r => r.addedNodes.length === 0)) {
        console.log('NO added nodes. Terminating!');
        return;
      }

      this._observer.disconnect();

      this._createButtons();
      this._startObserving();
    });
  }

  _startObserving () {
    this._observer.disconnect();

    let observedNode = document.querySelector('.stream__list,.l-content') || document;

    this._observer.observe(observedNode, { subtree: true, childList: true });
  }

  _createButtonsOnElem (elem) {
    console.log('Creating button on elem', elem);

    elem.dataset.sthy = true;

    let container = elem.querySelector('.sc-button-group');
    const size = this._isListPage ? 'small' : 'medium';
    container.appendChild(this._createButtonNode({ action: 'play', text: 'Slay', size }));
    container.appendChild(this._createButtonNode({ action: 'store', text: 'Store', size }));
  }

  _createButtonNode ({ action, text, size }) {
    const button = document.createElement('button');
    button.innerHTML = text;
    button.classList.add('sthy-button', 'sc-button', `sc-button-${size}`, 'sc-button-responsive');
    button.dataset['action'] = action;

    button.addEventListener('click', this, true);

    return button;
  }

  _createButtons () {
    const selectorPrefix = ':not([data-sthy])';

    let elements = this._isListPage
      ? document.querySelectorAll(`.soundList__item${selectorPrefix}`)
      : document.querySelectorAll(`.l-listen-wrapper${selectorPrefix}`);

    [...elements].forEach((elem) => this._createButtonsOnElem(elem));
  }

  handleEvent (evt) {
    evt.preventDefault();
    evt.stopPropagation();

    const action = evt.target.dataset.action;
    const container = evt.target.closest('.soundList__item');

    console.log(`Action '${action}' clicked`);

    switch (action) {
      case 'play':
        const url = this._isListPage ?
          container.querySelector('.sound__coverArt').getAttribute('href') :
          window.location.href;

        this._sendCommand(action, { url });

        break;

      case 'store':
        break;
    }
  }

  _sendCommand (command, data) {
    if (!chrome.runtime) {
      window.location.reload();
    }

    chrome.runtime.sendMessage({ command, data }, (response) => {});
  }
}

class PageLifecycleChecked {
  constructor () {
    this._bindEvents();
  }

  _bindEvents () {
    document.addEventListener('DOMContentLoaded', () => this._sendLifecycleEvent('content-loaded') );
    window.onload = () => this._sendLifecycleEvent('window-loaded');
  }

  _sendLifecycleEvent (event) {
    if (!chrome.runtime) {
      window.location.reload();
    }

    console.log(`Lifecycle event '${event}'`);

    chrome.runtime.sendMessage({ command: 'lifecycle', data: { event }});
  }
}

console.log('CONTENT STARTED!!!');

new ButtonsController;
new PageLifecycleChecked;


