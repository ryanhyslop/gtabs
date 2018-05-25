// Interfaces
declare var XDomainRequest: any;

interface IApiResult<F> {
    id: string;
    type: string;
    sectionId: string;
    sectionName: string;
    webPublicationDate: string;
    webTitle: string;
    webUrl: string;
    apiUrl: string;
    isHosted: boolean;
    pillarId: string;
    pillarName: string;
    fields: F;
}

interface IFields {
    trailText: string;
    thumbnail: string;
}

interface GAPIResponse {
    response: {
        status: string;
        userTier: string;
        total: number;
        startIndex: number;
        pageSize: number;
        currentPage: number;
        pages: number;
        orderBy: string;
        results: IApiResult<IFields>[];
    };
}

interface ICustomisableParams {
    section: string;
}

interface IApiParams {
    key: string;
    pageSize: number;
    initialPage: number;
    orderBy: string;
    section: string;
}

interface ISection {
    name: string;
    key: string;
}

type TabberItems = [HTMLLIElement[], HTMLDivElement[]];

(function(global) {
    // Little Utils namespace
    const Utils = {
        querySelectorAllToArray: (selector: string, scope: any = global.document) => {
            return Array.prototype.slice.call(scope.querySelectorAll(selector) || []);
        }
    };

    // Could use a typescript class here but went for a module revealing pattern
    const API = (() => {
        // defaults & fixed values
        const apiKey = '9wur7sdh84azzazdt3ye54k4';
        const pageSize = 5;
        const initialPage = 1;
        const orderBy = 'newest';
        const showFields = 'trail-text,thumbnail';

        // Considered using fetch here with a polyfil but went old school for lightweight x-browser
        const apiRequest = (section: string, onSuccess: any, onError: any) => {
            let xhr: XMLHttpRequest;

            if (new XMLHttpRequest().withCredentials === undefined) {
                // Oh boy its been a while since I've been exposed to this!
                xhr = new XDomainRequest();

                xhr.onload = function() {
                    const parseResult: GAPIResponse = JSON.parse(xhr.responseText);
                    onSuccess(parseResult);
                };

                xhr.onerror = function() {
                    onError(xhr.responseText);
                };
            } else {
                xhr = new XMLHttpRequest();

                xhr.onreadystatechange = function() {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        switch (xhr.status) {
                            case 200:
                                const parseResult: GAPIResponse = JSON.parse(xhr.responseText);
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

            xhr.open(
                'GET',
                `https://content.guardianapis.com/search?section=${section}&order-by=${orderBy}&show-fields=${showFields}&&page-size=${pageSize}&page=${initialPage}&api-key=${apiKey}`,
                true
            );

            xhr.send();
        };

        const getRecentBySection = function(section: string, onSuccess: any, onError: any) {
            function mapSuccessResponse(response: GAPIResponse) {
                // just a little data mapper so the handler doesn't have as much to do.
                onSuccess(response.response.results);
            }

            apiRequest(section, mapSuccessResponse, onError);
        };

        return {
            getRecentBySection
        };
    })();

    /*
        Went for a typescript class here with a view that they could be multiple instances
        Essentially compiles down to an iffy that returns a function with all instance methods
        set on prototype (ie. NewsTabber.prototype.createTabForSection);
     */

    class NewsTabber {
        private containerEl: HTMLElement;
        private tabListContainer: HTMLUListElement;
        private sections: ISection[];
        private tabs: HTMLLIElement[] = [];
        private panels: HTMLDivElement[] = [];

        constructor(containerId: string) {
            this.containerEl = document.getElementById(containerId) as HTMLElement;
            this.tabListContainer = this.buildTabListContainer();

            // these could be passed as config
            this.sections = [
                { name: 'UK News', key: 'uk-news' },
                { name: 'Football', key: 'football' },
                { name: 'Travel', key: 'travel' }
            ];

            const [tabs, panels] = this.buildTabber();
            this.tabs = tabs;
            this.panels = panels;
            this.render();
        }

        private buildTabListContainer(): HTMLUListElement {
            const tabList = document.createElement('ul');
            tabList.className = 'tabber__list';
            return tabList;
        }

        private createTabForSection(section: ISection, active: boolean): HTMLLIElement {
            const tabListItem = document.createElement('li');
            const tabLink = document.createElement('a');
            tabLink.setAttribute('href', `#tab-section-${section.key}`);
            tabLink.setAttribute('href', `tab-section-${section.key}`);
            tabLink.setAttribute('aria-selected', active ? 'true' : 'false');
            tabLink.className = 'tabber__tab-link';
            tabLink.innerText = section.name;
            tabListItem.appendChild(tabLink);
            return tabListItem;
        }

        private createTabPanelForSection(section: ISection, active: boolean): HTMLDivElement {
            const tabPanel = document.createElement('div');
            tabPanel.className = 'tabber__panel';
            tabPanel.setAttribute('aria-hidden', active ? 'false' : 'true');
            tabPanel.setAttribute('aria-labeledby', `tab-section-${section.key}`);
            tabPanel.innerHTML = 'Loading...';
            return tabPanel;
        }

        private getLinkFromTab(tabListItem: HTMLLIElement): HTMLAnchorElement {
            // return tabListItem.querySelector('a') as HTMLAnchorElement; // issues in IE8
            return tabListItem.firstChild as HTMLAnchorElement;
        }

        private bindTabLinkToPanel(tab: HTMLLIElement, tabPanel: HTMLDivElement): void {
            const tabLink = this.getLinkFromTab(tab);

            tabLink.addEventListener('click', e => {
                e.preventDefault();
                this.clearActiveTabSelection();

                tabLink.setAttribute('aria-selected', 'true');
                tabPanel.setAttribute('aria-hidden', 'false');

                // accessibility could be better, running out of time :/
                tabPanel.querySelector('a') && tabPanel.querySelector('a')!.focus();
            });
        }

        private clearActiveTabSelection() {
            this.tabs.forEach(tab =>
                this.getLinkFromTab(tab).setAttribute('aria-selected', 'false')
            );
            this.panels.forEach(panel => panel.setAttribute('aria-hidden', 'true'));
        }

        private createPanelBodyFromResponse(response: IApiResult<IFields>[]): HTMLOListElement {
            const itemList = document.createElement('ol');

            const items = response.reduce((acc, item) => {
                // this is a bit cluttered :/
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                const trail = document.createElement('span');
                const thumb = document.createElement('img');
                const linkText = document.createElement('span');

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
        }

        private fetchContentForSection(section: ISection, panel: HTMLDivElement) {
            const onFetchSuccess = (response: IApiResult<IFields>[]) => {
                const body = this.createPanelBodyFromResponse(response);
                panel.innerHTML = '';
                panel.appendChild(body);
            };

            const onFetchError = () => {
                panel.innerHTML = 'Could not fetch data for this section...';
            };

            API.getRecentBySection(section.key, onFetchSuccess, onFetchError);
        }

        private buildTabber(): TabberItems {
            const tabs: HTMLLIElement[] = [];
            const panels: HTMLDivElement[] = [];

            this.sections.forEach((section, index) => {
                const shouldBeActive = index === 0;
                const tab = this.createTabForSection(section, shouldBeActive);
                const panel = this.createTabPanelForSection(section, shouldBeActive);
                this.bindTabLinkToPanel(tab, panel);
                this.fetchContentForSection(section, panel);
                tabs.push(tab);
                panels.push(panel);
            });

            return [tabs, panels];
        }

        private render() {
            this.containerEl!.innerHTML = '';
            this.containerEl!.appendChild(this.tabListContainer);
            this.tabs.forEach(tab => this.tabListContainer!.appendChild(tab));
            this.panels.forEach(panel => this.containerEl!.appendChild(panel));
        }
    }

    const newsTabber1 = new NewsTabber('tabber');
})(window);
