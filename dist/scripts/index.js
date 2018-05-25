(function (global) {
    // Little Utils namespace
    var Utils = {
        querySelectorAllToArray: function (selector, scope) {
            if (scope === void 0) { scope = global.document; }
            return Array.prototype.slice.call(scope.querySelectorAll(selector) || []);
        }
    };
    // Could use a typescript class here but went for a module revealing pattern
    var API = (function () {
        // defaults & fixed values
        var apiKey = '9wur7sdh84azzazdt3ye54k4';
        var pageSize = 5;
        var initialPage = 1;
        var orderBy = 'newest';
        var showFields = 'trail-text,thumbnail';
        // Considered using fetch here with a polyfil but went old school for lightweight x-browser
        var apiRequest = function (section, onSuccess, onError) {
            var xhr;
            if (new XMLHttpRequest().withCredentials === undefined) {
                // Oh boy its been a while since I've been exposed to this!
                xhr = new XDomainRequest();
                xhr.onload = function () {
                    var parseResult = JSON.parse(xhr.responseText);
                    onSuccess(parseResult);
                };
                xhr.onerror = function () {
                    onError(xhr.responseText);
                };
            }
            else {
                xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        switch (xhr.status) {
                            case 200:
                                var parseResult = JSON.parse(xhr.responseText);
                                onSuccess(parseResult);
                                break;
                            default:
                                // possibly lots of cases here, just a general fall through for anything other than success
                                onError(xhr.responseText);
                        }
                        console.log(xhr.responseText);
                    }
                };
            }
            xhr.open('GET', "https://content.guardianapis.com/search?section=" + section + "&order-by=" + orderBy + "&show-fields=" + showFields + "&&page-size=" + pageSize + "&page=" + initialPage + "&api-key=" + apiKey, true);
            xhr.send();
        };
        var getRecentBySection = function (section, onSuccess, onError) {
            function mapSuccessResponse(response) {
                // just a little data mapper so the handler doesn't have as much to do.
                onSuccess(response.response.results);
            }
            apiRequest(section, mapSuccessResponse, onError);
        };
        return {
            getRecentBySection: getRecentBySection
        };
    })();
    /*
        Went for a typescript class here with a view that they could be multiple instances
        Essentially compiles down to an iffy that returns a function with all instance methods
        set on prototype (ie. NewsTabber.prototype.createTabForSection);
     */
    var NewsTabber = /** @class */ (function () {
        function NewsTabber(containerId) {
            this.tabs = [];
            this.panels = [];
            this.containerEl = document.getElementById(containerId);
            this.tabListContainer = this.buildTabListContainer();
            // these could be passed as config
            this.sections = [
                { name: 'UK News', key: 'uk-news' },
                { name: 'Football', key: 'football' },
                { name: 'Travel', key: 'travel' }
            ];
            var _a = this.buildTabber(), tabs = _a[0], panels = _a[1];
            this.tabs = tabs;
            this.panels = panels;
            this.render();
        }
        NewsTabber.prototype.buildTabListContainer = function () {
            var tabList = document.createElement('ul');
            tabList.className = 'tabber__list';
            return tabList;
        };
        NewsTabber.prototype.createTabForSection = function (section, active) {
            var tabListItem = document.createElement('li');
            var tabLink = document.createElement('a');
            tabLink.setAttribute('href', "#tab-section-" + section.key);
            tabLink.setAttribute('href', "tab-section-" + section.key);
            tabLink.setAttribute('aria-selected', active ? 'true' : 'false');
            tabLink.className = 'tabber__tab-link';
            tabLink.innerText = section.name;
            tabListItem.appendChild(tabLink);
            return tabListItem;
        };
        NewsTabber.prototype.createTabPanelForSection = function (section, active) {
            var tabPanel = document.createElement('div');
            tabPanel.className = 'tabber__panel';
            tabPanel.setAttribute('aria-hidden', active ? 'false' : 'true');
            tabPanel.setAttribute('aria-labeledby', "tab-section-" + section.key);
            tabPanel.innerHTML = 'Loading...';
            return tabPanel;
        };
        NewsTabber.prototype.getLinkFromTab = function (tabListItem) {
            // return tabListItem.querySelector('a') as HTMLAnchorElement; // issues in IE8
            return tabListItem.firstChild;
        };
        NewsTabber.prototype.bindTabLinkToPanel = function (tab, tabPanel) {
            var _this = this;
            var tabLink = this.getLinkFromTab(tab);
            tabLink.addEventListener('click', function (e) {
                e.preventDefault();
                _this.clearActiveTabSelection();
                tabLink.setAttribute('aria-selected', 'true');
                tabPanel.setAttribute('aria-hidden', 'false');
                // accessibility could be better, running out of time :/
                tabPanel.querySelector('a') && tabPanel.querySelector('a').focus();
            });
        };
        NewsTabber.prototype.clearActiveTabSelection = function () {
            var _this = this;
            this.tabs.forEach(function (tab) {
                return _this.getLinkFromTab(tab).setAttribute('aria-selected', 'false');
            });
            this.panels.forEach(function (panel) { return panel.setAttribute('aria-hidden', 'true'); });
        };
        NewsTabber.prototype.createPanelBodyFromResponse = function (response) {
            var itemList = document.createElement('ol');
            var items = response.reduce(function (acc, item) {
                // this is a bit cluttered :/
                var listItem = document.createElement('li');
                var link = document.createElement('a');
                var trail = document.createElement('span');
                var thumb = document.createElement('img');
                var linkText = document.createElement('span');
                itemList.className = 'section-list';
                listItem.className = 'section-list__item';
                link.className = 'section-list__link';
                link.setAttribute('href', item.webUrl);
                trail.className = 'section-list__trail';
                trail.innerHTML = item.fields.trailText;
                thumb.className = 'section-list__thumb';
                thumb.setAttribute('src', item.fields.thumbnail);
                linkText.className = 'section-list__link-text';
                linkText.innerHTML = item.webTitle;
                link.appendChild(thumb);
                link.appendChild(linkText);
                link.appendChild(trail);
                listItem.appendChild(link);
                itemList.appendChild(listItem);
                return itemList;
            }, itemList);
            return itemList;
        };
        NewsTabber.prototype.fetchContentForSection = function (section, panel) {
            var _this = this;
            var onFetchSuccess = function (response) {
                var body = _this.createPanelBodyFromResponse(response);
                panel.innerHTML = '';
                panel.appendChild(body);
            };
            var onFetchError = function () {
                panel.innerHTML = 'Could not fetch data for this section...';
            };
            API.getRecentBySection(section.key, onFetchSuccess, onFetchError);
        };
        NewsTabber.prototype.buildTabber = function () {
            var _this = this;
            var tabs = [];
            var panels = [];
            this.sections.forEach(function (section, index) {
                var shouldBeActive = index === 0;
                var tab = _this.createTabForSection(section, shouldBeActive);
                var panel = _this.createTabPanelForSection(section, shouldBeActive);
                _this.bindTabLinkToPanel(tab, panel);
                _this.fetchContentForSection(section, panel);
                tabs.push(tab);
                panels.push(panel);
            });
            return [tabs, panels];
        };
        NewsTabber.prototype.render = function () {
            var _this = this;
            this.containerEl.innerHTML = '';
            this.containerEl.appendChild(this.tabListContainer);
            this.tabs.forEach(function (tab) { return _this.tabListContainer.appendChild(tab); });
            this.panels.forEach(function (panel) { return _this.containerEl.appendChild(panel); });
        };
        return NewsTabber;
    }());
    var newsTabber1 = new NewsTabber('tabber');
})(window);
